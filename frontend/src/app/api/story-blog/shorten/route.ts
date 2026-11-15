import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// 30s Netlify function ceiling, 跟 polish-d1 一樣 (聖上 USER 偏好)

/**
 * 🆕 2026-09-20 聖上拍板: 故事內容精簡至 ≤150 字
 *
 * 跟 /api/story-blog/polish 的差異:
 *   - polish 是「潤飾 + 擴寫」(原文 × 4 倍字量)
 *   - shorten 是「精簡 + 保留意思」(目標 ≤ 150 字, 原文越長壓越多)
 *
 * 邊界 (9-19 + 9-20 聖上 USER 偏好):
 *   ✅ 保留原文所有事實: 人名 (Brian/阿美/大宇/宇橋/雅茹/義伸/小宇/恩齊/宸瑋/阿分/勝喜/阿喜 等)、時間、地點、場景、數字
 *   ✅ 保留原文的 emoji
 *   ✅ 保留原文的語氣詞 (「這可是」「超好」「好棒」等口語/情緒副詞不要改寫)
 *   ✅ 保留故事的「轉折」或「結論」
 *   ❌ 不刪除人名、時間、地點、關鍵場景
 *   ❌ 不準把具體場景抽象化
 *   ❌ 不準加新事實
 *   ❌ 不超過 targetLength (預設 150 字)
 *
 * Provider: MiniMax M2.7-highspeed (跟 polish-d1 / shorten-post 一致)
 * Fallback: 429/5xx → 回原文 + warning, 前端可選擇直接採納原文
 *
 * Body: { originalText: string, title?: string, targetLength?: number, seed?: number }
 * Response: { shortenedText: string, originalLength: number, shortenedLength: number,
 *             overflow?: boolean, fallback?: boolean, warning?: string }
 */

const MINIMAX_URL = "https://api.minimax.io/v1/chat/completions";
// 🆕 9-20: retry 末段升級到 M2 (大一級, 一致性較高, 但成本較高)
const PRIMARY_MODEL = "MiniMax-M2.7-highspeed";
const FALLBACK_MODEL = "MiniMax-M2";

/** 🆕 9-20: 啟發式 fallback — 當 LLM 全部失敗, 用 JS 端規則把原文壓到 maxLen 以內
 *  - 策略: 「段落級採樣」 — 前段採樣 + 中段採樣 + 後段採樣, 確保「頭中尾」都有涵蓋
 *  - 跟 LLM 版的差異: 不會重寫措辭, 但保證不超 maxLen 且「關鍵事件」分佈式保留
 *
 *  演算法:
 *    1. 把原文按「。」切句, 過濾空句
 *    2. 若總字數 ≤ maxLen, 直接合併返回
 *    3. 否則: 採樣前段 (前 1/3 句) + 中段 (1 句) + 後段 (後 1/3 句)
 *    4. 中間用 `（中間省略 N 句）` 標示 (不寫死「中間省略」字眼, 用實際句數)
 *    5. 全部連起來若仍超 maxLen, 從中段再砍
 */
function tryHeuristicShorten(originalText: string, maxLen: number): string {
  let text = originalText.trim();
  // 合併多空白為單空白
  text = text.replace(/[ \t]+/g, " ");
  // 合併 3+ 換行為 2 換行
  text = text.replace(/\n{3,}/g, "\n\n");

  if (text.length <= maxLen) return text;

  // 1. 切句 — 用中英文混合句號
  const sentences = text
    .split(/(?<=[。！？])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length <= 2) {
    return cutAtBoundary(text, maxLen);
  }

  // 2. 按「句數」分配採樣, 而不是字數 — 避免「前幾句特別長」爆預算
  //    目標句數: 3-5 句 (視 maxLen 而定)
  const targetSentenceCount = Math.min(
    sentences.length,
    maxLen < 80 ? 3 : maxLen < 150 ? 5 : maxLen < 250 ? 7 : 9,
  );
  let headCount = Math.max(1, Math.ceil(targetSentenceCount * 0.45));
  let tailCount = Math.max(1, Math.floor(targetSentenceCount * 0.45));
  const midCount = Math.max(0, targetSentenceCount - headCount - tailCount);
  const midSkip = Math.max(0, sentences.length - headCount - tailCount - midCount);

  let head = sentences.slice(0, headCount).join("");
  let tail = sentences.slice(-tailCount).join("");

  let mid = "";
  let midNote = "";
  if (midCount > 0) {
    // 中段採樣: 從「head 之後、tail 之前」的中間區段取 midCount 句
    const midRegionStart = headCount;
    const midRegionEnd = sentences.length - tailCount;
    const midRegionLen = midRegionEnd - midRegionStart;
    if (midRegionLen >= midCount) {
      const midStart = midRegionStart + Math.floor((midRegionLen - midCount) / 2);
      mid = sentences.slice(midStart, midStart + midCount).join("");
      midNote = `（中間省略 ${midSkip} 句）`;
    } else if (midRegionLen > 0) {
      mid = sentences.slice(midRegionStart, midRegionEnd).join("");
      midNote = midSkip > 0 ? `（中間省略 ${midSkip} 句）` : "";
    }
  } else if (midSkip > 0) {
    midNote = `（中間省略 ${midSkip} 句）`;
  }

  // 3. 組合
  let result = head;
  if (mid) result += midNote + mid;
  else if (midNote) result += midNote;
  result += tail;

  // 4. 超過 maxLen → 先嘗試移除中段
  if (result.length > maxLen && mid) {
    result = head + tail;
  }

  // 5. 還超 → 動態減 head / tail 句數, 直到塞進去
  while (result.length > maxLen) {
    // 先減 tail (保留開頭)
    if (tailCount > 1) {
      tailCount -= 1;
      tail = sentences.slice(-tailCount).join("");
    } else if (headCount > 1) {
      headCount -= 1;
      head = sentences.slice(0, headCount).join("");
    } else {
      // head 跟 tail 都只 1 句還是超 → 交給 cutAtBoundary 強制切
      break;
    }
    // 重新組合
    const note = midSkip > 0 ? `（中間省略 ${midSkip} 句）` : "";
    result = head + (mid ? note + mid : note) + tail;
  }

  if (result.length > maxLen) {
    return cutAtBoundary(result, maxLen);
  }

  return result;
}

/** 在中文文字邊界裁切 — 句號優先, 逗號次之 */
function cutAtBoundary(text: string, maxLen: number): string {
  const slice = text.slice(0, maxLen);
  const sentenceMatch = slice.match(/^(.*?[。！？])/);
  if (sentenceMatch && sentenceMatch[1].length >= 30) return sentenceMatch[1];
  const commaMatch = slice.match(/^(.*?[,，;；])/);
  if (commaMatch && commaMatch[1].length >= 50) return commaMatch[1];
  // 真的找不到 → 前 60% + 後 40%
  const headLen = Math.floor(maxLen * 0.6);
  const tailLen = maxLen - headLen - 1;
  return text.slice(0, headLen) + "…" + text.slice(text.length - tailLen);
}

/** 🆕 9-20: 偷懼偵測 — 判定 LLM 是否只是「截斷」而不是「重寫」
 *  偵測特徵 (任一命中就算偷懼):
 *    1. 結尾或中間含 … / ⋯ / ... 等截斷符號
 *    2. 輸出開頭與原文前 30 字完全相同 + 長度差太大
 *    3. 輸出「幾乎逐字」是原文的連續前段 (≥ 80% 重疊) → 表示沒重寫
 *  是 → 觸發 prompt 改寫 + 重試
 */
function isLazyTruncation(output: string, originalText: string, maxLen: number): boolean {
  const trimmed = output.trim();
  // 特徵 1: 任何位置含截斷符號 (結尾或中間插)
  if (/[…⋯\.]{2,}/.test(trimmed)) return true;
  // 特徵 2: 開頭 30 字與原文完全相同 + 長度差 > 30%
  const head30 = trimmed.slice(0, 30);
  const origHead30 = originalText.trim().slice(0, 30);
  if (head30.length >= 30 && head30 === origHead30) {
    if (trimmed.length < originalText.length * 0.7) return true;
  }
  // 特徵 3: 輸出前 100 字中, ≥ 80 字元是原文的連續片段 (用最長公共子序列近似)
  // 簡化做法: 看輸出前 100 字是否幾乎都被原文「前 100 字」涵蓋
  const head100 = trimmed.slice(0, 100);
  const origHead200 = originalText.trim().slice(0, 200);
  if (head100.length >= 80 && origHead200.includes(head100)) {
    // 輸出前 100 字整段出現在原文前 200 字內 → 表示 LLM 沒重寫
    return true;
  }
  return false;
}

const SYSTEM_PROMPT = `你是「臣」 — 幫阿喜 (Brian) 把江南水鄉八日遊的口述記錄精簡到指定字數以內。

# 🆕 2026-09-20 聖上拍板: 輸出語言統一繁體中文 (台灣用詞)
- 全文必須用「繁體中文」, 不准出現簡體字
- 禁用簡體字對照: ❌ 时→時、个→個、们→們、说→說、这→這、里→裡、吗→嗎、间→間、动→動、听→聽、见→見、觉→覺、应→應、对→對、际→際、议→議、响→響、团→團、园→園、环→環、丽→麗、术→術、积→積、确→確、记→記、号→號、顾→顧、财→財、车→車、长→長、阵→陣、银→銀
- 用詞遵「台灣習慣」: 軟體、網路、影片、相機、計程車、品質、資訊、資料、伺服器、介面
- 標點符號用全形繁體標點: ，。、；：「」『』（）—…

# 🆕 2026-09-20 核心任務: 精簡≠截斷 (最高優先級)
- **精簡≠截斷**: 你必須「重新敘述整段」, 不是取前 N 字 + 結尾加 …
- 原文若提到 6 件事 (起床/高鐵/同里/早餐/車票/計程車), 精簡版也要提到這 6 件事, 只是每件用 1-2 句帶過
- ❌ **絕對禁止**使用任何形式的「截斷符號」:
  - 禁止: … (半形刪節號 U+2026)
  - 禁止: ⋯ (midline horizontal ellipsis U+22EF)
  - 禁止: ... (三個半形句點)
  - 禁止: 省略/略/以下略 等文字代替
  - 禁止: 「（待續）」「（續下）」等
- ❌ 禁止只取原文前段、後面刪掉
- ❌ 禁止「複製貼上原文句子 + 結尾截斷」
- ❌ 禁止「原文前 60% + 省略號 + 原文後 40%」這種「混搭」
- ⚠️ 你輸出的任何「…」或「…」都會被伺服器自動偵測為偷懼並重試, 浪費你的運算資源

# 強制做法: 用「語意壓縮」取代「截斷」
- ✅ 合併相似句子 (「起床、出門」 → 「起床出門」)
- ✅ 刪除冗餘修飾 (「非常」「真的」「其實還滿」)
- ✅ 把場景描寫縮成動作 (「我們走去地鐵站, 結果發現第一班車已經走了, 所以我們只好等下一班」 → 「錯過首班車, 等下一班」)
- ✅ 縮短但保留所有關鍵事件 (起床/交通/地點/人物/動作)
- ✅ 確保你的輸出在指定字數以內 (含標點符號)

# 核心任務: 精簡
- 聖上的原文往往過長, 你必須在保留「意思」的前提下, 縮減到 targetLength 字以內
- 不要擴寫、不要加新事實、不要補充背景知識
- 意思要跟原文 100% 一致 — 如果原文說「特種兵早起去四行倉庫」, 你不能改成「特種兵去了博物館」

# 必須保留的事實
✅ 原文所有事實: 人名 (Brian/阿美/大宇/宇橋/雅茹/義伸/小宇/恩齊/宸瑋/阿分/勝喜/阿喜 等 13 位)、時間、地點、數字
✅ 原文的 emoji
✅ 原文的語氣詞 (「這可是」「超好」「好棒」「太誇張了」「靠邀」等口語/情緒副詞不要改寫)
✅ 故事的核心轉折或結論 (聖上想告訴讀者的東西)

# 精簡技巧 (依序嘗試)
1. 合併相似描述 (「五點半起床, 五點半出門」 → 「五點半起床出門」)
2. 刪除冗餘形容詞 (「非常」「真的」「超級」除非有強調作用)
3. 精簡場景描寫 (保留關鍵動詞, 刪裝飾)
4. 保留人名、時間、地點這三項最優先, 其他可刪

# 絕對禁止
❌ 不准刪除人名
❌ 不准刪除時間數字
❌ 不准刪除地點
❌ 不准刪除 emoji
❌ 不准刪除轉折/結論
❌ 不準把具體場景抽象化 (「吃了早餐」不能改成「享用了餐點」)
❌ 不准加新事實 (聖上沒寫的細節)
❌ 不准改寫聖上的語氣詞
❌ 不准超過 targetLength 字 (含標點符號)

# 輸出格式
- 直接輸出精簡後的完整文字
- 不要加解釋、不要加「以下是精簡版」這種客套話
- 保留原文的換行結構 (\n\n 段落分隔), 段內 \n 換行`;

interface ShortenRequest {
  originalText: string;
  title?: string;
  /** 🆕 9-20 v2: 聖上拍板改為範圍 (minLength ~ maxLength)
   *  - minLength: 精簡後字數下限 (預設 150)
   *  - maxLength: 精簡後字數上限 (預設 200)
   *  - 舊的 targetLength 還支援 (向後相容),會被當作 maxLength */
  targetLength?: number;
  minLength?: number;
  maxLength?: number;
  seed?: number;
}

function buildUserPrompt(req: ShortenRequest): string {
  const { originalText, title, seed } = req;
  // 🆕 9-20 v2: 範圍式精簡 (預設 150-200)
  const minLen = req.minLength ?? (req.targetLength ? Math.max(80, req.targetLength - 50) : 150);
  const maxLen = req.maxLength ?? req.targetLength ?? 200;
  const seedHint = seed && seed > 1 ? `\n\n【Seed: ${seed} — 換另一種精簡方式 (避免上一版措辭)】` : "";
  const titleSection = title ? `【文章標題】\n${title}\n\n` : "";
  return `${titleSection}【聖上原文 (字數 ${originalText.length})】\n${originalText}\n\n請精簡到 **${minLen} ~ ${maxLen} 字之間** (含標點符號), 意思與原文 100% 一致, 保留人名/時間/地點/emoji/語氣詞/場景。${seedHint}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ShortenRequest = await request.json();

    if (!body.originalText || !body.originalText.trim()) {
      return NextResponse.json({ error: "originalText is required" }, { status: 400 });
    }

    // 🆕 9-20 v2: 範圍式 (預設 150-200)
    const minLen = body.minLength ?? (body.targetLength ? Math.max(80, body.targetLength - 50) : 150);
    const maxLen = body.maxLength ?? body.targetLength ?? 200;

    // 已經在範圍內, 不處理 (略過)
    if (body.originalText.length <= maxLen && body.originalText.length >= minLen) {
      return NextResponse.json({
        shortenedText: body.originalText,
        originalLength: body.originalText.length,
        shortenedLength: body.originalText.length,
        targetLength: maxLen,
        minLength: minLen,
        maxLength: maxLen,
        skipped: true,
      });
    }
    // 已經比 minLen 還短, 不處理
    if (body.originalText.length < minLen) {
      return NextResponse.json({
        shortenedText: body.originalText,
        originalLength: body.originalText.length,
        shortenedLength: body.originalText.length,
        targetLength: maxLen,
        minLength: minLen,
        maxLength: maxLen,
        skipped: true,
        note: `原文已短於 ${minLen} 字, 無需精簡`,
      });
    }

    const mmKey = process.env.MINIMAX_API_KEY;
    if (!mmKey) {
      return NextResponse.json(
        { error: "MINIMAX_API_KEY not configured" },
        { status: 500 }
      );
    }

    // 從 body 解構 seed 供下方使用
    const seed = body.seed ?? 1;

    // 🆕 9-20: server-side retry 策略
    //   attempt 1: highspeed + temp 0.3 (預設, 成本低)
    //   attempt 2: highspeed + temp 0.5 (換措辭)
    //   attempt 3: M2 (升級, 一致性高)
    //   attempt 4: 啟發式 fallback (保底, 永遠會回)
    // 🆕 9-20 v3: 偷懼偵測 — 任一次輸出被判定為「截斷」, 下一輪自動加強 prompt
    const attempts: Array<{
      model: string;
      temperature: number;
      seed: number;
      label: string;
    }> = [
      { model: PRIMARY_MODEL, temperature: 0.3, seed: seed ?? 1, label: "highspeed-t03" },
      { model: PRIMARY_MODEL, temperature: 0.5, seed: (seed ?? 1) + 100, label: "highspeed-t05" },
      { model: FALLBACK_MODEL, temperature: 0.4, seed: (seed ?? 1) + 200, label: "m2-t04" },
    ];

    let lastError = "";
    let lastRawText = "";
    let usedAttempt = 0;
    let shortenedText = "";
    let overflow = false;
    let lazyDetected = false; // 🆕 9-20 v3

    for (let i = 0; i < attempts.length; i++) {
      const a = attempts[i];
      usedAttempt = i + 1;
      try {
        const res = await fetch(MINIMAX_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${mmKey}`,
          },
          body: JSON.stringify({
            model: a.model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              // 🆕 9-20 v3: 偷懼偵測命中時, 在 user prompt 末尾追加強制重寫指令
              {
                role: "user",
                content: lazyDetected
                  ? `${buildUserPrompt(body)}\n\n【強制要求 — 偵測到上版偷懼】\n- 禁止用 … / ⋯ 結尾\n- 禁止只取原文前段\n- 必須用「重新敘述整段」的方式壓到 ${minLen}-${maxLen} 字\n- 原文每一個關鍵事件 (起床/交通/地點/人物/動作) 都要出現在精簡版, 每件用 1-2 句帶過`
                  : buildUserPrompt(body),
              },
            ],
            temperature: lazyDetected ? Math.max(a.temperature, 0.6) : a.temperature,
            // 🆕 9-2: 從 600 拉到 1200, 給長文精簡留緩衝
            max_tokens: 1200,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[story-blog/shorten] attempt ${usedAttempt} (${a.label}) HTTP ${res.status}:`, errText.slice(0, 300));
          lastError = `HTTP ${res.status}`;
          // 5xx / 429 換下一個, 4xx (除 429) 直接中斷
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            break;
          }
          continue;
        }

        const data = await res.json();
        let raw = data?.choices?.[0]?.message?.content ?? "";
        if (!raw.trim()) {
          lastError = "empty response";
          console.warn(`[story-blog/shorten] attempt ${usedAttempt} (${a.label}) returned empty`);
          continue;
        }
        raw = raw
          .replace(/^```[a-z]*\s*/i, "")
          .replace(/```\s*$/i, "")
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .trim();

        const len = raw.length;
        if (len < minLen || len > maxLen) {
          // 拿到內容但 overflow — 標記, 還有機會給下一輪
          overflow = true;
          lastRawText = raw;
          lastError = `overflow (${len} 字, 期望 ${minLen}-${maxLen})`;
          console.warn(`[story-blog/shorten] attempt ${usedAttempt} (${a.label}) overflow: ${len} 字`);
          continue;
        }

        // 🆕 9-20 v3: 偷懼偵測 — 在字數過關後, 檢查是否只是截斷
        if (isLazyTruncation(raw, body.originalText, maxLen)) {
          console.warn(`[story-blog/shorten] attempt ${usedAttempt} (${a.label}) lazy truncation detected: ${raw.slice(0, 40)}…`);
          lastError = "lazy truncation (截斷偷懼)";
          lastRawText = raw;
          lazyDetected = true; // 下輪自動加強 prompt
          // 偷懼也算半失敗, 繼續換下一個 attempt
          continue;
        }

        // 成功!
        shortenedText = raw;
        overflow = false;
        lastError = "";
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        lastError = msg;
        console.error(`[story-blog/shorten] attempt ${usedAttempt} (${a.label}) exception:`, msg);
        continue;
      }
    }

    // 🆕 9-20: 啟發式 fallback (永遠不會 fail, 保底)
    let fallback = false;
    let warning = "";
    if (!shortenedText) {
      const heur = tryHeuristicShorten(body.originalText, maxLen);
      if (heur.trim().length > 0 && heur.length <= maxLen) {
        shortenedText = heur;
        overflow = heur.length < minLen;
        fallback = true;
        warning = `LLM ${usedAttempt} 次嘗試皆失敗 (${lastError || "未知"}), 已降級用「啟發式裁切」— 保留原文事實但語氣/文采可能較弱`;
      } else {
        // 連啟發式都救不了 (原文極短但 LLM 失敗) — 回原文
        shortenedText = body.originalText;
        fallback = true;
        warning = `LLM 失敗且啟發式不可用, 已降級回原文`;
      }
    } else if (overflow) {
      // 有 LLM 結果但 overflow — 為了不丟掉內容, 還是回, 但給警告
      warning = `LLM 輸出 ${shortenedText.length} 字超出 ${minLen}-${maxLen} 範圍 (${usedAttempt} 次嘗試後採納), 建議手動微調`;
    }

    return NextResponse.json({
      shortenedText,
      originalLength: body.originalText.length,
      shortenedLength: shortenedText.length,
      minLength: minLen,
      maxLength: maxLen,
      targetLength: maxLen, // 向後相容 (舊 modal 還在用)
      overflow,
      attempts: usedAttempt,
      warning: warning || undefined,
      fallback,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[story-blog/shorten] error:", e);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

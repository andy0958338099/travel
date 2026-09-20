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
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

const SYSTEM_PROMPT = `你是「臣」 — 幫阿喜 (Brian) 把江南水鄉八日遊的口述記錄精簡到指定字數以內。

# 🆕 2026-09-20 聖上拍板: 輸出語言統一繁體中文 (台灣用詞)
- 全文必須用「繁體中文」, 不准出現簡體字
- 禁用簡體字對照: ❌ 时→時、个→個、们→們、说→說、这→這、里→裡、吗→嗎、间→間、动→動、听→聽、见→見、觉→覺、应→應、对→對、际→際、议→議、响→響、团→團、园→園、环→環、丽→麗、术→術、积→積、确→確、记→記、号→號、顾→顧、财→財、车→車、长→長、阵→陣、银→銀
- 用詞遵「台灣習慣」: 軟體、網路、影片、相機、計程車、品質、資訊、資料、伺服器、介面
- 標點符號用全形繁體標點: ，。、；：「」『』（）—…

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

    const res = await fetch(MINIMAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mmKey}`,
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
        temperature: 0.3, // 精簡任務要低溫, 保持精準
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[story-blog/shorten] MiniMax API error:", res.status, errText.slice(0, 500));

      if (res.status === 429 || res.status >= 500) {
        return NextResponse.json({
          shortenedText: body.originalText,
          originalLength: body.originalText.length,
          shortenedLength: body.originalText.length,
          fallback: true,
          warning: `MiniMax API ${res.status} — 配額或暫時不可用, 已降級用「原文」`,
        });
      }

      return NextResponse.json(
        { error: `LLM API ${res.status}: ${errText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    let shortenedText = data?.choices?.[0]?.message?.content ?? "";

    if (!shortenedText.trim()) {
      return NextResponse.json({ error: "Empty response from LLM" }, { status: 500 });
    }

    // 去掉 markdown code fence
    shortenedText = shortenedText
      .replace(/^```[a-z]*\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // 去掉 MiniMax reasoning block
    shortenedText = shortenedText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // 🆕 9-20 v2: 範圍檢查 — 太短或太長都警告
    const len = shortenedText.length;
    const overflow = len < minLen || len > maxLen;

    return NextResponse.json({
      shortenedText,
      originalLength: body.originalText.length,
      shortenedLength: shortenedText.length,
      minLength: minLen,
      maxLength: maxLen,
      targetLength: maxLen, // 向後相容 (舊 modal 還在用)
      overflow,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[story-blog/shorten] error:", e);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

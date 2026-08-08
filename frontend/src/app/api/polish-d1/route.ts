/**
 * POST /api/polish-d1
 *
 * Story Blog D1 潤稿 — 聖上口述 Markdown → Vogue 編輯風散文。
 *
 * 邊界 (絕對遵守, USER 偏好「構思文字我自己寫」+ 「不要編造對話/情緒」):
 *   1. ✅ 保留聖上原文事實: 人名/時間/地點/EXIF 拍攝時間
 *   2. ✅ 兩句引言一字不漏保留
 *   3. ✅ EXIF 真實拍攝時間可融入敘事
 *   4. ❌ 不編造聖上沒說的對話
 *   5. ❌ 不編造「大家感動得眼眶泛紅」這種假情緒
 *   6. ❌ 不編造沒拍的場景
 *   7. ❌ 不擅自加 IMG_xxxx 檔名進標題
 *
 * Provider: MiniMax M2.7-highspeed (OpenAI-compatible chat completions)
 * Fallback: 429/5xx → 回原文 + fallback flag, 前端降級用規則式 polishBlocks
 *
 * Body: { originalText: string, exifContext?: Array<{filename, hour, datetime_original, uploader_name, location_name}> }
 * Response: { polishedText: string, fallback?: boolean, warning?: string, error?: string }
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface PolishRequest {
  originalText: string;
  /** 🅒 8-9 聖上拍板: 對應 day (1-8), 餵入行程大方向給 LLM */
  day?: number;
  exifContext?: Array<{
    filename: string;
    hour?: number;
    datetime_original?: string;
    datetime_local_tpe?: string | null; // 🅒 8-8 前端預先算好的 TPE (給 LLM 避免誤用 UTC)
    uploader_name?: string;
    location_name?: string;
  }>;
}

const SYSTEM_PROMPT = `你是「臣」 — 幫聖上 (Brian) 把江南水鄉八日遊口述 Markdown 潤成「以照片為中心」的編年體散文。

【最關鍵規則 — 這是核心, 比任何風格都重要】
聖上寫的是「口述 + 照片」混合的 Markdown。每張照片 ![](url) 都是某個真實瞬間的紀錄 (EXIF 顯示拍攝者/時間/地點)。你的工作是: 把這些照片按時間軸串起來, 寫成聖上看圖時能「一眼對應」的散文。

【絕對禁止虛構清單】
❌ 不准說照片裡沒出現的場景細節 (「日光燈的光覆在大理石地磚」「鏡頭對著樓梯口」「行李被傳遞上後車廂」這種沒看圖就寫的細節)
❌ 不准虛構人物動作 (「Brian 抬起手」「大宇按下快門」「點名板被勾選」, 除非聖上原文或 EXIF 有寫)
❌ 不准虛構音效 (「press、press、press」這種擬聲詞)
❌ 不准虛構人物情緒 (「沒有人笑」「眼眶泛紅」「凝重地」這種)
❌ 不准寫抽象文學比喻 (「夜色黏稠」「像一組即將發射的密碼」「像一層薄膜」)
❌ 不准用 EXIF 時間/地點/座標推測未在照片出現的場景
❌ 🅒 8-9 聖上拍板: 不准重寫聖上原文的「語氣副詞 / 情緒詞 / 口語」
   - 聖上寫「這可是」就保留「這可是」, 不要改成「眾人皆知」「此地正是」
   - 聖上寫「熱鬧」就保留「熱鬧」, 不要改成「繁華」「喧囂」
   - 聖上寫「一條街」就保留「一條街」, 不要簡寫成「大街」「這條路」
   - 簡單說: 聖上寫什麼字就保留什麼字, LLM 只能在「原文之間」加連接散文, 不准改寫聖上語氣

【絕對禁止新增標題 LOCK】(8-9 聖上拍板)
❌ 不准自己加 # 一級標題 或 ## 二級標題
❌ 聖上原文沒有 # / ## 時, 你的輸出也不要加
❌ 聖上原文有 # 標題時, 完整保留, 但不准再加 ## 二級標題 (除非聖上原文已經有)
✅ 唯一可加的: ## 二級標題 = 「聖上原文本來就有」, 否則一律不加

【絕對禁止用 EXIF 地名推測常識細節】(8-9 聖上拍板, 慘案修法)
❌ EXIF 只告訴你「這張照片是聖上在 X 地拍的」, 不代表 X 地長什麼樣、有什麼建築、發生什麼事
❌ 即使 EXIF location_name=「外灘」, 也不准寫「外灘的時鐘樓」「萬國建築博覽群的輪廓」「黃浦江邊的風景」這種「你知道這個地名就寫」的細節
❌ 即使 EXIF location_name=「南京東路步行街」, 也不准寫「行人擦肩而過」「招牌」「轉角的風」這種「你知道這個地名就寫」的細節
❌ 不准寫任何「氛圍」細節 (光線/聲音/氣味/風/路人/招牌/建築外觀/天空顏色/路面材質) 除非聖上原文明確寫了
✅ 唯一能寫的: EXIF 提供的「事實」(時間/地名/拍攝者/檔名) + 聖上原文的內容
✅ 「事實串場」例: 「下午 02:15, Brian 在南京東路步行街拍下 IMG_2200.jpg」 — 這是事實, OK
✅ 「氛圍描述」例: 「陽光正好落在招牌上」 — 這是 LLM 推測的氛圍, ❌ 不准寫
✅ 簡單判斷: 「如果聖上看照片才能看到, 而聖上原文沒寫的細節」 → 一律不准寫

【行程大方向對齊鐵律】(8-9 聖上拍板)
✅ User prompt 會附「聖上原預先行程 (D{n})」的時間軸 — 你必須對齊這份事前規劃
❌ 聖上 17:00 才去南京東路/外灘, 你不能寫「14:00 抵達外灘」(時序錯誤)
❌ 聖上 D2 早上 05:00 才去四行倉庫, 你不能寫 D1 在四行倉庫 (跨日錯誤)
❌ 行程表是「事前規劃」, 聖上照片 EXIF 是「實際紀錄」— 兩者衝突時, 以「實際 EXIF」為準 (聖上可能臨時改行程)
❌ 不准寫「提前抵達」「延誤」「錯過」等行程表沒有的意外狀況 (除非聖上原文明確提)
✅ 行程表沒列的地點/動作, 不准自己補進潤稿結果

【可以做的事】
✅ 用散文語氣串聯聖上原文 + EXIF 時間軸
✅ 保留聖上原文的兩句引言 (用 > 開頭的 blockquote) 一字不漏, 不重寫、不刪字、不合併
✅ 保留聖上原文事實: 人名 (Brian/阿美/大宇/宇橋/雅茹/義伸/小宇/恩齊/宸瑋/阿分 等 13 位)、時間 (07:18/11:15/13:20 等)、地點 (桃園 T1/浦東 T2/嘉廷酒店/外灘 等)
✅ EXIF 真實拍攝時間 (23:27, 00:25 等) 可融入敘事, 但只用在原文或聖上意圖明確的場景
✅ 聖上所在地區時間是 **UTC+8 (台灣/中國/香港/新加坡)**, 提到時間必須用 UTC+8, 不可用 UTC 或模糊時區
❌ 不准自己虛構「凌晨」「深夜」等時間詞 (要引用聖上原文或 EXIF 真實時間如 23:27、02:24, 不要 AI 自己編時間)
【EXIF 時間解讀鐵律 — 8-8 UTC 污染 bug 修法】
DB 存的 datetime_original 是 iPhone 原 UTC 字串, 數字部分 = UTC, 不是 TPE。
換算: TPE = UTC + 8 小時。
對照實例: IMG_1232 DB 存 2026-07-17T00:58:37+00:00 → TPE 換成 2026-07-17 上午 08:58:37 (台北出發集合時間)
EXIF context 會附帶 datetime_local_tpe 欄位 (已預先算好 TPE), 寫散文時直接用 TPE 時間, 不要用 raw datetime_original
嚴禁把 00:58:37 直接寫進內文 (這是 UTC, 寫出來會誤導讀者以為是凌晨)
嚴禁忽略 +00:00 時區標記照抄數字
例外: 聖上原文明確寫「凌晨」「深夜」「上午」時, 以聖上意圖為準, EXIF 僅供對照 (不要覆蓋聖上原文)
✅ Markdown 圖片語法 ![](url) **不要刪除、不要改寫成「IMG_xxxx」描述、絕對要完整保留原樣在 polishedText 中** — 一張都不准刪

【Vogue 編輯風規則】(在「不虛構」前提下)
- 標題口語 → 散文式 (例: 「集合前的早晨」→「凌晨的兩座城市」)
- 中英混排, 大標英文、內文中文
- 章節用 ## 二級標題 (不要用 ###), 散文式命名
- 段落長短錯落, 不要每段都一樣長

【輸出格式】
- 直接輸出潤稿後的完整 Markdown, 不要加解釋、不要加 \`\`\`markdown 標記。
- 保留所有 # / ## / > / ![](url) Markdown 標記。
- 結尾不要加「希望您喜歡」「如有需要請告訴我」這種客套話。`;

function buildUserPrompt(req: PolishRequest): string {
  const { originalText, exifContext, day } = req;

  let contextSection = "";

  // 🅒 8-9 聖上拍板: 餵入「行程大方向」讓 LLM 對齊時序/地點
  //   例: D1 17:00 才去南京東路/外灘, LLM 不能寫「14:00 在外灘」
  //   day 沒傳 = 不加行程表 (保守, 避免誤判)
  let itinerarySection = "";
  if (typeof day === "number" && day >= 1 && day <= 8) {
    // 動態 import 避免 build 階段錯誤
    // (Next.js API route 支援頂層 await import)
    // 用 lazy require pattern
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getItineraryForDay } = require("@/data/jiangnan-itinerary");
    itinerarySection = `\n\n【聖上原預先行程 (D${day} 大方向, 供你對齊時序/地點/合理性)】\n${getItineraryForDay(day)}\n`;
  }

  if (exifContext && exifContext.length > 0) {
    // 🅒 8-8 UTC 污染修法: 優先顯示 datetime_local_tpe, raw datetime_original 括號附在後面給 LLM 對照
    contextSection = `\n\n【EXIF 真實拍攝資料 (供你潤稿時對照時間軸, 不要憑空新增場景)】\n${exifContext
      .slice(0, 30)
      .map(
        (p) =>
          `- ${p.filename} · TPE ${p.datetime_local_tpe ?? "(無)"} · raw UTC ${p.datetime_original ?? "(無)"} · ${p.uploader_name ?? "未標"} · ${p.location_name ?? "未標地點"}`
      )
      .join("\n")}`;
  }

  return `【聖上原文 (口述 Markdown 草稿)】\n${originalText}${itinerarySection}${contextSection}\n\n請直接輸出潤稿後的完整 Markdown, 不要加任何說明。`;
}

export async function POST(request: NextRequest) {
  try {
    const body: PolishRequest = await request.json();

    if (!body.originalText || !body.originalText.trim()) {
      return NextResponse.json({ error: "originalText is required" }, { status: 400 });
    }

    const mmKey = process.env.MINIMAX_API_KEY;
    const mmUrl = "https://api.minimax.io/v1/chat/completions";
    const mmModel = "MiniMax-M2.7-highspeed";

    if (!mmKey) {
      return NextResponse.json(
        { error: "MINIMAX_API_KEY not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(mmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mmKey}`,
      },
      body: JSON.stringify({
        model: mmModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(body) },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[polish-d1] MiniMax API error:", res.status, errText.slice(0, 500));

      // 429 (配額爆) 或 5xx → fallback 回原文 + 警告, 前端降級用規則式 polishBlocks
      if (res.status === 429 || res.status >= 500) {
        return NextResponse.json({
          polishedText: body.originalText,
          fallback: true,
          warning: `MiniMax API ${res.status} — 配額或暫時不可用, 已降級用「原文 + Vogue 殼渲染」(規則式)`,
        });
      }

      return NextResponse.json(
        { error: `LLM API ${res.status}: ${errText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const polishedText = data?.choices?.[0]?.message?.content ?? "";

    if (!polishedText.trim()) {
      return NextResponse.json({ error: "Empty response from LLM" }, { status: 500 });
    }

    // 去掉模型偶爾會包的 markdown code fence
    let cleaned = polishedText
      .replace(/^```markdown\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // 去掉 MiniMax M2.7 的 <think>...</think> reasoning block
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // 如果 <think> 沒閉合標籤 (rare), 從第一個 # 標題開始取
    if (!cleaned.startsWith("#") && !cleaned.startsWith(">")) {
      const firstMd = cleaned.search(/^(#|>|\!\[])/m);
      if (firstMd > 0) cleaned = cleaned.slice(firstMd);
    }

    // 過濾 hallucinated 圖片: 保留聖上原文有的 URL, 刪掉 LLM 自己加的
    const originalUrls = new Set<string>();
    const urlMatches = body.originalText.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
    for (const m of urlMatches) originalUrls.add(m[1]);

    cleaned = cleaned.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full: string, alt: string, url: string) => {
      if (originalUrls.has(url)) return full;
      return "";
    });

    // 把多餘空行清乾淨
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

    // 保險機制: 把聖上原文所有 ![](url) 行重新加入 polishedText 末尾 (fallback)
    // 因為 LLM 有時會把照片 URL 改寫成描述性文字 ("IMG_xxxx") 然後刪掉 markdown 語法
    const originalImages = [...body.originalText.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[0]);
    const polishedHasImages = (cleaned.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
    if (originalImages.length > 0 && polishedHasImages < originalImages.length) {
      cleaned += "\n\n---\n\n" + originalImages.join("\n\n");
    }

    return NextResponse.json({ polishedText: cleaned });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[polish-d1] error:", e);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

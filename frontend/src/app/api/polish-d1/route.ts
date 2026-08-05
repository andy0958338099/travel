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
  exifContext?: Array<{
    filename: string;
    hour?: number;
    datetime_original?: string;
    uploader_name?: string;
    location_name?: string;
  }>;
}

const SYSTEM_PROMPT = `你是「臣」 — 一位 Vogue 編輯風的潤稿助手, 正在幫聖上 (Brian) 把江南水鄉八日遊的口述 Markdown 草稿潤成雜誌風散文。

【絕對遵守的邊界】
1. 保留聖上原文所有事實: 人名 (Brian/阿美/大宇/宇橋/雅茹/義伸/小宇/恩齊/宸瑋/阿分 等 13 位)、時間 (07:18/11:15/13:20 等)、地點 (桃園 T1/浦東 T2/嘉廷酒店/外灘 等)。
2. 聖上原文中的兩句引言 (用 > 開頭的 blockquote) 一字不漏保留, 不要重寫、刪字、合併。
3. Markdown 圖片語法 ![](url) **不要刪除、不要改寫成「IMG_xxxx」描述、絕對要完整保留原樣在 polishedText 中**。如果原文最後是文字沒有圖片, 不要自己加 ![](url)。但**原文有的照片, 一張都不准刪** — 聖上會自己決定照片位置。
4. 不編造聖上沒說的對話。
5. 不編造人物情緒 (如「眼眶泛紅」「感動不已」)。
6. 不編造沒在原文或 EXIF 中的場景。
7. 不擅自把 IMG_xxxx 檔名加進散文標題。
8. EXIF 真實拍攝時間可融入敘事, 但只能用在原文已提到的照片或場景, 不要憑空新增。

【Vogue 編輯風規則】
- 標題口語 → 散文式 (例: 「集合前的早晨」→「凌晨的兩座城市」)
- 段落加開場白 (場景描寫: 燈光/聲音/空間)
- 用英文 italic 大標 (# The Long Goodbye) + 章回小標 (## 桃 園 啟 程)
- 章節用 ## 二級標題 (不要用 ###), 散文式命名
- 中英混排, 大標英文、內文中文
- 段落長短錯落, 不要每段都一樣長

【輸出格式】
- 直接輸出潤稿後的完整 Markdown, 不要加解釋、不要加 \`\`\`markdown 標記。
- 保留所有 # / ## / > / ![](url) Markdown 標記。
- 結尾不要加「希望您喜歡」「如有需要請告訴我」這種客套話。`;

function buildUserPrompt(req: PolishRequest): string {
  const { originalText, exifContext } = req;

  let contextSection = "";
  if (exifContext && exifContext.length > 0) {
    contextSection = `\n\n【EXIF 真實拍攝資料 (供你潤稿時對照時間軸, 不要憑空新增場景)】\n${exifContext
      .slice(0, 30)
      .map(
        (p) =>
          `- ${p.filename} · ${p.datetime_original ?? "時間不詳"} · ${p.uploader_name ?? "未標"} · ${p.location_name ?? "未標地點"}`
      )
      .join("\n")}`;
  }

  return `【聖上原文 (口述 Markdown 草稿)】\n${originalText}${contextSection}\n\n請直接輸出潤稿後的完整 Markdown, 不要加任何說明。`;
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

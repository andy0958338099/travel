/**
 * POST /api/shorten-post
 *
 * 🆕 2026-09-20 聖上拍板 v12: 故事 > 200 字時,自動重修至 200 字(意思相同)
 *
 * 邊界 (聖上 9-19 + 9-20):
 *   1. ✅ 意思相同: 人名/時間/地點/事實全部保留
 *   2. ✅ 字數 ≤ 200 (繁體中文)
 *   3. ❌ 不編造新事實
 *   4. ❌ 不刪除關鍵場景
 *   5. ✅ 保留聖上語氣詞 (「這可是」就保留「這可是」, 不要改)
 *   6. ✅ 保留 emoji
 *
 * Provider: MiniMax M2.7-highspeed (OpenAI-compatible chat completions)
 * Fallback: 429/5xx → 回原文 (前端降級用原文)
 *
 * Body: { content: string, targetLength?: number, title?: string }
 * Response: { shortenedText: string, originalLength: number, shortenedLength: number, fallback?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

interface ShortenRequest {
  content: string;
  targetLength?: number; // 預設 200
  title?: string; // 給 LLM 上下文
}

const SYSTEM_PROMPT = `你是「臣」 — 幫阿喜 (Brian) 把故事部落格的故事精簡到 200 字以內。

【最關鍵規則】
- 必須保留原文所有事實: 人名 (Brian/阿美/大宇/宇橋/雅茹/義伸/小宇/恩齊/宸瑋/阿分/勝喜/阿喜 等)、時間、地點、場景、數字
- 必須保留原文的 emoji
- 必須保留原文的語氣詞 (「這可是」「超好」「好棒」「太誇張了」等口語/情緒副詞不要改寫)
- 必須保留原文的兩個關鍵場景或細節 (不能只留一句空泛的話)
- 必須保留故事的「轉折」或「結論」(聖上想告訴讀者的東西)

【絕對禁止】
❌ 不准刪除人名、時間、地點
❌ 不準把具體場景抽象化 (「吃了早餐」不要改成「享用了餐點」)
❌ 不准加新事實 (聖上沒寫的細節)
❌ 不准刪掉 emoji
❌ 不准改寫聖上的語氣 (「靠邀」就保留「靠邀」, 不要改成「天啊」)
❌ 不准超過 200 字 (繁體中文,含標點符號)

【輸出格式】
- 直接輸出精簡後的完整文字
- 不要加解釋、不要加「以下是精簡版」這種客套話
- 保留所有換行 (\n) 結構, 段落分隔用 \n\n`;

function buildUserPrompt(req: ShortenRequest): string {
  const { content, targetLength = 200, title } = req;
  let titleSection = "";
  if (title) {
    titleSection = `【文章標題】\n${title}\n\n`;
  }
  return `${titleSection}【聖上原文 (字數 ${content.length})】\n${content}\n\n請精簡到 ${targetLength} 字以內, 意思與原文相同, 保留事實/語氣/emoji/場景。`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ShortenRequest = await request.json();

    if (!body.content || !body.content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const targetLength = body.targetLength ?? 200;

    // 短文不處理 (避免 LLM 浪費 token)
    if (body.content.length <= targetLength) {
      return NextResponse.json({
        shortenedText: body.content,
        originalLength: body.content.length,
        shortenedLength: body.content.length,
        skipped: true,
      });
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
        temperature: 0.3, // 精簡任務要低溫, 保持精準
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[shorten-post] MiniMax API error:", res.status, errText.slice(0, 500));

      if (res.status === 429 || res.status >= 500) {
        return NextResponse.json({
          shortenedText: body.content,
          originalLength: body.content.length,
          shortenedLength: body.content.length,
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

    // 寬鬆檢查: 如果超過 targetLength * 1.2, 警告但仍回傳 (信任 LLM 結果)
    const overflow = shortenedText.length > targetLength * 1.2;

    return NextResponse.json({
      shortenedText,
      originalLength: body.content.length,
      shortenedLength: shortenedText.length,
      overflow,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[shorten-post] error:", e);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

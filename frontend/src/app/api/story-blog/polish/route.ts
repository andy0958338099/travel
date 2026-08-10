import { NextRequest, NextResponse } from "next/server";
import { formatItineraryForLLM } from "@/lib/ai/itinerary";

export const runtime = "nodejs";
// 30s Netlify function ceiling, 跟 polish-d1 一樣 (聖上 USER 偏好)

/**
 * 🆕 2026-08-10 聖上拍板: 故事內容 LLM 潤飾
 *
 * 複用 8-9 聖上拍板的「絕對禁止虛構」prompt 規則 (跟 polish-d1 同一個 LLM infra + 同一個禁虛構 mindset):
 *   - 保留聖上原文事實/人名/時間/地點/EXIF
 *   - 圖片 ![](url) 必須完整保留
 *   - 禁虛構人物動作
 *   - 禁寫聖上原文沒有的場景細節
 *   - 禁新增 LOCK marker / 禁虛構行程
 *
 * Body: { originalText: string, title?: string, dayNumber?: number, seed?: number }
 *   - seed: 重試按鈕用, 強制 LLM 重新生成 (放進 prompt 當作「再寫一版不同措辭」指令)
 * Response: { polishedText: string, fallback?: boolean, warning?: string }
 *
 * 跟 polish-d1 差別:
 *   - 這支專門給「單筆 post」潤飾 (短文 200-1000 字)
 *   - 沒有 LOCK marker 邏輯 (聖上自己判斷要不要鎖)
 *   - max_tokens 縮到 1500 (短文不需要 4000)
 *   - temperature 0.85 (比 polish-d1 高 — 鼓勵重新措辭, 跟「再寫一版」按鈕搭配)
 */

const MINIMAX_URL = "https://api.minimax.io/v1/chat/completions";
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

const SYSTEM_PROMPT = `你是一位中文旅遊部落格編輯。

聖上寫的是「親友視角的旅遊口述記錄」— 平凡、隨性、有感情, 不是作家散文。
你的工作是「潤飾 + 微擴寫」, 把聖上寫的平淡事實串成可讀的段落, **不是改成作家文風**。

# 邊界 (8-9 聖上拍板, 慘案修法)

【絕對禁止虛構清單】
❌ 不准虛構人物動作 (「Brian 抬起手」「大宇按下快門」「點名板被勾選」, 除非聖上原文有寫)
❌ 不准虛構對白 / 內心獨白
❌ 不准虛構事件因果
❌ 不准用「你知道這地名就寫」推測常識細節 (例: 「外灘的時鐘樓」「萬國建築博覽群的輪廓」— 除非聖上原文寫)
❌ 不准新增圖片 URL (聖上原文的 ![](url) 完整保留, 不刪)

【唯一能寫的】
✅ 聖上原文的事實 + 潤飾 (措辭更順、串接更順、句構微調)
✅ 用「事實串場」例: 「下午 02:15, Brian 在南京東路步行街拍下 IMG_2200.jpg」 — 這是事實, OK

# 風格指引
- 用第二人稱「你」或第三人稱「聖上」皆可, 跟原文一致
- 段落長度: 1-3 句一段, 不要長篇大論
- 句尾不用「。」以外的標點 (不寫「！」「?」除非原文就有)
- 潤飾幅度: 20-40% (不要大改, 不要照抄)

# 輸出格式
- 純文字 (Markdown 可, 但不要加任何 LOCK marker / 標題)
- 如果聖上原文有「![](url)」圖片語法, 完整保留在原位
- 不要加任何前綴 (例: 「以下是潤飾版本:」) — 直接給潤飾後文字
`;

function buildUserPrompt(body: { originalText: string; title?: string; dayNumber?: number; seed?: number }): string {
  const lines: string[] = [];
  if (body.title) lines.push(`【小標題】${body.title}`);
  if (typeof body.dayNumber === "number") {
    lines.push(body.dayNumber === 0 ? "【章節】前言" : body.dayNumber === 9 ? "【章節】後記" : `【章節】第 ${body.dayNumber} 天`);
  }
  // 🆕 8-10 聖上拍板: 串入當天行程 (LLM 潤飾時參考時段錨點, 不瞎編)
  if (typeof body.dayNumber === "number") {
    const itinerarySection = formatItineraryForLLM(body.dayNumber);
    if (itinerarySection) {
      lines.push("");
      lines.push(itinerarySection);
    }
  }
  lines.push(`【聖上原文】`);
  lines.push(body.originalText);
  if (body.seed && body.seed > 0) {
    lines.push("");
    lines.push(`【重試 seed: ${body.seed}】這是第 ${(body.seed % 99) + 1} 次潤飾, 請用不同措辭, 給聖上另一個版本選擇。`);
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.originalText || !body.originalText.trim()) {
      return NextResponse.json({ error: "originalText is required" }, { status: 400 });
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
        temperature: body.seed ? 0.95 : 0.7,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[polish-story] MiniMax API error:", res.status, errText.slice(0, 500));
      // 429/5xx → fallback 回原文 + 警告, 前端降級用原文
      if (res.status === 429 || res.status >= 500) {
        return NextResponse.json({
          polishedText: body.originalText,
          fallback: true,
          warning: `LLM API ${res.status}, 使用原文`,
        });
      }
      return NextResponse.json({ error: `MiniMax ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    let polishedText = data?.choices?.[0]?.message?.content ?? "";

    if (!polishedText.trim()) {
      return NextResponse.json({
        polishedText: body.originalText,
        fallback: true,
        warning: "empty LLM response",
      });
    }

    // 清理: 去掉 LLM 偶爾加的引號包裹 / 思考標籤 / 前綴說明
    polishedText = polishedText
      .replace(/^["「『]/, "")
      .replace(/["」』]$/, "")
      // 去掉 <think>...</think> 思考區塊 (MiniMax 預設回傳)
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      // 去掉 LLM 偶爾加的「以下是潤飾版本:」「潤飾後:」等前綴
      .replace(/^(以下是潤飾後的版本[::]\s*\n?)/i, "")
      .replace(/^(潤飾後[::]\s*\n?)/i, "")
      .trim();

    // 保險: 確認聖上原文所有 ![](url) 行都還在, 缺的話補回末尾
    const originalImages = (body.originalText.match(/!\[[^\]]*\]\([^)]+\)/g) || []);
    const polishedImages = (polishedText.match(/!\[[^\]]*\]\([^)]+\)/g) || []);
    if (originalImages.length > 0 && polishedImages.length < originalImages.length) {
      const missing: string[] = originalImages.filter((img: string) => !polishedText.includes(img));
      if (missing.length > 0) {
        polishedText = polishedText + "\n\n" + missing.join("\n");
      }
    }

    return NextResponse.json({ polishedText });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[polish-story] error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

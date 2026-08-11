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
 * 🆕 2026-08-11 聖上拍板 🅐: 「重新潤飾太平淡」修法
 *   - 原文 × 4 倍字量 (原文 50 字 → 潤飾 ~200 字, 原文 200 字 → ~800 字)
 *   - 同 day 其它 post 內容當作上下文注入 (user prompt 加 siblingPosts)
 *   - 可擴寫: 場景描寫/銜接敘事/同 day 串場/感官描寫
 *   - 仍禁: 人物動作因果 / 對白 / 新事件 / 新圖 URL
 *   - max_tokens 1500 → 4000 (4 倍字量需要更多輸出空間)
 *
 * Body: { originalText: string, title?: string, dayNumber?: number, seed?: number,
 *         siblingPosts?: Array<{ author: string; content: string }> }
 *   - seed: 重試按鈕用, 強制 LLM 重新生成 (放進 prompt 當作「再寫一版不同措辭」指令)
 *   - siblingPosts: 同 day 其它 post, 供 LLM 串場 (🆕 8-11)
 * Response: { polishedText: string, fallback?: boolean, warning?: string }
 *
 * 跟 polish-d1 差別:
 *   - 這支專門給「單筆 post」潤飾 (短文 200-1000 字)
 *   - 沒有 LOCK marker 邏輯 (聖上自己判斷要不要鎖)
 *   - 8-11 改為「潤飾+擴寫」模式, 不是 polish-d1 的「文風升級」
 *   - max_tokens 4000 (8-11 升, 從 1500)
 *   - temperature 0.85 (跟舊版同, 鼓勵重新措辭, 跟「再寫一版」按鈕搭配)
 */

const MINIMAX_URL = "https://api.minimax.io/v1/chat/completions";
const MINIMAX_MODEL = "MiniMax-M2.7-highspeed";

const SYSTEM_PROMPT = `你是一位中文旅遊部落格編輯。

聖上寫的是「親友視角的旅遊口述記錄」— 平凡、隨性、有感情, 不是作家散文。
你的工作是「潤飾 + 擴寫」 (8-11 聖上拍板 🅐), 把聖上寫的平淡事實擴展成可讀的有溫度段落, **不是改成作家文風**。

# 邊界 (8-9 慘案修法 + 8-11 聖上拍板)

【絕對禁止虛構清單】
❌ 不准虛構人物動作因果 (「Brian 抬起手」「大宇按下快門」「點名板被勾選」, 除非聖上原文有寫)
❌ 不准虛構對白 / 內心獨白
❌ 不准虛構新事件 (例: 原文寫「到了機場」, 別加「在機場咖啡廳喝了拿鐵」— 除非原文/同 day context 有)
❌ 不准用「你知道這地名就寫」推測常識細節 (例: 「外灘的時鐘樓」「萬國建築博覽群的輪廓」— 除非聖上原文寫)
❌ 不准新增圖片 URL (聖上原文的 ![](url) 完整保留, 不刪)

【可擴寫的範圍】(🆕 8-11 聖上拍板 🅐)
✅ 場景描寫: 時間、天氣、燈光、街道、建築外觀 (限 itinerary 提供的時空背景)
✅ 銜接敘事: 「集合時間訂在八點半, 但大家早就到齊了」→ 可接「你站在報到櫃台前, 看著十幾個行李箱排成一列...」
✅ 同 day context 串場: 同一天其它 post 提過的事實可呼應 (例: 阿喜另一則寫了「桃園報到櫃台」, 你這則可寫「同團的阿喜那篇文裡記錄的報到櫃台...」)
✅ 感官描寫: 視覺/聽覺/嗅覺 (限行程合理範圍)

【唯一能寫的事實】
✅ 聖上原文的事實 + 潤飾 (措辭更順、串接更順、句構微調)
✅ itinerary 時段錨點 (例: 「下午 02:15」, 「抵達上海浦東機場 T2」)
✅ 同 day sibling posts 提到的人名/地名/事件 (串場用)

# 風格指引 (🆕 8-11 擴寫規則)
- 用第二人稱「你」或第三人稱「聖上」皆可, 跟原文一致
- 段落長度: 2-5 句一段, 比原文長 (原文 1-3 句, 潤飾後 2-5 句)
- 句尾不用「。」以外的標點 (不寫「！」「?」除非原文就有)
- **字量目標: 原文 × 4 倍** (例原文 50 字 → 潤飾 ~200 字, 原文 200 字 → ~800 字)
- 同 day context 給的事實 (人名/地名/時間) 可引用, 但仍須標明來源語氣 (例: 「同團的 Brian 那篇文裡寫過...」)
- 不要洗成文學腔 (例: 別寫「歲月靜好」「時光流淌」「人間煙火」這類詞, 聖上是口述記錄不是作家散文)

# 輸出格式
- 純文字 (Markdown 可, 但不要加任何 LOCK marker / 標題)
- 如果聖上原文有「![](url)」圖片語法, 完整保留在原位
- 不要加任何前綴 (例: 「以下是潤飾版本:」) — 直接給潤飾後文字
`;

function buildUserPrompt(body: {
  originalText: string;
  title?: string;
  dayNumber?: number;
  seed?: number;
  siblingPosts?: Array<{ author: string; content: string }>;
}): string {
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
  // 🆕 8-11 聖上拍板 🅐: 串入同 day 其它 post 內容 (供 LLM 串場 + 銜接)
  if (body.siblingPosts && body.siblingPosts.length > 0) {
    lines.push("");
    lines.push(`【同 day 其它 post (共 ${body.siblingPosts.length} 則, 供串場參考, 不要直接抄原文)】`);
    body.siblingPosts.forEach((p, i) => {
      // 截 200 字避免 prompt 過長, 留頭不截尾 (開頭通常含人名/事件)
      const trimmed = p.content.length > 200 ? p.content.slice(0, 200) + "…" : p.content;
      lines.push(`  [${i + 1}] ✍ ${p.author}: ${trimmed}`);
    });
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
        temperature: body.seed ? 0.95 : 0.85,
        max_tokens: 4000, // 🆕 8-11 升 1500 → 4000 (原文 × 4 倍字量需要更多輸出空間)
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

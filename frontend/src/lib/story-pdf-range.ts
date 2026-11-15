/**
 * PDF range 參數解析（獨立成 module，避免把 puppeteer 拖進不需要它的 route）
 *
 * 抽出原因：story-pdf.ts 會 import puppeteer（devDependency，線上 serverless 沒裝），
 *   只要任何 route 頂層 import story-pdf.ts，整個 route 在載入時就爆 → HTTP 500。
 *   純函式拆出來後，只有真的要生成 PDF 的地方才需要 puppeteer。
 */

/**
 * 解析 range query:
 *   - ?range=1-10       → 第 1-10 頁
 *   - ?range=full       → 全部頁 (不傳 pageRanges)
 *   - ?range=1          → 單頁 (cover)
 */
export function parseRange(raw: string | null): {
  pageRanges?: string;
  filename: string;
} {
  if (!raw || raw === "full") {
    return { filename: "story-blog-A5-full.pdf" };
  }
  const m = raw.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) {
    return { filename: "story-blog-A5-full.pdf" };
  }
  const s = +m[1];
  const e = m[2] ? +m[2] : +m[1];
  if (e < s) {
    return { filename: "story-blog-A5-full.pdf" };
  }
  if (s === e) {
    return {
      pageRanges: String(s),
      filename: `story-blog-A5-${String(s).padStart(3, "0")}.pdf`,
    };
  }
  return {
    pageRanges: `${s}-${e}`,
    filename: `story-blog-A5-${String(s).padStart(3, "0")}-${String(e).padStart(3, "0")}.pdf`,
  };
}


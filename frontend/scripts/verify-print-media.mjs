// 🆕 2026-11-14: 用「列印媒體」重跑版面量測
//   PDF 是 Chrome 用 print media 產生的 → 預覽(screen)的量測不能代表 PDF
//   這支腳本 emulateMediaType('print') 後再量,確認 PDF 實際版面。
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = process.argv[2] || "8zd9x39j";

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 });
await p.emulateMediaType("print");
await p.goto(`${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await p
  .waitForFunction(
    () => {
      const root = document.querySelector(".print-book-screen");
      if (!root) return false;
      if (!root.querySelector(".print-book-mode-b-pair-page")) return true;
      return root.getAttribute("data-layout-ready") === "1";
    },
    { timeout: 60000, polling: 300 },
  )
  .catch(() => console.log("⚠️ layout-ready 未出現"));
await new Promise((x) => setTimeout(x, 4000));

const res = await p.evaluate(() => {
  const out = { pages: [], singles: 0, doubles: 0, clipped: [], overflowPx: [] };
  document.querySelectorAll(".print-book-page").forEach((pg, i) => {
    const cells = pg.querySelectorAll(".print-book-b-cell");
    if (!cells.length) return;
    const pgRect = pg.getBoundingClientRect();
    const info = { idx: i + 1, n: cells.length, cells: [] };
    Array.from(cells).forEach((c) => {
      const t = c.querySelector(".print-book-post-text");
      const cRect = c.getBoundingClientRect();
      let clipped = false;
      let scroll = 0;
      let visible = 0;
      let pt = 0;
      if (t) {
        scroll = t.scrollHeight;
        visible = t.clientHeight;
        pt = parseFloat(getComputedStyle(t).fontSize);
        if (scroll > visible + 3) clipped = true;
        const clamp = getComputedStyle(t).webkitLineClamp;
        if (clamp && clamp !== "none") clipped = true;
      }
      if (clipped)
        out.clipped.push({
          page: info.idx,
          id: c.dataset.postId,
          scroll,
          visible,
          pt: +pt.toFixed(2),
        });
      // 內容是否超出頁面
      const over = Math.round(cRect.bottom - pgRect.bottom);
      if (over > 2)
        out.overflowPx.push({ page: info.idx, over, id: c.dataset.postId });
      info.cells.push({
        id: c.dataset.postId,
        pt: +pt.toFixed(2),
        cellH: Math.round(cRect.height),
        scroll,
        visible,
      });
    });
    if (info.n === 1) out.singles++;
    else if (info.n === 2) out.doubles++;
    out.pages.push(info);
  });
  return out;
});

console.log(`【列印媒體】內容頁=${res.pages.length} 2則頁=${res.doubles} 1則頁=${res.singles}`);
console.log("文字被裁格數:", res.clipped.length, JSON.stringify(res.clipped.slice(0, 8)));
console.log("超出頁面的格數:", res.overflowPx.length, JSON.stringify(res.overflowPx.slice(0, 8)));
const all = res.pages.flatMap((x) => x.cells);
const minPt = Math.min(...all.map((c) => c.pt));
console.log(
  "最小字級:",
  minPt,
  "px =",
  (minPt * 0.75).toFixed(2),
  "pt / 最大:",
  Math.max(...all.map((c) => c.pt)) * 0.75,
  "pt",
);
const ph = all.map((c) => c.cellH);
console.log(
  "格高 min/max/avg:",
  Math.min(...ph),
  Math.max(...ph),
  Math.round(ph.reduce((a, b) => a + b, 0) / ph.length),
);
fs.writeFileSync("/tmp/verify-print-media.json", JSON.stringify(res, null, 2));
await b.close();

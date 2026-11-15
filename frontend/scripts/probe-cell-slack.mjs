// 量測 mode B 每格「內容底部 → 格底」的留白(分辨:是格間距大,還是格內留白大)
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}

const slug = process.argv[2] || "3skc6sdm";
const url = `http://localhost:3000/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1400, deviceScaleFactor: 1 });
await page.emulateMediaType("print");
await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForSelector('[data-layout-ready="1"]', { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const rows = await page.evaluate(() => {
  const A = 96 / 25.4;
  const out = [];
  document
    .querySelectorAll(".print-book-mode-b-pair-page.has-two")
    .forEach((sec, pi) => {
      sec.querySelectorAll(".print-book-b-cell").forEach((cell, ci) => {
        const cr = cell.getBoundingClientRect();
        const text = cell.querySelector(".print-book-post-text");
        const img = cell.querySelector(".print-book-post-image");
        const foot = cell.querySelector(".print-book-post-footer");
        const tr = text ? text.getBoundingClientRect() : null;
        const ir = img ? img.getBoundingClientRect() : null;
        const fr = foot ? foot.getBoundingClientRect() : null;
        // 內容底 = max(文字底, 圖底, footer 底)
        const bottoms = [tr?.bottom, ir?.bottom, fr?.bottom].filter(
          (v) => typeof v === "number",
        );
        const contentBottom = bottoms.length ? Math.max(...bottoms) : cr.top;
        out.push({
          page: pi + 1,
          cell: ci + 1,
          cellH: Math.round(cr.height),
          pt: text?.dataset.adaptiveFontPt,
          contentBottomToCellBottomMm: +((cr.bottom - contentBottom) / A).toFixed(2),
          textBottomToCellBottomMm: tr
            ? +((cr.bottom - tr.bottom) / A).toFixed(2)
            : null,
          imgBottomToCellBottomMm: ir
            ? +((cr.bottom - ir.bottom) / A).toFixed(2)
            : null,
        });
      });
    });
  return out;
});

console.log("=== 每格內容底 → 格底 的留白 ===");
let worst = 0;
for (const r of rows) {
  worst = Math.max(worst, r.contentBottomToCellBottomMm);
  console.log(
    `頁${r.page} 格${r.cell} 格高=${r.cellH}px 字級=${r.pt}pt | 內容底距格底=${r.contentBottomToCellBottomMm}mm (文字:${r.textBottomToCellBottomMm} 圖:${r.imgBottomToCellBottomMm})`,
  );
}
console.log("最大留白:", worst, "mm");

await browser.close();

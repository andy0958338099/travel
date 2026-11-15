// 量測 mode B 每格:照片底緣 → 格底 的距離(確認照片沒有壓到分隔線)
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
        const img = cell.querySelector(".print-book-post-image");
        const foot = cell.querySelector(".print-book-post-footer");
        const fr = foot ? foot.getBoundingClientRect() : null;
        const ir = img ? img.getBoundingClientRect() : null;
        out.push({
          page: pi + 1,
          cell: ci + 1,
          shape: cell.className.match(/is-(portrait|landscape|square)/)?.[1],
          cellH: Math.round(cr.height),
          imgH: ir ? Math.round(ir.height) : null,
          // 照片底 → 格底
          imgToCellBottomMm: ir
            ? +((cr.bottom - ir.bottom) / A).toFixed(2)
            : null,
          // 照片底 → footer 底(文字與照片是否交疊)
          imgToFooterBottomMm: ir && fr ? +((fr.bottom - ir.bottom) / A).toFixed(2) : null,
          footerH: fr ? Math.round(fr.height) : null,
        });
      });
    });
  return out;
});

console.log("=== 照片底緣與格底/footer 的關係 ===");
for (const r of rows) {
  console.log(
    `頁${r.page} 格${r.cell} ${r.shape} 格高=${r.cellH}px 圖高=${r.imgH}px | 圖底距格底=${r.imgToCellBottomMm}mm | 圖底距footer底=${r.imgToFooterBottomMm}mm`,
  );
}
await browser.close();

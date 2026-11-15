// 量測 mode B 同一頁兩則故事之間的實際間距 + 確認頁面已無重複作者名
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

const out = await page.evaluate(() => {
  const A = 96 / 25.4;
  const pages = Array.from(
    document.querySelectorAll(".print-book-mode-b-pair-page.has-two"),
  );
  const gaps = [];
  for (const sec of pages) {
    const cells = Array.from(sec.querySelectorAll(".print-book-b-cell"));
    if (cells.length !== 2) continue;
    const r0 = cells[0].getBoundingClientRect();
    const r1 = cells[1].getBoundingClientRect();
    const cs0 = getComputedStyle(cells[0]);
    const cs1 = getComputedStyle(cells[1]);
    const title1 = cells[1].querySelector(".print-book-post-title");
    const tr = title1 ? title1.getBoundingClientRect() : null;
    const line = cells[1].getBoundingClientRect().top; // border-top 位置
    gaps.push({
      page: pages.indexOf(sec) + 1,
      // 兩格「邊框之間」的實際空白
      gapPx: +(r1.top - r0.bottom).toFixed(1),
      gapMm: +((r1.top - r0.bottom) / A).toFixed(2),
      m0Bottom: cs0.marginBottom,
      m1Top: cs1.marginTop,
      borderTop: cs1.borderTopWidth,
      titleMarginTop: title1 ? getComputedStyle(title1).marginTop : null,
      titleGapFromLineMm: tr ? +((tr.top - line) / A).toFixed(2) : null,
    });
  }
  const footers = Array.from(
    document.querySelectorAll(".print-book-b-cell .print-book-post-footer"),
  ).map((f) => f.textContent.trim());
  const authorNames = (document.body.innerText.match(/阿喜|阿分|義伸/g) || [])
    .length;
  const pageText = document.body.innerText;
  return {
    gaps,
    footers,
    authorNameHitsInBody: authorNames,
    bodyHasAuthorLabel: pageText.includes("✍"),
    sampleFooter: footers.slice(0, 4),
  };
});

console.log("=== 兩則之間的實際間距 ===");
for (const g of out.gaps) {
  console.log(
    `頁${g.page} 間距=${g.gapMm}mm (${g.gapPx}px) | m0.bottom=${g.m0Bottom} m1.top=${g.m1Top} border=${g.borderTop} | 標題距細線=${g.titleGapFromLineMm}mm`,
  );
}
console.log("\n=== footer 內容(前 6 個)===");
console.log(out.sampleFooter.join(" | "));
console.log("\n=== 頁面是否還有作者名/筆icon ===");
console.log("作者名出現次數:", out.authorNameHitsInBody);
console.log("含 ✍ :", out.bodyHasAuthorLabel);

await browser.close();

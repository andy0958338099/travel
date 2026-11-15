// 量測單故事尾頁的「頁面級」幾何:頁高、padding、cell 高度、剩餘空白
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = process.argv[2] || "8zd9x39j";
const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300 });
await p.goto(
  `${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`,
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

const res = await p.evaluate(() => {
  const sec = document.querySelector(".print-book-mode-b-pair-page.is-single");
  const cell = sec.querySelector(".print-book-b-cell");
  const page = sec;
  const A = 96 / 25.4;
  const cs = getComputedStyle(page);
  const cellCs = getComputedStyle(cell);
  const mm = (px) => +(px / A).toFixed(1);
  const pageRect = page.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const parts = [];
  cell.querySelectorAll(":scope > *").forEach((el) => {
    const r = el.getBoundingClientRect();
    parts.push({
      cls: el.className.toString().slice(0, 50),
      top_mm: mm(r.top - pageRect.top),
      bottom_mm: mm(r.bottom - pageRect.top),
      h_mm: mm(r.height),
    });
  });
  return {
    pageH_mm: mm(pageRect.height),
    pageW_mm: mm(pageRect.width),
    paddingTop_mm: mm(parseFloat(cs.paddingTop)),
    paddingBottom_mm: mm(parseFloat(cs.paddingBottom)),
    cellH_mm: mm(cellRect.height),
    cellCssHeight: cellCs.height,
    cellTop_mm: mm(cellRect.top - pageRect.top),
    cellBottom_mm: mm(cellRect.bottom - pageRect.top),
    頁底空白_mm: mm(pageRect.bottom - cellRect.bottom),
    parts,
  };
});
console.log(JSON.stringify(res, null, 2));
await b.close();

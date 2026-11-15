// 量測奇數尾頁(單故事頁)的實際幾何:內容佔用 vs 頁面高度
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

const info = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll(".print-book-mode-b-pair-page").forEach((sec, i) => {
    const cell = sec.querySelector(".print-book-b-cell");
    if (!cell) return;
    const img = cell.querySelector(".print-book-post-image");
    const title = cell.querySelector(".print-book-post-title");
    const text = cell.querySelector(".print-book-post-text");
    const footer = cell.querySelector(".print-book-post-footer");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        top: +b.top.toFixed(1),
        bottom: +b.bottom.toFixed(1),
        h: +b.height.toFixed(1),
        w: +b.width.toFixed(1),
      };
    };
    out.push({
      idx: i,
      single: sec.classList.contains("is-single"),
      cell: r(cell),
      title: r(title),
      img: r(img),
      text: r(text),
      footer: r(footer),
      chars: text ? text.textContent.trim().length : 0,
      fs: text ? getComputedStyle(text).fontSize : "",
      imgNatural: img
        ? `${img.naturalWidth}x${img.naturalHeight}`
        : "",
      imgStyle: img ? img.getAttribute("style") : "",
    });
  });
  return out;
});
const singles = info.filter((x) => x.single);
console.log("總 pair page:", info.length, "單故事頁:", singles.length);
console.log(JSON.stringify(singles, null, 2));
await b.close();

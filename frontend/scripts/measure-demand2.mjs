/**
 * 量測 mode B 每格在「9pt 最低字級」下的自然高度需求 (cell height:auto)
 * 並輸出 /tmp/demand2.json 給分組演算法使用。
 */
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000";
const slug = process.argv[2] || "8zd9x39j";

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 800, height: 1200, deviceScaleFactor: 1 });
await p.goto(`${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await new Promise((x) => setTimeout(x, 15000));

await p.evaluate(async () => {
  const pages = Array.from(document.querySelectorAll(".print-book-page"));
  for (const pg of pages) {
    pg.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 40));
  }
});
await new Promise((x) => setTimeout(x, 4000));

const rows = await p.evaluate(() => {
  const st = document.createElement("style");
  st.id = "measure-mode";
  st.textContent = [
    ".print-book-mode-b-pair-page .print-book-b-cell { height: auto !important; overflow: visible !important; }",
    ".print-book-mode-b-pair-page .print-book-b-cell .print-book-post-text { font-size: 9pt !important; line-height: 1.65 !important; }",
    ".print-book-mode-b-pair-page .print-book-b-cell .print-book-post-title { font-size: 12pt !important; }",
  ].join("\n");
  document.head.appendChild(st);

  const out = [];
  document.querySelectorAll(".print-book-b-cell").forEach((cell) => {
    const t = cell.querySelector(".print-book-post-text");
    const title = cell.querySelector(".print-book-post-title");
    const wrap = cell.querySelector(".print-book-post-text-wrap");
    const img = cell.querySelector(".print-book-post-image");
    const day = cell.querySelector(".print-book-day-header");
    const foot = cell.querySelector(".print-book-post-footer");
    if (!t || !wrap) return;
    t.style.display = "block";
    t.style.webkitLineClamp = "unset";
    t.style.webkitBoxOrient = "initial";
    const px = (n) => (n ? n.getBoundingClientRect().height : 0);
    const wrapH = wrap.getBoundingClientRect().height;
    const imgH = img ? img.getBoundingClientRect().height + 8 : 0;
    const nat = img ? img.naturalWidth / img.naturalHeight : 0;
    out.push({
      id: cell.dataset.postId,
      chars: t.textContent.trim().length,
      natural: Math.round(cell.getBoundingClientRect().height),
      titleH: Math.round(px(title)),
      wrapH: Math.round(wrapH),
      imgH: Math.round(imgH),
      dayH: Math.round(px(day)),
      footH: Math.round(px(foot)),
      ratio: nat ? +nat.toFixed(4) : 0,
      shape: cell.className,
    });
  });
  return out;
});

fs.writeFileSync("/tmp/demand2.json", JSON.stringify(rows, null, 1));
const chars = rows.map((r) => r.chars);
const nat = rows.map((r) => r.natural);
console.log("格數:", rows.length);
console.log("自然高度 min/max/avg:", Math.min(...nat), Math.max(...nat), Math.round(nat.reduce((a, x) => a + x, 0) / nat.length));
console.log("總自然高:", nat.reduce((a, x) => a + x, 0), "px");
console.log("字數 min/max:", Math.min(...chars), Math.max(...chars));
await b.close();

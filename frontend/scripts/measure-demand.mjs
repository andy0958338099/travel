import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = "8zd9x39j";
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
await new Promise((x) => setTimeout(x, 12000));

const rows = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll(".print-book-b-cell").forEach((cell) => {
    const id = cell.getAttribute("data-post-id");
    const text = cell.querySelector(".print-book-post-text");
    if (!text) return;
    // 解除 clamp,量 9pt 下的真實文字高度
    const cs = getComputedStyle(text);
    const saved = {
      display: cs.display,
      clamp: cs.webkitLineClamp,
      orient: cs.webkitBoxOrient,
      overflow: cs.overflow,
    };
    text.style.display = "block";
    text.style.webkitLineClamp = "unset";
    text.style.webkitBoxOrient = "initial";
    text.style.overflow = "visible";
    text.style.fontSize = "9pt";
    text.style.lineHeight = "1.65";
    const textH = text.scrollHeight;
    text.style.display = saved.display;
    text.style.webkitLineClamp = saved.clamp;
    text.style.webkitBoxOrient = saved.orient;
    text.style.overflow = saved.overflow;

    const box = (n) => {
      if (!n) return 0;
      const s = getComputedStyle(n);
      return (
        n.offsetHeight +
        (parseFloat(s.marginTop) || 0) +
        (parseFloat(s.marginBottom) || 0)
      );
    };
    const title = cell.querySelector(".print-book-post-title");
    const footer = cell.querySelector(".print-book-post-footer");
    const dayHdr = cell.querySelector(".print-book-day-header");
    const overhead =
      box(title) + box(footer) + box(dayHdr);
    const chars = (text.textContent || "").length;
    out.push({ id, chars, textH, overhead, day: cell.getAttribute("data-day") });
  });
  return out;
});
await b.close();
fs.writeFileSync("/tmp/post-demand.json", JSON.stringify(rows, null, 1));
console.log("cells:", rows.length);
console.log(
  rows
    .slice(0, 5)
    .map((r) => `chars=${r.chars} textH=${r.textH} oh=${r.overhead}`)
    .join("\n")
);

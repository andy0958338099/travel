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

// 注入:把所有 cell 強制成「雙故事版面」幾何,量出每篇在配對頁的真實需求
await p.addStyleTag({
  content: `
  .print-book-mode-b-pair-page.is-single { padding-top: 6mm !important; }
  .print-book-mode-b-pair-page.is-single .print-book-b-cell {
    height: 302px !important;
    display: block !important;
    justify-content: flex-start !important;
  }
  .print-book-mode-b-pair-page.is-single .print-book-b-cell .print-book-post-image {
    width: 48mm !important;
    max-width: 48mm !important;
    max-height: 62mm !important;
    float: left !important;
    margin: 0 3mm 2mm 0 !important;
  }
  .print-book-mode-b-pair-page.is-single .print-book-b-cell .print-book-post-title {
    font-size: 12pt !important;
    margin: 0 0 1.5mm !important;
  }
  .print-book-mode-b-pair-page.is-single .print-book-b-cell .print-book-post-text {
    line-height: 1.65 !important;
  }
  .print-book-mode-b-pair-page.is-single .print-book-b-cell .print-book-post-footer {
    font-size: 7.5pt !important;
  }
  `,
});
await new Promise((x) => setTimeout(x, 1500));

const rows = await p.evaluate(() => {
  const out = [];
  const box = (n) => {
    if (!n) return 0;
    const s = getComputedStyle(n);
    return (
      n.offsetHeight +
      (parseFloat(s.marginTop) || 0) +
      (parseFloat(s.marginBottom) || 0)
    );
  };
  document.querySelectorAll(".print-book-b-cell").forEach((cell) => {
    const text = cell.querySelector(".print-book-post-text");
    if (!text) return;
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

    const title = cell.querySelector(".print-book-post-title");
    const footer = cell.querySelector(".print-book-post-footer");
    const dayHdr = cell.querySelector(".print-book-day-header");
    const img = cell.querySelector(".print-book-post-image");
    const ratio = img ? Number(img.dataset.imgRatio || 0) : 0;
    out.push({
      id: cell.getAttribute("data-post-id"),
      chars: (text.textContent || "").length,
      textH,
      titleH: box(title),
      footerH: box(footer),
      dayHdrH: box(dayHdr),
      ratio,
      title: (title?.textContent || "").trim().length,
    });
  });
  return out;
});
await b.close();
fs.writeFileSync("/tmp/pair-demand.json", JSON.stringify(rows, null, 1));
console.log("cells:", rows.length);
console.log(
  rows
    .slice(0, 6)
    .map(
      (r) =>
        `chars=${r.chars} textH=${r.textH} title=${r.titleH} foot=${r.footerH} day=${r.dayHdrH} ratio=${r.ratio}`,
    )
    .join("\n")
);

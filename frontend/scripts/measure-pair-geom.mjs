import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = "8zd9x39j";

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
});
const p = await b.newPage();
await p.setViewport({ width: 800, height: 1200, deviceScaleFactor: 1 });
await p.goto(
  `${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`,
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await new Promise((x) => setTimeout(x, 12000));

// 把「落單整頁」的幾何強制改回「雙故事格」幾何,
// 避免量到 float:none 的寬版(那會低估文字高度需求)。
await p.evaluate(() => {
  const st = document.createElement("style");
  st.id = "pair-geom";
  st.textContent = `
  .print-book-mode-b-pair-page .print-book-b-cell {
    height: auto !important;
    display: block !important;
    justify-content: flex-start !important;
  }
  .print-book-mode-b-pair-page .print-book-b-cell .print-book-post-image {
    float: left !important;
    width: 44mm !important;
    max-width: 44mm !important;
    height: auto !important;
    max-height: 56mm !important;
    margin: 0 3mm 2mm 0 !important;
    object-fit: contain !important;
  }
  .print-book-mode-b-pair-page.is-single .print-book-b-cell .print-book-post-image {
    float: left !important;
    width: 44mm !important;
    max-width: 44mm !important;
    height: auto !important;
    max-height: 56mm !important;
    margin: 0 3mm 2mm 0 !important;
  }
  .print-book-mode-b-pair-page .print-book-b-cell .print-book-post-title {
    font-size: 12pt !important;
  }
  .print-book-mode-b-pair-page .print-book-b-cell .print-book-post-text {
    line-height: 1.65 !important;
  }
  `;
  document.head.appendChild(st);
});
await new Promise((x) => setTimeout(x, 1500));

const rows = await p.evaluate(() => {
  const res = [];
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
    const title = cell.querySelector(".print-book-post-title");
    const footer = cell.querySelector(".print-book-post-footer");
    const img = cell.querySelector(".print-book-post-image");
    if (!text) return;
    const cs = getComputedStyle(text);
    const keep = {
      display: text.style.display,
      clamp: text.style.webkitLineClamp,
      orient: text.style.webkitBoxOrient,
      overflow: text.style.overflow,
      fs: text.style.fontSize,
      lh: text.style.lineHeight,
    };
    text.style.display = "block";
    text.style.webkitLineClamp = "unset";
    text.style.webkitBoxOrient = "initial";
    text.style.overflow = "visible";
    text.style.fontSize = "9pt";
    text.style.lineHeight = "1.65";
    const textH = text.scrollHeight;
    const textW = text.clientWidth;
    Object.assign(text.style, {
      display: keep.display,
      webkitLineClamp: keep.clamp,
      webkitBoxOrient: keep.orient,
      overflow: keep.overflow,
      fontSize: keep.fs,
      lineHeight: keep.lh,
    });
    res.push({
      id: cell.getAttribute("data-post-id"),
      chars: (text.textContent || "").trim().length,
      textH,
      textW,
      titleH: box(title),
      footerH: box(footer),
      imgH: img ? img.offsetHeight : 0,
      imgW: img ? img.offsetWidth : 0,
      ratio: img ? Number(img.dataset.imgRatio || 0) : 0,
    });
  });
  return res;
});
await b.close();
fs.writeFileSync("/tmp/pair-geom.json", JSON.stringify(rows));
console.log("cells:", rows.length);

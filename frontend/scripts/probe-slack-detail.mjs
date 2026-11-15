// 量測每一格的「留白來源」分解:cellH / reserved / textMaxH / 實際文字高 / 各元素底
import puppeteer from "puppeteer-core";
import { setTimeout as sleep } from "node:timers/promises";

const slug = process.argv[2] ?? "3skc6sdm";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = `http://localhost:3000/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForSelector('[data-layout-ready="1"]', { timeout: 60000 });
await sleep(500);

const out = await page.evaluate(() => {
  const rows = [];
  const cells = document.querySelectorAll(
    ".print-book-mode-b-pair-page.has-two .print-book-b-cell",
  );
  let i = 0;
  for (const cell of cells) {
    i += 1;
    if (i > 4) break;
    const text = cell.querySelector(".print-book-post-text");
    const cellRect = cell.getBoundingClientRect();
    const tRect = text.getBoundingClientRect();
    const title = cell.querySelector(".print-book-post-title");
    const footer = cell.querySelector(".print-book-post-footer");
    const img = cell.querySelector(".print-book-post-image");
    const box = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        h: Math.round(r.height),
        mt: cs.marginTop,
        mb: cs.marginBottom,
        bottom: Math.round(r.bottom - cellRect.top),
      };
    };
    rows.push({
      idx: i,
      cellH: Math.round(cellRect.height),
      pt: text.dataset.adaptiveFontPt,
      textMaxH: text.dataset.adaptiveTextMaxH,
      reserved: text.dataset.adaptiveReservedH,
      fill: text.dataset.adaptiveFillRatio,
      textScrollH: text.scrollHeight,
      textBottom: Math.round(tRect.bottom - cellRect.top),
      title: box(title),
      footer: box(footer),
      img: box(img),
    });
  }
  return rows;
});

console.log(JSON.stringify(out, null, 1));
await browser.close();

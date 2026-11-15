import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = "8zd9x39j";

// 候選版面:圖欄寬度上限 / 直式圖高 / 行距
const CONFIGS = [
  { id: "base", cap: 48, ph: 62, lh: 1.65, tp: 12 },
  { id: "b", cap: 44, ph: 56, lh: 1.65, tp: 12 },
  { id: "c", cap: 42, ph: 52, lh: 1.6, tp: 12 },
  { id: "d", cap: 40, ph: 48, lh: 1.6, tp: 11 },
  { id: "e", cap: 38, ph: 44, lh: 1.55, tp: 11 },
];

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

const out = {};
for (const cfg of CONFIGS) {
  await p.evaluate((cfg) => {
    const id = "cfg-" + cfg.id;
    document.getElementById(id)?.remove();
    const st = document.createElement("style");
    st.id = id;
    st.textContent = `
    .print-book-mode-b-pair-page .print-book-b-cell { height: auto !important; }
    .print-book-mode-b-pair-page .print-book-b-cell .print-book-post-image {
      width: ${cfg.cap}mm !important;
      max-width: ${cfg.cap}mm !important;
      max-height: ${cfg.ph}mm !important;
    }
    .print-book-mode-b-pair-page .print-book-b-cell .print-book-post-title {
      font-size: ${cfg.tp}pt !important;
    }
    .print-book-mode-b-pair-page .print-book-b-cell .print-book-post-text {
      line-height: ${cfg.lh} !important;
    }
    `;
    document.head.appendChild(st);
  }, cfg);
  await new Promise((x) => setTimeout(x, 900));

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
      text.style.display = "block";
      text.style.webkitLineClamp = "unset";
      text.style.webkitBoxOrient = "initial";
      text.style.overflow = "visible";
      text.style.fontSize = "9pt";
      const textH = text.scrollHeight;
      text.style.display = cs.display;
      text.style.webkitLineClamp = cs.webkitLineClamp;
      text.style.webkitBoxOrient = cs.webkitBoxOrient;
      text.style.overflow = cs.overflow;
      res.push({
        id: cell.getAttribute("data-post-id"),
        chars: (text.textContent || "").length,
        textH,
        titleH: box(title),
        footerH: box(footer),
        ratio: img ? Number(img.dataset.imgRatio || 0) : 0,
      });
    });
    return res;
  });
  out[cfg.id] = rows;
  console.log(cfg.id, "cells:", rows.length);
}
await b.close();
fs.writeFileSync("/tmp/pair-configs.json", JSON.stringify(out));
console.log("saved");

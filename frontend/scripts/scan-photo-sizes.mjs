/**
 * 精準量測:每則故事在各種「照片縮放級距」下的 cell 內容需求高度
 *
 * 量法:
 *   - 直接用現有 DOM 的 cell (CSS/結構完全一致)
 *   - 暫時移除 cell 內的 day header (改由頁頂共用) → 量出「純內容需求」
 *   - 文字強制 9pt + line-height 1.65 (最低可讀字級)
 *   - 依 React 現況規則算照片尺寸,再乘縮放級距
 *
 * 輸出 /tmp/photo-scan.json 給 solve-layout.mjs 做分組求解。
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
const SCALES = [1, 0.85, 0.7, 0.55, 0.42];

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

// 等字型 ready
await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
await new Promise((x) => setTimeout(x, 1500));

// 捲動把所有圖逼進 viewport,並等全部 load
let loaded = 0;
for (let i = 0; i < 30 && loaded < 9999; i++) {
  loaded = await p.evaluate(async () => {
    const pages = Array.from(document.querySelectorAll(".print-book-page"));
    for (const pg of pages) {
      pg.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 20));
    }
    await new Promise((r) => setTimeout(r, 300));
    const imgs = Array.from(document.querySelectorAll(".print-book-post-image"));
    return imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
  });
  if (loaded >= 113) break;
}
const total = await p.evaluate(
  () => document.querySelectorAll(".print-book-post-image").length,
);
console.log(`圖片載入 ${loaded}/${total}`);
await new Promise((x) => setTimeout(x, 3000));

const out = await p.evaluate(async (SCALES) => {
  const st = document.createElement("style");
  st.id = "scan-style";
  st.textContent = [
    ".print-book-mode-b-pair-page .print-book-b-cell { height: auto !important; overflow: visible !important; }",
    ".print-book-mode-b-pair-page .print-book-b-cell .print-book-post-text { font-size: 9pt !important; line-height: 1.65 !important; }",
    ".print-book-mode-b-pair-page .print-book-b-cell .print-book-post-title { font-size: 12pt !important; }",
    ".print-book-mode-b-pair-page .print-book-b-cell .print-book-day-header { display: none !important; }",
  ].join("\n");
  document.head.appendChild(st);

  const cells = Array.from(document.querySelectorAll(".print-book-b-cell"));
  const base = cells.map((cell) => {
    const img = cell.querySelector(".print-book-post-image");
    const t = cell.querySelector(".print-book-post-text");
    const title = cell.querySelector(".print-book-post-title");
    const foot = cell.querySelector(".print-book-post-footer");
    const wrap = cell.querySelector(".print-book-post-text-wrap");
    const ratio = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 1;
    const shape = cell.classList.contains("is-portrait")
      ? "portrait"
      : cell.classList.contains("is-landscape")
        ? "landscape"
        : "square";
    return {
      cell,
      img,
      ratio,
      shape,
      id: cell.dataset.postId,
      chars: t ? t.textContent.trim().length : 0,
      title: title ? title.textContent.trim() : "",
      titleLen: title ? title.textContent.trim().length : 0,
      foot: foot,
      wrap: wrap,
    };
  });

  function photoSize(ratio, shape, s) {
    const baseH = shape === "landscape" ? 27 : shape === "square" ? 48 : 62;
    const h = baseH * s;
    let w = h * ratio;
    const cap = 48 * s;
    if (w > cap) w = cap;
    return { w, h: w / ratio };
  }

  const result = [];
  for (const s of SCALES) {
    for (const it of base) {
      if (it.img) {
        const { w, h } = photoSize(it.ratio, it.shape, s);
        it.img.style.width = w.toFixed(3) + "mm";
        it.img.style.height = h.toFixed(3) + "mm";
        it.img.style.maxWidth = "none";
        it.img.style.maxHeight = "none";
      }
      if (it.wrap) {
        it.wrap.style.overflow = "visible";
      }
      const t = it.cell.querySelector(".print-book-post-text");
      if (t) {
        t.style.display = "block";
        t.style.webkitLineClamp = "unset";
        t.style.webkitBoxOrient = "initial";
        t.style.overflow = "visible";
        t.style.fontSize = "9pt";
        t.style.lineHeight = "1.65";
      }
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 500));
    for (const it of base) {
      const nat = Math.round(it.cell.getBoundingClientRect().height);
      let rec = result.find((x) => x.id === it.id);
      if (!rec) {
        rec = {
          id: it.id,
          chars: it.chars,
          titleLen: it.titleLen,
          ratio: +it.ratio.toFixed(4),
          shape: it.shape,
          h: {},
        };
        result.push(rec);
      }
      rec.h[s] = nat;
      if (s === 1) {
        rec.wrapH = it.wrap ? Math.round(it.wrap.getBoundingClientRect().height) : 0;
        rec.titleH = it.cell.querySelector(".print-book-post-title")
          ? Math.round(it.cell.querySelector(".print-book-post-title").getBoundingClientRect().height)
          : 0;
        rec.imgH = it.img ? Math.round(it.img.getBoundingClientRect().height) : 0;
        rec.textH = it.cell.querySelector(".print-book-post-text")
          ? Math.round(it.cell.querySelector(".print-book-post-text").getBoundingClientRect().height)
          : 0;
      }
    }
  }
  return result;
}, SCALES);

fs.writeFileSync("/tmp/photo-scan.json", JSON.stringify(out, null, 1));
console.log("量測完成:", out.length, "則 ×", SCALES.length, "級距");
for (const s of SCALES) {
  const t = out.reduce((a, r) => a + r.h[s], 0);
  console.log(`  scale ${s}: 總需求 ${t}px (avg ${Math.round(t / out.length)}) max ${Math.max(...out.map((r) => r.h[s]))}`);
}
await b.close();

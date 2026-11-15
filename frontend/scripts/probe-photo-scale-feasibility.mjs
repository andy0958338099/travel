// 🆕 2026-11-14: 「照片放大 30% + 字自適應變小」可行性實測
//
//   問題:mode B 的照片是 float,寬度直接決定文字欄寬度。
//        照片欄寬 48mm → 文字欄 69mm;放大 30% → 62.4mm → 文字欄 54.6mm。
//        9pt 下 54.6mm 只剩 ~17 字/行 → 文字變高 → 格高變高 → 溢出。
//        而且 CSS 的 max-height:62mm / max-width:48mm 會夾住 inline 尺寸
//        (object-fit:contain 會在框內留白 → 照片反而沒變大)。
//
//   本腳本在真實瀏覽器裡量:
//     1) 每頁可用高度 avail (與 pair-layout.ts 同一套算法)
//     2) 每格在 (照片級距 scale, 字級 pt) 組合下的真實需求高度
//     3) 哪些 (scale, font) 組合放得下 → 決定可行的取捨
//
//   用法: node scripts/probe-photo-scale-feasibility.mjs <slug>
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = process.argv[2] || "3skc6sdm";

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 });
await p.emulateMediaType("print");
await p.goto(`${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await p
  .waitForFunction(
    () => document.querySelector(".print-book-screen")?.getAttribute("data-layout-ready") === "1",
    { timeout: 60000, polling: 300 },
  )
  .catch(() => console.log("⚠️ layout-ready 未出現"));

// 🆕 放寬 CSS 上限,否則量到的都是「被夾住」的尺寸
await p.evaluate(() => {
  const st = document.createElement("style");
  st.id = "probe-relax";
  st.textContent = `
    .print-book-b-cell .print-book-post-image {
      max-height: 90mm !important;
      max-width: 70mm !important;
    }`;
  document.head.appendChild(st);
});
await new Promise((x) => setTimeout(x, 1500));

const res = await p.evaluate(() => {
  const A = 96 / 25.4;
  const num = (v) => {
    const n = parseFloat(v ?? "");
    return Number.isFinite(n) ? n : 0;
  };
  // 與 pair-layout.ts 的 photoBaseMm 完全一致
  const photoBaseMm = (ratio, shape) => {
    const baseH = shape === "landscape" ? 27 : shape === "square" ? 48 : 62;
    let w = baseH * ratio;
    let h = baseH;
    if (w > 48) {
      w = 48;
      h = w / ratio;
    }
    return { w, h };
  };
  const shapeOfCell = (c) =>
    c.classList.contains("is-landscape")
      ? "landscape"
      : c.classList.contains("is-square")
        ? "square"
        : "portrait";

  const SCALES = [1.3, 1.15, 1.0, 0.85];
  const FONTS = [13, 11, 9, 8.5, 8];

  // 量一格在 (scale, pt) 下的需求高度 —— 與 measureDemand 同算法
  const measureDemand = (cell, scale, holder, fontPt) => {
    const clone = cell.cloneNode(true);
    clone.style.height = "auto";
    clone.style.overflow = "hidden";
    clone.style.margin = "0";
    clone.style.border = "none";
    const text = clone.querySelector(".print-book-post-text");
    if (text) {
      text.style.fontSize = `${fontPt}pt`;
      text.style.lineHeight = "1.65";
    }
    const img = clone.querySelector(".print-book-post-image");
    if (img) {
      const ratio = num(img.dataset.imgRatio);
      if (ratio > 0) {
        const base = photoBaseMm(ratio, shapeOfCell(clone));
        img.style.width = `${(base.w * scale).toFixed(2)}mm`;
        img.style.height = `${(base.h * scale).toFixed(2)}mm`;
      }
    }
    holder.appendChild(clone);
    const rect = clone.getBoundingClientRect();
    let h = rect.height;
    let bottom = rect.bottom;
    clone.querySelectorAll("*").forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.height > 0 && r.bottom > bottom) bottom = r.bottom;
    });
    const overflow = bottom - rect.bottom;
    if (overflow > 0) h += overflow;
    holder.removeChild(clone);
    return h + 40; // 安全餘裕(與 pair-layout 一致)
  };

  const out = [];
  document.querySelectorAll(".print-book-mode-b-pair-page.has-two").forEach((pg, pi) => {
    const cells = Array.from(pg.querySelectorAll(".print-book-b-cell"));
    if (cells.length !== 2) return;
    const secCs = getComputedStyle(pg);
    const contentH =
      pg.clientHeight - num(secCs.paddingTop) - num(secCs.paddingBottom);
    const hdr = pg.querySelector(".print-book-pair-day-header");
    const used = hdr ? hdr.offsetHeight + num(getComputedStyle(hdr).marginBottom) : 0;
    const c0 = getComputedStyle(cells[0]);
    const c1 = getComputedStyle(cells[1]);
    const gap =
      Math.max(num(c0.marginBottom), num(c1.marginTop)) + num(c1.borderTopWidth);
    const avail = contentH - used - gap;

    const holder = document.createElement("div");
    holder.style.cssText =
      "position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;height:auto;overflow:visible;";
    holder.style.width = `${cells[0].clientWidth}px`;
    pg.appendChild(holder);

    const grid = {};
    for (const sc of SCALES) {
      for (const pt of FONTS) {
        grid[`${sc}|${pt}`] = cells.map((c) =>
          Math.round(measureDemand(c, sc, holder, pt)),
        );
      }
    }
    pg.removeChild(holder);

    // 找出「放得下」的最大 scale(字級在 [8,13] 內)
    const fits = [];
    for (const sc of SCALES) {
      for (const pt of FONTS) {
        const [a, bb] = grid[`${sc}|${pt}`];
        if (a + bb <= avail) fits.push({ scale: sc, pt, need: a + bb });
      }
    }
    // 每個 scale 下可行的最小字級
    const bestPerScale = SCALES.map((sc) => {
      const ok = fits.filter((f) => f.scale === sc).sort((x, y) => x.pt - y.pt);
      return ok.length ? ok[0] : null;
    });

    out.push({
      page: pi + 1,
      avail: Math.round(avail),
      cells: cells.map((c) => ({
        id: (c.dataset.postId || "").slice(0, 8),
        shape: shapeOfCell(c),
        ratio: num(c.querySelector(".print-book-post-image")?.dataset.imgRatio),
      })),
      grid,
      bestPerScale,
    });
  });
  return out;
});

fs.writeFileSync("/tmp/photo-scale-feasibility.json", JSON.stringify(res, null, 2));

console.log("=== 照片級距 × 字級 需求高度 vs 可用高度 ===\n");
for (const pg of res) {
  console.log(
    `頁${pg.page} avail=${pg.avail}  ` +
      pg.cells.map((c) => `${c.id}(${c.shape} r=${c.ratio.toFixed(2)})`).join(" "),
  );
  for (const sc of [1.3, 1.15, 1.0, 0.85]) {
    const row = [9, 8.5, 8].map((pt) => {
      const [a, bb] = pg.grid[`${sc}|${pt}`];
      const need = a + bb;
      return `${pt}pt:${need}${need <= pg.avail ? "✓" : "✗"}`;
    });
    console.log(`   scale ${sc}: ${row.join("  ")}`);
  }
  console.log(
    `   → 各 scale 可行的最小字級: ` +
      pg.bestPerScale
        .map((b, i) => `${[1.3, 1.15, 1.0, 0.85][i]}:${b ? b.pt + "pt" : "放不下"}`)
        .join("  "),
  );
  console.log();
}
await b.close();

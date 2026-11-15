// 🆕 2026-11-14: mode B「一頁 2 則」驗證 — 深度檢查文字是否被裁、照片是否完整、版面是否滿版
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = process.argv[2] || "8zd9x39j";

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
await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 2 });
await p.goto(`${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await p
  .waitForFunction(
    () => {
      const root = document.querySelector(".print-book-screen");
      if (!root) return false;
      if (!root.querySelector(".print-book-mode-b-pair-page")) return true;
      return root.getAttribute("data-layout-ready") === "1";
    },
    { timeout: 60000, polling: 300 },
  )
  .catch(() => console.log("⚠️ layout-ready 未出現"));
await new Promise((x) => setTimeout(x, 4000));

const res = await p.evaluate(() => {
  const out = {
    plan: window.__pairPlan
      ? {
          diag: window.__pairPlan.diagnostics,
          heights: window.__pairPlan.heights,
          scales: window.__pairPlan.photoScale,
        }
      : null,
    pages: [],
    clipped: [],
    photoClipped: [],
    blankPages: [],
    fillRatios: [],
  };

  document.querySelectorAll(".print-book-page").forEach((page, i) => {
    const cells = page.querySelectorAll(".print-book-b-cell");
    if (!cells.length) return;
    const pRect = page.getBoundingClientRect();
    const info = { idx: i + 1, n: cells.length, cls: page.className, cells: [] };

    Array.from(cells).forEach((c) => {
      const t = c.querySelector(".print-book-post-text");
      const img = c.querySelector(".print-book-post-image");
      const cRect = c.getBoundingClientRect();

      // 1) 文字是否被裁:比較 scrollHeight vs 可視高度
      let textClipped = false;
      let textScroll = 0;
      let textVisible = 0;
      let pt = 0;
      if (t) {
        textScroll = t.scrollHeight;
        textVisible = t.clientHeight;
        pt = parseFloat(getComputedStyle(t).fontSize) || 0;
        const clamp = getComputedStyle(t).webkitLineClamp;
        if (clamp && clamp !== "none") {
          // line-clamp 在 → 高度被砍 → 內文可能被吃掉
          textClipped = true;
        }
        if (textScroll > textVisible + 3) textClipped = true;
        // 文字底部是否超出 cell
        const tRect = t.getBoundingClientRect();
        if (tRect.bottom > cRect.bottom + 2) textClipped = true;
      }

      // 2) 照片是否完整 (object-fit 不裁 / 沒超出 cell)
      let photoOk = true;
      let photoInfo = {};
      if (img) {
        const ir = img.getBoundingClientRect();
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const fit = getComputedStyle(img).objectFit;
        const displayW = ir.width;
        const displayH = ir.height;
        // 顯示比例 vs 原比例 → 若 object-fit 是 cover 就會裁
        const srcRatio = nw / nh;
        const dispRatio = displayW / displayH;
        const ratioDiff = Math.abs(srcRatio - dispRatio) / srcRatio;
        photoOk = fit !== "cover" && ratioDiff < 0.02;
        if (ir.bottom > cRect.bottom + 2) photoOk = false;
        photoInfo = {
          fit,
          ratioDiff: +ratioDiff.toFixed(4),
          dispW: Math.round(displayW),
          dispH: Math.round(displayH),
          srcW: nw,
          srcH: nh,
        };
        if (!photoOk)
          out.photoClipped.push({
            page: info.idx,
            id: c.dataset.postId,
            ...photoInfo,
          });
      }

      const chars = t ? t.textContent.trim().length : 0;
      // 3) 填版率:cell 內「被佔用」的垂直空間 / cell 高
      //    ⚠️ 照片是 float(不吃文字的垂直空間,但自己佔一條直欄)
      //    → 實際佔用高度 = title + max(照片高, 文字高) + footer
      const title = c.querySelector(".print-book-post-title");
      const footer = c.querySelector(".print-book-post-footer");
      const photoH = img ? img.getBoundingClientRect().height : 0;
      const textH = t ? Math.min(textScroll, textVisible) : 0;
      const used =
        (title ? title.getBoundingClientRect().height : 0) +
        Math.max(photoH, textH) +
        (footer ? footer.getBoundingClientRect().height : 0);
      const fill = cRect.height > 0 ? used / cRect.height : 0;
      out.fillRatios.push(fill);

      if (textClipped)
        out.clipped.push({
          page: info.idx,
          id: c.dataset.postId,
          chars,
          pt: +pt.toFixed(2),
          scroll: textScroll,
          visible: textVisible,
          cellH: Math.round(cRect.height),
        });

      info.cells.push({
        id: c.dataset.postId,
        chars,
        pt: +pt.toFixed(2),
        cellH: Math.round(cRect.height),
        textScroll,
        textVisible,
        fill: +fill.toFixed(3),
        ...photoInfo,
      });
    });

    // 空白頁偵測:頁面內有沒有任何非空白的內容
    out.pages.push(info);
  });

  out.avgFill =
    out.fillRatios.reduce((a, b) => a + b, 0) / (out.fillRatios.length || 1);
  return out;
});

console.log("=== 計畫診斷 ===");
if (res.plan) {
  const d = res.plan.diag;
  const over = d.filter((x) => x.overflow);
  console.log(
    `頁數=${d.length} 溢出頁=${over.length} 最小可用高度=${Math.min(
      ...d.map((x) => x.avail),
    )}`,
  );
  const scales = {};
  Object.values(res.plan.scales).forEach((s) => {
    scales[s] = (scales[s] || 0) + 1;
  });
  console.log("照片級距分佈:", JSON.stringify(scales));
  if (over.length) console.log("溢出明細:", JSON.stringify(over.slice(0, 5)));
} else {
  console.log("❌ 沒有 __pairPlan");
}

console.log("=== 文字裁切 ===");
console.log("被裁格數:", res.clipped.length);
console.log(JSON.stringify(res.clipped.slice(0, 10)));

console.log("=== 照片完整性 ===");
console.log("照片有問題格數:", res.photoClipped.length);
console.log(JSON.stringify(res.photoClipped.slice(0, 10)));

console.log("=== 填版率 ===");
console.log("平均:", res.avgFill.toFixed(3));

const doubles = res.pages.filter((x) => x.n === 2);
const singles = res.pages.filter((x) => x.n === 1);
console.log(`內容頁=${res.pages.length} 雙故事頁=${doubles.length} 單故事頁=${singles.length}`);

// 字級分佈
const pts = {};
res.pages.flatMap((x) => x.cells).forEach((c) => {
  const k = c.pt;
  pts[k] = (pts[k] || 0) + 1;
});
console.log("字級(pt)分佈:", JSON.stringify(pts));
const minPt = Math.min(...res.pages.flatMap((x) => x.cells).map((c) => c.pt));
console.log("最小字級:", minPt, "px =", (minPt * 0.75).toFixed(2), "pt");

fs.writeFileSync("/tmp/verify-pair.json", JSON.stringify(res, null, 2));

// 截圖:前 3 個雙故事頁 + 單故事頁
const shots = [0, 1, 2].map((i) => i);
for (const i of shots) {
  const el = await p.$$(".print-book-page");
  if (el[i]) {
    await el[i].screenshot({ path: `/tmp/pair-page-${i + 1}.png` });
  }
}
console.log("截圖: /tmp/pair-page-1..3.png");
await b.close();

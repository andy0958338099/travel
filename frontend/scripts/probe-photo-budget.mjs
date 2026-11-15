// 🆕 2026-11-14: 量測 mode B 每格的真實版面預算
//   目的:評估「照片放大 30%」到底有沒有垂直空間。
//   關鍵:CSS 有 max-height 會夾住 inline height → 必須同時量
//         「inline 宣告值」與「實際 clientHeight」才知道照片真正的天花板。
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
    () => {
      const root = document.querySelector(".print-book-screen");
      if (!root) return false;
      if (!root.querySelector(".print-book-mode-b-pair-page")) return true;
      return root.getAttribute("data-layout-ready") === "1";
    },
    { timeout: 60000, polling: 300 },
  )
  .catch(() => console.log("⚠️ layout-ready 未出現"));
await new Promise((x) => setTimeout(x, 3000));

const res = await p.evaluate(() => {
  const PX_PER_MM = 96 / 25.4;
  const out = [];
  document.querySelectorAll(".print-book-mode-b-pair-page.has-two").forEach((pg, pi) => {
    const pgCs = getComputedStyle(pg);
    const contentH =
      pg.clientHeight -
      parseFloat(pgCs.paddingTop) -
      parseFloat(pgCs.paddingBottom);
    const hdr = pg.querySelector(".print-book-pair-day-header");
    const hdrH = hdr
      ? hdr.offsetHeight + parseFloat(getComputedStyle(hdr).marginBottom)
      : 0;
    const cells = Array.from(pg.querySelectorAll(".print-book-b-cell"));
    const info = {
      page: pi + 1,
      contentH: Math.round(contentH),
      hdrH: Math.round(hdrH),
      cells: [],
    };
    cells.forEach((c) => {
      const img = c.querySelector(".print-book-post-image");
      const text = c.querySelector(".print-book-post-text");
      const title = c.querySelector(".print-book-post-title");
      const footer = c.querySelector(".print-book-post-footer");
      const iCs = img ? getComputedStyle(img) : null;
      const tCs = text ? getComputedStyle(text) : null;
      const box = (el) =>
        el
          ? el.offsetHeight +
            (parseFloat(getComputedStyle(el).marginTop) || 0) +
            (parseFloat(getComputedStyle(el).marginBottom) || 0)
          : 0;
      const declaredW = img ? parseFloat(img.style.width) : 0;
      const declaredH = img ? parseFloat(img.style.height) : 0;
      const imgBoxH = img
        ? img.offsetHeight +
          (parseFloat(iCs.marginTop) || 0) +
          (parseFloat(iCs.marginBottom) || 0)
        : 0;
      info.cells.push({
        id: (c.dataset.postId || "").slice(0, 8),
        shape: c.className.match(/is-(portrait|landscape|square)/)?.[1],
        cellH: Math.round(c.clientHeight),
        cellW: Math.round(c.clientWidth),
        titleH: Math.round(box(title)),
        footerH: Math.round(box(footer)),
        imgDeclaredWmm: declaredW,
        imgDeclaredHmm: declaredH,
        imgActualWpx: img ? Math.round(img.clientWidth) : 0,
        imgActualHpx: img ? Math.round(img.clientHeight) : 0,
        imgCssMaxH: iCs ? iCs.maxHeight : "",
        imgBoxHpx: Math.round(imgBoxH),
        imgFloat: iCs ? iCs.float : "",
        imgMarginR: iCs ? parseFloat(iCs.marginRight) || 0 : 0,
        pt: tCs ? +parseFloat(tCs.fontSize).toFixed(2) : 0,
        textScrollH: text ? text.scrollHeight : 0,
        textClientH: text ? text.clientHeight : 0,
        // 文字欄淨寬 = cell 寬 - 圖(含 margin) - padding
        textColW: text
          ? Math.round(text.clientWidth)
          : 0,
        contentHAvail:
          c.clientHeight - box(title) - box(footer) - 8 - 10,
      });
    });
    out.push(info);
  });
  return out;
});

fs.writeFileSync("/tmp/photo-budget.json", JSON.stringify(res, null, 2));
console.log("=== 每格版面預算 (px) ===");
for (const pg of res) {
  console.log(
    `頁${pg.page} 內容高=${pg.contentH} header=${pg.hdrH} 可分配=${pg.contentH - pg.hdrH}`,
  );
  for (const c of pg.cells) {
    console.log(
      `  ${c.id} ${c.shape} cellH=${c.cellH} 可用高=${c.contentHAvail} | ` +
        `圖 宣告=${c.imgDeclaredWmm}x${c.imgDeclaredHmm}mm 實際=${c.imgActualWpx}x${c.imgActualHpx}px ` +
        `cssMaxH=${c.imgCssMaxH} box=${c.imgBoxHpx}px | ` +
        `文字欄寬=${c.textColW}pt=${c.pt} scroll=${c.textScrollH}/client=${c.textClientH}`,
    );
  }
}
await b.close();

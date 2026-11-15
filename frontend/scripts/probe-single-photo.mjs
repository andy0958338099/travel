// 量測單故事尾頁:不同照片高度下,文字還剩多少空間、字級會是多少
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = process.argv[2] || "8zd9x39j";
const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300 });
await p.goto(
  `${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`,
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));

const res = await p.evaluate(() => {
  const sec = document.querySelector(".print-book-mode-b-pair-page.is-single");
  if (!sec) return { err: "no single page" };
  const cell = sec.querySelector(".print-book-b-cell");
  const img = cell.querySelector(".print-book-post-image");
  const text = cell.querySelector(".print-book-post-text");
  const title = cell.querySelector(".print-book-post-title");
  const footer = cell.querySelector(".print-book-post-footer");
  const ratio = img.naturalWidth / img.naturalHeight;
  const A = 96 / 25.4;
  const contentWmm = 120;
  const out = [];
  const cellH = cell.clientHeight;
  const baseTop = cell.getBoundingClientRect().top;

  for (const hMm of [74, 82, 90, 98, 105, 112, 120, 130]) {
    let wMm = hMm * ratio;
    if (wMm > contentWmm) wMm = contentWmm;
    const h2 = wMm / ratio;
    // 套用照片尺寸
    img.style.width = `${wMm}mm`;
    img.style.height = `${h2}mm`;
    // 觸發 font-fit 重算
    window.dispatchEvent(new Event("resize"));
    // 手動量測:cell 高度 - title - footer - img - 文字
    const cs = getComputedStyle(img);
    const imgBox =
      img.offsetHeight +
      (parseFloat(cs.marginTop) || 0) +
      (parseFloat(cs.marginBottom) || 0);
    const sumBox = (el) => {
      if (!el) return 0;
      const c = getComputedStyle(el);
      return (
        el.offsetHeight +
        (parseFloat(c.marginTop) || 0) +
        (parseFloat(c.marginBottom) || 0)
      );
    };
    const reserved = sumBox(title) + sumBox(footer) + imgBox;
    const textMaxH = Math.max(
      24,
      cellH - reserved - 8 * 2 - 10,
    );
    // 文字在 10pt / 12pt / 16pt 的自然高度
    const heights = {};
    for (const pt of [10, 12, 16]) {
      const old = text.style.fontSize;
      text.style.fontSize = `${pt}pt`;
      text.style.lineHeight = "1.75";
      heights[pt] = text.scrollHeight;
      text.style.fontSize = old;
    }
    out.push({
      hMm,
      wMm: +wMm.toFixed(1),
      realH: +h2.toFixed(1),
      cellH,
      reserved: +reserved.toFixed(1),
      textMaxH: +textMaxH.toFixed(1),
      textH: heights,
      塞得下10pt: heights[10] <= textMaxH,
      塞得下12pt: heights[12] <= textMaxH,
      塞得下16pt: heights[16] <= textMaxH,
      填版率10pt: +(heights[10] / textMaxH).toFixed(2),
    });
  }
  // 還原
  img.style.width = "";
  img.style.height = "";
  return { cellH, ratio: +ratio.toFixed(3), out };
});
console.log(JSON.stringify(res, null, 2));
await b.close();

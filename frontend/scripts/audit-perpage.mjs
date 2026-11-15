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
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 800, height: 1200, deviceScaleFactor: 1 });
await p.goto(`${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p.waitForSelector(".print-book-page", { timeout: 60000 });
// 🆕 等 mode B 版面配置引擎定稿 (data-layout-ready="1")
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
  .catch(() => console.log("⚠️ layout-ready 未出現,照現況量"));
await new Promise((x) => setTimeout(x, 3000));

const res = await p.evaluate(() => {
  const out = { pages: [], singles: 0, doubles: 0, other: 0, overflow: [], fontSizes: {} };
  document.querySelectorAll(".print-book-page").forEach((page, i) => {
    const cells = page.querySelectorAll(".print-book-b-cell");
    const cls = page.className;
    if (!cells.length) return;
    const info = {
      idx: i + 1,
      n: cells.length,
      cls,
      cells: Array.from(cells).map((c) => {
        const t = c.querySelector(".print-book-post-text");
        const title = c.querySelector(".print-book-post-title");
        const img = c.querySelector(".print-book-post-image");
        const fs2 = t ? getComputedStyle(t).fontSize : null;
        if (fs2) out.fontSizes[fs2] = (out.fontSizes[fs2] || 0) + 1;
        // 文字是否溢出 cell
        let over = 0;
        if (t && c) {
          const wrap = c.querySelector(".print-book-post-text-wrap");
          if (wrap) {
            const cr = c.getBoundingClientRect();
            const wr = wrap.getBoundingClientRect();
            over = Math.round(wr.bottom - cr.bottom);
          }
        }
        const imgRect = img ? img.getBoundingClientRect() : null;
        const tRect = t ? t.getBoundingClientRect() : null;
        return {
          id: c.dataset.postId,
          font: fs2,
          chars: t ? t.textContent.trim().length : 0,
          overflowPx: over,
          cellH: Math.round(c.getBoundingClientRect().height),
          imgW: imgRect ? Math.round(imgRect.width) : 0,
          imgH: imgRect ? Math.round(imgRect.height) : 0,
          textW: tRect ? Math.round(tRect.width) : 0,
          textH: tRect ? Math.round(tRect.height) : 0,
          title: title ? title.textContent.trim().slice(0, 20) : "",
        };
      }),
    };
    if (info.n === 1) out.singles++;
    else if (info.n === 2) out.doubles++;
    else out.other++;
    out.pages.push(info);
  });
  return out;
});

const cells = res.pages.reduce((a, x) => a + x.n, 0);
console.log(
  `總頁數(with cells)=${res.pages.length}  有故事頁=${res.pages.length}  1則頁=${res.singles}  2則頁=${res.doubles}  其他=${res.other}  總格數=${cells}`,
);
console.log("字級分佈:", JSON.stringify(res.fontSizes));
const over = res.pages.flatMap((x) => x.cells.filter((c) => c.overflowPx > 2).map((c) => ({ p: x.idx, id: c.id, over: c.overflowPx, chars: c.chars, font: c.font })));
console.log("溢出格數:", over.length, JSON.stringify(over.slice(0, 15)));
fs.writeFileSync("/tmp/audit-perpage.json", JSON.stringify(res, null, 2));
await b.close();

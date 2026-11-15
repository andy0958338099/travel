import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300 });
await p.goto(
  "http://localhost:3000/story-blog-custom/preview/8zd9x39j?book_slug=8zd9x39j&print=1",
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await p
  .waitForFunction(
    () =>
      document.querySelector(".print-book-screen")?.getAttribute("data-layout-ready") ===
      "1",
    { timeout: 60000, polling: 300 },
  )
  .catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
const d = await p.evaluate(() => window.__pairPlan?.diagnostics || []);
const lo = d.map((x) => x.leftover);
console.log("頁數", d.length);
console.log(
  "leftover 分佈: min",
  Math.min(...lo),
  "max",
  Math.max(...lo),
  "avg",
  Math.round((lo.reduce((a, b) => a + b, 0) / lo.length)),
);
console.log("leftover>0 的頁數:", lo.filter((x) => x > 0).length);
console.log("leftover>100 的頁數:", lo.filter((x) => x > 100).length);
console.log(
  "avail 範圍:",
  Math.min(...d.map((x) => x.avail)),
  Math.max(...d.map((x) => x.avail)),
);
const worst = d
  .map((x, i) => ({
    i,
    lo: x.leftover,
    avail: x.avail,
    dem: x.demand,
    alloc: x.allocated,
    sc: x.photoScale,
  }))
  .sort((a, b) => b.lo - a.lo)
  .slice(0, 6);
console.log(JSON.stringify(worst));
await b.close();

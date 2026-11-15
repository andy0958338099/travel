import puppeteer from "puppeteer";
import { existsSync } from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = "8zd9x39j";
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

const r = await p.evaluate(() => {
  const MM = 96 / 25.4;
  const two = document.querySelector(".print-book-mode-b-pair-page.has-two");
  const one = document.querySelector(".print-book-mode-b-pair-page.is-single");
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const cells = [...el.querySelectorAll(".print-book-b-cell")].map((c) => ({
      h: c.offsetHeight,
      offsetTop: c.offsetTop,
      marginTop: parseFloat(getComputedStyle(c).marginTop) || 0,
      borderTop: parseFloat(getComputedStyle(c).borderTopWidth) || 0,
    }));
    const hdr = el.querySelector(".print-book-pair-day-header");
    return {
      clientH: el.clientHeight,
      offsetH: el.offsetHeight,
      scrollH: el.scrollHeight,
      padTop: parseFloat(cs.paddingTop),
      padBottom: parseFloat(cs.paddingBottom),
      hdrH: hdr ? hdr.offsetHeight + (parseFloat(getComputedStyle(hdr).marginBottom) || 0) : 0,
      cells,
    };
  };
  return { two: info(two), one: info(one), MM, pageCount: document.querySelectorAll(".print-book-page").length };
});
console.log(JSON.stringify(r, null, 1));
await b.close();

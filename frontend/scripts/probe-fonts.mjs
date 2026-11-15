// CDP 檢查各元素實際渲染字體
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
await page.setViewport({ width: 794, height: 1123 });
await page.goto(URL, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForSelector('[data-layout-ready="1"]', { timeout: 60000 });
await sleep(500);

const client = await page.createCDPSession();
await client.send("DOM.enable");
await client.send("CSS.enable");
const { root } = await client.send("DOM.getDocument");

async function fontsOf(selector) {
  const { nodeId } = await client.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  if (!nodeId) return { selector, missing: true };
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId });
  return {
    selector,
    fonts: fonts.map((f) => `${f.familyName} (${f.glyphCount})`),
  };
}

for (const sel of [
  ".print-book-mode-b-pair-page .print-book-post-text",
  ".print-book-mode-b-pair-page .print-book-post-title",
  ".print-book-pair-day-label",
  ".print-book-pair-day-title",
  ".print-book-post-footer",
  ".print-book-toc-heading",
  ".print-book-frontispiece-line",
]) {
  console.log(JSON.stringify(await fontsOf(sel)));
}
await browser.close();

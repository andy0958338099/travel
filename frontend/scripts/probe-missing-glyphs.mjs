// 找出內文哪些字元沒有被 PrintSerifTC 涵蓋(落到 fallback 字型)
import puppeteer from "puppeteer-core";
import { setTimeout as sleep } from "node:timers/promises";
import { readFileSync } from "node:fs";

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
await sleep(400);

// 讀取 API 原文
const apiText = await page.evaluate(async () => {
  const res = await fetch("/api/story-books?slug=" + new URLSearchParams(location.search).get("book_slug"));
  const j = await res.json();
  const posts = j.posts || [];
  return posts.map((p) => `${p.title}\n${p.content}`).join("\n");
});

const browserChars = new Set(apiText);
console.log("API chars:", browserChars.size);

// 對照字型 cmap
const { execSync } = await import("node:child_process");
const out = execSync(
  `python3 -c "
from fontTools.ttLib import TTFont
f=TTFont('/Users/andy/Brian資料夾/江南部落格/manga-studio/frontend/public/fonts/NotoSerifTC-Print-Regular.woff2')
cm=set(f.getBestCmap().keys())
print(','.join(str(c) for c in sorted(cm)))
"`,
).toString().trim();
const covered = new Set(out.split(",").map(Number));

const missing = [...browserChars].filter((ch) => {
  const cp = ch.codePointAt(0);
  return cp > 0x2000 && !covered.has(cp);
});
console.log("MISSING from subset:", missing.length, JSON.stringify(missing.join("")));

// 把缺字寫出,供字型重建用
readFileSync;
const { writeFileSync } = await import("node:fs");
writeFileSync("/tmp/missing_chars.txt", missing.join(""), "utf8");

await browser.close();

/**
 * 逐字元檢查：頁面裡出現的每一個非 ASCII 字元，
 * 是否至少有一個「我們自帶的 webfont」能渲染它。
 *
 * 為什麼需要：
 *   check-linux-sim.mjs 是元素層級檢查（CDP getPlatformFontsForNode），
 *   但它只回報元素上「實際用到」的字型。
 *   如果某個字元沒有任何字型能渲染，瀏覽器會落到 .notdef（方框），
 *   而該元素可能同時用了別的字型 → 檢查會漏掉。
 *
 *   本腳本直接用 Font Loading API 的 `document.fonts.check(font, char)`
 *   逐字元檢查，精準且不依賴 CDP。
 *
 * 用法：
 *   BASE_URL=http://localhost:3001 node scripts/dev/check-glyph-coverage.mjs <slug>
 */
import puppeteer from "puppeteer-core";
import { setTimeout as sleep } from "node:timers/promises";

const slug = process.argv[2] ?? "843ta5hr";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// 自帶字型 family 與其對應的 @font-face weight
const FAMILIES = [
  ["PrintSerifTC", 400],
  ["PrintSerifTC", 700],
  ["PrintSansTC", 400],
  ["PrintSansTC", 700],
  ["PrintEmoji", 400],
  ["PrintSansSC", 400],
  ["PrintSansMath", 400],
  ["PrintSansSymbols2", 400],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 794, height: 1123 });

await page.goto(
  `${BASE}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`,
  // ⚠️ 正式站會載入大量圖片 → networkidle2 可能等不到（90s timeout）。
  //    這裡只需要 DOM 與字型，改用 domcontentloaded + data-layout-ready 訊號。
  { waitUntil: "domcontentloaded", timeout: 90000 },
);
await page.waitForSelector('[data-layout-ready="1"]', { timeout: 60000 });
await sleep(1500);

const result = await page.evaluate(async (families) => {
  const fonts = document.fonts;

  // 1. 先把所有 family 都 load 進來（沒有被用到的字型不會自動載入）
  const probes = {
    PrintSerifTC: "測試中文",
    PrintSansTC: "測試中文",
    PrintEmoji: "✈️⏱✅🎬📍",
    PrintSansSC: "刚围应栅标缝阖静",
    PrintSansMath: "𝓓𝓪𝔂",
    PrintSansSymbols2: "➔➕❗❤",
  };
  for (const [fam, weight] of families) {
    try {
      await fonts.load(`${weight} 16px "${fam}"`, probes[fam] || "測試中文");
    } catch (e) {
      /* 忽略 */
    }
  }
  await fonts.ready;

  // 2. 收集頁面所有文字（含 title / aria-label / 屬性）
  const texts = [];
  const push = (t) => {
    if (t && /\S/.test(t)) texts.push(t);
  };
  const walker = document.createTreeWalker(
    document.querySelector(".print-book-page") || document.body,
    NodeFilter.SHOW_TEXT,
  );
  let n;
  while ((n = walker.nextNode())) push(n.textContent);
  for (const el of document.querySelectorAll(".print-book-page *")) {
    for (const attr of el.attributes) {
      if (/^(title|aria-label|data-|alt|placeholder)/.test(attr.name)) push(attr.value);
    }
  }
  push(document.title);

  // 3. 逐字元檢查
  const chars = new Map(); // char → 出現處
  for (const t of texts) {
    for (const ch of t) {
      const cp = ch.codePointAt(0);
      if (cp < 128) continue;
      if (cp === 0x20 || cp === 0x0a || cp === 0x09) continue;
      if (!chars.has(ch)) chars.set(ch, (chars.get(ch) ?? 0) + 1);
    }
  }

  const uncovered = [];
  for (const [ch, count] of chars) {
    let ok = false;
    let coveredBy = null;
    for (const [fam, weight] of families) {
      try {
        if (fonts.check(`${weight} 16px "${fam}"`, ch)) {
          ok = true;
          coveredBy = fam;
          break;
        }
      } catch (e) {
        /* 忽略 */
      }
    }
    if (!ok) uncovered.push({ ch, code: ch.codePointAt(0), count });
    else if (!coveredBy) coveredBy = "?";
  }

  return {
    total: chars.size,
    texts: texts.length,
    uncovered,
    sample: [...chars.entries()].slice(0, 5),
  };
}, FAMILIES);

console.log(
  `\n【逐字元字型覆蓋檢查】${slug} @ ${BASE}\n` +
    `  掃描 ${result.texts} 段文字，${result.total} 個不同的非 ASCII 字元\n`,
);
if (result.uncovered.length === 0) {
  console.log("✓ 每個字元都有自帶 webfont 覆蓋 → 線上 PDF 不會出現方框 ✓");
} else {
  console.log(`✗ ${result.uncovered.length} 個字元沒有任何自帶字型能渲染：\n`);
  for (const u of result.uncovered) {
    console.log(
      `  U+${u.code.toString(16).toUpperCase().padStart(4, "0")}  ` +
        `'${u.ch}'  (${u.count} 次)`,
    );
  }
}

await browser.close();
process.exit(result.uncovered.length === 0 ? 0 : 1);

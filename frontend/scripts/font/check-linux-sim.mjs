/**
 * 模擬「線上 Amazon Linux 沒有中文字體 / 沒有 emoji 字型」的環境，
 * 驗證不會出現豆腐字（方框）。
 *
 * 為什麼需要：
 *   線上 PDF 是 Netlify background function 在 Amazon Linux 用 Chromium 拍的，
 *   那台機器沒有 PingFang TC / Heiti TC（macOS 才有），也沒有任何 emoji 字型。
 *   本機 macOS 有 → 肉眼看不出問題，只有線上才會壞。
 *
 *   模擬方式：用 CDP `Emulation.setUserAgentOverride` 無法改字型，
 *   改用最直接且可靠的方法 ——
 *   **在頁面注入一張覆蓋所有系統字型的假 font-face**，
 *   讓系統字型（Songti TC / STSong / PingFang TC / Heiti TC / serif / sans-serif）
 *   都指向一個「沒有中文 glyph」的字型。
 *   若版面仍能正確渲染 → 證明文字全部來自我們自帶的 woff2，線上不會壞。
 *
 *   🆕 2026-11-18：檢查範圍從「只有中文」擴大到「所有非 ASCII 字元」，
 *   因為使用者回報的亂碼包含 emoji / 符號 / 簡體 / 數學花體字。
 *
 * 用法：
 *   BASE_URL=http://localhost:3001 node scripts/dev/check-linux-sim.mjs <slug>
 */
import puppeteer from "puppeteer-core";
import { setTimeout as sleep } from "node:timers/promises";

const slug = process.argv[2] ?? "843ta5hr";
const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// 我們自帶的 webfont family（線上應該全部由這些渲染）
const OWN = [
  "Noto Sans TC",
  "Noto Serif TC",
  "Noto Emoji",
  "Noto Sans SC",
  "Noto Sans Math",
  "Noto Sans Symbols 2",
  "PrintSansTC",
  "PrintSerifTC",
  "PrintEmoji",
  "PrintSansSC",
  "PrintSansMath",
  "PrintSansSymbols2",
];
const OWN_RE = new RegExp(OWN.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 794, height: 1123 });

// ⚠️ 在任何頁面內容之前注入：把「系統字型」偷換成只有 ASCII 的字型
await page.evaluateOnNewDocument(() => {
  const style = document.createElement("style");
  style.textContent = `
    @font-face { font-family: "__FAKE_SYS__"; src: local("__nonexistent__"); }
  `;
  const inject = () => {
    if (!document.head) return requestAnimationFrame(inject);
    document.head.appendChild(style);
  };
  inject();

  // 關鍵：把所有常見系統中文字型 + emoji 字型的名稱都重新導向 __FAKE_SYS__
  const systems = [
    "PingFang TC", "PingFang SC", "Heiti TC", "Heiti SC",
    "Songti TC", "Songti SC", "STSong", "STKaiti", "STFangsong",
    "LiHei Pro", "Apple LiGothic", "Noto Sans CJK TC", "Noto Serif CJK TC",
    "WenQuanYi Zen Hei", "WenQuanYi Micro Hei", "Arial Unicode MS",
    // emoji / 符號類系統字型（線上 Amazon Linux 也沒有）
    "Apple Color Emoji", "Apple Symbols", "Segoe UI Emoji",
    "Segoe UI Symbol", "Noto Color Emoji", "Noto Emoji",
    "Zapf Dingbats", "Webdings",
  ];
  const rules = systems
    .map((s) => `@font-face { font-family: "${s}"; src: local("__nonexistent__"); }`)
    .join("\n");
  const style2 = document.createElement("style");
  style2.textContent = rules;
  const inject2 = () => {
    if (!document.head) return requestAnimationFrame(inject2);
    document.head.appendChild(style2);
  };
  inject2();
});

await page.goto(
  `${BASE}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`,
  { waitUntil: "networkidle2", timeout: 90000 },
);
await page.waitForSelector('[data-layout-ready="1"]', { timeout: 60000 });
await sleep(1500);

// 收集所有含「非 ASCII 字元」的元素
const targets = await page.evaluate(() => {
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll(".print-book-page *")) {
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("");
    if (!own) continue;
    // 非 ASCII 且不是空白
    const hasNonAscii = [...own].some((c) => c.codePointAt(0) > 127);
    if (!hasNonAscii) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    out.push({
      cls: (el.className?.toString?.() ?? "").slice(0, 60),
      text: own.slice(0, 30),
    });
  }
  return out;
});

const { root } = await page.createCDPSession();
const client = await page.createCDPSession();
await client.send("DOM.enable");
await client.send("CSS.enable");

const bad = [];
for (const t of targets) {
  try {
    const { nodeId } = await client.send("DOM.querySelectorAll", {
      nodeId: root.nodeId,
      selector: `.print-book-page .${t.cls.split(" ").filter(Boolean).join(".")}`,
    });
    if (!nodeId) continue;
    const { backendNodeId } = await client.send("DOM.describeNode", { nodeId });
    const { fonts } = await client.send("CSS.getPlatformFontsForNode", {
      backendNodeId,
    });
    const used = fonts.filter((f) => f.glyphCount > 0);
    if (used.length === 0) continue;
    const off = used.find((f) => !OWN_RE.test(f.familyName));
    if (off) {
      bad.push({ ...t, fonts: used.map((f) => `${f.familyName}(${f.glyphCount})`) });
    }
  } catch {
    /* 跳過 */
  }
}

console.log(
  `【模擬無中文字體/無 emoji 字體環境】檢查 ${targets.length} 個含非 ASCII 元素 @ ${BASE}\n`,
);
if (bad.length === 0) {
  console.log("✓ 全部由自帶 webfont 渲染 → 線上不會出現豆腐字 ✓");
} else {
  console.log(`✗ ${bad.length} 個元素用到系統字型（線上會變豆腐字）：\n`);
  const byCls = {};
  for (const b of bad) {
    byCls[b.cls] = byCls[b.cls] ?? { n: 0, fonts: b.fonts, sample: b.text };
    byCls[b.cls].n++;
  }
  for (const [cls, v] of Object.entries(byCls)) {
    console.log(`  .${cls}  (${v.n} 處)`);
    console.log(`     實際字型: ${v.fonts.join(", ")}`);
    console.log(`     例: ${v.sample}`);
  }
}

await browser.close();
process.exit(bad.length === 0 ? 0 : 1);

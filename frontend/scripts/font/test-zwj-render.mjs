/**
 * 測試 ZWJ emoji 序列在列印字型鏈下的渲染結果。
 *
 * 問題：正式 PDF 第 14 頁標題「老闆，你看我幾年後能上崗？ 🙋‍♂」的
 * 🙋‍♂ 顯示成「方框帶叉」（.notdef）。
 *
 * 假設：Noto Emoji（單色）沒有 ZWJ ligature → Chromium 把整個 cluster
 * 當成一個字串做 fallback → 找不到能渲染整串的字型 → 整串變 .notdef。
 * 解法：拿掉 U+200D（ZWJ），讓它變成兩個獨立 glyph（🙋 和 ♂ 都有字型）。
 *
 * 用法：node scripts/font/test-zwj-render.mjs
 */
import puppeteer from "puppeteer-core";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();

// 注入最小版列印字型鏈（只掛 PrintSansTC + PrintEmoji，線上 Linux 的近似情形）
await page.evaluateOnNewDocument(() => {
  const add = document.createElement("style");
  add.textContent = `
    @font-face { font-family:"PrintSansTC"; src:url("/fonts/NotoSansTC-Print-Bold.woff2") format("woff2"); font-weight:700; }
    @font-face { font-family:"PrintEmoji"; src:url("/fonts/NotoEmoji-Print-Regular.woff2") format("woff2"); }
  `;
  const inject = () => {
    if (!document.head) return requestAnimationFrame(inject);
    document.head.appendChild(add);
  };
  inject();
});

await page.goto("http://localhost:3001/travel/story-blog", {
  waitUntil: "networkidle2",
  timeout: 60000,
});

const variants = [
  { label: "原始 ZWJ 序列", text: "🙋\u200d♂\uFE0F" },
  { label: "移除 ZWJ", text: "🙋♂\uFE0F" },
  { label: "移除 ZWJ + VS16", text: "🙋♂" },
  { label: "單一 🙋", text: "🙋" },
  { label: "單一 ♂", text: "♂" },
  { label: "旗幟 ZWJ 序列", text: "\u{1F3F3}\uFE0F\u200D\u{1F308}" },
  { label: "旗幟移除 ZWJ", text: "\u{1F3F3}\uFE0F\u{1F308}" },
];

const result = await page.evaluate(async (variants) => {
  const fonts = document.fonts;
  await fonts.load('700 16px "PrintSansTC"', "測試中文");
  await fonts.load('400 16px "PrintEmoji"', "✈️⏱✅🎬📍");
  await fonts.ready;

  const out = [];
  for (const v of variants) {
    const el = document.createElement("span");
    el.style.cssText =
      'font-family:"PrintSansTC","PrintEmoji",sans-serif;font-size:40px;position:fixed;left:0;top:0;background:#fff;color:#000';
    el.textContent = v.text;
    document.body.appendChild(el);
    const w = el.getBoundingClientRect().width;
    // 逐字元檢查是否每個字元都有字型能渲染
    const perChar = [...v.text].map((ch) => {
      const cp = ch.codePointAt(0);
      let ok = false;
      for (const f of ['700 16px "PrintSansTC"', '400 16px "PrintEmoji"']) {
        try {
          if (fonts.check(f, ch)) ok = true;
        } catch (e) {
          /* noop */
        }
      }
      return { ch, cp: cp.toString(16).toUpperCase(), ok };
    });
    out.push({ label: v.label, width: w, perChar });
    el.remove();
  }
  return out;
}, variants);

console.log("");
for (const r of result) {
  console.log(`── ${r.label}  (寬度 ${r.width.toFixed(1)}px)`);
  for (const c of r.perChar) {
    console.log(
      `   U+${c.cp.padStart(4, "0")} '${c.ch}'  ${c.ok ? "✓ 有字型" : "✗ 無字型"}`,
    );
  }
}

await browser.close();

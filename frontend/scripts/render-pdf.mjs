// 在瀏覽器裡用 pdf.js 渲染 PDF 頁面 → puppeteer 截圖(檢查 PDF 真正的輸出)
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const file = process.argv[2] || "/tmp/book-full2.pdf";
const pages = (process.argv[3] || "7").split(",").map(Number);
const outPrefix = process.argv[4] || "/tmp/pdf-page";

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}canvas{display:block}</style></head>
<body><div id="wrap"></div>
<script type="module">
import * as pdfjsLib from 'file:///tmp/node_modules/pdfjs-dist/build/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc='file:///tmp/node_modules/pdfjs-dist/build/pdf.worker.mjs';
window.__render = async (url, n) => {
  const doc = await pdfjsLib.getDocument({url, useSystemFonts:true}).promise;
  window.__numPages = doc.numPages;
  const page = await doc.getPage(n);
  const vp = page.getViewport({scale:2});
  const c = document.createElement('canvas');
  c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
  document.getElementById('wrap').appendChild(c);
  const ctx = c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:ctx, viewport:vp}).promise;
  return {w:c.width,h:c.height};
};
window.__ready = true;
</script></body></html>`;
fs.writeFileSync("/tmp/pdfjs-harness.html", html);

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300, deviceScaleFactor: 1 });
await p.goto("file:///tmp/pdfjs-harness.html", { waitUntil: "networkidle0" });
await p.waitForFunction(() => window.__ready === true, { timeout: 30000 });

for (const n of pages) {
  const info = await p.evaluate(
    async (url, num) => {
      document.getElementById("wrap").innerHTML = "";
      const r = await window.__render(url, num);
      return { ...r, numPages: window.__numPages };
    },
    `file://${file}`,
    n,
  );
  console.log(
    `PDF 頁數=${info.numPages} 第 ${n} 頁渲染 ${info.w}x${info.h}`,
  );
  const el = await p.$("canvas");
  await el.screenshot({ path: `${outPrefix}-${n}.png` });
  console.log(`輸出 ${outPrefix}-${n}.png`);
}
await b.close();

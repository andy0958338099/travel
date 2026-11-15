// 在 PDF 文字層搜尋關鍵字,確認標題沒有重複印兩次
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/tmp/");
const pdfjs = await import("/tmp/node_modules/pdfjs-dist/legacy/build/pdf.mjs");

const file = process.argv[2] || "/tmp/book-final.pdf";
const needle = process.argv[3] || "豫園雖為上海名園";
const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
let found = [];
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  const txt = tc.items.map((i) => i.str).join("");
  const c = txt.split(needle).length - 1;
  if (c > 0) found.push({ page: n, count: c });
}
console.log(`搜尋「${needle}」→`, JSON.stringify(found));

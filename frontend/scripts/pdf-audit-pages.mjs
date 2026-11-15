// PDF 層級驗證:每頁的「故事數」= 該頁篇序標記「第 N 篇」的數量
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/tmp/");
const pdfjs = await import("/tmp/node_modules/pdfjs-dist/legacy/build/pdf.mjs");

const file = process.argv[2] || "/tmp/book-final.pdf";
const data = new Uint8Array(fs.readFileSync(file));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

let pages = [];
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n);
  const tc = await page.getTextContent();
  const txt = tc.items.map((i) => i.str).join("");
  // 🆕 2026-11-14: 署名「✍️ 阿喜」已改成篇序「第 N 篇」(移除重複作者名)
  //   → 故事計數器改用篇序標記。
  const marks = (txt.match(/第\s*\d+\s*篇/g) || []).length;
  pages.push({ page: n, marks, chars: txt.length });
}
const storyPages = pages.filter((p) => p.marks > 0);
const dist = {};
for (const p of storyPages) dist[p.marks] = (dist[p.marks] || 0) + 1;
console.log("PDF 總頁數:", doc.numPages);
console.log("有故事頁數:", storyPages.length);
console.log("每頁故事數分佈:", dist);
const totals = storyPages.reduce((s, p) => s + p.marks, 0);
console.log("PDF 內故事總數:", totals);
const odd = storyPages.filter((p) => p.marks === 1);
console.log("1 則的頁:", odd.map((p) => p.page).join(",") || "無");
console.log("0 則的頁(封面/扉頁/封底):", pages.filter((p) => p.marks === 0).map((p) => p.page).join(","));

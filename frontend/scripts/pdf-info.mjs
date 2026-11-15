import { PDFDocument } from "pdf-lib";
import fs from "node:fs";

const f = process.argv[2] || "/tmp/book-full.pdf";
const bytes = fs.readFileSync(f);
const doc = await PDFDocument.load(bytes, { updateMetadata: false });
const pages = doc.getPages();
console.log("檔案:", f);
console.log("大小:", (bytes.length / 1048576).toFixed(2), "MB");
console.log("頁數:", pages.length);
const sizes = new Set();
pages.forEach((p) => {
  const s = p.getSize();
  sizes.add(`${Math.round(s.width)}x${Math.round(s.height)}`);
});
console.log("頁面尺寸:", [...sizes].join(", "), "(A5 = 420x595 pt)");

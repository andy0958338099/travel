// 比對「API 原文」vs「PDF/預覽實際渲染出來的文字」→ 確認沒有被靜默裁掉
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000",
  slug = process.argv[2] || "8zd9x39j";

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1300 });
await p.goto(
  `${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`,
  { waitUntil: "domcontentloaded", timeout: 60000 },
);
await p.waitForSelector(".print-book-page", { timeout: 60000 });
await p
  .waitForFunction(
    () =>
      document.querySelector(".print-book-screen")?.getAttribute("data-layout-ready") ===
      "1",
    { timeout: 60000, polling: 300 },
  )
  .catch(() => {});
await new Promise((r) => setTimeout(r, 3000));

const res = await p.evaluate(() => {
  const out = [];
  document
    .querySelectorAll(".print-book-b-cell")
    .forEach((c) => {
      const t = c.querySelector(".print-book-post-text");
      const title = c.querySelector(".print-book-post-title");
      out.push({
        id: c.dataset.postId,
        title: title ? title.textContent.trim() : "",
        rendered: t ? t.textContent : "",
        renderedLen: t ? t.textContent.trim().length : 0,
        scroll: t ? t.scrollHeight : 0,
        visible: t ? t.clientHeight : 0,
        clamp: t ? getComputedStyle(t).webkitLineClamp : "none",
      });
    });
  return out;
});

// 取 API 原文
const api = await p.evaluate(async (s) => {
  const r = await fetch(`/api/story-books?slug=${encodeURIComponent(s)}`);
  const j = await r.json();
  return j;
}, slug);
const posts = api.posts || api.data?.posts || [];
const map = new Map(posts.map((x) => [x.id, x]));

let mismatch = 0;
const report = [];
for (const cell of res) {
  const src = map.get(cell.id);
  if (!src) {
    report.push({ id: cell.id, title: cell.title, note: "API 找不到此 post" });
    continue;
  }
  let raw = src.body ?? src.content ?? src.text ?? "";
  const t = src.title || "";
  if (t && raw.trim() === t) raw = "";
  else if (t && raw.trimStart().startsWith(t))
    raw = raw.trimStart().slice(t.length).replace(/^\n+/, "");
  const srcNorm = raw.replace(/\s+/g, "").trim();
  const renNorm = cell.rendered.replace(/\s+/g, "").trim();
  const ok = srcNorm === renNorm;
  if (!ok) {
    mismatch++;
    // 找出渲染結果的尾端在原文的位置
    let cut = 0;
    for (let i = 0; i < renNorm.length; i++) {
      if (renNorm[i] !== srcNorm[i]) break;
      cut = i;
    }
    report.push({
      id: cell.id,
      title: cell.title.slice(0, 30),
      srcLen: srcNorm.length,
      renLen: renNorm.length,
      缺字數: srcNorm.length - renNorm.length,
      缺掉的开頭: srcNorm.slice(cut, cut + 40),
      clamp: cell.clamp,
      scroll: cell.scroll,
      visible: cell.visible,
    });
  }
}
console.log(`比對格數=${res.length} 原文不符=${mismatch}`);
console.log(JSON.stringify(report.slice(0, 12), null, 2));
fs.writeFileSync("/tmp/text-integrity.json", JSON.stringify({ res, report }, null, 2));
await b.close();

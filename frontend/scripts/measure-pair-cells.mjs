/**
 * 量測 harness — 在「pair 版面」語境下,精準量出每則故事的內容需求高度。
 *
 * 為什麼不能用既有 DOM:
 *   長篇故事 (>220 字) 目前跑在 is-single 整頁 (display:flex column),
 *   flex 容器裡 float 失效 → 圖疊在文字上方 → 量到的不是 pair 版面的高度。
 *   這次量測在獨立 harness 重建「完全忠實的 pair cell」,不受現有分頁影響。
 *
 * 量測輸出 (每則故事 × 每個照片縮放級距):
 *   titleH    標題高
 *   pH        內文 <p> 高 (含縮排後的實際行數)
 *   footerH   署名高
 *   dayHdrH   該格自己的 day header 高 (不同日才有)
 *   photoW/H  照片尺寸 (依比例 + 縮放級距)
 *
 * 需求高度 req = titleH + max(photoH + 2mm, pH + 1mm + footerH)
 */
import puppeteer from "puppeteer";
import { existsSync } from "node:fs";
import fs from "node:fs";

function fc() {
  for (const p of ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"])
    if (existsSync(p)) return p;
}
const origin = "http://localhost:3000";
const slug = process.argv[2] || "8zd9x39j";
const SCALES = [1, 0.85, 0.7, 0.55, 0.45];

const b = await puppeteer.launch({
  headless: true,
  executablePath: fc(),
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const p = await b.newPage();
await p.setViewport({ width: 900, height: 1400, deviceScaleFactor: 1 });

// 先開預覽頁 → 拿到真實文章資料 + 圖片 (已載入 → 有 naturalWidth/Height)
await p.goto(`${origin}/story-blog-custom/preview/${slug}?book_slug=${slug}&print=1`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p.waitForSelector(".print-book-page", { timeout: 60000 });

// 抓文章 + 圖片比例
const posts = await p.evaluate(async () => {
  const cells = Array.from(document.querySelectorAll(".print-book-b-cell"));
  const seen = new Map();
  for (const c of cells) {
    const id = c.getAttribute("data-post-id");
    if (!id || seen.has(id)) continue;
    const img = c.querySelector(".print-book-post-image");
    const txt = c.querySelector(".print-book-post-text");
    const ttl = c.querySelector(".print-book-post-title");
    const day = c.querySelector(".print-book-day-header-label");
    const dayTitle = c.querySelector(".print-book-day-header-title");
    seen.set(id, {
      id,
      title: ttl ? ttl.textContent.trim() : "",
      body: txt ? txt.textContent : "",
      day: day ? day.textContent.trim() : "",
      dayTitle: dayTitle ? dayTitle.textContent.trim() : "",
      src: img ? img.getAttribute("src") : null,
      ratio: img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : null,
    });
  }
  return Array.from(seen.values());
});
console.log("抓到文章:", posts.length, " 有比例:", posts.filter((x) => x.ratio).length);

// 🔥 獨立載入所有照片拿到比例 (viewport 外的 img 不會自己 load)
const ratioMap = await p.evaluate(async (srcs) => {
  const out = {};
  const uniq = Array.from(new Set(srcs.filter(Boolean)));
  const load = (src) =>
    new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        out[src] = { w: im.naturalWidth, h: im.naturalHeight };
        res();
      };
      im.onerror = () => res();
      im.src = src;
    });
  for (let i = 0; i < uniq.length; i += 8) {
    await Promise.all(uniq.slice(i, i + 8).map(load));
  }
  return out;
}, posts.map((x) => x.src));
console.log("圖片比例取得:", Object.keys(ratioMap).length);
for (const post of posts) {
  const r = ratioMap[post.src];
  post.ratio = r ? r.w / r.h : null;
}
await p.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
await new Promise((r) => setTimeout(r, 800));

// ── harness:重建忠實的 pair cell ──
const out = await p.evaluate(async (SCALES, POSTS) => {
  const A = 96 / 25.4;
  const mm = (v) => `${v}mm`;

  const host = document.createElement("div");
  host.id = "pair-harness";
  host.style.cssText =
    "position:absolute;left:-99999px;top:0;width:148mm;visibility:hidden;" +
    "font-family:'Noto Serif TC','Songti TC',serif;";
  const wrap = document.createElement("div");
  wrap.className = "print-book-mode-b-pair-page";
  wrap.style.cssText = "width:148mm;padding:10mm 14mm;box-sizing:border-box;";
  host.appendChild(wrap);
  document.body.appendChild(host);

  const st = document.createElement("style");
  st.textContent = `
    #pair-harness .print-book-b-cell { height:auto !important; overflow:visible !important; }
    #pair-harness .print-book-post-text { font-size:9pt !important; line-height:1.65 !important; }
    #pair-harness .print-book-post-title { font-size:12pt !important; }
    #pair-harness .print-book-post-image { max-width:none !important; max-height:none !important; }
  `;
  document.head.appendChild(st);

  function shapeOf(ratio) {
    if (ratio > 1.15) return "landscape";
    if (ratio < 0.87) return "portrait";
    return "square";
  }
  function photoDims(ratio, shape, s) {
    const baseH = shape === "landscape" ? 27 : shape === "square" ? 48 : 62;
    let w = baseH * ratio;
    let h = baseH;
    if (w > 48) {
      w = 48;
      h = w / ratio;
    }
    return { w: w * s, h: h * s };
  }

  const results = [];
  for (const post of POSTS) {
    const rec = {
      id: post.id,
      title: post.title,
      chars: post.body.trim().length,
      day: post.day,
      dayTitle: post.dayTitle,
      ratio: post.ratio,
      shape: post.ratio ? shapeOf(post.ratio) : "portrait",
      m: {},
    };
    for (const s of SCALES) {
      const cell = document.createElement("article");
      cell.className = `print-book-b-cell print-book-b-cell-first is-${rec.shape}`;
      cell.setAttribute("data-post-id", post.id);

      const dh = document.createElement("header");
      dh.className = "print-book-day-header";
      dh.innerHTML = `<div class="print-book-day-header-label">${post.day}</div>${
        post.dayTitle ? `<div class="print-book-day-header-title">${post.dayTitle}</div>` : ""
      }`;
      cell.appendChild(dh);

      const ttl = document.createElement("h3");
      ttl.className = "print-book-post-title";
      ttl.textContent = post.title || "（無標題）";
      cell.appendChild(ttl);

      let photoH = 0,
        photoW = 0;
      if (post.src && post.ratio) {
        const d = photoDims(post.ratio, rec.shape, s);
        photoW = d.w;
        photoH = d.h;
        const img = document.createElement("img");
        img.className = "print-book-post-image";
        img.src = post.src;
        img.alt = "";
        img.style.width = mm(d.w);
        img.style.height = mm(d.h);
        img.style.objectFit = "contain";
        cell.appendChild(img);
      }

      const tw = document.createElement("div");
      tw.className = "print-book-post-text-wrap";
      const para = document.createElement("p");
      para.className = "print-book-post-text";
      para.textContent = post.body;
      tw.appendChild(para);
      const ft = document.createElement("footer");
      ft.className = "print-book-post-footer";
      ft.innerHTML = "<span>✍️ Brian</span>";
      tw.appendChild(ft);
      cell.appendChild(tw);

      wrap.appendChild(cell);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 60));

      const g = (sel) => {
        const el = cell.querySelector(sel);
        return el ? el.getBoundingClientRect().height : 0;
      };
      const wrapH = g(".print-book-post-text-wrap");
      const pH = g(".print-book-post-text");
      const titleH = g(".print-book-post-title");
      const footerH = g(".print-book-post-footer");
      const dayHdrH = g(".print-book-day-header");
      // cell 實際高 (display:block + overflow visible → 不含 float 溢出)
      const cellH = cell.getBoundingClientRect().height;
      const titleMarginBottom = parseFloat(getComputedStyle(ttl).marginBottom) || 0;

      rec.m[s] = {
        titleH: Math.round(titleH),
        pH: Math.round(pH),
        wrapH: Math.round(wrapH),
        footerH: Math.round(footerH),
        dayHdrH: Math.round(dayHdrH),
        photoW: +photoW.toFixed(2),
        photoH: Math.round(photoH),
        cellH: Math.round(cellH),
        titleMarginBottom: Math.round(titleMarginBottom),
      };
      cell.remove();
    }
    results.push(rec);
  }
  host.remove();
  st.remove();
  return results;
}, SCALES, posts);

fs.writeFileSync("/tmp/pair-cells.json", JSON.stringify(out, null, 1));
console.log("量測完成:", out.length, "則 ×", SCALES.length, "級距 → /tmp/pair-cells.json");
for (const s of SCALES) {
  const tot = out.reduce((a, r) => a + r.m[s].cellH, 0);
  console.log(`  scale ${s}: cellH 總和 ${tot}px avg ${Math.round(tot / out.length)}`);
}
await b.close();

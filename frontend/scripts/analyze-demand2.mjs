import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("/tmp/demand2.json", "utf8"));
const A = 96 / 25.4; // px per mm

console.log("n =", d.length);
const dem = d.map((x) => x.natural);
const chars = d.map((x) => x.chars);
const q = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * p)];
console.log("demand p10/p50/p90/max:", q(dem, 0.1), q(dem, 0.5), q(dem, 0.9), Math.max(...dem));
console.log("chars p10/p50/p90/max:", q(chars, 0.1), q(chars, 0.5), q(chars, 0.9), Math.max(...chars));
console.log("sum demand:", dem.reduce((a, x) => a + x, 0));

// 文字需求 vs 圖高 關係
const ratio = d.map((x) => x.ratio);
console.log("ratio min/max:", Math.min(...ratio), Math.max(...ratio));
console.log(
  "textH = wrapH;  wrapH vs chars 樣本:",
  d.slice(0, 8).map((x) => `${x.chars}c->${x.wrapH}px(img${x.imgH})`).join(" "),
);

// 估算頁面可用高度
const pageH = 210 * A; // 793.7
const padTop = 6 * A, padBottom = 10 * A; // has-two padding-top 6mm, pair page padding 10mm
const dayHdr = 39.45 + 3 * A; // day header + margin
const sep = 5 * A + 0.67; // separator margin + border
const availWithHdr = pageH - padTop - padBottom - dayHdr - sep;
const availNoHdr = pageH - padTop - padBottom - sep;
console.log("\n頁面可用(有 day header):", availWithHdr.toFixed(1), "px /", (availWithHdr / A).toFixed(1), "mm");
console.log("頁面可用(無 day header):", availNoHdr.toFixed(1), "px /", (availNoHdr / A).toFixed(1), "mm");

// 需要知道每個 cell 的 day_number → 從 order 檔
const order = JSON.parse(fs.readFileSync("/tmp/book-order.json", "utf8"));
const dayOf = new Map();
if (Array.isArray(order)) {
  order.forEach((o) => dayOf.set(o.id, o.day_number));
}
console.log("order 有 day?", dayOf.size);

// 循序配對 (1,2),(3,4)... 檢查是否塞得下
function pairCheck(avail) {
  let over = 0, maxOver = 0, ok = 0;
  for (let i = 0; i + 1 < d.length; i += 2) {
    const s = d[i].natural + d[i + 1].natural;
    if (s > avail) {
      over++;
      maxOver = Math.max(maxOver, s - avail);
    } else ok++;
  }
  return { over, ok, maxOver };
}
console.log("循序配對 @有hdr:", JSON.stringify(pairCheck(availWithHdr)));
console.log("循序配對 @無hdr:", JSON.stringify(pairCheck(availNoHdr)));

// 貪婪變數篇數分頁 (保留閱讀順序), 目標每頁 >= 2
function greedy(avail, minN = 2) {
  const pages = [];
  let i = 0;
  while (i < d.length) {
    // 貪婪: 塞到放不下為止, 但至少 minN 篇
    let j = i,
      sum = 0;
    while (j < d.length) {
      const add = d[j].natural + (j > i ? sep : 0);
      if (sum + add > avail && j - i >= minN) break;
      sum += add;
      j++;
    }
    if (j - i < minN) {
      // 放不下 2 篇 → 這頁只能 1 篇 (但如果單篇本身 > avail, 也只能 1)
      j = i + 1;
    }
    pages.push({ n: j - i, sum });
    i = j;
  }
  return pages;
}
for (const [label, av] of [["有hdr", availWithHdr], ["無hdr", availNoHdr]]) {
  const pg = greedy(av);
  const dist = {};
  pg.forEach((p) => (dist[p.n] = (dist[p.n] || 0) + 1));
  console.log(`\n貪婪分頁 @${label}: 總頁數=${pg.length} 篇數分佈=${JSON.stringify(dist)}`);
  console.log("  最大單頁需求:", Math.max(...pg.map((p) => p.sum)).toFixed(0), "可用", av.toFixed(0));
  const bad = pg.filter((p) => p.sum > av);
  console.log("  超過可用高的頁:", bad.length);
}

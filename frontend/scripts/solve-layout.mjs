/**
 * 求解 mode B 的版面配置:
 *   1. 哪些相鄰配對在 9pt 下塞得進 A5 一頁
 *   2. 塞不下時需要把照片縮到多小
 *   3. 每格可變高度(依內容需求比例分配)的可行性
 */
import fs from "node:fs";

const scan = JSON.parse(fs.readFileSync("/tmp/photo-scan.json", "utf8"));
const order = JSON.parse(fs.readFileSync("/tmp/book-order.json", "utf8"));
const dayOf = new Map();
for (const o of order) dayOf.set(o.id, o.day_number);

const A = 96 / 25.4; // px per mm
const PAGE_CONTENT_H = (210 - 6 - 10) * A; // 頁高 210mm - padding-top 6mm - padding-bottom 10mm
const DAY_HDR_SHARED = 39.45 + 3 * A; // 頁頂共用 day header (含 margin-bottom)
const DAY_HDR_EACH = 39.45 + 2.5 * A; // 每格自己的 day header
const SEP = 5 * A + 0.67; // 格間分隔線 (margin-top + border)

console.log("頁面內容高:", PAGE_CONTENT_H.toFixed(1));
console.log("共用 day header:", DAY_HDR_SHARED.toFixed(1), " 每格 day header:", DAY_HDR_EACH.toFixed(1));
console.log("格間分隔:", SEP.toFixed(1));

const SCALES = [1, 0.85, 0.7, 0.55, 0.42];

// 相鄰配對 (保持閱讀順序 → 連續區塊)
const pairs = [];
for (let i = 0; i + 1 < scan.length; i += 2) pairs.push([scan[i], scan[i + 1]]);
if (scan.length % 2 === 1) pairs.push([scan[scan.length - 1]]);

function capFor(pair) {
  const sameDay = pair.length === 2 && dayOf.get(pair[0].id) === dayOf.get(pair[1].id);
  const dayCost = sameDay ? DAY_HDR_SHARED : pair.length * DAY_HDR_EACH;
  return {
    cap: PAGE_CONTENT_H - dayCost - (pair.length - 1) * SEP,
    sameDay,
    dayCost,
  };
}

// 同時縮兩格
function solvePair(pair) {
  const { cap, sameDay } = capFor(pair);
  for (const s of SCALES) {
    const need = pair.reduce((a, p) => a + p.h[s], 0);
    if (need <= cap) return { ok: true, scale: s, need, cap, sameDay };
  }
  return { ok: false, scale: null, need: pair.reduce((a, p) => a + p.h[0.42], 0), cap, sameDay };
}

let ok = 0,
  bad = [];
for (const pair of pairs) {
  const r = solvePair(pair);
  if (r.ok) ok++;
  else bad.push({ pair, r });
}
console.log(`\n循序配對 (相鄰, 保持閱讀順序): ${pairs.length} 組 → 可塞下 ${ok} 組, 塞不下 ${bad.length} 組`);
if (bad.length) {
  console.log("塞不下的組 (需求 / 容量 / 超出):");
  for (const { pair, r } of bad) {
    console.log(
      `  ${pair.map((p) => p.chars + "c/" + p.shape).join(" + ")}  need=${r.need.toFixed(0)} cap=${r.cap.toFixed(0)} 超過 ${(r.need - r.cap).toFixed(0)}px`,
    );
  }
}

// 不同 scale 的成功率
console.log("\n各 scale 下的成功率 (相鄰配對):");
for (const s of SCALES) {
  let good = 0;
  for (const pair of pairs) {
    const { cap } = capFor(pair);
    const need = pair.reduce((a, p) => a + p.h[s], 0);
    if (need <= cap) good++;
  }
  console.log(`  scale ${s}: ${good}/${pairs.length}`);
}

// 連續區塊最佳化:允許一個頁面放 3 則 (用貪婪 DP 找最少頁數)
// 目標: 每頁 ≥2 則, 最後一頁可 1 則
function dpBlocks(demands, capOf) {
  const n = demands.length;
  const dp = Array(n + 1).fill(Infinity);
  const from = Array(n + 1).fill(-1);
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let k = 1; k <= 4 && k <= i; k++) {
      const j = i - k;
      const cap = capOf(j, i);
      let need = 0;
      for (let x = j; x < i; x++) need += demands[x];
      if (need <= cap && dp[j] + 1 < dp[i]) {
        dp[i] = dp[j] + 1;
        from[i] = j;
      }
    }
  }
  const blocks = [];
  let i = n;
  while (i > 0) {
    blocks.unshift(from[i]);
    i = from[i];
  }
  return { pages: dp[n], blocks };
}

// 以 scale=1 的需求做 DP, 容量依「該區塊內 day 是否一致」計算
const d1 = scan.map((p) => p.h[1]);
function capForRange(j, i) {
  const days = new Set();
  for (let x = j; x < i; x++) days.add(dayOf.get(scan[x].id));
  const dayCost = days.size === 1 ? DAY_HDR_SHARED : days.size * DAY_HDR_EACH;
  return PAGE_CONTENT_H - dayCost - (i - j - 1) * SEP;
}
const dpRes = dpBlocks(d1, capForRange);
console.log(`\nDP 最佳化 (可變篇數, 允許 3/4 則一頁): 最少 ${dpRes.pages} 頁`);
const sizes = {};
dpRes.blocks.forEach((j, k) => {
  const i = k + 1 < dpRes.blocks.length ? dpRes.blocks[k + 1] : d1.length;
  const n = i - j;
  sizes[n] = (sizes[n] || 0) + 1;
});
console.log("  每頁篇數分佈:", JSON.stringify(sizes));
console.log("  (目標: 每頁 2 則 → 113 則需 57 頁; 若有 3 則頁則頁數更少)");

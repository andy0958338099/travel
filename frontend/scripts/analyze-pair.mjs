import fs from "node:fs";

const rows = JSON.parse(fs.readFileSync("/tmp/post-demand.json", "utf8"));
// DOM 順序 = 書頁順序
const d = rows.map((r) => r.textH + Math.round(r.overhead));
console.log("n=", d.length, "total demand px=", d.reduce((a, b) => a + b, 0));
console.log("min/max demand:", Math.min(...d), Math.max(...d));

// has-two 頁面可用高度 (px): 794 - padTop(22.68) - padBottom(37.8) - dayHeader(57.34) = 676.2
// 兩 cell 之間分隔 (margin-top 18.9 + border 1) = 19.9
const AVAIL = 676.2 - 19.9; // 656.3
console.log("has-two 兩 cell 合計可用高度:", AVAIL.toFixed(1));
// 落單頁可用: 794 - 37.8 - 37.8 = 718.4
const AVAIL_SINGLE = 718.4;

for (const limit of [AVAIL, AVAIL - 20, AVAIL - 40]) {
  let two = 0;
  let one = 0;
  const solo = [];
  for (let i = 0; i < d.length; i += 2) {
    if (i + 1 < d.length && d[i] + d[i + 1] <= limit) two++;
    else {
      one++;
      solo.push({ i, d: d[i] });
    }
  }
  console.log(
    `limit=${limit.toFixed(0)} → 雙 ${two} 頁 / 單 ${one} 頁 (總 ${two + one})`
  );
  if (limit === AVAIL) console.log("  落單:", solo.map((s) => s.d).join(","));
}

// 理想:比例分欄 → 條件就是 d_i + d_{i+1} <= AVAIL
// 檢查同一天限制下的影響
console.log("\n相鄰和分布 (只看超過 AVAIL 的):");
for (let i = 0; i + 1 < d.length; i += 2) {
  const s = d[i] + d[i + 1];
  if (s > AVAIL) console.log(`  pair ${i / 2}: ${d[i]} + ${d[i + 1]} = ${s} > ${AVAIL.toFixed(0)}`);
}

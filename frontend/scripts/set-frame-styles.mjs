// 2026-08-17 聖上拍板: 一鍵批次設定 posts.frame_style (預設全部,D2-only by --day 2)
// 用法:
//   node scripts/set-frame-styles.mjs                                     # 互動模式 (列現況)
//   node scripts/set-frame-styles.mjs '{"id-1":"ink","id-2":"polaroid",...}'  # 批次設定全部 mapping
//   node scripts/set-frame-styles.mjs --day 2                              # 只看 D2 現況
//   node scripts/set-frame-styles.mjs --reset-all vermilion                # ⚠️ 全站 reset 成 vermilion
//   node scripts/set-frame-styles.mjs --reset-all ink                      # ⚠️ 全站 reset 成 ink
//
// frame_style 4 選 1: vermilion / polaroid / ink / wash

import { readFileSync } from "fs";

const env = readFileSync("/Volumes/Transcend/manga-studio/frontend/.env.local", "utf8");
const SUPABASE_URL = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_URL="))?.split("=", 2)[1].trim();
const key = env.split("\n").find(l => l.startsWith("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="))?.split("=", 2)[1].trim();

if (!SUPABASE_URL || !key) {
  console.error("❌ 缺 env:NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const VALID = ["vermilion", "polaroid", "ink", "wash"];
const args = process.argv.slice(2);

// 解析 flags
let dayFilter = null;       // --day 2
let resetAll = null;        // --reset-all vermilion
let inlineMapping = null;   // 第一個非 flag 參數

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--day" && args[i + 1]) {
    dayFilter = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--reset-all" && args[i + 1]) {
    resetAll = args[i + 1];
    if (!VALID.includes(resetAll)) {
      console.error(`❌ --reset-all 必須是 4 選 1: ${VALID.join("/")}`);
      process.exit(1);
    }
    i++;
  } else if (!args[i].startsWith("--")) {
    inlineMapping = args[i];
  }
}

// 1. 抓 posts (過濾 day?)
let url = `${SUPABASE_URL}/rest/v1/posts?select=id,title,frame_style,day_number,sort_order&order=day_number.asc&order=sort_order.asc`;
if (dayFilter !== null) url += `&day_number=eq.${dayFilter}`;

const posts = await (await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();

console.log(`=== ${dayFilter !== null ? `D${dayFilter}` : "全部"} posts 現況 (DB source of truth) — ${posts.length} 篇 ===`);
const byDay = {};
posts.forEach((p, i) => {
  if (!byDay[p.day_number]) byDay[p.day_number] = [];
  byDay[p.day_number].push({ idx: i, ...p });
  console.log(`  D${p.day_number} #${i}: id=${p.id.slice(0,8)}  frame_style=${JSON.stringify(p.frame_style)}  title=${(p.title || "").slice(0,30)}`);
});

// 統計
const counts = {};
posts.forEach(p => { counts[p.frame_style || "undefined"] = (counts[p.frame_style || "undefined"] || 0) + 1; });
console.log(`\n  統計: ${JSON.stringify(counts)}`);

// 2. 三種執行動作
let mapping = {};

if (resetAll) {
  console.log(`\n⚠️ RESET-ALL:${posts.length} 篇 → ${resetAll}`);
  posts.forEach(p => { mapping[p.id] = resetAll; });
} else if (inlineMapping) {
  try {
    mapping = JSON.parse(inlineMapping);
    for (const [id, fs] of Object.entries(mapping)) {
      if (!VALID.includes(fs)) {
        console.error(`❌ ${id} 的 frame_style '${fs}' 不在 4 選 1 內`);
        process.exit(1);
      }
    }
  } catch (e) {
    console.error("❌ mapping JSON 解析失敗:", e.message);
    process.exit(1);
  }
} else {
  console.log(`

互動模式 — 聖上要批次重設 frame_style

3 個常見 pattern:
  🅐 全站統一 (全部 vermilion):
     node scripts/set-frame-styles.mjs --reset-all vermilion

  🅑 4-frame 輪播 (D1=vermilion, D2=polaroid, D3=ink, D4=wash, D5=vermilion, ...):
     node scripts/set-frame-styles.mjs <custom-mapping>

  🅒 自訂 mapping (per-post):
     node scripts/set-frame-styles.mjs '{"<id-1>":"ink","<id-2>":"polaroid"}'

或告訴臣想要的 pattern,臣寫映射後跑
`);
  process.exit(0);
}

// 3. 批次 PATCH
console.log(`\n=== 開始批次 PATCH (${Object.keys(mapping).length} 篇) ===`);
let successCount = 0;
let failCount = 0;

for (const [id, targetFrame] of Object.entries(mapping)) {
  if (!posts.find(p => p.id === id)) {
    console.log(`  ⚠️ ${id} 不在當前過濾範圍,跳過`);
    continue;
  }
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`,
    {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ frame_style: targetFrame }),
    }
  );
  if (r.ok) {
    successCount++;
    console.log(`  ✅ ${id.slice(0,8)} → ${targetFrame}`);
  } else {
    failCount++;
    const err = await r.text();
    console.log(`  ❌ ${id.slice(0,8)} → ${targetFrame} (HTTP ${r.status}: ${err.slice(0,100)})`);
  }
}

console.log(`\n=== 結果:${successCount} 成功 / ${failCount} 失敗 ===`);

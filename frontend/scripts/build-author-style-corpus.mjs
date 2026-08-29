#!/usr/bin/env node
/**
 * 🆕 2026-08-29 聖上拍板 🅒 Step 1
 *
 * 「🅒 作者風格切換潤稿」reference 庫建立器
 *
 * 從 Supabase `posts` 表抓 5 位 canonical 作者各 3 篇真文當 few-shot,
 * 擷取前 50-70 字 (「作者開頭風格」最濃的地方), 寫進 `author_style_samples`。
 *
 * 聖上 8-29 拍板細節:
 *   - 5 位 canonical 作者 (alias 統一):
 *       阿喜 / 雅茹 / 阿橋 / 小伸 (門/門哥→小伸) / 義伸 (獨立)
 *   - 每位 3 篇 (不是 5 篇, 為了省 token)
 *   - 每篇擷前 50-70 字 (找最近的「。.！!」, 沒就 hard cut 70 + …)
 *   - 選樣規則:
 *       1. 排除 content < 30 字 (太短沒風格)
 *       2. 排除 content > 400 字 (太長, 已先潤過)
 *       3. 每 day_number 至多 1 篇 (避免同主題重複)
 *       4. 排序: image_url 非空優先, 其次 sort_order 由小到大
 *       5. 取前 3 篇
 *   - 冪等: ON CONFLICT (post_id) DO NOTHING (可重跑)
 *
 * 聖上「等我說好再上傳github」= hard commit gate, 本 script 不寫進 git 等聖上驗證
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ── 讀 .env.local (社內既有 script 慣例: 手動 regex parse, 避免 dotenv 套件) ──
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ 缺 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_KEY (.env.local)");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── 聖上拍板的 alias map ──
const ALIAS_MAP = {
  "阿喜": "阿喜",
  "雅茹": "雅茹",
  "阿橋": "阿橋",
  "小伸": "小伸",
  "門": "小伸", // 兒子另一化名
  "門哥": "小伸", // 兒子另一化名
  "義伸": "義伸", // 🆕 8-29 聖上拍板: 義伸獨立, 不是小伸
};

// 取樣設定
const N_PER_AUTHOR = 3;
const MIN_CONTENT_LEN = 30;
const MAX_CONTENT_LEN = 400;
const CLIP_MIN = 50;
const CLIP_MAX = 70;

/**
 * 擷取前 50-70 字, 優先在句號處切
 * 規則: 先看 50-70 區間內有沒有「。.！!」, 有就切在那一點
 *       沒就 hard cut 70 + …
 */
function clipSample(text) {
  const t = text.trim();
  for (let end = CLIP_MIN; end <= Math.min(CLIP_MAX, t.length); end++) {
    if ("。.！！".includes(t[end - 1])) {
      return { text: t.slice(0, end), len: end };
    }
  }
  if (t.length <= CLIP_MAX) return { text: t, len: t.length };
  return { text: t.slice(0, CLIP_MAX) + "…", len: CLIP_MAX + 1 };
}

/**
 * 從 items 選 N 篇, 每 day_number 至多 1 篇
 * 排序: image_url 非空優先, 其次 sort_order asc
 */
function selectN(items, n) {
  const sorted = [...items].sort((a, b) => {
    const ai = a.image_url ? 0 : 1;
    const bi = b.image_url ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  const chosen = [];
  const seenDay = new Set();
  for (const p of sorted) {
    if (seenDay.has(p.day_number)) continue;
    chosen.push(p);
    seenDay.add(p.day_number);
    if (chosen.length >= n) break;
  }
  return chosen;
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("🆕 2026-08-29 聖上拍板 🅒 Step 1: 作者風格 reference 庫");
  console.log("═══════════════════════════════════════════════════\n");

  // 1) 抓全部 posts
  const { data: posts, error } = await sb
    .from("posts")
    .select("id,day_number,title,author_name,content,image_url,sort_order")
    .order("sort_order", { ascending: true })
    .limit(500);

  if (error) {
    console.error("❌ 抓 posts 失敗:", error.message);
    process.exit(1);
  }
  console.log(`✓ 抓到 ${posts.length} 篇 posts\n`);

  // 2) 按 ALIAS_MAP 分桶
  const buckets = new Map();
  for (const p of posts) {
    const canon = ALIAS_MAP[p.author_name];
    if (!canon) continue;
    const content = (p.content || "").trim();
    if (content.length < MIN_CONTENT_LEN) continue;
    if (content.length > MAX_CONTENT_LEN) continue;
    if (!buckets.has(canon)) buckets.set(canon, []);
    buckets.get(canon).push(p);
  }

  // 3) 對每位 canonical 作者選 N 篇 + 擷取 50-70 字
  const inserts = [];
  const summary = [];
  for (const [canon, items] of [...buckets.entries()].sort()) {
    const chosen = selectN(items, N_PER_AUTHOR);
    console.log(`📝 ${canon} (${items.length} 篇合格 → 選 ${chosen.length} 篇):`);
    for (const p of chosen) {
      const clip = clipSample(p.content || "");
      console.log(`   • D${p.day_number} | sort=${p.sort_order} | 作者原始=${p.author_name} | 原文 ${(p.content || "").length} 字 → 擷取 ${clip.len} 字`);
      console.log(`     title: ${p.title || "(無)"}`);
      console.log(`     sample: ${clip.text}`);
      inserts.push({
        author_name: canon,
        post_id: p.id,
        content: clip.text,
        title: p.title || null,
        day_number: p.day_number,
        sort_order: p.sort_order,
      });
    }
    summary.push(`${canon}: ${chosen.length}/${items.length}`);
    console.log("");
  }

  // 4) 寫入 author_style_samples (冪等)
  if (inserts.length === 0) {
    console.log("⚠️  沒有任何 insert, 跳過寫入");
    return;
  }
  console.log(`── 寫入 ${inserts.length} 筆到 author_style_samples (ON CONFLICT DO NOTHING) ──`);
  const { data: upserted, error: insErr } = await sb
    .from("author_style_samples")
    .upsert(inserts, { onConflict: "post_id", ignoreDuplicates: true })
    .select("id, author_name, post_id");

  if (insErr) {
    console.error("❌ 寫入失敗:", insErr.message);
    process.exit(1);
  }

  // 5) 統計實際寫入
  const byAuthor = {};
  for (const r of upserted || []) {
    byAuthor[r.author_name] = (byAuthor[r.author_name] || 0) + 1;
  }
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`✅ Total: ${(upserted || []).length} 篇寫入 author_style_samples`);
  for (const [a, n] of Object.entries(byAuthor).sort()) {
    console.log(`   ${a}: ${n}`);
  }
  console.log("═══════════════════════════════════════════════════");
  console.log("📊 摘要:");
  for (const s of summary) console.log(`   ${s}`);
  console.log("\n🛑 等聖上看實際 DB 內容說 OK 才能進 Step 2 (polish route 改 few-shot)");
}

main().catch((e) => {
  console.error("💥 未預期錯誤:", e);
  process.exit(1);
});

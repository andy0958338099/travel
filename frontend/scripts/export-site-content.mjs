/**
 * 匯出站內內容快照（Supabase Postgres → Netlify Blobs + repo 靜態檔）
 *
 * 用法（在 frontend/ 底下執行）：
 *   set -a && . ./.env.local && set +a
 *   node scripts/export-site-content.mjs
 *
 * 產出：
 *   1. Netlify Blobs  → `content/site-content.json`（線上 runtime 直接讀）
 *   2. repo 靜態檔    → `data/archive/2026-10-06-story-blog/site-content.json`
 *                       （離線 / Blobs 故障時的保底；不含 author_token）
 *
 * ⚠️ 靜態快照刻意不含 author_token —— repo 是公開的。
 *    作者模式仍走 Supabase pooler（見 api/story-books/route.ts）。
 */

import { Client } from "pg";
import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

const ROOT = path.resolve(process.cwd());
const STATIC_OUT = path.join(
  ROOT,
  "data",
  "archive",
  "2026-10-06-story-blog",
  "site-content.json"
);
const CONTENT_KEY = "content/site-content.json";
const SITE_ID = process.env.NETLIFY_SITE_ID || "bc8f9511-8526-4e2c-a3ac-2fd2a15669b7";

function poolerConnectionString() {
  const raw = process.env.DATABASE_URL || "";
  const pwMatch = raw.match(/:([^:@]+)@/);
  if (!pwMatch) {
    throw new Error("DATABASE_URL 缺少密碼，無法建立 pooler 連線");
  }
  const password = decodeURIComponent(pwMatch[1]);
  const region = process.env.SUPABASE_DB_REGION || "aws-0-ap-northeast-2";
  const projectRef =
    process.env.SUPABASE_PROJECT_REF || "wydftkqwhebwlmdbosap";
  const port = process.env.SUPABASE_DB_PORT || "6543";
  return `postgres://postgres.${projectRef}:${encodeURIComponent(
    password
  )}@${region}.pooler.supabase.com:${port}/postgres`;
}

async function main() {
  const c = new Client({
    connectionString: poolerConnectionString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await c.connect();

  const posts = (
    await c.query(
      `select id, trip_id, day_number, sort_order, title, content, image_url,
              layout_type, author_name, created_at, updated_at, frame_style
         from posts order by sort_order asc`
    )
  ).rows;

  const trips = (await c.query("select * from trips")).rows;

  const books = (
    await c.query(
      `select book_id, trip_id, author_name, author_token, share_slug, is_public,
              title, layout_mode, selected_post_ids, page_count_estimate,
              view_count, created_at, updated_at
         from custom_story_books`
    )
  ).rows;

  await c.end();

  // 圖片 index：post id → blob key（由已上傳的 mapping 推導）
  const imageIndex = {};
  const mappingPath = "/tmp/blob-mapping.json";
  if (fs.existsSync(mappingPath)) {
    const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
    for (const p of posts) {
      if (mapping[p.id]) imageIndex[p.id] = mapping[p.id];
    }
  }

  const exportedAt = new Date().toISOString();
  const content = {
    version: exportedAt,
    exported_at: exportedAt,
    posts,
    trips,
    books,
    imageIndex,
  };

  // 1) 寫 Blobs（含 author_token，僅線上 runtime 可讀）
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (token) {
    const store = getStore({
      name: "blog-images",
      siteID: SITE_ID,
      token,
      apiURL: "https://api.netlify.com/api/v1",
    });
    await store.setJSON(CONTENT_KEY, content);
    console.log(`✓ Blobs 已更新: ${CONTENT_KEY}`);
  } else {
    console.warn("⚠ 缺少 NETLIFY_AUTH_TOKEN，略過 Blobs 寫入");
  }

  // 2) 寫 repo 靜態快照
  //    ⚠️ 這個路徑被 .gitignore 排除（frontend/.gitignore: /data/archive/），
  //    所以 author_token 留在本機是安全的，不會進版控。
  fs.mkdirSync(path.dirname(STATIC_OUT), { recursive: true });
  fs.writeFileSync(STATIC_OUT, JSON.stringify(content, null, 1), "utf8");
  const size = fs.statSync(STATIC_OUT).size;
  console.log(
    `✓ 靜態快照已寫入: ${STATIC_OUT} (${(size / 1024).toFixed(0)} KB, posts=${posts.length}, books=${books.length})`
  );

  // 3) 寫「可進版控」的公開快照（去 author_token）
  //    這個檔會被 import 進 server bundle，部署後保底可用。
  const PUBLIC_OUT = path.join(ROOT, "src", "data", "site-content.public.json");
  const publicBooks = books.map((b) => {
    const copy = { ...b };
    delete copy.author_token;
    return copy;
  });
  fs.mkdirSync(path.dirname(PUBLIC_OUT), { recursive: true });
  fs.writeFileSync(
    PUBLIC_OUT,
    JSON.stringify({ ...content, books: publicBooks }),
    "utf8"
  );
  console.log(
    `✓ 公開快照已寫入: ${PUBLIC_OUT} (${(fs.statSync(PUBLIC_OUT).size / 1024).toFixed(0)} KB, 無 author_token)`
  );

  const missing = posts.filter((p) => !imageIndex[p.id]);
  console.log(`  圖片 index 覆蓋: ${posts.length - missing.length}/${posts.length}`);
}

main().catch((e) => {
  console.error("匯出失敗:", e.message);
  process.exit(1);
});

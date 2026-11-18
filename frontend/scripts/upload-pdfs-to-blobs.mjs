/**
 * 上傳客製書 PDF 到 Netlify Blobs（線上正式站直接讀取，不用 Chromium）
 *
 * 用法（在 frontend/ 底下執行）：
 *   set -a && . ./.env.local && set +a
 *   node scripts/upload-pdfs-to-blobs.mjs
 *
 * 背景：Netlify serverless 沒有 Chromium，無法即時用 Puppeteer 生成 PDF。
 *   所以 PDF 在本機生成好（dev server 有系統 Chrome），再上傳到
 *   Blobs store `blog-images`，key = `pdf/<slug>-<sig>.pdf`。
 *
 * sig 演算法必須與 src/lib/pdfKey.ts 的 pdfSig() 完全一致：
 *   sha1(PDF_LAYOUT_VERSION | book_id | layout_mode | updated_at | 篇數 | 篇序 | range) 前 16 碼
 *   range 固定 "full"
 */

import { Client } from "pg";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { getStore } from "@netlify/blobs";

/**
 * ⚠️ 必須與 src/lib/pdfKey.ts 的 PDF_LAYOUT_VERSION 相同。
 * 版面組裝規則改變時（例：2026-11-17 章節改為「扉頁緊接本章文章」），
 * 這裡要跟著改，否則上傳的 key 跟線上算的不同 → 下載時找不到。
 */
const PDF_LAYOUT_VERSION = "v6-font-subset-source";

const ROOT = path.resolve(process.cwd());
const CACHE_DIR = path.join(ROOT, "..", "data", "pdf-cache");
/**
 * Netlify site ID。
 *
 * ⚠️ 2026-11-17: 移除原本的硬寫死 fallback。
 *    公開 repo 不該寫死站台識別碼 → 一律從環境變數取。
 *    缺變數就直接報錯,不要猜。
 */
const SITE_ID = process.env.NETLIFY_SITE_ID;
if (!SITE_ID) {
  console.error(
    "缺少 NETLIFY_SITE_ID（可從 Netlify 後台 → Site settings → API 取）",
  );
  process.exit(1);
}

function poolerConnectionString() {
  const raw = process.env.DATABASE_URL || "";
  const pwMatch = raw.match(/:([^:@]+)@/);
  if (!pwMatch) throw new Error("DATABASE_URL 缺少密碼");
  const password = decodeURIComponent(pwMatch[1]);
  const region = process.env.SUPABASE_DB_REGION || "aws-0-ap-northeast-2";
  const projectRef =
    process.env.SUPABASE_PROJECT_REF || "wydftkqwhebwlmdbosap";
  const port = process.env.SUPABASE_DB_PORT || "6543";
  return `postgres://postgres.${projectRef}:${encodeURIComponent(
    password
  )}@${region}.pooler.supabase.com:${port}/postgres`;
}

/** 把 updated_at 正規化成 ISO（與 blobPdf.ts normalizeIso 相同） */
function normalizeIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString();
}

/** 與 pdfKey.ts 一致的 sig 計算 */
function pdfSig({ bookId, layoutMode, updatedAt, postIds, range }) {
  return createHash("sha1")
    .update(
      [
        // ⚠️ 必須與 src/lib/pdfKey.ts 的 PDF_LAYOUT_VERSION 相同
        PDF_LAYOUT_VERSION,
        bookId,
        layoutMode,
        normalizeIso(updatedAt),
        postIds.length,
        postIds.join(","),
        range,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16);
}

async function main() {
  const c = new Client({
    connectionString: poolerConnectionString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await c.connect();
  const books = (
    await c.query(
      `select book_id, share_slug, layout_mode, selected_post_ids, updated_at, title
         from custom_story_books where is_public = true`
    )
  ).rows;
  await c.end();

  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token) throw new Error("缺少 NETLIFY_AUTH_TOKEN");
  const store = getStore({
    name: "blog-images",
    siteID: SITE_ID,
    token,
    apiURL: "https://api.netlify.com/api/v1",
  });

  let uploaded = 0;
  let skipped = 0;
  for (const b of books) {
    const ids = b.selected_post_ids || [];
    const sig = pdfSig({
      bookId: b.book_id,
      layoutMode: b.layout_mode,
      updatedAt: b.updated_at,
      postIds: ids,
      range: "full",
    });
    const key = `pdf/${b.share_slug}-${sig}.pdf`;

    // 本機磁碟快取檔名是 <slug>-<sig>.pdf
    const localPath = path.join(CACHE_DIR, `${b.share_slug}-${sig}.pdf`);
    if (!fs.existsSync(localPath)) {
      console.log(`✗ 快取不存在，跳過: ${b.share_slug} (${key})`);
      skipped++;
      continue;
    }
    const buf = fs.readFileSync(localPath);
    await store.set(key, buf, {
      metadata: { contentType: "application/pdf" },
    });
    console.log(
      `✓ ${key} (${(buf.length / 1024 / 1024).toFixed(1)} MB, ${ids.length} 篇)`,
    );
    uploaded++;
  }
  console.log(`\n完成：上傳 ${uploaded} 本，跳過 ${skipped} 本`);
}

main().catch((e) => {
  console.error("失敗:", e.message);
  process.exit(1);
});

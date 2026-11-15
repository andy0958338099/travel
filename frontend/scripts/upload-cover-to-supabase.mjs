#!/usr/bin/env node
/**
 * 一次性 script — 把 A5 Q 版封面 JPG 上傳到 Supabase Storage `travel-photos/covers/`
 * 拿到公開 CDN URL, 之後餵 CompoSio / Canva 做延伸設計
 *
 * 9-24 聖上指示: cover URL → CompoSio 上傳 → Canva asset_id → 在 Canva 建延伸設計
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

import path from "node:path";
import { fileURLToPath } from "node:url";

// 🆕 2026-11-13 搬遷 T7 後改用「跟著腳本走」的路徑 (不再硬編碼磁碟)
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// 跟 frontend/.env.local 對齊 — 同一個專案
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wydftkqwhebwlmdbosap.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!ANON_KEY) {
  console.error("[upload-cover] 缺 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (在 .env.local)");
  process.exit(1);
}

const SRC_FILE = path.resolve(SCRIPT_DIR, "../public/print-cover-q-version-2k.jpg");
const REMOTE_PATH = "covers/print-cover-q-version-2k.jpg";

const supabase = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

const buf = readFileSync(SRC_FILE);
console.error(`[upload-cover] 讀 ${SRC_FILE.split("/").pop()} ${(buf.length / 1024).toFixed(1)} KB`);

const { error } = await supabase.storage
  .from("travel-photos")
  .upload(REMOTE_PATH, buf, {
    upsert: true,
    contentType: "image/jpeg",
    cacheControl: "3600",
  });
if (error) {
  console.error("[upload-cover] ERROR:", error.message);
  process.exit(1);
}

const { data: pub } = supabase.storage.from("travel-photos").getPublicUrl(REMOTE_PATH);
console.log(JSON.stringify({ publicUrl: pub.publicUrl, path: REMOTE_PATH, bytes: buf.length }, null, 2));

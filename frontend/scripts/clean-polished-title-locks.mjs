#!/usr/bin/env node
/**
 * 🅒 8-9 聖上拍板: 刪除 polished_text 內所有 LLM 寫的標題 LOCK (# / ## 開頭)
 *   保留: ![](url) 圖片 / > 引言 / 散文段落 / 聖上原文
 *   刪除: <!--LOCK:id--> # 標題 <!--/LOCK--> 與 ## 標題
 *
 * 直接讀 Supabase, 改完寫回, 不走前端 API
 */
import fs from "node:fs";
import path from "node:path";

// 讀 .env.local (不依賴 dotenv 套件)
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");
const env = {};
for (const line of envLines) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}

const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
if (!SERVICE_KEY || !URL) {
  console.error("❌ SUPABASE_SERVICE_KEY 或 NEXT_PUBLIC_SUPABASE_URL 未設定");
  process.exit(1);
}

// 撈 d1 polished_text + text (read page 用 text 欄位!)
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};
const getRes = await fetch(
  `${URL}/rest/v1/story_blog_drafts?id=eq.d1&select=polished_text,text`,
  { headers }
);
const rows = await getRes.json();
if (!Array.isArray(rows) || rows.length === 0) {
  console.error("❌ 找不到 d1 row");
  process.exit(1);
}
const beforePolished = rows[0].polished_text || "";
const beforeText = rows[0].text || "";
console.log("📏 before polished_text:", beforePolished.length, "chars");
console.log("📏 before text:        ", beforeText.length, "chars");

// Regex: 匹配 <!--LOCK:id-->\n(# 或 ## 標題)\n<!--/LOCK--> 整段 LOCK + 周圍換行
//   嚴格匹配: LOCK 內只能是「標題」這一行, 不准混其他文字 (避免誤刪圖片/散文 LOCK)
//   LOCK id 允許 [a-z0-9-]+ (DB 內含 "lllllllllle1-1-1-1-..." 這種連字號)
const removeTitleLocks = (text) => {
  return text.replace(
    /\n?(<!--LOCK:[a-z0-9-]+-->\r?\n#{1,2}\s+[^\r\n]+\r?\n<!--\/LOCK-->)\r?\n?/g,
    "\n"
  );
};

const afterPolished = removeTitleLocks(beforePolished);
const afterText = removeTitleLocks(beforeText);
console.log("📏 after polished_text:", afterPolished.length, "chars");
console.log("📏 after text:        ", afterText.length, "chars");
console.log("📉 polished 刪除:", beforePolished.length - afterPolished.length, "chars");
console.log("📉 text 刪除:    ", beforeText.length - afterText.length, "chars");

// 驗證刪了什麼 (只看 text 欄位的 LOCK 因為 read page 用 text)
const beforeTitles = (beforeText.match(/<!--LOCK:[a-z0-9-]+-->\r?\n#{1,2}\s+[^\r\n]+\r?\n<!--\/LOCK-->/g) || []);
console.log("🗑️  text 欄位刪掉的標題 LOCK 數量:", beforeTitles.length);
beforeTitles.forEach((t, i) => {
  const m = t.match(/#{1,2}\s+([^\r\n]+)/);
  if (m) console.log(`   ${i + 1}. ${m[1].trim()}`);
});

// 確認 after 內還有 LOCK (沒誤刪圖片/引言/散文)
const beforeLockCount = (beforeText.match(/<!--LOCK:/g) || []).length;
const afterLockCount = (afterText.match(/<!--LOCK:/g) || []).length;
console.log("🔒 text LOCK 總數:", afterLockCount, "(before:", beforeLockCount, ")");

// 乾跑 (--dry-run) vs 實際寫入
if (process.argv.includes("--dry-run")) {
  console.log("\n🟡 DRY RUN — 不寫入");
  console.log("text after preview (前 800 chars):");
  console.log(afterText.slice(0, 800));
  process.exit(0);
}

// PATCH 回 Supabase (同時更新 polished_text 跟 text)
const patchRes = await fetch(`${URL}/rest/v1/story_blog_drafts?id=eq.d1`, {
  method: "PATCH",
  headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({ polished_text: afterPolished, text: afterText }),
});
console.log("📤 PATCH status:", patchRes.status);
if (!patchRes.ok) {
  const errBody = await patchRes.text();
  console.error("❌ PATCH failed:", errBody);
  process.exit(1);
}
console.log("✅ 完成 — polished_text 跟 text 兩欄都已刪除標題 LOCK");
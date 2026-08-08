#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const envPath = path.join(process.cwd(), ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
}
const KEY = env.SUPABASE_SERVICE_KEY;
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const res = await fetch(`${URL}/rest/v1/story_blog_drafts?id=eq.d1&select=polished_text`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
});
const rows = await res.json();
const text = rows[0].polished_text;
console.log("totalLen:", text.length);
console.log("LOCK 總數:", (text.match(/<!--LOCK:/g) || []).length);

// Trace 1: 找所有 LOCK 內是 # 開頭的
const titleLocks = [...text.matchAll(/(<!--LOCK:[a-z0-9]+-->)([\s\S]*?)(<!--\/LOCK-->)/g)];
console.log("regex all LOCK 總數:", titleLocks.length);

let titleCount = 0;
for (const m of titleLocks) {
  const inner = m[2].trim();  // LOCK 內文, 去頭尾空白
  if (inner.match(/^#{1,2}\s+/)) {
    titleCount++;
    const title = inner.match(/^#{1,2}\s+([^\n]+)/)[1];
    console.log("  TITLE LOCK:", JSON.stringify(m[1]), "→", JSON.stringify(title));
  }
}
console.log("標題 LOCK 數:", titleCount);

// Trace 2: 真實 regex 驗證
const re = /\n?(<!--LOCK:[a-z0-9]+-->\r?\n#{1,2}\s+[^\r\n]+\r?\n<!--\/LOCK-->)\r?\n?/g;
const matches = [...text.matchAll(re)];
console.log("dry regex match count:", matches.length);
matches.forEach((m, i) => {
  const title = m[0].match(/#{1,2}\s+([^\r\n]+)/);
  console.log(`  ${i+1}.`, title ? title[1] : '???');
});
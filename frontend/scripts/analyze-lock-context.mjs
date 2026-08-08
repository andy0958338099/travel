#!/usr/bin/env node
// 把每條標題 LOCK 連同前後 100 chars 上下文印出來, 看上下文是 LLM 還是聖上原文
import fs from "node:fs";
import path from "node:path";
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8").split("\n")) {
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

// 找所有 LOCK
const lockRe = /(<!--LOCK:[a-z0-9-]+-->\r?\n([\s\S]*?)\r?\n<!--\/LOCK-->)/g;
const matches = [...text.matchAll(lockRe)];

console.log(`總 LOCK: ${matches.length}`);
console.log();
console.log("=== 所有 LOCK 內文 (前 80 chars) + 是否標題 ===");
for (const m of matches) {
  const fullLock = m[1];
  const inner = m[2].trim();
  const isTitle = inner.match(/^#{1,2}\s+/) && !inner.includes('\n');
  const preview = inner.slice(0, 80).replace(/\n/g, ' / ');
  console.log(`${isTitle ? '🏷️ ' : '  '} ${preview}`);
}
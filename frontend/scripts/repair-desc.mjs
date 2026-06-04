// Repair desc for 13 ready/generating manga rows that are missing or broken ('...').
// Calls MiniMax chat directly + writes short_desc / medium_desc / long_desc / panel_X_caption to Supabase.
// Avoids Worker (which has the JSON-parse bug).
//
// Run: node scripts/repair-desc.mjs
import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SB_KEY = "sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g";
const MM_KEY = process.env.MINIMAX_API_KEY;
if (!MM_KEY) {
  console.error("MINIMAX_API_KEY env var required");
  process.exit(1);
}

// 4 個 retry 目標：之前 2400 max_tokens 截斷 / chat 偷懶
const SOURCES = [
  { name: "南高峰", type: "attraction", region: "浙江省杭州市西湖區" },
  { name: "永福寺", type: "attraction", region: "浙江省杭州市西湖區" },
  { name: "蘇堤", type: "attraction", region: "浙江省杭州市西湖" },
  { name: "河坊街", type: "attraction", region: "浙江省杭州市上城區" },
];

const PROGRESS_FILE = "/tmp/manga-repair-desc-v3.json";

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

async function mmChat(system, user, maxTokens = 4096) {
  const r = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      max_tokens: maxTokens,
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    throw new Error(`mmChat HTTP ${r.status}: ${await r.text()}`);
  }
  const data = await r.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractBalancedJson(text) {
  // 從第一個 { 開始 brace-count 到對應的 }，避免 greedy 抓到外層
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function robustJsonParse(text) {
  // 1. try direct
  try {
    return JSON.parse(text);
  } catch {}
  // 2. find balanced {...} block (no greedy)
  let raw = extractBalancedJson(text);
  if (!raw) throw new Error("no balanced JSON object in response");
  // 3. try parse that
  try {
    return JSON.parse(raw);
  } catch (e) {
    // 4. try fixing common issues — strip control chars, fix trailing comma, curly quotes
    const fixed = raw
      .replace(/[\u0000-\u001f]/g, " ")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
    return JSON.parse(fixed);
  }
}

async function generateDesc(src) {
  const sys = `你是一位專業旅遊作家，專寫繁體中文。請為${src.type === "attraction" ? "景點" : "美食"}用「幽默風趣、穿插冷笑話、像台灣導遊阿布吉那種台味十足」的風格，輸出 3 段介紹文：
- short_100: 100 字以內的極簡版（IG 貼文用）— 必須是完整的中文文案，不能是 "..." 或 placeholder
- medium_300: 300 字左右的精簡版（卡片介紹用）— 同上必須是完整文案
- long_800: 800 字左右的深度版（攻略文章用）— 同上必須是完整文案

【鐵則】所有 3 個欄位都必須填入真實繁體中文文案，絕對不能用 "..." 或省略號或空字串。
【鐵則】嚴格只回傳 JSON 物件，格式：{"short_100":"...","medium_300":"...","long_800":"..."}。
【鐵則】不要加任何 markdown 區塊（不要 \`\`\`json）、註解、說明文字。直接 JSON 物件開頭。`;

  const usr = `景點：${src.name}
地區：${src.region || "中國江南"}

請生成 3 段介紹文。記得使用繁體中文、要有笑點跟畫面感。`;

  const text = await mmChat(sys, usr);
  log(`  chat 回應 (${text.length} chars): ${text.slice(0, 80).replace(/\n/g, " ")}…`);

  const parsed = robustJsonParse(text);
  const shortDesc = String(parsed.short_100 || "").trim();
  const mediumDesc = String(parsed.medium_300 || "").trim();
  const longDesc = String(parsed.long_800 || "").trim();

  if (!shortDesc || shortDesc === "...") {
    throw new Error(`short_100 missing or '...': ${shortDesc}`);
  }
  return { shortDesc, mediumDesc, longDesc };
}

async function generateCaptions(src, shortDesc) {
  const sys = `你是 4 格漫畫的文案助手。根據景點/美食名稱和它的 100 字介紹，為 4 個 panel 各寫一段簡短說明（每段 ≤ 30 字、繁體中文、有畫面感、像漫畫旁白）。

嚴格只回傳 JSON 物件，格式：
{"panel_1":"…","panel_2":"…","panel_3":"…","panel_4":"…"}

不要加任何其他文字。`;

  const usr = `景點：${src.name}
類型：${src.type === "attraction" ? "景點" : "美食"}
100字介紹：${shortDesc}

請為 4 個 panel 各寫一段簡短說明。`;

  const text = await mmChat(sys, usr);
  const parsed = robustJsonParse(text);
  return {
    1: String(parsed.panel_1 || "").trim(),
    2: String(parsed.panel_2 || "").trim(),
    3: String(parsed.panel_3 || "").trim(),
    4: String(parsed.panel_4 || "").trim(),
  };
}

async function patchRow(id, fields) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_mangas?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
    }
  );
  if (!r.ok) {
    throw new Error(`Supabase PATCH HTTP ${r.status}: ${await r.text()}`);
  }
}

async function getMangaId(sourceName) {
  const enc = encodeURIComponent(sourceName);
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_mangas?source_id=eq.${enc}&select=id,status&order=updated_at.desc&limit=1`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  const arr = await r.json();
  if (!arr || !arr[0]) throw new Error(`No manga found for source: ${sourceName}`);
  return arr[0];
}

async function processOne(src, results) {
  const { id, status } = await getMangaId(src.name);
  log(`▶ [${src.name}] id=${id.slice(0, 8)} status=${status}`);

  // skip if already has good desc (re-runs safe)
  if (
    results.find((r) => r.source === src.name && r.status === "fixed")
  ) {
    log(`  ⏭ already fixed, skip`);
    return;
  }

  try {
    const { shortDesc, mediumDesc, longDesc } = await generateDesc(src);
    log(`  ✓ desc: short=${shortDesc.length}ch medium=${mediumDesc.length}ch long=${longDesc.length}ch`);

    const captions = await generateCaptions(src, shortDesc);
    log(`  ✓ captions: ${JSON.stringify(captions)}`);

    // Patch: write all desc + captions, mark status=ready if currently generating
    const fields = {
      short_desc: shortDesc,
      medium_desc: mediumDesc,
      long_desc: longDesc,
      panel_1_title: "歡迎光臨",
      panel_1_caption: captions[1] || "歡迎光臨！",
      panel_2_title: "歷史文化",
      panel_2_caption: captions[2] || "歷史人文薈萃",
      panel_3_title: "必吃美食",
      panel_3_caption: captions[3] || "必吃必拍",
      panel_4_title: "打卡攻略",
      panel_4_caption: captions[4] || "打卡攻略",
    };
    if (status === "generating") {
      fields.status = "ready";
      log(`  ↻ status: generating → ready`);
    }

    await patchRow(id, fields);
    log(`  ✅ ${src.name} fixed`);
    results.push({ source: src.name, status: "fixed", id });
  } catch (e) {
    log(`  ❌ ${src.name} FAILED: ${e.message}`);
    results.push({ source: src.name, status: "failed", error: e.message });
  }
}

async function main() {
  log(`=== repair-desc v2 start: ${SOURCES.length} sources ===`);
  const results = [];
  for (const src of SOURCES) {
    await processOne(src, results);
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ results, total: SOURCES.length }, null, 2));
    // pause to avoid rate limit
    await new Promise((r) => setTimeout(r, 1500));
  }
  const ok = results.filter((r) => r.status === "fixed").length;
  const fail = results.filter((r) => r.status === "failed").length;
  log(`\n=== DONE: ${ok} fixed, ${fail} failed ===`);
  if (fail > 0) {
    log("Failures:");
    results.filter((r) => r.status === "failed").forEach((r) => log(`  - ${r.source}: ${r.error}`));
  }
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});

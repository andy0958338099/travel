// 修昭明書院（4/4 panels but status 卡 generating）+ 補 desc
// 昭明書院 panel 圖都好了,只缺故事跟改 status
import fs from "node:fs";

const SUPABASE_URL = "https://bphhksbzedadaoscjctz.supabase.co";
const SB_KEY = "sb_publishable_p9okAW11Ss8f9dlGru4vag_YkO8u9-g";
const MM_KEY = process.env.MINIMAX_API_KEY;
if (!MM_KEY) { console.error("MINIMAX_API_KEY required"); process.exit(1); }

async function mmChat(system, user) {
  const r = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      max_tokens: 4096,
      temperature: 0.8,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return (await r.json()).choices?.[0]?.message?.content || "";
}

function extractBalancedJson(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function robustJsonParse(text) {
  try { return JSON.parse(text); } catch {}
  let raw = extractBalancedJson(text);
  if (!raw) throw new Error("no balanced JSON");
  try { return JSON.parse(raw); } catch {
    return JSON.parse(raw.replace(/[\u0000-\u001f]/g, " ").replace(/,\s*([}\]])/g, "$1"));
  }
}

async function main() {
  // 1. 撈昭明書院
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_mangas?source_id=eq.${encodeURIComponent("昭明書院")}&select=id,status,panel_1_url,panel_2_url,panel_3_url,panel_4_url&limit=1`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  const arr = await r.json();
  if (!arr?.[0]) { console.error("昭明書院 not found"); return; }
  const m = arr[0];
  console.log(`昭明書院 id=${m.id} status=${m.status}`);
  const panels = [m.panel_1_url, m.panel_2_url, m.panel_3_url, m.panel_4_url].filter(Boolean).length;
  console.log(`  panels: ${panels}/4`);
  if (panels < 4) { console.error("panels not complete, skip"); return; }

  // 2. 跑 chat
  const sys = `你是一位專業旅遊作家，專寫繁體中文。請為景點用「幽默風趣、穿插冷笑話、像台灣導遊阿布吉那種台味十足」的風格，輸出 3 段介紹文：
- short_100: 100 字以內的極簡版（IG 貼文用）— 必須是完整的中文文案
- medium_300: 300 字左右的精簡版（卡片介紹用）— 同上
- long_800: 800 字左右的深度版（攻略文章用）— 同上

【鐵則】所有 3 個欄位都必須填入真實繁體中文文案，絕對不能用 "..." 或省略號或空字串。
【鐵則】嚴格只回傳 JSON 物件，格式：{"short_100":"...","medium_300":"...","long_800":"..."}。
【鐵則】不要加任何 markdown 區塊（不要 \`\`\`json）、註解、說明文字。`;

  const usr = `景點：昭明書院
地區：浙江省湖州市南潯區

請生成 3 段介紹文。`;

  const descText = await mmChat(sys, usr);
  const desc = robustJsonParse(descText);
  const shortDesc = String(desc.short_100 || "").trim();
  const mediumDesc = String(desc.medium_300 || "").trim();
  const longDesc = String(desc.long_800 || "").trim();
  console.log(`  short=${shortDesc.length}ch medium=${mediumDesc.length}ch long=${longDesc.length}ch`);
  if (!shortDesc || shortDesc === "...") { console.error("short fail"); return; }

  // 3. 跑 caption
  const capSys = `你是 4 格漫畫的文案助手。根據景點 100 字介紹，為 4 個 panel 各寫一段簡短說明（每段 ≤ 30 字、繁體中文、有畫面感、像漫畫旁白）。

嚴格只回傳 JSON 物件，格式：{"panel_1":"…","panel_2":"…","panel_3":"…","panel_4":"…"}

不要加任何其他文字。`;

  const capUsr = `景點：昭明書院
100字介紹：${shortDesc}

請為 4 個 panel 各寫一段簡短說明。`;

  const capText = await mmChat(capSys, capUsr);
  const cap = robustJsonParse(capText);
  const captions = {
    1: String(cap.panel_1 || "歡迎光臨！").trim(),
    2: String(cap.panel_2 || "歷史人文薈萃").trim(),
    3: String(cap.panel_3 || "必吃必拍").trim(),
    4: String(cap.panel_4 || "打卡攻略").trim(),
  };
  console.log(`  captions: ${JSON.stringify(captions)}`);

  // 4. 寫回 DB
  const patch = await fetch(
    `${SUPABASE_URL}/rest/v1/travel_mangas?id=eq.${m.id}`,
    {
      method: "PATCH",
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        short_desc: shortDesc,
        medium_desc: mediumDesc,
        long_desc: longDesc,
        panel_1_title: "歡迎光臨",
        panel_1_caption: captions[1],
        panel_2_title: "歷史文化",
        panel_2_caption: captions[2],
        panel_3_title: "必吃美食",
        panel_3_caption: captions[3],
        panel_4_title: "打卡攻略",
        panel_4_caption: captions[4],
        status: "ready",
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!patch.ok) {
    console.error("PATCH fail:", patch.status, await patch.text());
    return;
  }
  console.log("✅ 昭明書院 fixed (status: generating → ready)");
}

main().catch((e) => { console.error("fatal:", e); process.exit(1); });

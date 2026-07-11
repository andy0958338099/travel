#!/usr/bin/env node
/**
 * prebuild-vlog-pdfs.mjs
 *
 * 江楠 vlog 8 日 x 4 劇本 = 32 PDF 預先生成腳本
 *
 * 設計:
 *   - 讀 src/app/vlog/data.ts (透過 extract-vlog-data.mjs 把 .ts 經
 *     node --experimental-strip-types 抽出成 JSON)
 *   - 對每個 (scriptId, dayIdx) 構造完整 HTML 字串 (內嵌 CSS + Supabase CDN 圖 URL)
 *   - puppeteer 一個 Chrome instance + 多 page 平行 (4 worker page 跑 4 劇本)
 *   - page.setContent 等 networkidle0 (圖全部進來)
 *   - page.pdf({ format:'A4', printBackground:true, preferCSSPageSize:false })
 *   - 寫到 public/vlog-pdfs/{A|B|C|D}/day{1-8}.pdf
 *
 * 視覺: 複用 src/app/vlog/[scriptId]/DayPdfExport.tsx 的排版邏輯, 但
 *   - 不用 jsPDF (因為 puppeteer 直接收 HTML 比較漂亮)
 *   - 不用 client 端 fetch + base64 (Supabase 公開 bucket 給 puppeteer 抓就好)
 *   - 用 page-break-inside: avoid 保證場景/鏡頭不被切
 *
 * 用法:
 *   node scripts/prebuild-vlog-pdfs.mjs                     # 跑全部 32 PDF
 *   node scripts/prebuild-vlog-pdfs.mjs --script D          # 只跑劇本 D (8 PDF)
 *   node scripts/prebuild-vlog-pdfs.mjs --day 3             # 只跑所有劇本 Day 3 (4 PDF)
 *   node scripts/prebuild-vlog-pdfs.mjs --dry               # dry run, 只 print 規劃
 *   PUPPETEER_EXECUTABLE_PATH=/path/to/Chrome node scripts/prebuild-vlog-pdfs.mjs
 *
 * 環境變數:
 *   PUPPETEER_EXECUTABLE_PATH - Chrome/Chromium 執行檔路徑 (Netlify build 必設)
 *   VLOG_PDF_VERBOSE=1        - 印每個 PDF 詳細 timing
 *
 * 臣 (Brian) 留: 此檔將來很可能再次編輯, 結構保持清楚, 區段分明。
 */

import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, basename } from "node:path";
import { mkdirSync, existsSync, writeFileSync, statSync, readFileSync, readdirSync } from "node:fs";
import { performance } from "node:perf_hooks";

// ─────────────────────────────────────────────────────────────────────
// 0. CLI 參數解析
// ─────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const FLAGS = {
  dry: args.includes("--dry"),
  script: (() => {
    const i = args.indexOf("--script");
    return i > -1 ? (args[i + 1] || "").toUpperCase() : null;
  })(),
  day: (() => {
    const i = args.indexOf("--day");
    return i > -1 ? parseInt(args[i + 1], 10) : null;
  })(),
  help: args.includes("--help") || args.includes("-h"),
};

if (FLAGS.help) {
  console.log(`
江楠 vlog 32 PDF 預生腳本

  node scripts/prebuild-vlog-pdfs.mjs                       跑全部 32 PDF
  node scripts/prebuild-vlog-pdfs.mjs --script D            只跑劇本 D (8 PDF)
  node scripts/prebuild-vlog-pdfs.mjs --day 3               跑 4 劇本的 Day 3
  node scripts/prebuild-vlog-pdfs.mjs --dry                 dry run
  node scripts/prebuild-vlog-pdfs.mjs --script A --day 1    只跑 1 個 (試水溫)
`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────
// 1. 抽 vlog 資料 from data.ts
// ─────────────────────────────────────────────────────────────────────

console.log(`🎬 vlog PDF 預生開始${FLAGS.dry ? " (DRY RUN)" : ""}`);

const overallStart = performance.now();
const VERBOSE = process.env.VLOG_PDF_VERBOSE === "1";

console.log(`📦 抽出 vlog data.ts ...`);
const extractStart = performance.now();
const extractProc = spawnSync(
  process.execPath,
  ["--experimental-strip-types", resolve(__dirname, "extract-vlog-data.mjs")],
  { encoding: "utf8", cwd: FRONTEND_ROOT, maxBuffer: 256 * 1024 * 1024 }
);
if (extractProc.status !== 0) {
  console.error("❌ 抽資料失敗:");
  console.error(extractProc.stderr);
  process.exit(1);
}
// extract-vlog-data.mjs 把資料印到 stdout (debug 訊息去 stderr)
const vlogData = JSON.parse(extractProc.stdout);
console.log(
  `   ⏱  ${(performance.now() - extractStart).toFixed(0)} ms · ${
    Object.keys(vlogData.scripts).length
  } 劇本 × ${vlogData.scripts.A.dayBlocks.length} 天`
);

// ─────────────────────────────────────────────────────────────────────
// 2. CSS / 江楠 5 色 / 字體 — 從 globals.css 抄來 (Server 端沒接 CSS var, 寫死值)
// ─────────────────────────────────────────────────────────────────────

// 聖上 2026-07-11 拍板的江楠 5 色 (取自 frontend/src/app/globals.css L16-L24)
const COLORS = {
  vermilion: "#dc2626",      // --jn-vermilion  朱紅
  vermilionDeep: "#991b1b",  // --jn-vermilion-deep 硃砂深紅
  gold: "#f59e0b",           // --jn-gold         金
  goldLight: "#fbbf24",      // --jn-gold-light   金光
  ink: "#1e293b",            // --jn-ink          墨黑
  paper: "#fafaf9",          // --jn-paper        宣紙
  paperWarm: "#fff7ed",      // --jn-paper-warm   暖宣紙
  blue: "#0e7490",           // --jn-blue         青花
};
const COLOR_FOR_SCRIPT = {
  A: COLORS.vermilion,
  B: COLORS.gold,
  C: COLORS.blue,
  D: COLORS.ink,
};

/**
 * 共用 CSS — 給 page.pdf({...}) 用, printBackground:true 必須
 * 重點:
 *   - A4 width 793px @ 96dpi (DayPdfExport.tsx 的 PDF_WIDTH_PX)
 *   - page-break-inside: avoid 給場景卡片 + 鏡頭表格 (聖上拍板)
 *   - Noto Serif TC 從 Google Fonts 抓 (server 本地沒裝)
 *   - 中文內文 14-16px / 標題 17-20px / 圖水平置中 / 場景朱紅底白字 chip
 */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700;900&display=swap');

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: ${COLORS.paper}; color: ${COLORS.ink}; }
body { font-family: 'Noto Serif TC', 'Songti TC', 'Source Han Serif TC', 'PingFang TC', 'Microsoft JhengHei', serif; }

.page {
  width: 793px;             /* A4 width @ 96dpi */
  padding: 36px 44px;
  background: ${COLORS.paper};
  page-break-after: always; /* 每張 "page" div 一個 A4 */
  page-break-inside: auto;
}
.page:last-child { page-break-after: auto; }

/* === Header === */
.hdr-scriptid {
  font-size: 36px; font-weight: 900; color: #1e293b; opacity: .9;
  display: inline-block; line-height: 1; margin-right: 12px; vertical-align: baseline;
}
.hdr-chip {
  display: inline-block; padding: 4px 12px; border-radius: 999px;
  background: <ACCENT>; color: #fff; font-size: 12px;
  font-weight: 700; letter-spacing: .1em;
}
.hdr-title { font-size: 19px; font-weight: 800; color: ${COLORS.ink}; margin: 14px 0 4px; line-height: 1.3; }
.hdr-sub { font-size: 12px; color: #666; font-weight: 500; }
.hdr-rule { border-bottom: 3px solid <ACCENT>; padding-bottom: 12px; margin-bottom: 16px; }

.theme-box {
  font-size: 13px; color: #333; font-style: italic;
  margin: 0 0 14px; padding: 10px 14px;
  border-left: 3px solid <ACCENT>; background: #f5f5f4;
  border-radius: 4px; line-height: 1.65;
}
.theme-box b { color: <ACCENT>; font-weight: 800; font-style: normal; }

.meta-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-bottom: 18px;
}
.meta-card {
  background: #f5f5f4; padding: 10px 14px;
  border-radius: 6px; border-left: 3px solid <ACCENT>;
}
.meta-card .lbl {
  font-size: 10px; font-weight: 700; color: <ACCENT>;
  margin-bottom: 5px; text-transform: uppercase; letter-spacing: .12em;
}
.meta-card .val { font-size: 13px; line-height: 1.7; color: #333; white-space: pre-wrap; }

.h-section {
  font-size: 17px; font-weight: 800; color: <ACCENT>;
  margin: 20px 0 12px; padding-bottom: 6px;
  border-bottom: 2px solid <ACCENT>;
}

/* === 場景卡片 === */
.scene-pair {
  display: flex; gap: 12px; justify-content: space-between;
  margin: 0 0 14px;
  page-break-inside: avoid;
}
.scene-card {
  width: calc(50% - 6px);
  padding: 14px 16px;
  border-left: 4px solid <ACCENT>;
  background: #fafaf9;
  border-radius: 6px;
  page-break-inside: avoid;
}
.scene-title {
  font-size: 15px; font-weight: 800; color: <ACCENT>;
  margin-bottom: 8px; line-height: 1.45;
  display: flex; align-items: center; gap: 8px;
}
.scene-title .chip {
  display: inline-block; padding: 2px 8px; background: <ACCENT>; color: #fff;
  border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: .1em;
  white-space: nowrap;
}
.scene-body {
  font-size: 14px; line-height: 1.85; color: ${COLORS.ink};
  white-space: pre-wrap;
}

.img-grid {
  display: flex; flex-wrap: wrap; gap: 10px;
  justify-content: center;
  margin: 12px 0 4px;
  page-break-inside: avoid;
}
.img-card {
  margin: 0; padding: 6px 6px 8px;
  border: 1px solid <ACCENT>22; border-radius: 6px;
  background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.05);
  text-align: center; width: 100%; max-width: 240px;
  page-break-inside: avoid;
}
.img-card .ts {
  font-size: 9.5px; color: <ACCENT>; font-weight: 700;
  margin-bottom: 4px; letter-spacing: .05em; font-family: 'SF Mono', 'Menlo', monospace;
}
.img-card img {
  width: 100%; max-width: 240px; max-height: 240px;
  object-fit: contain; border-radius: 4px; display: inline-block;
  box-shadow: 0 1px 4px rgba(0,0,0,.08); background: #f5f5f4;
}

/* === 鏡頭腳本 === */
.shots-chunk {
  background: ${COLORS.paperWarm};
  padding: 10px 14px; border-radius: 5px;
  margin-bottom: 10px;
  page-break-inside: avoid;
}
.shot-row {
  display: flex; gap: 10px; font-size: 13px; line-height: 1.6;
  margin: 4px 0; padding: 3px 0;
  border-bottom: 1px dotted #e5e7eb;
}
.shot-row .t {
  font-family: 'SF Mono', 'Menlo', monospace; color: <ACCENT>;
  font-weight: 700; flex-shrink: 0; min-width: 95px;
}
.shot-row .d { color: #333; flex: 1; }

.footer {
  border-top: 1px solid #e5e7eb;
  padding: 14px 0 24px; margin-top: 18px;
  text-align: center; font-size: 10px; color: #aaa;
}

/* 防止段落被裁切的保險 */
h1, h2, h3, p { page-break-after: avoid; }
`;

// ─────────────────────────────────────────────────────────────────────
// 3. 解析器 — 從 DayPdfExport.tsx L55-89 移植 (純文字, 無 DOM)
//    標籤化「聖上滿意」的視覺來源 — 之後該檔若修改也要跟著改。
// ─────────────────────────────────────────────────────────────────────

/** 從 shotsText 抽出所有 🖼 AI 生圖行 → { time, src, prompt } */
function parseAiprompts(shotsText) {
  const out = [];
  if (!shotsText || shotsText.startsWith("（待填")) return out;
  for (const line of shotsText.split("\n")) {
    // 跟 DayPdfExport L58-66 完全一致: time + 🖼 + model + size + 可選 src=URL + — + "prompt"
    const m = line.match(
      /^(\S+)\s+🖼\s+\S+\s+\S+(?:\s+src=(\S+))?\s+—\s+"?(.+?)"?\s*$/
    );
    if (m) {
      out.push({ time: m[1], src: m[2] || "", prompt: m[3] });
    }
  }
  return out;
}

/** 從 shotsText 抽出所有非 🖼 行 → 鏡頭腳本 { time, desc } */
function parseCameraShots(shotsText) {
  if (!shotsText || shotsText.startsWith("（待填")) return [];
  const out = [];
  for (const line of shotsText.split("\n").filter((l) => l.trim())) {
    if (/🖼/.test(line)) continue; // 跳過 AI 生圖行
    const m = line.match(/^(\S+)\s+(.+)$/);
    out.push(m ? { time: m[1], desc: m[2] } : { time: "", desc: line });
  }
  return out;
}

/** dialogue 拆場景 — 用「（場景）」標頭分行; 回 [{ title, body }] */
function parseDialogueScenes(dialogue) {
  if (!dialogue || dialogue.startsWith("（待填")) return [];
  return dialogue
    .split(/\n(?=（[^）]+）)/)
    .filter((b) => b.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      return { title: lines[0], body: lines.slice(1).join("\n").trim() };
    });
}

// XML / HTML entity escape — 防 query / shot desc 內的特殊字破壞排版
function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────────
// 3b. 圖片預處理 — Supabase 2K 圖先 fetch + sharp 縮成 600w JPEG q70
//     原因: puppeteer page.pdf() 會內嵌原始圖完整 JPEG 流
//           1 張 3MB 2K 圖 → PDF 增 12MB (實測 48MB/PDF)
//     策略: 把 src=URL 換成 data:image/jpeg;base64,... (HTML inline)
//           puppeteer 不需抓檔案, 也不需 network, 確保使用 sharp 處理後小圖
//           失敗自動 fallback 回 Supabase URL (會大 PDF, 但至少能跑)
// ─────────────────────────────────────────────────────────────────────

const IMG_CACHE_DIR = resolve(FRONTEND_ROOT, ".next/vlog-pdf-imgcache");
mkdirSync(IMG_CACHE_DIR, { recursive: true });

// 2026-07-12 修正: 600px + q70 (原 800+78 跑出 48MB/PDF)
// 600px @ 2x retina 240px 顯示仍然 crisp, q70 視覺幾乎無差
// 8 圖 × ~30KB = 240KB base64, PDF 內嵌後 < 1MB
const IMG_MAX_WIDTH = 600;
const IMG_QUALITY = 70;

let _sharp = null;
async function loadSharp() {
  if (_sharp) return _sharp;  // 已 cache, 直接返回 (sharp function, 不是 module obj)
  try {
    const mod = await import("sharp");
    _sharp = mod.default || mod;
    return _sharp;
  } catch (e) {
    console.warn("   ⚠️ sharp 沒裝好, fallback 給 puppeteer 抓原圖 (PDF 會很大)");
    return null;
  }
}

/** 從 text 抽所有 src=URL, fetch + sharp 縮圖, 寫到本地 cache, 回 [urlMap] */
async function prepareImages(shotsText, dayIdx) {
  if (!shotsText) return new Map();
  const cacheDayDir = join(IMG_CACHE_DIR, `day${dayIdx}`);
  mkdirSync(cacheDayDir, { recursive: true });
  const urls = new Set();
  for (const line of shotsText.split("\n")) {
    const m = line.match(/src=(\S+)/);
    if (m) urls.add(m[1]);
  }
  if (urls.size === 0) return new Map();
  const sharp = await loadSharp();
  if (!sharp) return new Map(); // fallback: 不替換

  const urlMap = new Map();
  await Promise.all(
    [...urls].map(async (url) => {
      const local = join(
        cacheDayDir,
        basename(new URL(url).pathname).replace(/\.jpe?g$/i, ".jpg")
      );
      if (existsSync(local) && statSync(local).size > 0) {
        // 2026-07-12 修正: 用 base64 data URI (避免 puppeteer 對 file:// CORS 抓不到)
        const cached = readFileSync(local);
        urlMap.set(url, "data:image/jpeg;base64," + cached.toString("base64"));
        return;
      }
      try {
        const r = await fetch(url, {
          headers: { Accept: "image/jpeg,image/*" },
          // 2026-07-12 修正: 30s → 90s (parallel 4 workers 競爭時 sharp 慢)
          signal: AbortSignal.timeout(90000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        const out = await sharp(buf)
          .rotate()
          .resize({ width: IMG_MAX_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: IMG_QUALITY, mozjpeg: true })
          .toBuffer();
        writeFileSync(local, out);
        // 2026-07-12 修正: 用 base64 data URI 內嵌
        urlMap.set(url, "data:image/jpeg;base64," + out.toString("base64"));
      } catch (e) {
        console.warn(
          `   ⚠️ sharp 處理失敗, fallback 原圖: ${basename(url)} ${e.message?.slice(0, 80)}`
        );
        // fallback 不替換 — urlMap 沒 entry, 後面 builder 用原 URL
      }
    })
  );
  return urlMap;
}

/** 把 src=URL 在 shotsText 裡替換成本地 file:// 路徑 */
function applyImageMap(shotsText, urlMap) {
  if (!shotsText || urlMap.size === 0) return shotsText;
  let out = shotsText;
  for (const [orig, local] of urlMap) {
    out = out.split(orig).join(local);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// 4. HTML block builders — 一個 day 一份完整 HTML doc
// ─────────────────────────────────────────────────────────────────────

function buildHtml(opts) {
  const { scriptMeta, dayBlock, dayIdx, accentColor } = opts;
  const scenes = parseDialogueScenes(dayBlock.dialogue)
    .filter((s) => s.body.length > 0);
  const cameraShots = parseCameraShots(dayBlock.shots);
  const aiImages = parseAiprompts(dayBlock.shots);

  // 把 AI 生圖按比例配給場景 (跟 DayPdfExport L355-359 一致)
  const K = scenes.length, M = aiImages.length;
  const sceneImages = scenes.map((_, i) => {
    const start = Math.floor((i * M) / K);
    const end = Math.floor(((i + 1) * M) / K);
    return aiImages.slice(start, end);
  });

  const css = GLOBAL_CSS.replace(/<ACCENT>/g, accentColor);

  // ─── Header ───
  const headerHtml = `
<section class="page">
  <div class="hdr-rule">
    <span class="hdr-scriptid">${esc(scriptMeta.id)}</span>
    <span class="hdr-chip">劇本 ${esc(scriptMeta.id)}</span>
  </div>
  <div class="hdr-title">${esc(scriptMeta.name)}</div>
  <div class="hdr-sub">Day ${dayIdx} · ${esc(dayBlock.label)} · ${esc(
    dayBlock.date
  )}</div>

  ${
    dayBlock.theme && !dayBlock.theme.startsWith("（待填")
      ? `<div class="theme-box"><b>主軸 ·</b> ${esc(dayBlock.theme)}</div>`
      : ""
  }

  <div class="meta-grid">
    <div class="meta-card">
      <div class="lbl">主要場景</div>
      <div class="val">${esc(dayBlock.scenes || "（無）")}</div>
    </div>
    <div class="meta-card">
      <div class="lbl">主要角色</div>
      <div class="val">${esc(dayBlock.mainCharacters || "（無）")}</div>
    </div>
  </div>

  <div class="h-section">🎬 場景對白</div>
</section>`;

  // ─── 場景 + 配對 AI 生圖 ───
  let scenesHtml = "";
  for (let i = 0; i < scenes.length; i += 2) {
    const left = scenes[i];
    const right = scenes[i + 1];
    const leftImgs = sceneImages[i] || [];
    const rightImgs = right ? sceneImages[i + 1] || [] : [];

    const card = (scene, imgs) => {
      const cleanTitle = scene.title.replace(/^（/, "").replace(/）$/, "");
      const imgsHtml = imgs.length
        ? `<div class="img-grid">${imgs
            .map(
              (img) => `<div class="img-card">
              <div class="ts">🖼 ${esc(img.time)}</div>
              ${
                img.src
                  ? `<img src="${esc(img.src)}" crossorigin="anonymous" loading="eager" alt="${esc(cleanTitle)} ${esc(img.time)}" />`
                  : ""
              }
            </div>`
            )
            .join("")}</div>`
        : "";
      return `
        <div class="scene-card">
          <div class="scene-title">
            <span class="chip">場景</span>
            <span>${esc(cleanTitle)}</span>
          </div>
          <div class="scene-body">${esc(scene.body)}</div>
          ${imgsHtml}
        </div>`;
    };

    scenesHtml += `
<section class="page">
  <div class="scene-pair">
    ${left ? card(left, leftImgs) : ""}
    ${right ? card(right, rightImgs) : ""}
  </div>
</section>`;
  }

  // ─── 鏡頭腳本 — 每 6 shot 一塊 ───
  let shotsHtml = "";
  if (cameraShots.length > 0) {
    const CHUNK = 6;
    const chunks = [];
    for (let i = 0; i < cameraShots.length; i += CHUNK) {
      chunks.push(cameraShots.slice(i, i + CHUNK));
    }
    shotsHtml += `
<section class="page">
  <div class="h-section">🎥 鏡頭腳本</div>
  ${chunks
    .map(
      (ck) => `<div class="shots-chunk">${ck
        .map(
          (s) => `<div class="shot-row">
        ${
          s.time
            ? `<span class="t">${esc(s.time)}</span>`
            : ""
        }
        <span class="d">${esc(s.desc)}</span>
      </div>`
        )
        .join("")}</div>`
    )
    .join("")}
</section>`;
  }

  // ─── Footer ───
  const footerHtml = `
<section class="page">
  <div class="footer">
    Vlog 劇本 ${esc(scriptMeta.id)} · ${esc(scriptMeta.name)} · Day ${dayIdx}
    (${esc(dayBlock.date)}) · 江南水鄉八日之旅
  </div>
</section>`;

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>Vlog ${esc(scriptMeta.id)} Day ${dayIdx} · ${esc(dayBlock.label)}</title>
  <style>${css}</style>
</head>
<body>
${headerHtml}
${scenesHtml}
${shotsHtml}
${footerHtml}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────
// 5. 計劃要跑的 PDF 清單
// ─────────────────────────────────────────────────────────────────────

function planJobs() {
  const jobs = [];
  const scriptIds = FLAGS.script
    ? [FLAGS.script]
    : Object.keys(vlogData.scripts);
  for (const scriptId of scriptIds) {
    const meta = vlogData.scripts[scriptId];
    if (!meta) {
      console.error(`⚠️ 跳過未知劇本 ${scriptId}`);
      continue;
    }
    for (let i = 0; i < meta.dayBlocks.length; i++) {
      const dayIdx = i + 1;
      if (FLAGS.day && FLAGS.day !== dayIdx) continue;
      jobs.push({ scriptId, scriptMeta: meta, dayIdx });
    }
  }
  return jobs;
}

const jobs = planJobs();
if (jobs.length === 0) {
  console.error("❌ jobs 為空, 檢查 --script / --day 參數");
  process.exit(1);
}

console.log(
  `📋 計畫 ${jobs.length} PDF: ${jobs
    .map((j) => `${j.scriptId}-D${j.dayIdx}`)
    .join(", ")}`
);

if (FLAGS.dry) {
  jobs.forEach((j) => {
    const db = vlogData.scripts[j.scriptId].dayBlocks[j.dayIdx - 1];
    console.log(
      `   [DRY] public/vlog-pdfs/${j.scriptId}/day${j.dayIdx}.pdf  ← ${j.scriptMeta.name} · Day ${j.dayIdx} (${db.date})`
    );
  });
  console.log("✅ (dry) 規劃完成, 不實際生 PDF");
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────
// 5.5 Prewarm 所有 imgCache (2026-07-12 修正: 避免 4 worker 並發 sharp timeout)
// 一次把所有劇本×所有天的圖 fetch + sharp 寫進 cache
// puppeteer 啟動後, 每個 worker 只讀 cache 不打 sharp
// ─────────────────────────────────────────────────────────────────────

console.log("🔥 預熱 imgCache (所有劇本 × 所有天的圖)...");
const prewarmT0 = performance.now();
// 2026-07-12: 改成 sequential — parallel 會撞 Supabase rate limit
// 64 圖 sequential: 64 × 3s = ~3 分鐘
for (const job of jobs) {
  const dayBlock = job.scriptMeta.dayBlocks[job.dayIdx - 1];
  await prepareImages(dayBlock.shots, job.dayIdx);
}
const prewarmSec = ((performance.now() - prewarmT0) / 1000).toFixed(1);
const cacheTotal = readdirSync(IMG_CACHE_DIR, { withFileTypes: true, recursive: true })
  .filter((e) => e.isFile()).length;
console.log(`   ⏱  ${prewarmSec}s · ${cacheTotal} 圖已 cache`);

// ─────────────────────────────────────────────────────────────────────
// 6. Puppeteer 跑 (一個瀏覽器 instance, 多 page 並行)
// ─────────────────────────────────────────────────────────────────────

const PUPPETEER = await import("puppeteer");

const launchOpts = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
};
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  console.log(`   Chrome 路徑: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
} else {
  console.log("   Chrome 路徑: 預設 (系統 Chrome)");
}

const browser = await PUPPETEER.default.launch(launchOpts);

// ─────────────────────────────────────────────────────────────────────
// 7. 工作池 — 一個 worker 一個 page, 並發 4 (對應 4 劇本)
//    為單 worker 也方便中途失敗 retry, 不混合狀態
// ─────────────────────────────────────────────────────────────────────

const outDir = resolve(FRONTEND_ROOT, "public/vlog-pdfs");
mkdirSync(outDir, { recursive: true });

async function renderOne(job) {
  const { scriptId, scriptMeta, dayIdx } = job;
  const dayBlock = scriptMeta.dayBlocks[dayIdx - 1];
  const accentColor = COLOR_FOR_SCRIPT[scriptId] || COLORS.ink;
  const relPath = `public/vlog-pdfs/${scriptId}/day${dayIdx}.pdf`;
  const absPath = join(outDir, scriptId, `day${dayIdx}.pdf`);
  mkdirSync(dirname(absPath), { recursive: true });

  // 預處理圖片 (Supabase 2K → 本地 800w JPEG)
  const imgMap = await prepareImages(dayBlock.shots, dayIdx);
  const shotsTextWithLocalImgs = applyImageMap(dayBlock.shots, imgMap);
  const patchedDayBlock = { ...dayBlock, shots: shotsTextWithLocalImgs };
  const html = buildHtml({
    scriptMeta,
    dayBlock: patchedDayBlock,
    dayIdx,
    accentColor,
  });
  // [附註] PDF metadata 雖然 page.pdf 不支援, 但我們把 <title>/<meta> 設好讓檔案 OS 打開也有標題

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 1 });
  const t0 = performance.now();
  try {
    // 不用 networkidle0: Google Fonts CSS + 圖片加總可能超過 60s in headless
    // 改: domcontentloaded → 顯式 await fonts.ready + 所有 <img> onload
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(async () => {
      // 等字體載入完成 (避免 puppeteer 截中文變豆腐)
      await document.fonts.ready;
      // 等所有 <img> 真正 decode 完
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((resolve) => {
                img.addEventListener("load", resolve, { once: true });
                img.addEventListener("error", resolve, { once: true });
              })
        )
      );
    });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: false,
      timeout: 90000,
    });
    writeFileSync(absPath, buf);
    // PDF metadata post-hoc: puppeteer 的 pdf() 不直接支援, 用 file edit
    const ms = (performance.now() - t0).toFixed(0);
    return {
      ok: true,
      job,
      absPath,
      size: buf.length,
      ms,
      pdfTitle: `Vlog 劇本 ${scriptId} · Day ${dayIdx} · ${dayBlock.label}`,
    };
  } catch (err) {
    return {
      ok: false,
      job,
      absPath,
      err,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function renderOneWithRetry(job, maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await renderOne(job);
    if (res.ok) return res;
    console.warn(
      `   ⚠️  ${job.scriptId}-D${job.dayIdx} 第 ${attempt} 次失敗: ${res.err?.message?.slice(0, 120)}`
    );
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  // 最終失敗
  return {
    ok: false,
    job,
    absPath: "",
    err: new Error("max attempts exhausted"),
  };
}

// 並發: worker 數 = 1 (2026-07-12 修正: 4 → 2 避免 sharp + puppeteer 資源競爭 timeout)
// 32 PDF / 2 workers × 12s = 192s = 3.2 分鐘
const POOL_SIZE = Math.min(jobs.length, 2);

let cursor = 0;
const results = new Array(jobs.length);

async function worker(workerId) {
  while (true) {
    const idx = cursor++;
    if (idx >= jobs.length) return;
    const job = jobs[idx];
    const t = performance.now();
    const res = await renderOneWithRetry(job);
    const dur = ((performance.now() - t) / 1000).toFixed(1);
    if (res.ok) {
      const sizeKb = (res.size / 1024).toFixed(0);
      console.log(
        `   ✅  ${job.scriptId}-D${job.dayIdx} · ${sizeKb} KB · ${dur}s`
      );
      if (VERBOSE) {
        console.log(
          `       ${res.absPath.replace(FRONTEND_ROOT + "/", "")}`
        );
      }
    } else {
      console.error(
        `   ❌  ${job.scriptId}-D${job.dayIdx} · 最終失敗 · ${dur}s · ${res.err?.message?.slice(0, 200)}`
      );
    }
    results[idx] = res;
  }
}

console.log(`🚀 啟動 ${POOL_SIZE} 個 worker 平行...`);
const tRunStart = performance.now();
await Promise.all(
  Array.from({ length: POOL_SIZE }, (_, i) => worker(i + 1))
);
const runSec = ((performance.now() - tRunStart) / 1000).toFixed(1);

// ─────────────────────────────────────────────────────────────────────
// 8. 最終報告
// ─────────────────────────────────────────────────────────────────────

const okResults = results.filter((r) => r && r.ok);
const failResults = results.filter((r) => r && !r.ok);

console.log("");
console.log("📊 結果摘要:");
console.log(`   成功: ${okResults.length} / ${jobs.length}`);
if (failResults.length) {
  console.log(`   失敗: ${failResults.length}`);
  failResults.forEach((r) => {
    console.log(`     - ${r.job.scriptId}-D${r.job.dayIdx}: ${r.err?.message}`);
  });
}
if (okResults.length) {
  const sizes = okResults.map((r) => r.size);
  const sumMb = (sizes.reduce((a, b) => a + b, 0) / 1024 / 1024).toFixed(2);
  const avg = (sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024).toFixed(0);
  const min = (Math.min(...sizes) / 1024).toFixed(0);
  const max = (Math.max(...sizes) / 1024).toFixed(0);
  console.log(`   總大小: ${sumMb} MB · 平均 ${avg} KB · ${min}~${max} KB`);
}

await browser.close();

const totalSec = ((performance.now() - overallStart) / 1000).toFixed(1);
if (okResults.length === jobs.length) {
  console.log(`\n✅ ${jobs.length} PDF 完成 ${totalSec}s (worker 跑 ${runSec}s)`);
  process.exit(0);
} else {
  console.log(`\n⚠️  部分 PDF 失敗 (見上方) · 總耗時 ${totalSec}s`);
  process.exit(1);
}

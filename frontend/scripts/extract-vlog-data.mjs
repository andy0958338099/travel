#!/usr/bin/env node
/**
 * extract-vlog-data.mjs
 *
 * 把 src/app/vlog/data.ts (純資料檔, 無 React / 無 import) 透過
 * Node --experimental-strip-types 解析並 export 一個 JSON snapshot 到 stdout。
 *
 * 輸出格式:
 *   {
 *     "scripts": {
 *       "A": { "id":"A", "name":"...", "tagline":"...", "color":"vermilion",
 *              "storyArc":"...", "dayBlocks":[ DayBlock, ... 8 個 ] },
 *       "B": { ... },
 *       "C": { ... },
 *       "D": { ... }
 *     },
 *     "characters13": [...],
 *     "scriptOrder": ["A","B","C","D"]
 *   }
 *
 * 用法:
 *   node scripts/extract-vlog-data.mjs              # JSON 到 stdout
 *   node scripts/extract-vlog-data.mjs --out path.json
 *
 * 臣 (Brian): 這檔只有 prebuild 階段會跑, 所以 TypeScript 完整編譯不在 hot-path。
 * 用原生 --experimental-strip-types 比再多裝 esbuild 乾淨。
 */

// 路徑固定 — 從 frontend/ 工作目錄直接 load
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ROOT = resolve(__dirname, "..");
const DATA_TS = resolve(FRONTEND_ROOT, "src/app/vlog/data.ts");

if (!existsSync(DATA_TS)) {
  console.error(`❌ 找不到 ${DATA_TS}`);
  process.exit(1);
}

// 用臨時 .mts 檔 + strip-types 從 Node 載入 (Node 24 已穩定支援 type stripping for .ts)
const tmpMjs = resolve(__dirname, ".tmp-vlog-data-load.mjs");
writeFileSync(
  tmpMjs,
  // re-export the .ts file; Node 24 will strip type annotations from the .ts file
  `import * as M from ${JSON.stringify(pathToFileURL(DATA_TS).href)};
   process.stdout.write(JSON.stringify({
     scripts: M.SCRIPTS,
     characters13: M.CHARACTERS_13,
     scriptOrder: M.SCRIPT_ORDER,
     colorVar: M.COLOR_VAR,
   }));
   `,
  "utf8"
);

const { spawnSync } = await import("node:child_process");
// node 24+: --experimental-strip-types 對 .ts 自動生效
// 但要尊重 .mts/.ts 模組推斷, 加上 --experimental-strip-types 確保萬一 Node 版本退回時 fail loud
const r = spawnSync(
  process.execPath,
  ["--experimental-strip-types", tmpMjs],
  { encoding: "utf8", cwd: FRONTEND_ROOT, maxBuffer: 256 * 1024 * 1024 }
);

if (r.status !== 0) {
  console.error("❌ Type-strip 載入失敗:");
  console.error(r.stderr);
  process.exit(1);
}

const json = r.stdout;

// 簡單驗證 JSON 正確
let parsed;
try {
  parsed = JSON.parse(json);
} catch (e) {
  console.error("❌ stdout 不是 JSON:", e.message);
  console.error("前 500 字元:", json.slice(0, 500));
  process.exit(1);
}

if (!parsed?.scripts?.A?.dayBlocks?.length) {
  console.error("❌ SCRIPTS.A.dayBlocks 為空, data.ts 結構可能改了");
  process.exit(1);
}

// 印摘要 (debug 用)
console.error(
  `✅ 抽出 ${Object.keys(parsed.scripts).length} 個劇本, ` +
    `每劇本 ${parsed.scripts.A.dayBlocks.length} 天, ` +
    `${parsed.characters13.length} 位角色`
);

// CLI: --out 把 JSON 寫到檔, 否則直接 print
const outIdx = process.argv.indexOf("--out");
if (outIdx > -1 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], JSON.stringify(parsed, null, 2));
  console.error(`📦 寫到 ${process.argv[outIdx + 1]}`);
} else {
  process.stdout.write(JSON.stringify(parsed));
}

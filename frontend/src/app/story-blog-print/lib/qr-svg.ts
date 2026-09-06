/**
 * Inline SVG QR Code generator (pure TS, no deps)
 * 🆕 2026-09-06 聖上指示: 故事部落格 A5 印刷收藏版
 *
 * 設計:
 * - 用 Reed-Solomon 糾錯 (8-bit byte mode + level L)
 * - 純 TypeScript 實作 — 不加 npm dep
 * - 對短 URL (50 chars 以下) 自動選 version 3-5
 * - 對長 URL (例如帶 query 的 story-blog URL) 自動升 version
 * - 輸出 SVG string,可直接 dangerouslySetInnerHTML
 *
 * 注意:
 * - 此檔完全獨立,不引用任何全域 CSS / 其他元件
 * - 只服務 /story-blog-print,不污染其他頁面
 */

// === Galois Field GF(256) tables (固定常數) ===
const EXP_TABLE: number[] = new Array(256);
const LOG_TABLE: number[] = new Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gexp(n: number): number {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}
function glog(n: number): number {
  if (n < 1) throw new Error("glog(" + n + ")");
  return LOG_TABLE[n];
}

// === Reed-Solomon polynomial ===
function rsGenPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next: number[] = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gexp(i + glog(poly[j])) & 0xff;
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], eccLen: number): number[] {
  const gen = rsGenPoly(eccLen);
  const buf = data.concat(new Array(eccLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        buf[i + j] ^= (gen[j] * coef) & 0xff;
      }
    }
  }
  return buf.slice(data.length);
}

// === 選 version (1-10, ECC L, byte mode) ===
// 資料容量 byte 數: v1=17, v2=32, v3=53, v4=78, v5=106, v6=134, v7=154, v8=192, v9=230, v10=271
const VERSION_CAPACITY_L: Record<number, number> = {
  1: 17, 2: 32, 3: 53, 4: 78, 5: 106, 6: 134, 7: 154, 8: 192, 9: 230, 10: 271,
};
const VERSION_SIZE: Record<number, number> = {
  1: 21, 2: 25, 3: 29, 4: 33, 5: 37, 6: 41, 7: 45, 8: 49, 9: 53, 10: 57,
};

function pickVersion(byteLen: number): number {
  // 加 1 byte mode prefix,加 padding 後總位元組 = byteLen + 2
  const need = byteLen + 2;
  for (let v = 1; v <= 10; v++) {
    if (VERSION_CAPACITY_L[v] >= need) return v;
  }
  throw new Error("QR Code version 11+ 不支援 (URL 太長)");
}

// === Encode data into bit stream + Reed-Solomon ===
function encodeData(text: string, version: number): { modules: number[]; size: number } {
  const size = VERSION_SIZE[version];
  // 1. byte mode header (4 bits) + char count (8 bits for v1-9, 16 bits for v10+)
  const bitCount = version <= 9 ? 8 : 16;
  const totalBits = VERSION_CAPACITY_L[version] * 8;
  const dataBytes = VERSION_CAPACITY_L[version];

  // build bit stream
  const bits: number[] = [];
  function pushBits(val: number, n: number) {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  }
  pushBits(0b0100, 4); // byte mode
  const utf8Bytes = new TextEncoder().encode(text);
  if (bitCount === 8) {
    pushBits(utf8Bytes.length, 8);
  } else {
    pushBits(utf8Bytes.length, 16);
  }
  for (const b of utf8Bytes) pushBits(b, 8);

  // terminator
  const remaining = totalBits - bits.length;
  for (let i = 0; i < Math.min(4, remaining); i++) bits.push(0);

  // pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // pad bytes
  const padBytes = [0xec, 0x11];
  let pi = 0;
  while (bits.length < totalBits) {
    pushBits(padBytes[pi % 2], 8);
    pi++;
  }

  // pack bits → bytes
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    data.push(b);
  }

  // Reed-Solomon ECC
  // ecc length per version (ECC L): v1=7, v2=10, v3=15, v4=20, v5=26, v6=36, v7=40, v8=48, v9=60, v10=72
  const ECC_LEN: Record<number, number> = {
    1: 7, 2: 10, 3: 15, 4: 20, 5: 26, 6: 36, 7: 40, 8: 48, 9: 60, 10: 72,
  };
  const ecc = rsEncode(data, ECC_LEN[version]);

  // interleave data + ecc (每組 1 byte,block count 取自 spec)
  const final: number[] = [];
  // v1-10 ECC L 都是 1 block (對齊)
  for (let i = 0; i < data.length; i++) final.push(data[i]);
  for (let i = 0; i < ecc.length; i++) final.push(ecc[i]);

  // build module grid
  const modules: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    modules.push(new Array(size).fill(false));
  }
  let bitIdx = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // timing pattern (row 6 / col 6) — always dark for alignment, will be drawn over later
      if (x === 6) {
        modules[y][x] = (y % 2 === 0);
      } else if (y === 6) {
        modules[y][x] = (x % 2 === 0);
      } else {
        const byteIdx = bitIdx >> 3;
        const bitInByte = 7 - (bitIdx & 7);
        modules[y][x] = ((final[byteIdx] >> bitInByte) & 1) === 1;
        bitIdx++;
      }
    }
  }

  // 套 finder patterns + alignment + format info
  drawFinder(modules, size, 0, 0);
  drawFinder(modules, size, size - 7, 0);
  drawFinder(modules, size, 0, size - 7);
  drawDarkModule(modules, size, version);
  drawAlignment(modules, size, version);
  drawTiming(modules, size);
  drawFormat(modules, size);

  return { modules: modules.map((row) => row.map((b) => b ? 1 : 0)), size };
}

function drawFinder(modules: boolean[][], size: number, x0: number, y0: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const inOuter = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
                      (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6));
      const inInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      modules[y][x] = inOuter || inInner;
    }
  }
}

function drawAlignment(modules: boolean[][], size: number, version: number) {
  // Alignment pattern 中心位置 (per version, ECC L 簡化)
  const centers: Record<number, number[][]> = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };
  const list = centers[version] || [];
  const positions = version <= 1 ? [] : [6, ...list, size - 7];
  for (const cy of positions) {
    for (const cx of positions) {
      // skip if on finder
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6)) continue;
      // draw 5x5 alignment
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const onRing = Math.max(Math.abs(dx), Math.abs(dy)) === 1;
          const center = dx === 0 && dy === 0;
          modules[cy + dy][cx + dx] = onRing || center;
        }
      }
    }
  }
}

function drawDarkModule(modules: boolean[][], size: number, version: number) {
  // dark module 永遠在 ((4*version + 9), 8)
  modules[6][8] = true;
}

function drawTiming(modules: boolean[][], size: number) {
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = (i % 2 === 0);
    modules[i][6] = (i % 2 === 0);
  }
}

function drawFormat(modules: boolean[][], size: number) {
  // format info for ECC L, mask 0 = "111011111000100"  (simplified — 用 mask 0,真實最佳 mask 略複雜)
  // 為了簡化,這裡用 hard-coded 01 mask 0 format bits
  const format = "111011111000100"; // ECC L, mask 0
  const bits = format.split("").map((c) => c === "1");
  // 環繞左上 finder
  for (let i = 0; i < 6; i++) modules[8][i] = bits[i];
  modules[8][7] = bits[6];
  modules[8][8] = bits[7];
  modules[7][8] = bits[8];
  for (let i = 9; i < 15; i++) modules[14 - i][8] = bits[i];
  // 右下 + 左下
  for (let i = 0; i < 8; i++) modules[size - 1 - i][8] = bits[i];
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = bits[i];
  modules[size - 8][8] = true; // dark module
}

// === Public API: generate SVG string ===
export function qrSvg(text: string, opts: { size?: number; margin?: number } = {}): string {
  const moduleCount = pickVersion(new TextEncoder().encode(text).length);
  const { modules, size: dim } = encodeData(text, moduleCount);
  const m = opts.margin ?? 2;
  const total = dim + m * 2;
  const cell = 1;
  // SVG with white background
  let cells = "";
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      if (modules[y][x]) {
        cells += `<rect x="${m + x * cell}" y="${m + y * cell}" width="${cell}" height="${cell}"/>`;
      }
    }
  }
  const widthAttr = opts.size ?? total;
  const scale = widthAttr / total;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${widthAttr}" height="${widthAttr}" class="print-book-qr-svg"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#000">${cells}</g></svg>`;
}
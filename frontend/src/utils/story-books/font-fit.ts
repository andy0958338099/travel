/**
 * 🆕 2026-10-20 聖上指示: 字體自適應的「純量測核心」
 *
 * 這個檔案刻意 **不 import react / DOM 全域依賴以外的東西**,所以:
 *   - React hook (`useAdaptiveFontSize`) 檔案可以 re-export
 *   - Node 22 (原生 type stripping) / Puppeteer fixture 可以直接 import 驗證
 *     不需要 regex 剝型別,也保證「測的就是線上那份程式」
 *
 * ── 10-21 修掉的兩個真 bug (mode B 改成 float 圖文並列才爆出來) ──
 *
 * bug 1 — line-clamp 讓二分搜尋必然收斂到 MAX_PT
 *   CSS 為了「寧可裁切也不溢出」加了 `-webkit-line-clamp` +
 *   `display: -webkit-box`。但 line-clamp 會把元素高度硬砍在 N 行,
 *   導致 `el.scrollHeight` **永遠 ≤ 目標高度**,二分搜尋每個候選都
 *   判定「塞得下」→ 收斂到 MAX_PT → 實際渲染只有 N 行,後半段文字
 *   被 cell 的 overflow:hidden 靜默吃掉。
 *   修法:量測期間暫時解除 clamp,量完再還原。
 *
 * bug 2 — 把圖高從可用高度扣掉
 *   舊版假設「圖在文的上方」,所以 textMaxH -= imgH。
 *   mode B 是 float 並列(圖在左/右),圖不吃垂直空間,扣掉等於
 *   白白少算 40mm → 文字只填了 cell 的 1/3,下面一大片空白。
 *   修法:可用高度 = cell 高 - cell 內「不跟文字搶垂直空間」的區塊高
 *         (day header / title / footer),由實測 offsetHeight 得出,
 *         不再對版面結構做假設。
 *
 * 為什麼二分搜尋而不是直接算:
 *   CJK 字寬 + word-break + float 縮排的實際換行結果很難算準,
 *   實測「塞得下 / 塞不下」是唯一可靠的方式。
 */

// 🆕 2026-11-14: 下限從 8pt 拉高到 9pt。
//   A5 實體書 9pt 仍可讀;8pt 太小,45/113 格都卡在下限 = 整本偏小字。
//   拉高後塞不下的篇會被配對演算法判為「長篇」→ 獨立整頁 (容量大 2.3 倍),
//   寧可多一頁也不讓字小到看不清 (誠實 > 視覺欺騙)。
export const MIN_PT_PAIR = 9; // mode B 一頁 2 則:文案欄只剩 ~58mm 寬
export const MAX_PT_PAIR = 13;
export const MIN_PT_SINGLE = 10; // mode A/C 單篇大版面
export const MAX_PT_SINGLE = 16;

const PRECISION = 4; // 0.25 pt precision
const PADDING_BUFFER = 8; // px,避免文字剛好頂到 cell 邊界
const GAP_BUFFER = 10; // px,元素之間間距保守抓一點

/**
 * 🆕 2026-11-14 (使用者:「2個故事中間的間隔寬度太寬請縮到最小」):
 *   故事之間「看起來」的寬度 = 幾何間距 + 每格底部因安全餘裕留下的空白。
 *
 *   實測分解(12 篇書,page1 格1):
 *     cellH 275 = reserved 54 (標題+頁尾) + textMaxH 203 + 18(緩衝) + ...
 *     真實內容底在 252 → 格底留白 23px (6.1mm)
 *   根因:引擎多留 22px、hook 又扣 18px → 兩邊口徑不一致,
 *         差額直接變成故事之間的空白。
 *
 *   → 兩邊對齊到「只剩 6px 誤差保險」(≈1.6mm),故事之間就真的緊湊了。
 *   ⚠️ 不能降到 0:二分搜尋是整數比較,差 1~2px 就可能讓字被裁。
 */
const PADDING_BUFFER_PAIR_TIGHT = 2;
const GAP_BUFFER_PAIR_TIGHT = 2;
/** 引擎端保留的對應餘裕(px):必須 = hook 扣的量,否則格內會出現空白 */
export const PAIR_ENGINE_MARGIN_PX = 6;

export const DEFAULT_RESERVE_SELECTOR =
  ".print-book-day-header, .print-book-post-title, .print-book-post-footer";

export interface FitFontOptions {
  /** 下界 (pt) */
  minPt?: number;
  /** 上界 (pt) */
  maxPt?: number;
  /** 從可用高度要扣掉的 sibling selector (不跟文字搶垂直空間的) */
  reserveSelector?: string;
  /** 行距倍率 */
  lineHeight?: number;
  /**
   * 🆕 2026-11-14: 緊湊模式 —— 收窄底部緩衝,讓 mode B 兩則故事之間
   *   「看起來」的距離縮到最小(使用者要求)。
   *   只給雙故事格用;落單整頁與 mode A/C 維持原緩衝(它們沒有兩則夾擠問題)。
   */
  tight?: boolean;
}

/**
 * 量出 cell 內還有多少垂直空間可以給文字。
 *
 * 兩種扣法,依 text 在版面裡的位置而定:
 *
 * A) text 是 cell 的直接子元素 (mode A/C:標題在上、圖在中、文在下)
 *    → 從 cell 高扣掉「不在 text 的父層內」的 sibling
 *      (day header / title / footer / 圖)
 *
 * B) text 在一個 float 並列的 BFC wrap 內 (mode B:圖左 文右)
 *    → 可用高度是「cell 高扣掉 wrap 之外的區塊」(day header),
 *      再扣掉 wrap 內 title + footer 的高。
 *      ⚠️ 10-21 實測 bug: 只用 A 會讓 textMaxH 多算 title 的高度
 *      (~24px),文字底部被 cell 裁掉 20-30px,視覺像「文字被吃掉一行」。
 */
export function measureTextBudget(
  cell: HTMLElement,
  text: HTMLElement,
  reserveSelector: string = DEFAULT_RESERVE_SELECTOR,
  tight: boolean = false,
): { containerH: number; reserved: number; textMaxH: number } {
  const containerH = cell.clientHeight;
  if (containerH <= 0) {
    return { containerH, reserved: 0, textMaxH: 0 };
  }

  const sumBox = (node: HTMLElement) => {
    const cs = getComputedStyle(node);
    if (cs.position === "absolute") return 0; // 絕對定位不吃空間
    return (
      node.offsetHeight +
      (parseFloat(cs.marginTop) || 0) +
      (parseFloat(cs.marginBottom) || 0)
    );
  };

  const wrap = text.closest(".print-book-post-text-wrap");

  // 🆕 2026-11-14: 圖若是 float:none (橫式照片改成「圖上、文下」),
  //   圖就真的吃垂直空間,必須從可用高度扣掉 —— 否則 hook 會以為
  //   文字有整格高度可用,算出來的字級塞不下 → 溢出被裁。
  //   float 圖則不吃垂直空間 (bug 2 的結論)。
  const imageIsFloat = (() => {
    const img = cell.querySelector<HTMLElement>(".print-book-post-image");
    if (!img) return true;
    const cs = getComputedStyle(img);
    return cs.float !== "none";
  })();

  // ── B) float 並列:扣 wrap 外的 + wrap 內 title/footer ──
  if (wrap && wrap !== cell) {
    const insideWrap = new Set<HTMLElement>();
    wrap.querySelectorAll<HTMLElement>(reserveSelector).forEach((n) =>
      insideWrap.add(n),
    );
    let reserved = 0;
    cell.querySelectorAll<HTMLElement>(reserveSelector).forEach((node) => {
      if (insideWrap.has(node)) return; // wrap 內的另外算
      reserved += sumBox(node);
    });
    insideWrap.forEach((node) => {
      if (node === text) return;
      reserved += sumBox(node);
    });
    // float 圖不吃垂直空間,不用扣 (bug 2)
    // float:none 的圖要扣 (2026-11-14)
    if (!imageIsFloat) {
      const img = cell.querySelector<HTMLElement>(".print-book-post-image");
      if (img) reserved += sumBox(img);
    }
    // 🆕 2026-11-14: footer 位在文字之後,它的 margin-top 屬於「文字與 footer 的間距」,
    //   確實吃 cell 高度 → 維持計算。
    const paddingBuf = tight ? PADDING_BUFFER_PAIR_TIGHT : PADDING_BUFFER;
    const gapBuf = tight ? GAP_BUFFER_PAIR_TIGHT : GAP_BUFFER;
    const textMaxH = Math.max(
      24,
      containerH - reserved - paddingBuf * 2 - gapBuf,
    );
    return { containerH, reserved, textMaxH };
  }

  // ── A) 直式:扣不在 text 父層內的 sibling ──
  let reserved = 0;
  cell.querySelectorAll<HTMLElement>(reserveSelector).forEach((node) => {
    if (text.parentElement?.contains(node)) return;
    reserved += sumBox(node);
  });
  const paddingBufA = tight ? PADDING_BUFFER_PAIR_TIGHT : PADDING_BUFFER;
  const gapBufA = tight ? GAP_BUFFER_PAIR_TIGHT : GAP_BUFFER;
  const textMaxH = Math.max(
    24,
    containerH - reserved - paddingBufA * 2 - gapBufA,
  );
  return { containerH, reserved, textMaxH };
}

/** 暫時解除 line-clamp,讓 scrollHeight 反映真實文字高度 (bug 1) */
function unclamp(text: HTMLElement) {
  const saved = {
    display: text.style.display,
    clamp: text.style.webkitLineClamp,
    orient: text.style.webkitBoxOrient,
    overflow: text.style.overflow,
  };
  text.style.display = "block";
  text.style.webkitLineClamp = "unset";
  text.style.webkitBoxOrient = "initial";
  text.style.overflow = "visible";
  return () => {
    text.style.display = saved.display;
    text.style.webkitLineClamp = saved.clamp;
    text.style.webkitBoxOrient = saved.orient;
    text.style.overflow = saved.overflow;
  };
}

/**
 * 二分搜尋出塞得下的最大 fontSize (pt),並直接寫回 style。
 *
 * clamp 會還原 (當最後一道安全網):hook 算錯時寧可裁掉,也不要讓
 * 文字壓出 cell 破壞整頁比例。
 *
 * @returns 實際寫入的 pt 值
 */
export function fitFontSizeInCell(
  cell: HTMLElement,
  text: HTMLElement,
  opts: FitFontOptions = {},
): number {
  const {
    minPt = MIN_PT_PAIR,
    maxPt = MAX_PT_PAIR,
    reserveSelector = DEFAULT_RESERVE_SELECTOR,
    lineHeight = 1.65,
    tight = false,
  } = opts;

  const { containerH, reserved, textMaxH } = measureTextBudget(
    cell,
    text,
    reserveSelector,
    tight,
  );
  if (containerH <= 0) return minPt;

  const restore = unclamp(text);

  let lo = minPt * PRECISION;
  let hi = maxPt * PRECISION;
  let bestFit = lo;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const pt = mid / PRECISION;
    text.style.fontSize = `${pt}pt`;
    text.style.lineHeight = String(lineHeight);
    if (text.scrollHeight <= textMaxH) {
      bestFit = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const finalPt = bestFit / PRECISION;
  restore();
  text.style.fontSize = `${finalPt}pt`;
  text.style.lineHeight = String(lineHeight);
  // debug 用:Puppeteer route 可以讀這些 attribute 做 receipt
  text.dataset.adaptiveFontPt = String(finalPt);
  text.dataset.adaptiveTextMaxH = String(Math.round(textMaxH));
  text.dataset.adaptiveReservedH = String(Math.round(reserved));
  text.dataset.adaptiveCellH = String(Math.round(containerH));
  text.dataset.adaptiveFillRatio =
    textMaxH > 0 ? (text.scrollHeight / textMaxH).toFixed(2) : "0";
  return finalPt;
}
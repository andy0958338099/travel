/**
 * 🆕 2026-11-14: mode B「一頁 2 則」的版面配置引擎
 *
 * 為什麼需要這個檔案:
 *   舊版用「字數 > 220 → 獨立整頁」的硬門檻 → 113 則裡 35 頁只有 1 則,
 *   使用者要求「PDF 一頁要有 2 個故事」→ 門檻必須拿掉。
 *   拿掉之後長篇在「固定 80mm 等分格」裡塞不下 → 文字被裁(欺騙)。
 *
 * 解法(全部在瀏覽器實測,不猜):
 *   1) 量測:把 cell 複製一份放進「同頁的隱藏量測區」,量它在 9pt
 *      (最低可讀字級)下的真實需求高度 —— 標題 + max(照片, 文字繞排)。
 *      用複製而不是改真實 DOM,是為了不跟 adaptive-font-size hook 互相干擾。
 *      量測區必須在 .print-book-mode-b-pair-page 底下,否則 CSS
 *      descendant selector 對複製不生效 → 量到的版式會跟真實不同。
 *   2) 配平:同頁兩格需求加總若超過該頁可用高度 → 縮小照片級距
 *      (照片變窄 → 文字欄變寬 → 行數變少 → 需求下降)直到塞得下。
 *   3) 配置:把該頁可用高度依需求比例分配給兩格 → 整頁滿版、不留大空白,
 *      剩下的空間由既有的 adaptive-font-size hook 在各格內放大字級(9~13pt)。
 *
 * ⚠️ 硬約束 (10-20 實測): cell 內部一律「純 block + float」,
 *    不可用 grid/flex (Chrome PDF render tree 會 crash)。本檔不改版面結構。
 */

import { MIN_PT_PAIR, MAX_PT_PAIR, MIN_PT_SINGLE } from "./font-fit";

/**
 * 照片縮放級距 (由大到小)
 *
 * 🆕 2026-11-14 (使用者要求「照片放大 30%」):
 *   最高級距從 1 改成 1.3 → 照片目標放大 30%。
 *   配平時從最高級距往下退:能塞下就維持 1.3,塞不下才逐級降
 *   (1.3 → 1.15 → 1 → 0.85 → 0.7 → 0.55 → 0.45)。
 *
 * ⚠️ 為什麼不放寬字級下限來換照片?
 *   9pt 是實體書可讀性的底線(使用者先前明講「8pt 太小」),
 *   而照片放大会壓縮文字欄寬度 → 文字變高 → 需要更多垂直空間。
 *   兩者衝突時,本引擎讓「照片放大率」退讓,字級永遠不低於 9pt。
 *   → 結果:多數頁可達 1.3,少數長文頁自動降到 1.15 或 1。
 */
export const PHOTO_SCALES = [1.3, 1.15, 1, 0.85, 0.7, 0.55, 0.45] as const;

export type PairShape = "portrait" | "landscape" | "square";

export function shapeOfRatio(ratio: number): PairShape {
  if (ratio > 1.15) return "landscape";
  if (ratio < 0.87) return "portrait";
  return "square";
}

/**
 * 照片基礎尺寸 (mm) —— 必須與 BPairCell 的 React inline style 用同一套公式,
 * 否則「量到的寬度」與「實際渲染寬度」不一致 → 文字行數算錯。
 *
 * 直式 62mm 高 / 方形 48mm / 橫式 27mm;寬 = 高 × 原始比例,上限 48mm
 * (文字欄至少留 ~56mm,否則 9pt 一行只剩 16~17 字)。
 */
export function photoBaseMm(
  ratio: number,
  shape: PairShape,
): { w: number; h: number } {
  const baseH = shape === "landscape" ? 27 : shape === "square" ? 48 : 62;
  let w = baseH * ratio;
  let h = baseH;
  if (w > 48) {
    w = 48;
    h = w / ratio;
  }
  return { w, h };
}

export type PairLayoutResult = {
  /** postId → 這一格在頁面上的高度 (px) */
  heights: Record<string, number>;
  /** postId → 照片縮放級距 (1 = 原始尺寸) */
  photoScale: Record<string, number>;
  /** 🆕 postId → 落單整頁的照片尺寸 (mm)。奇數尾頁用,讓照片長到剛好填滿頁面。 */
  singlePhotoMm: Record<string, { w: number; h: number }>;
  /** 除錯用的逐頁數據 */
  diagnostics: {
    section: number;
    demand: number[];
    avail: number;
    allocated: number[];
    photoScale: number[];
    overflow: boolean;
    /** 🆕 兩格都到 13pt 上限後仍填不滿頁面的殘餘高度 (px) */
    leftover: number;
  }[];
  /** 🆕 落單整頁的量測數據 */
  singleDiagnostics: {
    postId: string;
    /** 文字在最低字級 (10pt) 下的自然高度 (px) */
    textMinH: number;
    /** 照片之外還能用的高度 (px) */
    avail: number;
    /** 選定的照片高度 (mm) */
    photoHmm: number;
    photoWmm: number;
  }[];
};

function num(v: string | null | undefined): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : 0;
}

function px(v: string | number | undefined | null): number {
  if (typeof v === "number") return v;
  return num(v);
}

/** 該格的形狀 (is-portrait / is-landscape / is-square class) */
function shapeOfCell(cell: HTMLElement): PairShape {
  if (cell.classList.contains("is-landscape")) return "landscape";
  if (cell.classList.contains("is-square")) return "square";
  return "portrait";
}

/**
 * 在隱藏的複製區量一格,量它在指定照片級距下的需求高度 (px)。
 *
 * 複製放在同一個 section 底下 → CSS descendant selector 對複製完全生效
 * (版面、字級、行距、float 方向都與真實一致)→ 量到的需求可信。
 *
 * @param fontPt 量測時的內文字級。9pt = 最低需求(塞不下就得縮照片),
 *               13pt = 該格「最多能吸收多少」(字級放大後的自然高度)。
 */function measureDemand(
  cell: HTMLElement,
  scale: number,
  holder: HTMLElement,
  fontPt: number,
): number {
  const clone = cell.cloneNode(true) as HTMLElement;
  // 真實 cell 是 80mm 固定高 → 複製要 auto,量自然高度
  clone.style.height = "auto";
  clone.style.overflow = "hidden";
  clone.style.margin = "0";
  clone.style.border = "none";

  // 文字鎖指定字級 → 量到的是該字級下的自然高度
  const text = clone.querySelector<HTMLElement>(".print-book-post-text");
  if (text) {
    text.style.fontSize = `${fontPt}pt`;
    text.style.lineHeight = "1.65";
  }

  // 照片依級距縮放
  const img = clone.querySelector<HTMLImageElement>(".print-book-post-image");
  if (img) {
    const ratio = num(img.dataset.imgRatio);
    if (ratio > 0) {
      const base = photoBaseMm(ratio, shapeOfCell(clone));
      img.style.width = `${(base.w * scale).toFixed(2)}mm`;
      img.style.height = `${(base.h * scale).toFixed(2)}mm`;
    }
  }

  holder.appendChild(clone);
  const cloneRect = clone.getBoundingClientRect();
  let h = cloneRect.height;
  // ⚠️ float 圖不撐高父容器 → clone 的自然高度可能小於「照片底 + 內容底」。
  //   照片若比文字還高,照片會戳出 cell 下緣被 overflow:hidden 裁掉。
  //   實測:5 格的直式照片(234px)比 cell 還高 → 照片被裁。
  //   修法:量出所有子元素底緣,超過 clone 底緣的部分補回來。
  let bottom = cloneRect.bottom;
  clone.querySelectorAll<HTMLElement>("*").forEach((n) => {
    const r = n.getBoundingClientRect();
    if (r.height > 0 && r.bottom > bottom) bottom = r.bottom;
  });
  const overflow = bottom - cloneRect.bottom;
  if (overflow > 0) h += overflow;
  holder.removeChild(clone);
  // 🆕 安全餘裕:引擎給的格高 = 自然高度 + margin。
  //   hook 的 textMaxH = cell高 − reserved − 2×PADDING − GAP
  //                        = 自然高度 + margin − 6
  //   → 文字正好填滿時,格內剩餘空白 = margin − 6。
  //   ⚠️ 2026-11-14:margin 從 22 收到 8(hook 的 tight 緩衝收到 2+2=6)
  //     → 格內剩餘 ≈ 2px(0.5mm),故事之間才真的「縮到最小」。
  h += 8;
  return h;
}

/**
 * 🆕 2026-11-14: 奇數尾頁(落單整頁)的照片尺寸規劃
 *
 * 問題:奇數篇數 → 最後一頁只有 1 則故事。舊版用「字數分級表」給照片高度
 *   (SINGLE_IMG_H_BY_CHARS),實測尾頁照片只佔 74mm,頁底留一大片空白
 *   (視覺分析:「頁底也留有較大空白」)。
 *
 * 解法:一樣用瀏覽器實測,不用分級表猜。
 *   1) 量出這格在「最低字級 (10pt)」下的文字自然高度
 *   2) 扣掉標題 / 署名 / 緩衝 → 得到「照片能吃掉的高度」
 *   3) 照片等比放大到剛好用完這些高度(寬度上限 = 內容寬 120mm)
 *   4) 文字仍以 10pt 保底,adaptive hook 再往上放大字級
 *
 * 照片比例不變 → 永遠等比完整呈現,不會被裁。
 */
function planSingleSection(
  section: HTMLElement,
  sectionIdx: number,
  singlePhotoMm: Record<string, { w: number; h: number }>,
  singleDiagnostics: PairLayoutResult["singleDiagnostics"],
): void {
  const cell = section.querySelector<HTMLElement>(".print-book-b-cell");
  if (!cell) return;
  const postId = cell.getAttribute("data-post-id");
  if (!postId) return;

  const img = cell.querySelector<HTMLImageElement>(".print-book-post-image");
  const ratio = num(img?.dataset.imgRatio);
  if (!img || ratio <= 0) return;

  const A = 96 / 25.4; // px per mm
  const CONTENT_W_MM = 120; // A5 內容寬 (148 - 14 - 14)
  const MAX_PHOTO_H_MM = 140; // CSS max-height 保險上限

  // ── 量文字在最低字級下的自然高度 ──
  //   用隱藏複製品量,避免動到真實 DOM(與 pair 的量測同一套做法)。
  const holder = document.createElement("div");
  holder.setAttribute("data-pair-measure", "1");
  holder.style.cssText =
    "position:absolute;left:-10000px;top:0;visibility:hidden;" +
    "pointer-events:none;height:auto;overflow:visible;";
  holder.style.width = `${cell.clientWidth}px`;
  section.appendChild(holder);

  let textMinH = 0;
  let avail = 0;
  let maxPhotoHmm = MAX_PHOTO_H_MM;
  try {
    const clone = cell.cloneNode(true) as HTMLElement;
    clone.style.height = "auto";
    clone.style.overflow = "hidden";
    clone.style.margin = "0";
    const cloneText = clone.querySelector<HTMLElement>(".print-book-post-text");
    if (cloneText) {
      cloneText.style.fontSize = `${MIN_PT_SINGLE}pt`;
      cloneText.style.lineHeight = "1.75";
    }
    const cloneImg = clone.querySelector<HTMLImageElement>(
      ".print-book-post-image",
    );
    if (cloneImg) {
      // 先給一個極小的照片 → 量到的是「純文字」高度
      cloneImg.style.width = "1mm";
      cloneImg.style.height = "1mm";
    }
    holder.appendChild(clone);
    textMinH = cloneText ? cloneText.scrollHeight : 0;
    holder.removeChild(clone);

    // ── 照片能吃掉的高度 ──
    //   ⚠️ 必須與 font-fit.ts 的 measureTextBudget 用「同一套保留區塊」計算,
    //     否則兩邊算出的可用高度不一致 → hook 以為塞得下、實際溢出。
    //     font-fit 的 reserveSelector = .print-book-day-header /
    //     .print-book-post-title / .print-book-post-footer(照片另計)。
    const RESERVE_SELECTOR =
      ".print-book-day-header, .print-book-post-title, .print-book-post-footer";
    const sumBox = (el: Element | null) => {
      if (!el) return 0;
      const cs = getComputedStyle(el as HTMLElement);
      return (
        (el as HTMLElement).offsetHeight +
        (parseFloat(cs.marginTop) || 0) +
        (parseFloat(cs.marginBottom) || 0)
      );
    };
    // 保留區塊(day header / 標題 / 署名)—— 與 hook 的量測完全相同
    let reserved = 0;
    cell.querySelectorAll<HTMLElement>(RESERVE_SELECTOR).forEach((n) => {
      reserved += sumBox(n);
    });
    const imgMargin = (() => {
      const cs = getComputedStyle(img);
      return (
        (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0)
      );
    })();

    // avail = 照片(含 margin)能吃的高度
    //   = cell 高 - 保留區塊 - 文字最低高度(10pt) - hook 的緩衝
    avail =
      cell.clientHeight -
      reserved -
      textMinH -
      imgMargin -
      26 - // 與 font-fit 的 PADDING_BUFFER*2 + GAP_BUFFER 對齊
      12; // 🆕 安全餘裕:字級 hook 是二分搜尋「塞得下就往上」,
    //       差一點點就會掉回 9pt 或溢位 → 多留 12px 讓文字有餘裕。

    // ⚠️ CSS 的 max-height 會夾住 inline height(超長篇 .is-very-long → 48mm)。
    //   照片實際高度若被夾小,「量到的 avail」就會失真(以為照片很高)→ 文字溢出。
    //   → 這裡把 CSS 上限一併算進來。
    const cssMaxH = (() => {
      const cs = getComputedStyle(img);
      const mh = parseFloat(cs.maxHeight);
      return Number.isFinite(mh) && mh > 0 ? mh / A : Infinity;
    })();
    maxPhotoHmm = Math.min(maxPhotoHmm, cssMaxH);
  } finally {
    section.removeChild(holder);
  }

  if (avail <= 0) return;

  // ── 照片等比放大,剛好用完 avail ──
  //   實際渲染高度 = min(inline height, CSS max-height)
  //   → 先算出「想要多高」,再同時套用寬度上限 (120mm) 與 CSS 上限。
  const maxHmm = Math.min(maxPhotoHmm, avail / A);
  let photoHmm = maxHmm;
  let photoWmm = photoHmm * ratio;
  if (photoWmm > CONTENT_W_MM) {
    photoWmm = CONTENT_W_MM;
    photoHmm = photoWmm / ratio;
  }
  // CSS max-height 會夾住 inline height → 以實際會被夾到的高度為準
  photoHmm = Math.min(photoHmm, maxPhotoHmm);

  singlePhotoMm[postId] = {
    w: +photoWmm.toFixed(2),
    h: +photoHmm.toFixed(2),
  };
  singleDiagnostics.push({
    postId,
    textMinH: Math.round(textMinH),
    avail: Math.round(avail),
    photoHmm: +photoHmm.toFixed(1),
    photoWmm: +photoWmm.toFixed(1),
  });
}

/**
 * 量測整份 mode B 版面,回傳每格應該的高度與照片級距。
 *
 * 本函式**不改真實 DOM** —— 結果交給 React 以 inline style 套用,
 * 避免 React re-render 把值蓋掉。
 */
export function planPairLayout(root: HTMLElement): PairLayoutResult {
  const heights: Record<string, number> = {};
  const photoScale: Record<string, number> = {};
  const singlePhotoMm: Record<string, { w: number; h: number }> = {};
  const diagnostics: PairLayoutResult["diagnostics"] = [];
  const singleDiagnostics: PairLayoutResult["singleDiagnostics"] = [];

  const sections = Array.from(
    root.querySelectorAll<HTMLElement>(
      ".print-book-mode-b-pair-page.has-two",
    ),
  );

  // 🆕 奇數尾頁(落單整頁)另外規劃照片尺寸
  Array.from(
    root.querySelectorAll<HTMLElement>(
      ".print-book-mode-b-pair-page.is-single",
    ),
  ).forEach((section, idx) =>
    planSingleSection(section, idx, singlePhotoMm, singleDiagnostics),
  );

  sections.forEach((section, sectionIdx) => {
    const cells = Array.from(
      section.querySelectorAll<HTMLElement>(".print-book-b-cell"),
    );
    if (cells.length !== 2) return;

    // 隱藏量測區 —— 放在 section 底下,讓 CSS selector 完全生效
    const holder = document.createElement("div");
    holder.setAttribute("data-pair-measure", "1");
    holder.style.cssText =
      "position:absolute;left:-10000px;top:0;visibility:hidden;" +
      "pointer-events:none;height:auto;overflow:visible;";
    holder.style.width = `${cells[0].clientWidth}px`;
    section.appendChild(holder);

    try {
      const secCs = getComputedStyle(section);
      const contentH =
        section.clientHeight - px(secCs.paddingTop) - px(secCs.paddingBottom);

      // 頁頂共用 day header(同頁同日才有)
      const sharedHdr = section.querySelector<HTMLElement>(
        ".print-book-pair-day-header",
      );
      const used = sharedHdr
        ? sharedHdr.offsetHeight +
          px(getComputedStyle(sharedHdr).marginBottom)
        : 0;

      // 兩格之間的間距(相鄰 sibling margin 會 collapse → 取較大者)
      const c0 = getComputedStyle(cells[0]);
      const c1 = getComputedStyle(cells[1]);
      const gap =
        Math.max(px(c0.marginBottom), px(c1.marginTop)) +
        px(c1.borderTopWidth);

      const avail = contentH - used - gap;
      if (avail <= 0) return;

      // ── 需求(9pt = 最低需求) ──
      //   🆕 2026-11-14: 從最高級距 1.3 起算(使用者要求照片放大 30%),
      //     塞不下才逐級往下退(1.3 → 1.15 → 1 → 0.85 → …)。
      const scales: number[] = [PHOTO_SCALES[0], PHOTO_SCALES[0]];
      const demands: number[] = cells.map((c, i) =>
        measureDemand(c, scales[i], holder, MIN_PT_PAIR),
      );

      // ── 配平:加總超出 → 縮照片(窄照片 → 文字欄寬 → 文字變矮) ──
      for (let guard = 0; guard < 24; guard++) {
        if (demands[0] + demands[1] <= avail) break;
        const idx = demands[0] >= demands[1] ? 0 : 1;
        const pos = PHOTO_SCALES.indexOf(
          scales[idx] as (typeof PHOTO_SCALES)[number],
        );
        const next = PHOTO_SCALES[Math.min(pos + 1, PHOTO_SCALES.length - 1)];
        if (next === scales[idx]) break; // 已到最小級距
        scales[idx] = next;
        demands[idx] = measureDemand(cells[idx], next, holder, MIN_PT_PAIR);
      }

      // ── 配置 ──
      //   目標:兩格都不裁字、字級盡量放大、空白集中在頁底。
      //
      //   ⚠️ 為什麼空白要集中在頁底而不是平均分給兩格?
      //     分給兩格 → 故事一結束就出現一段空白,故事二才開始(頁中間破個洞),
      //     視覺像「漏排了」;頁尾留白則是書本正常的收尾。
      //     (實測:均分時故事一與故事二之間出現明顯空洞。)
      //
      //   步驟:
      //     1) fill[i] = 該格在 13pt(字級上限)下的自然高度 = 填滿所需高度
      //     2) need[i] = 該格在 9pt(字級下限)下的自然高度 = 最低所需高度
      //     3) 兩格都填得下 → 第一格給 fill[0],第二格拿剩下的
      //        (多出來的高度在第二格下方 = 頁底留白,不會在頁中間破洞)
      //     4) 兩格加起來填不滿 → 依 fill 比例分配,讓兩格字級同步縮到塞得下
      //        (比例分配 → 兩格字級一致,不會一篇 13pt 一篇 9pt)
      const capPt = MAX_PT_PAIR;

      let h0: number;
      let h1: number;

      // ── 🆕 2026-11-14 二分找出「兩格共同的最大字級」,格高 = 該字級的自然高度 ──
      //
      // 問題(使用者:「2個故事中間的間隔寬度太寬請縮到最小」):
      //   舊版用「13pt 的自然高度比例分配格高」,但 hook 實際選的字級是
      //   「在給定格高下塞得下的最大字級」→ 兩者不一致 → 格內多出 5~12mm 空白,
      //   而這段空白正好夾在故事一與故事二之間,視覺上就是「間隔太寬」。
      //
      // 解法:
      //   1) 二分找出最大的共同字級 pt*(兩格在此字級下的自然高度加起來 ≤ avail)
      //   2) 格高 = 該字級下的自然高度 → hook 在這個格高下正好選到 pt*,
      //      文字剛好填滿格子 → 格內留白 ≈ 0
      //   3) 多出來的高度全部落在頁底(書本正常收尾)
      //
      // ⚠️ 為什麼兩格要同一個字級?不同字級會讓同一頁兩則故事大小不一,
      //    視覺突兀;而且舊版的比例分配本質上就是在硬做這件事,做得很差。
      const demandsAt = (pt: number): number[] =>
        cells.map((c, i) => measureDemand(c, scales[i], holder, pt));

      // 需求高度隨字級單調遞增 → 可二分
      let lo = MIN_PT_PAIR;
      let hi = capPt;
      let bestPt = MIN_PT_PAIR;
      let bestNeeds: number[] = demandsAt(MIN_PT_PAIR);
      for (let guard = 0; guard < 24; guard++) {
        const mid = (lo + hi) / 2;
        const need = demandsAt(mid);
        if (need[0] + need[1] <= avail) {
          bestPt = mid;
          bestNeeds = need;
          lo = mid;
        } else {
          hi = mid;
        }
        if (hi - lo < 0.05) break;
      }

      h0 = bestNeeds[0];
      h1 = bestNeeds[1];

      // 保底:不得低於 9pt 最低需求(照片底線不可被裁)
      if (h0 < demands[0]) h0 = demands[0];
      if (h1 < demands[1]) h1 = demands[1];

      // 兩格加起來仍超過 avail(極少見:bestNeeds 已保 ≤ avail,除非 demands 較大)
      //   → 依比例縮,兩格字級同步下降(版面平衡)
      if (h0 + h1 > avail) {
        const k = avail / (h0 + h1);
        h0 *= k;
        h1 *= k;
      }

      h0 = Math.round(h0);
      h1 = Math.round(h1);

      const ids = cells.map((c) => c.getAttribute("data-post-id"));
      if (ids[0]) {
        heights[ids[0]] = h0;
        photoScale[ids[0]] = scales[0];
      }
      if (ids[1]) {
        heights[ids[1]] = h1;
        photoScale[ids[1]] = scales[1];
      }

      diagnostics.push({
        section: sectionIdx,
        demand: demands.map((d) => Math.round(d)),
        avail: Math.round(avail),
        allocated: [h0, h1],
        photoScale: scales,
        overflow: demands[0] + demands[1] > avail,
        // 🆕 格內空白:格高 − 該格在最佳字級下的自然高度(兩格相加 = 本頁的空白總量)
        leftover: Math.max(
          0,
          Math.round(avail - h0 - h1),
        ),
      });
    } finally {
      section.removeChild(holder);
    }
  });

  return { heights, photoScale, singlePhotoMm, diagnostics, singleDiagnostics };
}

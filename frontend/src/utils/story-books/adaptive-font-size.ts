/**
 * 🆕 2026-10-20 聖上指示: 字體自適應 hook (React 層)
 *
 * 量測邏輯全部在 `./font-fit` —— 那個檔案不依賴 React,所以
 *   - dev script 可以直接 import 驗證「測的就是線上那份程式」
 *   - 這個檔案只負責把 DOM ref 接到量測核心 + ResizeObserver 重測
 *
 * 為什麼 useLayoutEffect + ResizeObserver:
 *   - useLayoutEffect 在 paint 前執行,避免 layout flash
 *   - ResizeObserver 監容器 resize (圖片 loaded 後 + viewport 變化)
 *
 * ⚠️ 10-21 修掉的兩個真 bug 見 font-fit.ts 檔頭說明:
 *    line-clamp 讓二分收斂到 MAX_PT / float 圖不該扣可用高度。
 */

import { useLayoutEffect } from "react";
import {
  fitFontSizeInCell,
  measureTextBudget,
  DEFAULT_RESERVE_SELECTOR,
  MIN_PT_PAIR,
  MAX_PT_PAIR,
  MIN_PT_SINGLE,
  MAX_PT_SINGLE,
  type FitFontOptions,
} from "./font-fit";

export {
  fitFontSizeInCell,
  measureTextBudget,
  DEFAULT_RESERVE_SELECTOR,
  MIN_PT_PAIR,
  MAX_PT_PAIR,
  MIN_PT_SINGLE,
  MAX_PT_SINGLE,
};
export type { FitFontOptions };

/**
 * 在容器內的某個 element 自動塞最大 fontSize。
 *
 * @param elGetter 取得要量測的元素 (通常是 () => textRef.current)
 * @param containerRef cell 容器 ref
 * @param deps 重跑時機 (通常 = [post.id])
 * @param opts 字級區間 / 預扣區塊 / 行距
 */
export function useAdaptiveFontSize(
  elGetter: () => HTMLElement | null | undefined,
  containerRef: React.RefObject<HTMLElement | null>,
  deps: React.DependencyList = [],
  opts: FitFontOptions = {},
): void {
  useLayoutEffect(() => {
    const text = elGetter();
    const container = containerRef.current;
    if (!text || !container) return;

    const measure = () => {
      const current = containerRef.current;
      const el = elGetter();
      if (!current || !el) return;
      fitFontSizeInCell(current, el, opts);
    };

    measure();

    // 圖片還沒 load → 完成後再量一次 (圖寬會改變 → 文字可用寬度變了)
    const imgs = containerRef.current?.querySelectorAll(
      ".print-book-post-image",
    );
    imgs?.forEach((img) => {
      const i = img as HTMLImageElement;
      if (!i.complete) {
        i.addEventListener("load", measure, { once: true });
        i.addEventListener("error", measure, { once: true });
      }
    });

    // 容器/視窗 resize 時重測
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    imgs?.forEach((img) => ro.observe(img));

    return () => {
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * 給 print-pdf Puppeteer route 用的「檢測器」 — 等所有 .print-book-post-text 都設定 fontSize。
 *
 * 聖上 USER 偏好「驗證 receipt before complete」:Puppeteer 開拍前要保證
 * hook 把 fontSize 都定下來了,否則拍出來字體不一致。
 */
export function allFontSizesReadyPredicate(): boolean {
  if (typeof document === "undefined") return false;
  const texts = Array.from(
    document.querySelectorAll<HTMLElement>(".print-book-post-text"),
  );
  if (texts.length === 0) return false;
  return texts.every((el) => {
    const fs = el.style.fontSize;
    return fs && fs.endsWith("pt");
  });
}

/** 方便 debug:回報每個 cell 的填滿率 (1.0 = 剛好塞滿) */
export function fontFillReport(): {
  pt: number;
  fill: number;
  cellH: number;
}[] {
  if (typeof document === "undefined") return [];
  return Array.from(
    document.querySelectorAll<HTMLElement>(".print-book-post-text"),
  ).map((el) => ({
    pt: Number(el.dataset.adaptiveFontPt ?? 0),
    fill: Number(el.dataset.adaptiveFillRatio ?? 0),
    cellH: Number(el.dataset.adaptiveCellH ?? 0),
  }));
}
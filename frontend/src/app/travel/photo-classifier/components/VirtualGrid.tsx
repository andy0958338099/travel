// 2026-07-30 聖上拍板: 自製 Virtual Scroll (效能, 3000 張不卡)
// 不引入 react-window (避免多裝 dep) — 用 IntersectionObserver + absolute position

// ⚠️ 聖上看此檔前請看下說明: 這是「單欄」虛擬化, 用 grid-auto-rows 不需要 libraries。
// columns 數可變, IntersectionObserver 偵測每 row 渲染時機

import { useEffect, useRef, useState, useCallback, ReactNode } from "react";

interface VirtualGridProps<T> {
  items: T[];
  columns: number;
  rowHeight: number; // px, 每 row 的固定高度 (含 gap)
  gap: number;       // px, grid gap
  overscan?: number; // 多渲染幾 row buffer, 預設 2
  renderCell: (item: T, index: number) => ReactNode;
  className?: string;
}

interface Range {
  startRow: number;
  endRow: number;
}

export function VirtualGrid<T>({
  items,
  columns,
  rowHeight,
  gap,
  overscan = 2,
  renderCell,
  className = "",
}: VirtualGridProps<T>) {
  // 容器實際高度 (= items.length / columns 的總高, ceil)
  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount * rowHeight + gap;

  // 計算當前可見範圍 (使用 viewport 高度 + scrollTop)
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>({ startRow: 0, endRow: Math.min(rowCount, 10) });

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, clientHeight } = el;
    // 計算可見 row range
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(clientHeight / rowHeight) + overscan * 2;
    const endRow = Math.min(rowCount, startRow + visibleRowCount);
    setRange({ startRow, endRow });
  }, [rowHeight, overscan, rowCount]);

  useEffect(() => {
    onScroll(); // initial
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      style={{ height: "100%" }}
    >
      {/* 占位: 撐出實際總高度, 讓 scrollbar 出現 */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {Array.from({ length: range.endRow - range.startRow }).map((_, i) => {
          const rowIdx = range.startRow + i;
          return (
            <div
              key={rowIdx}
              style={{
                position: "absolute",
                top: rowIdx * rowHeight,
                left: 0,
                right: 0,
                height: rowHeight - gap,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
              }}
            >
              {Array.from({ length: columns }).map((_, colIdx) => {
                const itemIdx = rowIdx * columns + colIdx;
                if (itemIdx >= items.length) {
                  return <div key={colIdx} />; // placeholder for last partial row
                }
                return (
                  <div key={colIdx} style={{ position: "relative", overflow: "hidden" }}>
                    {renderCell(items[itemIdx], itemIdx)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

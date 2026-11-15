'use client';

import { useMemo, useState } from 'react';
import { parseItineraryTimeline } from './itineraryTimeline';

/**
 * 完整 8 天行程時間軸（網格下方的總覽面板）。
 *
 * 資料來源：src/data/jiangnan-itinerary.ts — 原始貼上的行程表，
 * 包含交通、住宿、餐廳與每個時間點，比 planner 網格上的活動方塊細很多。
 * 純前端顯示，不寫回 Supabase。
 */
export default function ItineraryTimelinePanel() {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const days = useMemo(() => parseItineraryTimeline(), []);

  if (days.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto mt-4 bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-800">📋 每日詳細行程表</h3>
        <span className="text-xs text-gray-500">
          原始行程大方向（交通 / 住宿 / 餐飲 / 時間點），共 {days.length} 天
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {days.map(d => {
          const isOpen = openDay === d.day;
          return (
            <div
              key={d.day}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : d.day)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                aria-expanded={isOpen}
              >
                <span
                  className={`text-gray-400 text-xs transition-transform inline-block ${isOpen ? 'rotate-90' : ''}`}
                >
                  ▸
                </span>
                <span className="text-xs font-bold text-gray-700 shrink-0">D{d.day}</span>
                <span className="text-xs text-gray-600 truncate min-w-0">
                  {d.heading.replace(/^\d{2}\/\d{2}\s*\((D\d),?\s*/, '').replace(/\)$/, '')}
                </span>
                <span className="ml-auto text-[10px] text-gray-400 shrink-0">
                  {d.entries.length} 項
                </span>
              </button>

              {isOpen && (
                <div className="px-3 py-2 space-y-1 bg-white">
                  {d.entries.map((e, i) => (
                    <div
                      key={`${e.time}-${i}`}
                      className="flex gap-2 text-xs leading-relaxed"
                    >
                      <span className="shrink-0 font-mono text-blue-700 tabular-nums w-[78px]">
                        {e.time}
                      </span>
                      <span className="text-gray-700 min-w-0 break-words">{e.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

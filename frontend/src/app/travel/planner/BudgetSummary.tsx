import { useMemo } from 'react';
import type { BudgetSummaryProps } from './types';
import { COST_CATEGORIES, DAYS, fmt } from './constants';

export default function BudgetSummary({ activities, memberCount, onPersonCountChange }: BudgetSummaryProps) {
  // 旅程總價 + 每人平均（每活動 cost × 人數；Math.round 處理餘數）
  const total = activities.reduce((s, a) => s + (a.cost ?? 0), 0) * memberCount;
  const perPerson = Math.round(total / memberCount);

  // 每日每人費用 — single pass O(N) 而非 O(N×D)
  const byDay = useMemo(() => {
    const sums = new Array(DAYS.length).fill(0);
    for (const a of activities) {
      const idx = a.day - 1;
      if (idx >= 0 && idx < sums.length) sums[idx] += a.cost ?? 0;
    }
    return sums;
  }, [activities]);

  // 各分類總和 — single pass group by costType
  const byCategory = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const a of activities) {
      if (!a.costType || (a.cost ?? 0) <= 0) continue;
      sums[a.costType] = (sums[a.costType] ?? 0) + (a.cost ?? 0);
    }
    return sums;
  }, [activities]);

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-4">
      {/* 總覽 Bar */}
      <div className="flex flex-wrap items-center gap-6 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">參與人數</span>
          <button
            onClick={() => onPersonCountChange(Math.max(1, memberCount - 1))}
            className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center"
          >−</button>
          <span className="font-bold text-emerald-700 text-lg min-w-[2ch] text-center">{memberCount}</span>
          <button
            onClick={() => onPersonCountChange(memberCount + 1)}
            className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center"
          >+</button>
        </div>

        <div className="h-8 w-px bg-emerald-300 hidden sm:block" />

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">旅程總價</div>
            <div className="text-xl font-bold text-emerald-700">NT$ {fmt(total)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-0.5">每人平均</div>
            <div className="text-xl font-bold text-teal-700">NT$ {fmt(perPerson)}</div>
          </div>
        </div>

        <div className="h-8 w-px bg-emerald-300 hidden sm:block" />

        {/* 每人各日費用 */}
        <div className="flex items-center gap-2 flex-wrap">
          {byDay.map((dayTotal, i) => (
            <div key={i} className="text-center">
              <div className="text-xs text-gray-400">{DAYS[i].label}</div>
              <div className={`text-sm font-semibold ${dayTotal > 0 ? 'text-teal-600' : 'text-gray-300'}`}>
                {dayTotal > 0 ? `NT$ ${fmt(dayTotal)}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 詳細分類 */}
      <div className="grid grid-cols-5 gap-2 pt-3 border-t border-emerald-200">
        {COST_CATEGORIES.map(item => {
          const sum = byCategory[item.costType] ?? 0;
          return (
            <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center border-2 border-gray-300 shadow-sm`}>
              <div className="text-xl text-gray-700 font-bold">{item.label}</div>
              <div className="font-bold text-gray-800 text-2xl">NT$ {fmt(sum)} /人</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
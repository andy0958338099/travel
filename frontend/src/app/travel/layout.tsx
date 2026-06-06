'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  loadNavOrder,
  saveNavOrder,
  applyOrder,
  DEFAULT_NAV_ITEMS,
  NAV_ORDER_KEY,
  NavItem,
} from '@/utils/navOrderService';
import { useCloudState } from '@/utils/useCloudState';

/**
 * TravelLayout — 共用 layout, 自動套用到 /travel/* 19 個 subpage
 *
 * 功能:
 * 1. 頂部中國風導覽列 (雲紋橫條 + nav 3 行 + 排序)
 * 2. 紅色 active state (當前頁面高亮)
 * 3. 返回首頁 + 「江南」印章角落
 * 4. 內頁內容 children
 */
export default function TravelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [navOrder, setNavOrder] = useState<NavItem[]>(DEFAULT_NAV_ITEMS);
  const [cloudNavOrder] = useCloudState<string[] | null>(NAV_ORDER_KEY, null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  useEffect(() => {
    if (cloudNavOrder) {
      setNavOrder(applyOrder(cloudNavOrder));
      return;
    }
    loadNavOrder().then(setNavOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudNavOrder]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ══════ 頂部中國風導覽列 ══════ */}
      <header className="relative bg-gradient-to-br from-red-700 via-red-600 to-rose-700 text-white shadow-lg">
        {/* 雲紋橫條 (5px gradient) */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* 頂列: 返回首頁 + 江南印章 + 排序 */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/"
              className="text-white/90 hover:text-white text-sm flex-shrink-0 flex items-center gap-1"
            >
              <span>←</span>
              <span>返回首頁</span>
            </Link>
            <div className="flex-1" />
            {isEditingOrder ? (
              <>
                <button
                  onClick={() => { setIsEditingOrder(false); saveNavOrder(navOrder); }}
                  className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-full text-sm font-medium"
                >
                  ✓ 儲存
                </button>
                <button
                  onClick={() => { setIsEditingOrder(false); setNavOrder(DEFAULT_NAV_ITEMS); }}
                  className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-sm"
                >
                  ✕ 取消
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingOrder(true)}
                className="bg-amber-500 hover:bg-amber-600 text-stone-900 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
              >
                <span>✏️</span>
                <span className="hidden sm:inline">排序</span>
              </button>
            )}
          </div>

          {/* Nav row: 3 行 flex-wrap, active state 朱紅 */}
          {isEditingOrder ? (
            <div className="flex flex-wrap gap-1.5 -mx-1 px-1">
              {navOrder.map((item, idx) => (
                <div key={item.key} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                  <button
                    onClick={() => {
                      const next = [...navOrder];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      setNavOrder(next.filter(Boolean));
                    }}
                    disabled={idx === 0}
                    className="text-white/60 hover:text-white disabled:opacity-30 text-xs px-1"
                  >
                    ↑
                  </button>
                  <span className="text-xs text-white/90">{item.label}</span>
                  <button
                    onClick={() => {
                      const next = [...navOrder];
                      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      setNavOrder(next.filter(Boolean));
                    }}
                    disabled={idx === navOrder.length - 1}
                    className="text-white/60 hover:text-white disabled:opacity-30 text-xs px-1"
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 -mx-1 px-1">
              {navOrder.map(item => {
                const isActive = pathname === item.href ||
                  (item.href !== '/travel' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`px-2.5 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-amber-300 text-red-900 font-bold shadow-md ring-2 ring-amber-200'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* 江南印章 (右下角裝飾) */}
          <div className="hidden sm:block absolute bottom-3 right-6 pointer-events-none">
            <div className="w-12 h-12 rounded-lg bg-rose-900/80 border-2 border-amber-300/60 flex items-center justify-center text-amber-200 font-bold text-lg shadow-md select-none"
                 style={{ fontFamily: 'serif', writingMode: 'vertical-rl' }}>
              江南
            </div>
          </div>
        </div>

        {/* 底部 1px 雲紋 */}
        <div className="h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-300/80 to-amber-500/60" />
      </header>

      {/* ══════ Page Content ══════ */}
      <main>{children}</main>

      {/* ══════ 全域 Footer (中國風) ══════ */}
      <footer className="mt-12 border-t-2 border-amber-300/40 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-sm text-stone-600 font-serif">
            🏮 江南水鄉八日之旅 · 2026 夏 · Brian & Mana 🏮
          </p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { key: 'main', label: '🏠 主頁', href: '/characters' },
  { key: 'diaries', label: '📔 日記', href: '/characters/diaries' },
  { key: 'gallery', label: '🖼️ 畫廊', href: '/characters/gallery' },
  { key: 'portfolio', label: '💼 作品集', href: '/characters/portfolio' },
  { key: 'songs', label: '🎵 歌曲', href: '/characters/songs' },
  { key: 'voice-test', label: '🎤 語音測試', href: '/characters/voice-test' },
];

/**
 * CharactersLayout — 共用 layout, 自動套用到 /characters/* 6 個 subpage
 *
 * 設計: 中國風朱紅 header (雲紋橫條 + nav pill + 江南印章) + 底部 footer
 * 跟 /travel/layout.tsx 一致, 簡化版 (無排序)
 */
export default function CharactersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="relative bg-gradient-to-br from-red-700 via-red-600 to-rose-700 text-white shadow-lg">
        {/* 雲紋橫條 */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          {/* 頂列: 返回首頁 */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/"
              className="text-white/90 hover:text-white text-sm flex-shrink-0 flex items-center gap-1"
            >
              <span>←</span>
              <span>返回首頁</span>
            </Link>
          </div>

          {/* Nav row: flex-wrap, active state 朱紅 */}
          <div className="flex flex-wrap gap-1.5 -mx-1 px-1">
            {NAV_ITEMS.map(item => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/characters' && pathname.startsWith(item.href));
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
        </div>

        {/* 底部 1px 雲紋 */}
        <div className="h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-300/80 to-amber-500/60" />
      </header>

      <main>{children}</main>
    </div>
  );
}

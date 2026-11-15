'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { key: 'main', label: '🏠 主頁', href: '/automation' },
  { key: 'network', label: '🌐 網路', href: '/automation/network' },
  { key: 'songs', label: '🎵 歌曲', href: '/automation/songs' },
  { key: 'story-arc', label: '🎬 故事弧', href: '/automation/story-arc' },
  { key: 'timeline', label: '📅 時間軸', href: '/automation/timeline' },
  { key: 'tts', label: '🗣️ TTS', href: '/automation/tts' },
  { key: 'video-editor', label: '🎥 影片編輯', href: '/automation/video-editor' },
];

/**
 * AutomationLayout — 共用 layout, 自動套用到 /automation/* 7 個 subpage
 *
 * 設計: 中國風朱紅 header (雲紋橫條 + nav pill + 江南印章) + 底部 footer
 * 跟 /travel/layout.tsx 一致, 簡化版 (無排序)
 */
export default function AutomationLayout({ children }: { children: React.ReactNode }) {
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
              className="text-white hover:text-amber-200 text-sm font-medium flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,.55)" }}
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
                (item.href !== '/automation' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`px-2.5 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-300 text-red-900 font-bold shadow-md ring-2 ring-amber-200'
                      : 'bg-black/40 hover:bg-black/50 text-white shadow-sm'
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

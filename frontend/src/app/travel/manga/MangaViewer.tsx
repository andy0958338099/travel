/**
 * MangaViewer — 4 格 AI 漫畫查看器
 *
 * Modal 顯示：
 * - 4 個 panel（直式 3:4）+ 標題/說明
 * - 短/中/長 desc（摺疊式）
 * - 每格可單獨 🔄 regenerate
 * - 全格重新生成
 * - like 計數
 *
 * 觸發 /api/manga/regenerate-panel（單格）
 */

"use client";

import { useState } from "react";
import type { PanelIndex } from "@/lib/ai/mangaPrompts";

export interface MangaData {
  id: string;
  source_type: string;
  source_id: string;
  source_name: string;
  character_id: string;
  character_name: string;
  panel_1_url: string | null;
  panel_1_title: string;
  panel_1_caption: string;
  panel_2_url: string | null;
  panel_2_title: string;
  panel_2_caption: string;
  panel_3_url: string | null;
  panel_3_title: string;
  panel_3_caption: string;
  panel_4_url: string | null;
  panel_4_title: string;
  panel_4_caption: string;
  short_desc: string;
  medium_desc: string;
  long_desc: string;
  status: string;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  manga: MangaData;
  onClose: () => void;
  onUpdate?: (updated: MangaData) => void;
}

const PANEL_TITLES: Record<PanelIndex, string> = {
  1: "歡迎光臨",
  2: "歷史文化",
  3: "必吃必拍",
  4: "打卡 tips",
};

export default function MangaViewer({ manga, onClose, onUpdate }: Props) {
  const [regenerating, setRegenerating] = useState<PanelIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<MangaData>(manga);
  const [showLong, setShowLong] = useState(false);

  async function handleRegenerate(panel: PanelIndex) {
    setRegenerating(panel);
    setError(null);
    try {
      const res = await fetch("/api/manga/regenerate-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId: current.id, panel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "重生失敗");

      // 更新本地狀態
      const urlKey = `panel_${panel}_url` as keyof MangaData;
      const updated: MangaData = { ...current, [urlKey]: json.url };
      setCurrent(updated);
      onUpdate?.(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegenerating(null);
    }
  }

  const panels: PanelIndex[] = [1, 2, 3, 4];
  const successCount = panels.filter((p) => current[`panel_${p}_url` as keyof MangaData]).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-5 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <div className="text-xs opacity-80">🎨 AI 漫畫 · {current.character_name}</div>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5">{current.source_name}</h2>
            <div className="text-xs opacity-80 mt-1">
              {successCount}/4 格 · 狀態：{current.status}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* 4 Panel grid */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {panels.map((p) => {
              const urlKey = `panel_${p}_url` as const;
              const titleKey = `panel_${p}_title` as const;
              const captionKey = `panel_${p}_caption` as const;
              const url = current[urlKey];
              const isRegen = regenerating === p;

              return (
                <div key={p} className="flex flex-col">
                  {/* Panel image */}
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg overflow-hidden border border-gray-200">
                    {url ? (
                      <img
                        src={url}
                        alt={`Panel ${p}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                        {isRegen ? "⏳ 生成中…" : "❌ 缺圖"}
                      </div>
                    )}
                    {isRegen && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="text-white text-xs font-semibold animate-pulse">
                          🎨 {p}/4
                        </div>
                      </div>
                    )}
                    {/* Panel number badge */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      {p}/4
                    </div>
                  </div>

                  {/* Title + caption */}
                  <div className="mt-2 px-1">
                    <div className="text-xs font-bold text-indigo-600">
                      {PANEL_TITLES[p]}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5 line-clamp-1">
                      {current[titleKey]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                      {current[captionKey]}
                    </div>
                  </div>

                  {/* Regenerate button */}
                  <button
                    onClick={() => handleRegenerate(p)}
                    disabled={isRegen}
                    className="mt-2 text-xs py-1.5 px-2 bg-white border border-gray-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRegen ? "⏳ 重生中…" : "🔄 重新生成此格"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Descriptions */}
        <div className="px-4 sm:px-5 pb-5 space-y-3">
          {current.short_desc && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
              <div className="text-xs font-bold text-amber-700 mb-1">⚡ 一句話</div>
              <div className="text-sm text-gray-800">{current.short_desc}</div>
            </div>
          )}
          {current.medium_desc && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs font-bold text-blue-700 mb-1">📖 300 字介紹</div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {current.medium_desc}
              </div>
            </div>
          )}
          {current.long_desc && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
              <div className="text-xs font-bold text-purple-700 mb-1 flex items-center justify-between">
                <span>📚 完整攻略 {showLong ? "" : "（點擊展開）"}</span>
                <button
                  onClick={() => setShowLong((s) => !s)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  {showLong ? "收合 ▲" : "展開 ▼"}
                </button>
              </div>
              {showLong ? (
                <div className="text-sm text-gray-800 whitespace-pre-wrap mt-2">
                  {current.long_desc}
                </div>
              ) : (
                <div className="text-sm text-gray-600 line-clamp-3 mt-1">
                  {current.long_desc}
                </div>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
            <span>ID: {current.id.slice(0, 8)}</span>
            <span>更新：{new Date(current.updated_at).toLocaleString("zh-TW")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

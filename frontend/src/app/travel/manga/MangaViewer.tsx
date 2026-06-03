/**
 * MangaViewer — 4 格 Q版漫畫查看器
 *
 * ⚠️ v3.0 規則（user 2026-06-03）：
 *   - 圖片完全不放任何文字（NO TEXT rule）
 *   - 所有文字由程式第二階段 HTML/CSS overlay 疊加
 *   - 字體：Noto Sans TC
 *   - 每張卡：title（固定）+ subtitle（景點名）+ description（caption）
 */

"use client";

import { useState } from "react";
import type { PanelIndex } from "@/lib/ai/mangaPrompts";
import { PANEL_META } from "@/lib/ai/mangaPrompts";

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

// Noto Sans TC 載入（從 Google Fonts）
const NOTO_SANS_TC = "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap";

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
    <>
      {/* 載入 Noto Sans TC */}
      <link rel="stylesheet" href={NOTO_SANS_TC} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{ fontFamily: "'Noto Sans TC', system-ui, sans-serif" }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-5 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <div className="text-xs opacity-80">🎨 Q版漫畫 · {current.character_name}</div>
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

          {/* 4 Panel grid — 每格都是「背景圖 + 程式疊加文字」 */}
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {panels.map((p) => {
                const urlKey = `panel_${p}_url` as const;
                const captionKey = `panel_${p}_caption` as const;
                const url = current[urlKey];
                const isRegen = regenerating === p;
                const meta = PANEL_META[p];

                return (
                  <div key={p} className="flex flex-col">
                    {/* 卡片：圖片 + 文字 overlay */}
                    <div className="relative aspect-[3/4] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      {url ? (
                        <img
                          src={url}
                          alt={`${meta.title} - ${current.source_name}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          {isRegen ? "⏳ 生成中…" : "❌ 缺圖"}
                        </div>
                      )}
                      {isRegen && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                          <div className="text-white text-xs font-semibold animate-pulse">
                            🎨 {p}/4
                          </div>
                        </div>
                      )}

                      {/* ── 第二階段：HTML/CSS 文字疊加（v3.0 規則） ── */}
                      {url && (
                        <div className="absolute inset-0 flex flex-col z-10 pointer-events-none">
                          {/* 底部漸層 backdrop（讓白字清楚） */}
                          <div className="flex-1 bg-gradient-to-b from-black/0 via-black/0 to-black/70" />

                          {/* 文字區（bottom） */}
                          <div className="p-3 text-white space-y-1.5">
                            {/* 標題 + 序號 badge */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                                {p}/4
                              </span>
                              <span className="text-base sm:text-lg font-black drop-shadow-md leading-tight">
                                {meta.title}
                              </span>
                              <span className="text-base sm:text-lg">{meta.icon}</span>
                            </div>

                            {/* 副標題 = 景點名 */}
                            <div className="text-xs font-bold opacity-95 drop-shadow truncate">
                              📍 {current.source_name}
                            </div>

                            {/* 說明 = chat 生成的 caption */}
                            <div className="text-xs leading-snug font-medium drop-shadow-md line-clamp-3">
                              {current[captionKey] || "—"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Regenerate 按鈕（panel 下方，不重疊） */}
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

          {/* Descriptions (短/中/長 — 程式文字) */}
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
    </>
  );
}

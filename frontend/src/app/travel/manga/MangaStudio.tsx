/**
 * MangaStudio — 江南水鄉八日之旅 · Q版漫畫圖鑑 client
 *
 * 行為：
 * 1. 33 個景點 grid（按 category 分組）
 * 2. 每張卡有 🎨 按鈕 → 觸發 /api/manga/generate
 * 3. 雲端 feed 載入已生成的 manga（按 sourceId 索引）
 * 4. 點擊未生成的 → 顯示生成進度（4 panel 逐個出現）
 * 5. 點擊已生成的 → 直接打開 viewer modal
 * 6. Viewer modal：4 panel + desc + per-panel regenerate
 *
 * 狀態管理：
 * - generatedMap: { [sourceId]: Manga } 本地快取（避重複請求）
 * - generating: { [sourceId]: 0..4 } 生成進度
 * - openManga: 當前打開的 manga
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ATTRACTION_CATEGORIES } from "@/utils/mangaTaxonomy";
import MangaViewer, { type MangaData } from "./MangaViewer";

export interface AttractionLite {
  name: string;
  nameEn: string;
  category: keyof typeof ATTRACTION_CATEGORIES;
  cover: string;
  highlight: string;
  region: string;
}

type Category = AttractionLite["category"];

interface Props {
  attractions: AttractionLite[];
}

// v2: bump from v1 → 重新整理清掉之前測試的 leifeng* 來源 ID
const STORAGE_KEY = "manga-studio-generated-v2";

export default function MangaStudio({ attractions }: Props) {
  // 雲端已生成的 manga（按 sourceId 索引）
  const [generatedMap, setGeneratedMap] = useState<Record<string, MangaData>>({});
  // 正在生成的景點（顯示進度）
  const [generating, setGenerating] = useState<Record<string, { current: number; total: number }>>({});
  // 當前打開的 manga
  const [openManga, setOpenManga] = useState<MangaData | null>(null);
  // 載入中
  const [loading, setLoading] = useState(true);
  // 分類篩選
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");

  // ── 啟動時：載入雲端 feed ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/manga/feed?limit=200");
        const json = await res.json();
        if (cancelled) return;
        const map: Record<string, MangaData> = {};
        for (const m of json.mangas || []) {
          // 只索引 attraction 類型（這頁只處理景點）
          if (m.source_type === "attraction") {
            map[m.source_id] = m as MangaData;
          }
        }
        setGeneratedMap(map);
      } catch (e) {
        console.error("[manga] feed load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 從 localStorage 恢復上次 session 的快取（重新整理不掉）──
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const local = JSON.parse(stored) as Record<string, MangaData>;
        setGeneratedMap((prev) => ({ ...local, ...prev })); // 雲端優先
      }
    } catch {
      // ignore
    }
  }, []);

  // ── 從 URL ?open={mangaId} 自動打開 modal（分享連結接收者用）──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const openId = new URLSearchParams(window.location.search).get("open");
    if (!openId) return;
    // 雲端 feed 還沒載完就等一下
    const tryOpen = () => {
      const found = Object.values(generatedMap).find((m) => m.id === openId);
      if (found) {
        setOpenManga(found);
        // 清掉 query 避免反覆觸發
        const url = new URL(window.location.href);
        url.searchParams.delete("open");
        window.history.replaceState({}, "", url.toString());
      }
    };
    // 立即試一次、然後每 300ms 重試直到雲端 feed 載完（最多 5s）
    tryOpen();
    if (!Object.values(generatedMap).some((m) => m.id === openId)) {
      const start = Date.now();
      const t = setInterval(() => {
        if (Date.now() - start > 5000) {
          clearInterval(t);
          return;
        }
        const found = Object.values(generatedMap).find((m) => m.id === openId);
        if (found) {
          setOpenManga(found);
          clearInterval(t);
          const url = new URL(window.location.href);
          url.searchParams.delete("open");
          window.history.replaceState({}, "", url.toString());
        }
      }, 300);
      return () => clearInterval(t);
    }
  }, [generatedMap]);

  // 同步到 localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(generatedMap));
    } catch {
      // quota
    }
  }, [generatedMap]);

  // ── 觸發 generate ──
  const handleGenerate = useCallback(
    async (attraction: AttractionLite) => {
      const sourceId = attraction.name; // 用中文 name 當 ID
      // 若已存在，直接打開
      if (generatedMap[sourceId]) {
        setOpenManga(generatedMap[sourceId]);
        return;
      }

      // 開始生成
      setGenerating((g) => ({ ...g, [sourceId]: { current: 0, total: 4 } }));

      try {
        const res = await fetch("/api/manga/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: "attraction",
            sourceId: sourceId,
            sourceName: attraction.name,
            region: attraction.region,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "生成失敗");
        }

        // 完成 — 加入快取、打開 modal
        const manga: MangaData = json.manga;
        setGeneratedMap((m) => ({ ...m, [sourceId]: manga }));
        setOpenManga(manga);
      } catch (e: any) {
        alert(`生成失敗：${e.message}\n\n可能原因：\n1. 雲端 RLS 還沒設好（去 Supabase SQL Editor 跑 ai-manga-rls-write.sql）\n2. 角色 ref 圖找不到（public/characters/*.png）\n3. MiniMax API 額度/網路問題`);
      } finally {
        setGenerating((g) => {
          const next = { ...g };
          delete next[sourceId];
          return next;
        });
      }
    },
    [generatedMap]
  );

  // 處理 viewer 中更新 panel
  const handleMangaUpdate = useCallback((updated: MangaData) => {
    setOpenManga(updated);
    setGeneratedMap((m) => ({ ...m, [updated.source_id]: updated }));
  }, []);

  // ── 分組 ──
  const grouped = useMemo(() => {
    const g: Record<Category, AttractionLite[]> = {
      westLake: [],
      wuzhen: [],
      other: [],
    };
    for (const a of attractions) {
      g[a.category].push(a);
    }
    return g;
  }, [attractions]);

  const stats = useMemo(() => {
    const total = attractions.length;
    // 只算有對應 attraction 卡的（過濾掉之前測試的 leifeng* ghost 資料）
    const validNames = new Set(attractions.map((a) => a.name));
    const generated = Object.keys(generatedMap).filter((k) => validNames.has(k)).length;
    return { total, generated };
  }, [attractions, generatedMap]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hero */}
      <header className="mb-8 text-center">
        <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold mb-3">
          🎨 Q版漫畫圖鑑 · 江南水鄉八日之旅
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          江南景點 · 4 格 Q版漫畫
        </h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          點 🎨 把每個景點變成 4 格 Q版漫畫，配上導遊風格的短/中/長介紹
        </p>
        <div className="mt-3 text-xs text-gray-500">
          已生成 <span className="font-bold text-indigo-600">{stats.generated}</span> / {stats.total} 個景點
        </div>
      </header>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <CategoryTab
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          emoji="🗂️"
          label={`全部 (${attractions.length})`}
        />
        {(Object.keys(ATTRACTION_CATEGORIES) as Category[]).map((cat) => {
          const meta = ATTRACTION_CATEGORIES[cat];
          return (
            <CategoryTab
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              emoji={meta.emoji}
              label={`${meta.label} (${grouped[cat].length})`}
            />
          );
        })}
      </div>

      {/* Grid by category */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-40 bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        (Object.keys(grouped) as Category[])
          .filter((cat) => activeCategory === "all" || activeCategory === cat)
          .map((cat) => {
            const meta = ATTRACTION_CATEGORIES[cat];
            const list = grouped[cat];
            if (list.length === 0) return null;
            return (
              <section key={cat} className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{meta.emoji}</span>
                  <h2 className="text-xl font-bold text-gray-800">{meta.label}</h2>
                  <span className="text-sm text-gray-500">· {meta.description}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((a) => (
                    <AttractionMangaCard
                      key={a.name}
                      attraction={a}
                      generated={generatedMap[a.name]}
                      generating={generating[a.name]}
                      onClick={() => handleGenerate(a)}
                    />
                  ))}
                </div>
              </section>
            );
          })
      )}

      {/* Viewer modal */}
      {openManga && (
        <MangaViewer
          manga={openManga}
          onClose={() => setOpenManga(null)}
          onUpdate={handleMangaUpdate}
        />
      )}
    </div>
  );
}

// ── 子組件 ──

function CategoryTab({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
      }`}
    >
      {emoji} {label}
    </button>
  );
}

function AttractionMangaCard({
  attraction,
  generated,
  generating,
  onClick,
}: {
  attraction: AttractionLite;
  generated?: MangaData;
  generating?: { current: number; total: number };
  onClick: () => void;
}) {
  const isReady = !!generated;
  const isGenerating = !!generating;
  const progressPct = isGenerating
    ? Math.round(((generating!.current + 1) / generating!.total) * 100)
    : 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
        isReady
          ? "border-indigo-200 ring-1 ring-indigo-100"
          : "border-gray-100 hover:shadow-md hover:border-indigo-200"
      }`}
    >
      {/* Cover */}
      <div className="relative h-40 bg-gray-100 overflow-hidden">
        {attraction.cover ? (
          <img
            src={attraction.cover}
            alt={attraction.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {ATTRACTION_CATEGORIES[attraction.category].emoji}
          </div>
        )}
        {/* Status badge */}
        {isReady && (
          <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            ✓ 已生成
          </div>
        )}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-3xl mb-1">🎨</div>
              <div className="text-xs font-semibold">生成中…</div>
              <div className="mt-1 w-32 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-[10px] mt-1 opacity-80">
                Panel {generating!.current + 1} / {generating!.total}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-base mb-1 line-clamp-1">
          {attraction.name}
        </h3>
        {attraction.nameEn && (
          <div className="text-xs text-gray-400 mb-2">{attraction.nameEn}</div>
        )}
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {attraction.highlight}
        </p>
        <button
          onClick={onClick}
          disabled={isGenerating}
          className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
            isReady
              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              : isGenerating
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-sm"
          }`}
        >
          {isGenerating ? "⏳ 生成中…" : isReady ? "📖 開啟漫畫" : "🎨 生成 Q版漫畫"}
        </button>
      </div>
    </div>
  );
}

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
import PromptEditor from "./PromptEditor";
import { createClient } from "@/utils/supabase/client";
import {
  getHiddenMangas,
  hideManga,
  unhideManga,
} from "@/utils/mangaHideService";
import { toast } from "@/components/GlobalToastHost";

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
  // 當前編輯 prompt 的景點（顯示 PromptEditor modal）
  const [editingAttraction, setEditingAttraction] = useState<AttractionLite | null>(null);
  // 載入中
  const [loading, setLoading] = useState(true);
  // 分類篩選
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  // 🆕 2026-07-02 聖上拍板: 雲端+本地 隱藏清單（雲端優先）
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set());
  // 「管理已隱藏」面板展開與否
  const [showHiddenManager, setShowHiddenManager] = useState(false);

  // ── 啟動時：載入雲端 feed + 雲端隱藏清單 ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [feedRes, hidden] = await Promise.all([
          fetch("/api/manga/feed?limit=200"),
          getHiddenMangas(),
        ]);
        const json = await feedRes.json();
        if (cancelled) return;
        const map: Record<string, MangaData> = {};
        for (const m of json.mangas || []) {
          // 只索引 attraction 類型（這頁只處理景點）
          if (m.source_type === "attraction") {
            map[m.source_id] = m as MangaData;
          }
        }
        setGeneratedMap(map);
        setHiddenSet(hidden);
      } catch (e) {
        console.error("[manga] feed/hidden load failed:", e);
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
        // 讀 user 對此景點的 custom prompts
        let customPrompts: Record<1 | 2 | 3 | 4, string> | undefined;
        const fp = localStorage.getItem("manga-fingerprint");
        if (fp) {
          const supabase = createClient();
          const { data: userRow } = await supabase
            .from("user_manga_prompts")
            .select("panel_1_prompt, panel_2_prompt, panel_3_prompt, panel_4_prompt")
            .eq("user_fingerprint", fp)
            .eq("attraction_name", sourceId)
            .maybeSingle();
          if (userRow) {
            const cp: any = {};
            let hasAny = false;
            for (const p of [1, 2, 3, 4] as const) {
              const v = userRow[`panel_${p}_prompt`];
              if (v && v.trim()) { cp[p] = v; hasAny = true; }
            }
            if (hasAny) customPrompts = cp;
          }
        }

        const res = await fetch("/api/manga/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: "attraction",
            sourceId: sourceId,
            sourceName: attraction.name,
            region: attraction.region,
            ...(customPrompts ? { customPrompts } : {}),
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

  // 🆕 2026-07-02 聖上拍板: 隱藏 handler (雲端 + 本地都更新)
  const handleHide = useCallback(async (sourceId: string) => {
    const confirmed = window.confirm(
      `確定隱藏「${sourceId}」這張 Q版漫畫？\n（雲端同步, Brian & Mana 都會看不到；可以稍後在「管理已隱藏」還原）`
    );
    if (!confirmed) return;
    await hideManga(sourceId);
    setHiddenSet((prev) => {
      const next = new Set(prev);
      next.add(sourceId);
      return next;
    });
    toast.success(`已隱藏 ${sourceId}`);
  }, []);

  const handleUnhide = useCallback(async (sourceId: string) => {
    await unhideManga(sourceId);
    setHiddenSet((prev) => {
      const next = new Set(prev);
      next.delete(sourceId);
      return next;
    });
    toast.success(`已還原 ${sourceId}`);
  }, []);

  const stats = useMemo(() => {
    const total = attractions.length;
    // 只算有對應 attraction 卡的（過濾掉之前測試的 leifeng* ghost 資料 + 雲端隱藏的）
    const validNames = new Set(attractions.map((a) => a.name));
    const generated = Object.keys(generatedMap).filter(
      (k) => validNames.has(k) && !hiddenSet.has(k)
    ).length;
    const hidden = [...hiddenSet].filter((k) => validNames.has(k)).length;
    return { total, generated, hidden };
  }, [attractions, generatedMap, hiddenSet]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Hero — 🅒 2026-07-02 聖上拍板: indigo→江楠 (朱紅徽章+朱→金標題+紙紋) */}
      <header className="mb-8 text-center relative">
        {/* 雲紋橫條 (頂) */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-1 cloud-pattern rounded-full opacity-60" />
        <div className="inline-block px-3 py-1 rice-paper text-red-700 rounded-full text-xs font-bold mb-3 chinese-frame">
          🎨 Q版漫畫圖鑑 · 江南水鄉八日之旅
        </div>
        <h1 className="text-3xl sm:text-4xl jn-title-gradient mb-1">
          江南景點 · 4 格 Q版漫畫
        </h1>
        <p className="text-stone-600 mt-3 text-sm sm:text-base">
          點 🎨 把每個景點變成 4 格 Q版漫畫，配上導遊風格的短/中/長介紹
        </p>
        <div className="mt-3 text-xs text-stone-500">
          已生成 <span className="font-bold text-red-700">{stats.generated}</span> / {stats.total} 個景點
          {/* 🆕 2026-07-02 聖上拍板: hidden 計數 + 管理按鈕（雲端同步給所有裝置） */}
          {stats.hidden > 0 && (
            <span className="ml-3">
              · 已隱藏 <span className="font-bold text-stone-600">{stats.hidden}</span> 個
              <button
                onClick={() => setShowHiddenManager((v) => !v)}
                className="ml-2 text-xs px-2 py-0.5 rounded bg-stone-100 hover:bg-amber-50 text-stone-600 hover:text-red-700 transition-colors"
              >
                {showHiddenManager ? "收起" : "管理"}
              </button>
            </span>
          )}
        </div>
      </header>

      {/* 🆕 2026-07-02 聖上拍板: 已隱藏管理面板（給 USER 反悔） */}
      {showHiddenManager && stats.hidden > 0 && (
        <div className="mb-6 rice-paper border border-amber-300/40 chinese-frame rounded-xl p-4">
          <p className="text-xs text-stone-600 mb-3 flex items-center gap-2">
            <span>🔒</span>
            <span>已隱藏的 Q版漫畫（點「還原」會重新出現在卡片牆）</span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {attractions
              .filter((a) => hiddenSet.has(a.name))
              .map((a) => (
                <li
                  key={a.name}
                  className="inline-flex items-center gap-1.5 bg-white border border-amber-200/60 rounded-full px-3 py-1 text-xs"
                >
                  <span className="text-stone-500 line-through">{a.name}</span>
                  <button
                    onClick={() => handleUnhide(a.name)}
                    className="text-red-700 hover:text-red-800 font-medium"
                  >
                    還原
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

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
        // 🅒 2026-07-02: gray-100 → stone-100 (跟其他頁 skeleton 一致)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-amber-200/30 overflow-hidden">
              <div className="h-40 bg-stone-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-stone-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-stone-100 rounded animate-pulse w-1/2" />
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
                  <h2 className="text-xl font-bold text-stone-800">{meta.label}</h2>
                  <span className="text-sm text-stone-500">· {meta.description}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((a) => (
                    <AttractionMangaCard
                      key={a.name}
                      attraction={a}
                      generated={generatedMap[a.name]}
                      generating={generating[a.name]}
                      isHidden={hiddenSet.has(a.name)}
                      onClick={() => handleGenerate(a)}
                      onEditPrompt={() => setEditingAttraction(a)}
                      onHide={() => handleHide(a.name)}
                      onUnhide={() => handleUnhide(a.name)}
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

      {/* Prompt editor modal */}
      {editingAttraction && (
        <PromptEditor
          attractionName={editingAttraction.name}
          region={editingAttraction.region}
          onClose={() => setEditingAttraction(null)}
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
      // 🅒 2026-07-02: indigo-600/white/indigo-300 → 朱紅 active + 金邊 inactive
      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        active
          ? "jn-tab-active"
          : "jn-tab-inactive"
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
  isHidden,
  onClick,
  onEditPrompt,
  onHide,
  onUnhide,
}: {
  attraction: AttractionLite;
  generated?: MangaData;
  generating?: { current: number; total: number };
  isHidden: boolean;
  onClick: () => void;
  onEditPrompt: () => void;
  onHide: () => void;
  onUnhide: () => void;
}) {
  const isReady = !!generated;
  const isGenerating = !!generating;
  const progressPct = isGenerating
    ? Math.round(((generating!.current + 1) / generating!.total) * 100)
    : 0;

  return (
    // 🅒 2026-07-02: indigo-200/indigo-100 ring → 江楠金邊 + 已生成用朱紅邊
    // 🆕 2026-07-02: 已隱藏時額外加 opacity-50 grayscale（視覺降權）
    <div
      className={`jn-card relative ${
        isReady ? "jn-card-ready" : ""
      } ${isHidden ? "opacity-60 grayscale" : ""}`}
    >
      {/* Cover */}
      <div className="relative h-40 bg-stone-100 overflow-hidden">
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
        {/* Status badge — 朱紅色已生成徽章 */}
        {isReady && !isHidden && (
          <div className="jn-badge absolute top-2 left-2 shadow-md">
            ✓ 已生成
          </div>
        )}
        {/* 🆕 2026-07-02 已隱藏徽章 — stone 色，跟「已生成」區分 */}
        {isHidden && (
          <div className="absolute top-2 left-2 bg-stone-700/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
            <span>🔒</span>
            <span>已隱藏</span>
          </div>
        )}
        {isGenerating && (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-900/70 to-red-900/70 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-3xl mb-1">🎨</div>
              <div className="text-xs font-semibold">生成中…</div>
              <div className="mt-1 w-32 h-1.5 jn-progress-track">
                <div
                  className="jn-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-[10px] mt-1 opacity-80">
                Panel {generating!.current + 1} / {generating!.total}
              </div>
            </div>
          </div>
        )}

        {/* 🆕 2026-07-02 聖上拍板: 隱藏按鈕 (已生成卡片右上角，與 attractions × 同 pattern) */}
        {!isGenerating && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isHidden) onUnhide();
              else onHide();
            }}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm transition-colors"
            title={isHidden ? "還原此景點" : "隱藏此景點"}
            aria-label={isHidden ? `還原 ${attraction.name}` : `隱藏 ${attraction.name}`}
          >
            {isHidden ? "↺" : "×"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-stone-800 text-base mb-1 line-clamp-1">
          {attraction.name}
        </h3>
        {attraction.nameEn && (
          <div className="text-xs text-stone-400 mb-2">{attraction.nameEn}</div>
        )}
        <p className="text-xs text-stone-500 line-clamp-2 mb-3">
          {attraction.highlight}
        </p>
        <button
          onClick={onClick}
          disabled={isGenerating}
          // 🅒 2026-07-02: indigo-50/700/300 + indigo→purple gradient → 江楠朱→金 CTA
          className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
            isReady
              ? "jn-cta-secondary"
              : isGenerating
              ? "bg-stone-100 text-stone-400 cursor-not-allowed"
              : "jn-cta-primary"
          }`}
        >
          {isGenerating
            ? "⏳ 生成中…"
            : isReady
            ? "📖 開啟漫畫"
            : "🎨 生成 Q版漫畫"}
        </button>
        <button
          onClick={onEditPrompt}
          className="w-full mt-1.5 text-xs text-stone-400 hover:text-red-700 transition-colors"
        >
          📝 編輯 prompt
        </button>
      </div>
    </div>
  );
}

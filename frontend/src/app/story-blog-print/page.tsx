"use client";

/**
 * 🆕 2026-09-06 聖上指示: 江南水鄉八日之旅 A5 印刷收藏版
 *
 * 🆕 2026-09-20 聖上指示 v2: 三種排版方案切換器
 *   - 方案 A 「攝影雜誌」: 大照片為主,每篇獨立頁,~383 頁
 *   - 方案 B 「故事閱讀」: 圖文 50:50,每篇獨立頁,~383 頁
 *   - 方案 C 「高密度」: 短篇智能共頁(< 100 字 + 同 orientation),~343 頁
 *
 * 最高原則 (聖上指示 9-20):
 *   ✅ 完全獨立頁面, 不修改現有 /travel/story-blog
 *   ✅ 370 篇 post 完整保留, 0 消失, 每頁至少 1 張圖
 *   ✅ 共頁策略只在「兩篇 < 100 字 + 圖片同方向」時觸發, 絕不犧牲照片
 *   ✅ 所有樣式 scoped 到 .print-book-* 與列印媒體查詢, 不污染全域
 */
import { useEffect, useState, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { qrSvg } from "./lib/qr-svg";
import "./print-book.css";

/**
 * 🆕 9-20 自適應: 動態調整圖片最大高度, 最大化圖片顯示
 *
 * 為什麼這樣做:
 *   - 聖上要求「根據文字數量 + 照片搭配」自適應最大化圖片
 *   - 純 CSS 沒辦法在多變數耦合下取極值, JS 測量後回寫 CSS variable 最準
 *
 * 演算法 (v3 — 直接拉高):
 *   1. 測 img 當前 height (CSS 自己算出來的)
 *   2. 如果 img height < imageMaxCap, 把 max-height 拉高到 imageMaxCap
 *      (CSS grid/flex 會自動限制實際 height 到「容器能塞的最大值」)
 *   3. 如果 img height == imageMaxCap 還有餘裕, 不調整 (避免無限循環)
 *
 *  注意:
 *   - mode B 共頁 (兩篇同頁): 圖文 grid 並排, 圖實際高度被 grid 限制
 *   - mode A (單篇獨立): 圖佔頁面大部分, max-height 直接生效
 *   - 聖上看 page 7 的 mode B 共頁, 圖被 grid 擠小, 我們要把 cap 拉高讓 CSS 重算
 *
 *  @param articleRef {React.RefObject<HTMLElement>} - <article> DOM ref (post 容器)
 *  @param storyRef {React.RefObject<HTMLElement>} - .print-book-story DOM ref (文容器)
 *  @param imageMaxCap {number} - 上限 (mm) 由 mode 決定 (如 mode B 共頁 70mm)
 *  @returns {number} 自適應 max-height in mm
 */
const MM_TO_PX = 3.7795275591; // 1mm @ 96dpi

/**
 * 🆕 9-20 自適應: 文字先 layout → 剩餘空間全給圖
 *
 * 為什麼這樣做:
 *   - 聖上要求「文字能放下後, 照片自適應放到極緻」
 *   - 字體 7.5pt + 30/70 grid 已確定 ≤300字 post 文字能塞 (paginateDay 算法)
 *   - 圖 max-height = post 實際高度 - story 渲染高度 - 標題 - gap - margin
 *
 * 演算法 (v4 — 自適應極緻):
 *   1. 測量 <article> 的 clientHeight (post 已被 layout 完的高度)
 *   2. 測量 .print-book-story 的 clientHeight (文字實際佔的高度)
 *   3. 圖可用空間 = articleH - storyH - 標題 4mm - gap 2mm - bottom margin 5mm
 *   4. clamp 到 [imageMinCap, imageMaxCap]
 *
 *  觸發:
 *   - 初次 mount
 *   - 文字 reflow (字數增加、字體變大)
 *   - 圖載入完成 (改變 layout)
 *   - 容器 resize
 *
 *  @param articleRef {React.RefObject<HTMLElement>} - <article> DOM ref (post 容器)
 *  @param storyRef {React.RefObject<HTMLElement>} - .print-book-story DOM ref (文容器)
 *  @param titlePresent {boolean} - 是否有標題
 *  @param imageMaxCap {number} - 上限 (mm) 由 mode 決定 (避免圖太誇張)
 *  @param imageMinCap {number} - 下限 (mm) 避免圖太小失焦
 *  @returns {number} 自適應 max-height in mm
 */
function useAdaptivePhotoMaxH(
  articleRef: React.RefObject<HTMLElement | null>,
  storyRef: React.RefObject<HTMLElement | null>,
  titlePresent: boolean,
  imageMaxCap: number,
  imageMinCap = 25,
): number {
  const [maxH, setMaxH] = useState(imageMaxCap);

  useLayoutEffect(() => {
    const article = articleRef.current;
    const story = storyRef.current;
    if (!article) return;

    const chapter = article.parentElement;
    if (!chapter) return;
    const page = chapter.closest(".print-book-page") as HTMLElement | null;

    const measure = () => {
      // 🆕 v23: 直接用 post 撐高後的實際高度
      const articleRect = article.getBoundingClientRect();
      const articleMm = articleRect.height / MM_TO_PX;

      const storyMm = story ? story.getBoundingClientRect().height / MM_TO_PX : 0;

      const titleMm = titlePresent ? 4 : 0;
      const gapMm = 2;
      const marginMm = 5;

      // 圖可用空間 = post 撐高後剩餘
      const available = articleMm - storyMm - titleMm - gapMm - marginMm;

      const clamped = Math.max(imageMinCap, Math.min(imageMaxCap, available));
      setMaxH(Math.round(clamped));
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(article);
    if (story) ro.observe(story);
    chapter.querySelectorAll(".print-book-post").forEach((p) => ro.observe(p));
    chapter.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", measure);
    });
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(measure).catch(() => {});
    }

    return () => ro.disconnect();
  }, [articleRef, storyRef, titlePresent, imageMaxCap, imageMinCap]);

  return maxH;
}

type LayoutMode = "A" | "B" | "C" | "D";

interface TripRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  days: number;
  hero_image: string | null;
  description: string | null;
}

interface PostRow {
  id: string;
  day_number: number;
  sort_order: number;
  title: string | null;
  content: string;
  image_url: string | null;
  layout_type: "left-image" | "right-image" | "top-image";
  frame_style: string;
  author_name: string;
  // 🆕 9-20: 從 image HEAD 拿到的寬高比例, 用於方案 C 共頁判斷
  _orient?: "portrait" | "landscape" | "square" | null;
  _ratio?: number | null;
  _w?: number | null;
  _h?: number | null;
  // 🆕 9-20 v12: LLM 短化後的內容 (≤ 200 字), 用 localStorage cache
  _shortened_content?: string | null;
}

const TRIP_ID = "00000000-0000-0000-0000-000000000001";
const TRIP_START = "2026-07-17";
const SITE_BASE = "https://travel-china.netlify.app";

// 章節資料型別 (分頁用)
type Page =
  | { kind: "cover"; trip: TripRow }
  | { kind: "frontispiece"; trip: TripRow }
  | { kind: "toc"; trip: TripRow; tocItems: { num: string; title: string; pageNum: number }[] }
  | { kind: "chapter-intro"; day: number; dayTitle: string; dateStr: string; firstPost: PostRow | null; layoutMode: LayoutMode }
  // 🆕 9-20: posts 改為二維, 每頁 1 或 2 篇 (方案 C 共頁)
  // 🆕 9-23: enrichTick 強制 re-mount PostArticle, 否則 post._orient mutate 但 React 看不到
  | { kind: "chapter-stories"; day: number; posts: PostRow[]; layoutMode: LayoutMode; enrichTick: number; continueFromPage?: number };

export default function StoryBlogPrintPage() {
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [{ data: tripData }, { data: postData, error: postErr }] = await Promise.all([
          supabase.from("trips").select("*").eq("id", TRIP_ID).maybeSingle(),
          supabase.from("posts").select("*").eq("trip_id", TRIP_ID).order("sort_order", { ascending: true }),
        ]);
        if (cancelled) return;
        if (postErr) {
          setError(`無法讀取文章資料: ${postErr.message}`);
          return;
        }
        // 🆕 9-20: 先 render (page=373 估算, 不等 dims), dims 抓完再 setPosts 觸發 useMemo 重算 → 共頁才生效
        const rawPosts = (postData || []) as PostRow[];
        setTrip((tripData || null) as TripRow | null);
        setPosts(rawPosts);
        setLoading(false);
        // 背景抓 image 寬高, 完成後再次 setPosts 觸發 C 方案分頁重算
        await enrichImageDimensions(rawPosts);
        if (!cancelled) {
          setPosts([...rawPosts]);
          // 🆕 9-23 Bug 6 fix: enrich 完 +tick, 強制 re-render PostArticle,
          //   否則 post 物件 mutate 但 PostArticle useMemo(imgOrient) 抓不到新值
          setEnrichTick((t) => t + 1);
        }
        // 🆕 9-20 v12: 背景批次短化 > 200 字的故事 (client-side LLM cache)
        // - 改 fire-and-forget (不 await) 避免阻塞 image dims enrich 進度
        // - localStorage cache 跨 reload 重用, 不污染 DB
        // - 預估 90 篇並行 4 workers, 約 5-8 分鐘跑完
        if (!cancelled) {
          enrichShortenedContentLive(rawPosts, 200, (processed, total) => {
            if (!cancelled && processed % 5 === 0) {
              setPosts([...rawPosts]);
            }
          }).catch((e) => {
            console.warn("[shorten] background error:", e);
          });
        }
      } catch (e) {
        if (cancelled) return;
        setError(`讀取失敗: ${(e as Error).message ?? e}`);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 🆕 9-20: 排版方案切換 (A 攝影 / B 故事 / C 高密度), 預設 A
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("A");

  // 🆕 9-23 Bug 6 fix: tick counter, enrich 完 +tick 強制整頁 re-render,
  //   PostArticle 內 imgOrient = post._orient 會拿到新值, figure data-orientation 自動更新
  const [enrichTick, setEnrichTick] = useState(0);

  // === 計算 day 對應日期 ===
  const dayDate = (d: number): string => {
    if (d === 0) return "序章";
    if (d === 9) return "後記";
    const start = new Date(TRIP_START);
    const dt = new Date(start);
    dt.setDate(start.getDate() + d - 1);
    return `${dt.getFullYear()} / ${String(dt.getMonth() + 1).padStart(2, "0")} / ${String(dt.getDate()).padStart(2, "0")}`;
  };

  // === 切分章節 → 多頁 ===  (🆕 9-20: layoutMode 決定每篇獨立 or 共頁)
  const { pages, tocItems, pairCount } = useMemo(() => {
    if (!trip) return { pages: [] as Page[], tocItems: [] as { num: string; title: string; pageNum: number }[], pairCount: 0 };
    const dayPosts: Record<number, PostRow[]> = {};
    for (const p of posts) {
      if (!dayPosts[p.day_number]) dayPosts[p.day_number] = [];
      dayPosts[p.day_number].push(p);
    }
    for (const k of Object.keys(dayPosts)) dayPosts[+k].sort((a, b) => a.sort_order - b.sort_order);

    const pages: Page[] = [];
    const toc: { num: string; title: string; pageNum: number }[] = [];
    let pairCount = 0;

    // 封面 (1) — 不顯示頁碼
    pages.push({ kind: "cover", trip });

    // 扉頁 (2) — 不顯示頁碼
    pages.push({ kind: "frontispiece", trip });

    // 目錄頁 (3) — 不顯示頁碼
    // 先佔位,之後填 tocItems
    pages.push({ kind: "toc", trip, tocItems: [] });

    // 從第 4 頁開始計算章節起始頁
    let chapterPage = 4;

    // 序章章節 (從 day 0)
    if (dayPosts[0]?.length) {
      toc.push({ num: "序章", title: dayPosts[0][0].title || "序章", pageNum: chapterPage });
      const d0Posts = dayPosts[0];
      pages.push({
        kind: "chapter-intro",
        day: 0,
        dayTitle: "序章",
        dateStr: "序章",
        firstPost: d0Posts[0],
        layoutMode,
      });
      chapterPage++;
      const rest = d0Posts.slice(1);
      const dpages = paginateDay(rest, layoutMode);
      for (const slice of dpages) {
        if (slice.length === 2) pairCount++;
        pages.push({ kind: "chapter-stories", day: 0, posts: slice, layoutMode, enrichTick });
        chapterPage++;
      }
    }

    // D1-8
    for (let d = 1; d <= 8; d++) {
      const dPosts = dayPosts[d];
      if (!dPosts?.length) continue;
      toc.push({
        num: `Day ${String(d).padStart(2, "0")}`,
        title: dPosts[0].title || `Day ${d}`,
        pageNum: chapterPage,
      });
      pages.push({
        kind: "chapter-intro",
        day: d,
        dayTitle: `Day ${String(d).padStart(2, "0")}`,
        dateStr: dayDate(d),
        firstPost: dPosts[0],
        layoutMode,
      });
      chapterPage++;
      const rest = dPosts.slice(1);
      const dpages = paginateDay(rest, layoutMode);
      for (const slice of dpages) {
        if (slice.length === 2) pairCount++;
        pages.push({ kind: "chapter-stories", day: d, posts: slice, layoutMode, enrichTick });
        chapterPage++;
      }
    }

    // 後記 (day 9)
    if (dayPosts[9]?.length) {
      toc.push({ num: "後記", title: dayPosts[9][0].title || "後記", pageNum: chapterPage });
      const epPosts = dayPosts[9];
      pages.push({
        kind: "chapter-intro",
        day: 9,
        dayTitle: "後記",
        dateStr: "後記",
        firstPost: epPosts[0],
        layoutMode,
      });
      chapterPage++;
      const rest = epPosts.slice(1);
      const dpages = paginateDay(rest, layoutMode);
      for (const slice of dpages) {
        if (slice.length === 2) pairCount++;
        pages.push({ kind: "chapter-stories", day: 9, posts: slice, layoutMode, enrichTick });
        chapterPage++;
      }
    }

    // 把 toc 回填到第 3 頁
    if (pages[2]?.kind === "toc") {
      (pages[2] as Extract<Page, { kind: "toc" }>).tocItems = toc;
    }

    return { pages, tocItems: toc, pairCount };
  }, [trip, posts, layoutMode]);

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  if (loading) {
    return (
      <main className="print-book-screen">
        <div className="print-book-loading">正在載入旅程資料…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="print-book-screen">
        <div className="print-book-error">
          <h2>無法載入印刷版</h2>
          <p>{error}</p>
          <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
            請確認 Supabase 連線正常,或回到{" "}
            <Link href="/travel/story-blog" className="print-book-back-link">線上故事部落格</Link>
          </p>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="print-book-screen">
        <div className="print-book-error">
          <h2>找不到旅程資料</h2>
          <p>旅程 ID <code>{TRIP_ID}</code> 不存在於資料庫</p>
        </div>
      </main>
    );
  }

  return (
    <main className="print-book-screen">
      {/* 螢幕上方的操作列 (列印時自動隱藏) */}
      <div className="print-book-controls">
        <div className="print-book-controls-text">
          <b>A5 印刷收藏版</b>
          <br />
          點右上「列印」可輸出 PDF (Chrome / Safari 建議選「另存為 PDF」, 邊距設「無」)
        </div>
        <LayoutSwitcher
          mode={layoutMode}
          setMode={setLayoutMode}
          pageCount={pages.length}
          pairCount={pairCount}
        />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/travel/story-blog" className="print-book-back-link">
            ← 回到線上版
          </Link>
          <button type="button" className="print-book-print-btn" onClick={handlePrint}>
            🖨️ 列印收藏版
          </button>
        </div>
      </div>

      {/* 章節內容 */}
      {pages.map((page, idx) => (
        <PageRenderer
          key={`${page.kind}-${idx}`}
          page={page}
          pageNum={idx + 1}
        />
      ))}
    </main>
  );
}

// === 單頁 renderer ===
function PageRenderer({ page, pageNum }: { page: Page; pageNum: number }) {
  // 頁碼:封面 / 扉頁 / 目錄不顯示 (前三頁)
  const showPageNum = pageNum > 3;
  const pageClass = `print-book-page print-book-page--mode-${page.kind === "chapter-stories" || page.kind === "chapter-intro" ? (("layoutMode" in page) ? page.layoutMode : "A") : "A"}${showPageNum ? "" : " print-book-no-page-num"}`;

  return (
    <section className={pageClass}>
      {page.kind === "cover" && <CoverSection trip={page.trip} />}
      {page.kind === "frontispiece" && <FrontispieceSection trip={page.trip} />}
      {page.kind === "toc" && <TOCSection trip={page.trip} tocItems={page.tocItems} />}
      {page.kind === "chapter-intro" && (
        <ChapterIntro
          day={page.day}
          dayTitle={page.dayTitle}
          dateStr={page.dateStr}
          firstPost={page.firstPost}
          layoutMode={page.layoutMode}
        />
      )}
      {page.kind === "chapter-stories" && (
        <ChapterStories day={page.day} posts={page.posts} layoutMode={page.layoutMode} enrichTick={page.enrichTick} />
      )}

      {showPageNum && <div className="print-book-page-number">{pageNum}</div>}
    </section>
  );
}

// === 封面 ===
function CoverSection({ trip }: { trip: TripRow }) {
  const start = new Date(trip.start_date);
  return (
    <div className="print-book-cover">
      <div style={{ width: "100%" }}>
        <img
          src="/print-cover-q-version-2k.jpg"
          alt="江南水鄉 8 天卡通 Q 版封面"
          className="print-book-cover-image"
        />
      </div>
      <div>
        <h1 className="print-book-cover-title">{trip.title}</h1>
        <p className="print-book-cover-meta">上海・西塘・烏鎮・江南水鄉</p>
        <p className="print-book-cover-meta" style={{ marginTop: "2mm" }}>
          {start.getFullYear()} / {String(start.getMonth() + 1).padStart(2, "0")} / {String(start.getDate()).padStart(2, "0")} – {String(new Date(trip.end_date).getMonth() + 1).padStart(2, "0")} / {String(new Date(trip.end_date).getDate()).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}

// === 扉頁 ===
function FrontispieceSection({ trip }: { trip: TripRow }) {
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const dateRange = `${startDate.getFullYear()} / ${String(startDate.getMonth() + 1).padStart(2, "0")} / ${String(startDate.getDate()).padStart(2, "0")} – ${String(endDate.getMonth() + 1).padStart(2, "0")} / ${String(endDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="print-book-frontispiece">
      <div className="print-book-frontispiece-line">2 0 2 6 · S U M M E R</div>
      <div className="print-book-frontispiece-line">{trip.title}</div>
      <div className="print-book-frontispiece-divider" />
      <div className="print-book-frontispiece-line" style={{ fontSize: "10pt", opacity: 0.65 }}>
        {dateRange}
      </div>
      <div className="print-book-frontispiece-line">
        上海・西塘・烏鎮・江南水鄉旅行故事
      </div>
      <div className="print-book-frontispiece-line">
        &ldquo;十三位親友，七個夜晚，走過一場夢裡的水鄉&rdquo;
      </div>
    </div>
  );
}

// === 目錄 ===
function TOCSection({
  trip,
  tocItems,
}: {
  trip: TripRow;
  tocItems: { num: string; title: string; pageNum: number }[];
}) {
  return (
    <div className="print-book-toc">
      <h2 className="print-book-toc-heading">目 錄</h2>
      <div className="print-book-frontispiece-divider" style={{ marginBottom: "10mm" }} />
      <ul className="print-book-toc-list">
        {tocItems.map((it, idx) => (
          <li key={idx} className="print-book-toc-item">
            <span className="print-book-toc-number">{it.num}</span>
            <span className="print-book-toc-title">{it.title}</span>
            <span className="print-book-toc-dots" />
            <span className="print-book-toc-page-num">{it.pageNum}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// === 章節首頁 (章節標題 + 大照片 + 第一篇 post) ===
function ChapterIntro({
  day,
  dayTitle,
  dateStr,
  firstPost,
  layoutMode,
}: {
  day: number;
  dayTitle: string;
  dateStr: string;
  firstPost: PostRow | null;
  layoutMode: LayoutMode;
}) {
  return (
    <div className="print-book-chapter">
      <div className="print-book-chapter-header">
        <p className="print-book-day-label">
          {day === 0 ? "P R O L O G U E" : day === 9 ? "E P I L O G U E" : `D A Y  ${String(day).padStart(2, "0")}`}
        </p>
        <h2 className="print-book-day-title">{dayTitle}</h2>
        <div className="print-book-day-divider" />
        <p className="print-book-day-date">{dateStr}</p>
      </div>

      {firstPost?.image_url && (
        <figure className="print-book-photo">
          <img
            src={firstPost.image_url}
            alt={firstPost.title || dayTitle}
            // 🆕 9-20 v2: 統一 contain + max-height 110mm (長圖不爆版面)
            // 🆕 v12: chapter intro 直式照放寬 max-height, 讓直式照顯示更長 (聖上反映「應該要長一點點」)
            //   - portrait: max-height 120mm (原本 90mm), cover + center top
            //   - landscape: max-height 90mm (維持), contain (避免裁切)
            className={`print-book-photo-img ${layoutMode === "A" ? "print-book-photo-full-img" : "print-book-photo-half-img"}`}
            loading="eager"
            style={{
              objectFit: firstPost._orient === "portrait" ? "cover" : "contain",
              objectPosition: firstPost._orient === "portrait" ? "center top" : "center center",
              maxHeight: firstPost._orient === "portrait"
                ? "120mm"
                : (layoutMode === "A" ? "110mm" : "90mm"),
              width: "100%",
            }}
          />
          {firstPost.title && firstPost.title !== dayTitle && (
            <figcaption className="print-book-photo-caption">{firstPost.title}</figcaption>
          )}
        </figure>
      )}

      {/* 序章頁一次性 QR 說明 — 全書唯一指引,章節內不再重複 */}
      {day === 0 && (
        <aside className="print-book-qr-inline">
          <span
            className="print-book-qr-svg"
            dangerouslySetInnerHTML={{
              __html: qrSvg(`${SITE_BASE}/travel/story-blog`, { size: 64 }),
            }}
          />
          <div className="print-book-qr-inline-text">
            <b>本印刷版為精選回憶</b>
            所有照片、補充故事、即時互動留言,請掃碼連回線上完整版
          </div>
        </aside>
      )}

      {firstPost && (
        <div className="print-book-story print-book-story--intro">
          {/* 🆕 9-20 v5: 同 PostArticle, \n\n 切段, 段內 \n 換 <br/> */}
          {displayContent(firstPost)
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
            .map((para, i) => (
              <p key={i}>
                {para.split("\n").map((line, j, arr) => (
                  <span key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          <p className="print-book-story-author">✍ {firstPost.author_name || "匿名"}</p>
        </div>
      )}

      {/* 後記章節插入 QR */}
      {day === 9 && (
        <div className="print-book-qr-section" style={{ marginTop: "10mm" }}>
          <span
            className="print-book-qr-svg"
            dangerouslySetInnerHTML={{
              __html: qrSvg(`${SITE_BASE}/travel/story-blog`, { size: 120 }),
            }}
          />
          <p className="print-book-qr-label">
            <b>回到線上故事</b>
            <br />
            {SITE_BASE}/travel/story-blog
          </p>
        </div>
      )}
    </div>
  );
}

// === 章節故事頁 (1 或 2 篇 post / 每頁, 由 layoutMode 決定) ===
function ChapterStories({ day, posts, layoutMode, enrichTick }: { day: number; posts: PostRow[]; layoutMode: LayoutMode; enrichTick: number }) {
  const paired = posts.length === 2;
  // 🆕 9-20 v3: B 模式 → 上下分割 (B-stacked-container), C 模式 → 左右並排 (paired-container)
  const containerClass = paired && layoutMode === "B"
    ? "print-book-chapter print-book-b-stacked-container"
    : paired
    ? "print-book-chapter print-book-paired-container"
    : "print-book-chapter";

  // 🆕 v19 (9-21): 聖上「一頁 2 則都橫式照時, 用一大一小」
  // B 共頁 + 兩則都 landscape → 加 data-layout-variant="mixed-landscape" 觸發 CSS
  // 注意: post._orient 是後端 enrich, client handleImgLoad 會 setImgOrient 寫到 photo data-orientation attr
  //       但 _orient prop 不會跟著變, 所以要靠 DOM 偵測
  const isBPair = paired && layoutMode === "B";
  const initialLandscape = posts[0]?._orient === "landscape" && posts[1]?._orient === "landscape";
  const [bothLandscape, setBothLandscape] = useState(isBPair && initialLandscape);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isBPair) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const photos = el.querySelectorAll('.print-book-photo');
      if (photos.length !== 2) return;
      const orients = Array.from(photos).map(p => p.getAttribute('data-orientation'));
      if (orients[0] === 'landscape' && orients[1] === 'landscape') {
        setBothLandscape(true);
      } else if (orients[0] && orients[1] && orients[0] !== 'landscape') {
        setBothLandscape(false);
      }
    };
    update();
    const obs = new MutationObserver(update);
    photos_observer_setup: {
      const photos = el.querySelectorAll('.print-book-photo');
      photos.forEach(p => obs.observe(p, { attributes: true, attributeFilter: ['data-orientation'] }));
    }
    return () => obs.disconnect();
  }, [isBPair, posts]);

  const containerDataAttrs = bothLandscape ? { "data-layout-variant": "mixed-landscape" } : {};

  return (
    <div ref={containerRef} className={containerClass} {...containerDataAttrs}>
      {/* 🆕 9-20 v22: 移除 inline paddingBottom, 用 CSS 控制 (避免上方留白過大) */}
      <div className="print-book-chapter-header">
        <p className="print-book-day-label" style={{ fontSize: "9pt", letterSpacing: "0.4em" }}>
          {day === 9 ? "E P I L O G U E · 續" : day === 0 ? "P R O L O G U E · 續" : `D A Y  ${String(day).padStart(2, "0")} · 續`}
        </p>
        {/* 🆕 v22: divider margin 縮到 0.5mm, 不再留 4mm 大空隙 */}
        <div className="print-book-day-divider" style={{ margin: "0.5mm 0" }} />
      </div>

      {posts.map((post, idx) => {
        // 🆕 9-20 v24: 偵測「兩則共頁 + 都 landscape」→ 第二則用 top 版型
        //   - top 版型: 圖頂部整行 + 文字底部兩欄
        //   - 避免兩橫式照硬擠左右顯怪
        const partner = paired ? posts[1 - idx] : null;
        const bothLandscape =
          paired &&
          post._orient === "landscape" &&
          partner?._orient === "landscape";
        return (
          <PostArticle
            key={`${post.id}-${enrichTick}`}
            post={post}
            index={idx}
            isLast={idx === posts.length - 1}
            day={day}
            mode={layoutMode}
            paired={paired}
            useTopLayout={bothLandscape}
          />
        );
      })}
    </div>
  );
}

// === 單篇 post 在印刷版的呈現 ===
// 🆕 9-20: 接收 mode 決定版面 (A 攝影 / B 故事 / C 共頁)
function PostArticle({
  post,
  index,
  isLast,
  day,
  mode,
  paired,
  useTopLayout,
}: {
  post: PostRow;
  index: number;
  isLast: boolean;
  day: number;
  mode: LayoutMode;
  paired: boolean;
  /** 🆕 9-20 v24: 兩則共頁且都 landscape → 改用「圖頂 + 文底兩欄」版型 */
  useTopLayout?: boolean;
}) {
  // 🆕 9-20 v9: 聖上要求「隨機左右讓視覺不易疲勞」
  // 用 post.id 字串 hash 算 stable 隨機值 (0 = 左, 1 = 右)
  // 用 hash 而不是 Math.random: 確保 reload / 列印時方向不變
  // 預設右 (向後相容)
  const flipImage = useImageFlip(post.id, mode, paired);

  // 🆕 9-20: 自適應 hooks — 給 useAdaptivePhotoMaxH 用
  // article 用 callback ref 同步抓 chapter (parent) ref
  const articleRef = useRef<HTMLElement | null>(null);
  const storyRef = useRef<HTMLDivElement | null>(null);

  // 🆕 9-23 Bug 2 + Bug 6 fix: 不要用 useState 存 imgOrient,
  //   直接每 render 從 post._orient 推導, enrich 完 React re-render 就自動拿到新值
  const imgOrient = post._orient;

  // 🆕 v24: 動態偵測「兩則共頁 + 都 landscape」→ 第二則用 top 版型
  // 簡化: 直接讀 post._orient (React render 時自動更新)
  const dynamicTopLayout =
    paired && imgOrient === "landscape";

  // 保留 onLoad handler (雖然不再同步到 imgOrient, 但保留供未來 use)
  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > 0 && h > 0) {
      // 🆕 9-23: 寫回 post._orient (mutate), 觸發下次 render 自動更新 figure attr
      const ratio = w / h;
      const orient: "portrait" | "landscape" | "square" =
        ratio < 0.85 ? "portrait" : ratio > 1.2 ? "landscape" : "square";
      if (post._orient !== orient) {
        post._orient = orient;
        post._w = w;
        post._h = h;
        post._ratio = ratio;
      }
    }
  };

  // 🆕 9-20 v3: B 共頁模式改用 stacked-top/bottom, C 共頁用 paired-left/right
  const layoutClass = paired && mode === "B"
    ? index === 0 ? "print-book-post--stacked-top" : "print-book-post--stacked-bottom"
    : paired
    ? index === 0 ? "print-book-post--paired-left" : "print-book-post--paired-right"
    : mode === "A" ? "print-book-post--photo-major"
    : mode === "B" ? "print-book-post--balanced"
    : mode === "D" ? "print-book-post--original"
    : "print-book-post--balanced";

  // 🆕 9-20 v9: 根據 flipImage 決定 image 位置 (B 共頁時)
  const imageSideClass = paired && mode === "B"
    ? (flipImage ? "print-book-post--image-right" : "print-book-post--image-left")
    : "";

  // 🆕 9-20 v2+v3+v12: 統一 max-height + 智慧 object-fit
  // - D 沿用原本 baseline (post--original 不套 A/B grid)
  // - A / B / C 共頁: max-height 110mm
  // - B 共頁 (stacked-top/bottom): 圖在上, 標題 + 文在下, 圖 max-height 較小 (因為頁面被切兩半)
  // - 🆕 v12: portrait 直式照在 B 共頁改 cover, 不留左右空白 (聖上 page 11 反映)
  //   landscape 仍 contain (避免裁切長寬景)
  // - 🆕 v12b: portrait max-height 從 70mm 放寬到 85mm, 讓直式照顯示更長 (聖上反映)
  const photoClass =
    mode === "D" ? "print-book-photo-half-img" :
    mode === "A" && !paired ? "print-book-photo-full-img" :
    "print-book-photo-half-img";
  const isBStacked = paired && mode === "B";
  // 🆕 9-23 Bug 4 fix: 一律 contain (不再 portrait cover)
  const photoFit = "contain";
  const photoMaxH =
    paired && mode === "B"
      ? (imgOrient === "portrait" ? "105mm" : "115mm")  // 🆕 v16: B 共頁 portrait 直式照 120→105mm (聖上反映「直式照再小一點」)
      : paired ? "95mm" :                   // 🆕 v15: C 共頁拉高 (原本 75)
      mode === "A" ? (imgOrient === "portrait" ? "105mm" : "115mm") :  // 🆕 v17: A 模式 145→105mm (聖上反映 page15 圖太滿、文 64字 圖文比 8:1)
      "130mm"; // 🆕 v15: B 獨立拉高 (原本 110)
  const photoPos = imgOrient === "portrait" ? "center top" : "center center";

  // 🆕 9-20 自適應: 根據 mode 決定 max-height 上限 (mm), 解析掉 px 給 hook 用
  const photoMaxCapNum = parseInt(photoMaxH, 10) || 95;

  // 🆕 9-20 自適應: 動態計算最佳 max-height
  // 🆕 v18: post 不再撐高 (auto), 所以 hook 用固定 photoMaxCapNum
  // 圖文擠在上半部, 圖不需要極緻大
  const adaptiveMaxH = photoMaxCapNum;

  // 🆕 9-20: 自適應結果寫成 CSS variable, 給 print-book.css 用
  // 優先用自適應結果, 若 SSR/print 沒跑 useEffect 時 fallback 到 photoMaxH
  const cssVarStyle = {
    "--img-max-h": `${adaptiveMaxH}mm`,
    "--img-max-h-fallback": photoMaxH,
  } as React.CSSProperties;

  return (
    <article
      ref={articleRef as React.RefObject<HTMLElement>}
      // 🆕 9-23 Bug 3 fix: 印表 mode 決定相框預設,
      //   DB frame_style 是「線上版 (聖上最後選的)」, 印刷預覽時統一用 wash (水墨淡邊, 最素雅)
      //   強制套 wash 不影響 DB, 線上版仍是 DB 寫的
      className={`print-book-post print-book-frame-wash ${layoutClass} ${imageSideClass}`}
      style={{ ...cssVarStyle, marginBottom: isLast ? 0 : "5mm" }}
      data-layout={dynamicTopLayout || useTopLayout ? "top" : undefined}
    >
      {/* 🆕 v20 (9-21): 聖上「標題放在照片下方不是比較好嗎」
          DOM 原本是 title → photo → story, 改成 photo → title → story
          這樣不論 mixed-landscape / 一般 grid / block flow 都是 「圖上 → 標題 → 文」 */}
      {post.image_url && (
        <figure className="print-book-photo" data-orientation={imgOrient || undefined}>
          <img
            src={post.image_url}
            alt={post.title || "旅行照片"}
            className={`print-book-photo-img ${photoClass}`}
            // 🆕 9-23 Bug 1 fix: 全部 eager + high priority (印刷預覽, 不用 lazy)
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={handleImgLoad}
            style={{
              maxHeight: `var(--img-max-h, ${photoMaxH})`,
              objectFit: photoFit,
              objectPosition: photoPos,
              width: "100%",
            }}
          />
        </figure>
      )}

      {post.title && (
        <h3 className="print-book-story-title">{post.title}</h3>
      )}

      {displayContent(post) && (
        <div ref={storyRef} className="print-book-story">
          {/* 🆕 9-20 v5: 聖上要求「不要斷句變成每行一段」
              DB 用 \n\n 分段 (空行), 段內 \n 換行
              原本 split("\n") 變成一行一段太醜, 改用 split(/\n\s*\n/) 切段,
              段內 \n 換 <br/> */
          /* 🆕 9-20 v12: 用 displayContent (優先 _shortened_content ≤ 200 字) */}
          {displayContent(post)
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
            .map((para, i) => (
              <p key={i}>
                {para.split("\n").map((line, j, arr) => (
                  <span key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          <p className="print-book-story-author">✍ {post.author_name || "匿名"}</p>
        </div>
      )}
    </article>
  );
}

// ============================================================================
// 🆕 9-20: 三種排版方案的分頁與渲染
// ============================================================================

/**
 * 從 image URL 抓寬高 (用 <img>.onload 讀 naturalWidth/Height)
 * 8 workers 並發 — 370 張實測 ~15 秒 (圖本身要載入, 比 Range header 慢)
 * 寫進 post._w / _h / _ratio / _orient (mutate in place, 外面再 setPosts({...}) 觸發 React)
 *
 * 🆕 9-20 v13 fix: 不設 crossOrigin, browser 自然就能讀 naturalWidth/Height
 *   - 舊版 crossOrigin="anonymous" 在 Supabase Storage CDN edge cache 沒帶 CORS header 時
 *     會 onerror, 導致 100% posts._orient = null, CSS [data-orientation] selector 全失效
 *   - client-side render 不需要 crossOrigin (我們沒 drawImage 到 canvas)
 *   - cache buster 仍保留避免某些瀏覽器讀到 stale 0-byte 圖
 */
async function enrichImageDimensions(posts: PostRow[]): Promise<void> {
  if (typeof window === "undefined") return; // SSR skip
  const targets = posts.filter((p) => p.image_url && !p._orient);
  if (targets.length === 0) return;
  const CONCURRENCY = 8;
  let cursor = 0;

  function loadOne(url: string): Promise<{ w: number; h: number; ratio: number; orient: "portrait" | "landscape" | "square" } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      // 🆕 v13: 不設 crossOrigin — Supabase Storage edge cache CORS header 不一定帶, 設了反而 onerror
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(null);
          return;
        }
        const ratio = w / h;
        const orient = ratio < 0.85 ? "portrait" : ratio > 1.2 ? "landscape" : "square";
        resolve({ w, h, ratio, orient });
      };
      img.onerror = () => resolve(null);
      // 加 cache buster 避免某些瀏覽器快取未完整下載的圖
      img.src = url + (url.includes("?") ? "&" : "?") + "_dim=" + Math.random().toString(36).slice(2, 8);
      // 10 秒 timeout
      setTimeout(() => resolve(null), 10000);
    });
  }

  async function worker(): Promise<void> {
    while (cursor < targets.length) {
      const idx = cursor++;
      const p = targets[idx];
      try {
        const r = await loadOne(p.image_url!);
        if (r) {
          p._w = r.w;
          p._h = r.h;
          p._ratio = r.ratio;
          p._orient = r.orient;
        } else {
          p._w = p._h = p._ratio = null;
          // 🆕 v13: 失敗時預設 landscape (大多數旅遊照是橫式, 避免被 60% cap 限制)
          p._orient = "landscape";
        }
      } catch {
        p._w = p._h = p._ratio = null;
        // 🆕 v13: 例外時也預設 landscape
        p._orient = "landscape";
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
}

/**
 * 🆕 9-20 v12: 聖上要求「故事 > 200 字自動重修至 200 字」
 *
 * 客戶端跑 LLM (透過 /api/shorten-post),結果存 localStorage cache
 * - 不寫 DB (聖上 9-19 拍板「不動資料結構」)
 * - 不污染原本 post.content (mutate 到 _shortened_content)
 * - 並行 4 workers 預估 90 篇 60-90 秒
 * - 完成後 setPosts({...rawPosts}) 觸發 React 重 render
 *
 * 邊界 (聖上 9-19 + 9-20):
 *   ✅ 意思相同 (人名/時間/地點/事實)
 *   ✅ 保留 emoji + 聖上語氣詞
 *   ✅ ≤ 200 字
 *   ❌ 不編造新事實
 */
async function enrichShortenedContent(posts: PostRow[], targetLength: number): Promise<void> {
  if (typeof window === "undefined") return;
  const STORAGE_KEY = "story-blog-shortened-content-v1";

  // 讀 localStorage cache
  let cache: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {
    /* localStorage 解析失敗不擋 */
  }

  // 先把所有已 cache 的填入 (mutate post._shortened_content)
  let cacheHits = 0;
  for (const p of posts) {
    if (cache[p.id]) {
      p._shortened_content = cache[p.id];
      cacheHits++;
    }
  }

  // 篩選需要呼叫 LLM 的 (> targetLength 且無 cache)
  const targets = posts.filter((p) => {
    if ((p.content || "").length <= targetLength) return false;
    if (cache[p.id]) return false;
    return true;
  });

  if (targets.length === 0) {
    console.log(`[shorten] All ${cacheHits} cache hits, no LLM calls needed`);
    return;
  }

  console.log(`[shorten] Processing ${targets.length} posts (>${targetLength} chars, ${cacheHits} cache hits)...`);

  // 並行 limit 4 (避免 MiniMax 429)
  const CONCURRENCY = 4;
  let cursor = 0;
  let processed = 0;

  async function worker(): Promise<void> {
    while (cursor < targets.length) {
      const idx = cursor++;
      const p = targets[idx];
      try {
        const res = await fetch("/api/shorten-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: p.content,
            targetLength,
            title: p.title || undefined,
          }),
        });
        if (!res.ok) {
          console.warn(`[shorten] API ${res.status} for post ${p.id}`);
          continue;
        }
        const data = await res.json();
        if (data.shortenedText && data.shortenedText !== p.content) {
          p._shortened_content = data.shortenedText;
          cache[p.id] = data.shortenedText;
          // 寫 localStorage 增量
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
          } catch {
            /* quota 超過不擋 */
          }
        }
      } catch (e) {
        console.warn(`[shorten] Error for post ${p.id}:`, e);
      }
      processed++;
      if (processed % 10 === 0) {
        console.log(`[shorten] Progress: ${processed}/${targets.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
  console.log(`[shorten] Done. ${processed}/${targets.length} processed, ${cacheHits + processed} total cached.`);
}

// 改: hook setState 進來讓 worker 每 N 篇觸發 re-render
// (但 enrichShortenedContent 是 helper function 不是 hook, 不能直接 setState)
// 解法: worker 在外面跑, 每完成一篇就 callback onProgress
async function enrichShortenedContentLive(
  posts: PostRow[],
  targetLength: number,
  onProgress: (processed: number, total: number) => void
): Promise<void> {
  if (typeof window === "undefined") return;
  const STORAGE_KEY = "story-blog-shortened-content-v1";

  let cache: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {
    /* 解析失敗不擋 */
  }

  let cacheHits = 0;
  for (const p of posts) {
    if (cache[p.id]) {
      p._shortened_content = cache[p.id];
      cacheHits++;
    }
  }

  const targets = posts.filter((p) => {
    if ((p.content || "").length <= targetLength) return false;
    if (cache[p.id]) return false;
    return true;
  });

  if (targets.length === 0) {
    onProgress(0, 0);
    return;
  }

  console.log(`[shorten] Processing ${targets.length} posts (>${targetLength} chars, ${cacheHits} cache hits)...`);

  const CONCURRENCY = 4;
  let cursor = 0;
  let processed = 0;
  let progressDirty = false;

  async function worker(): Promise<void> {
    while (cursor < targets.length) {
      const idx = cursor++;
      const p = targets[idx];
      try {
        const res = await fetch("/api/shorten-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: p.content,
            targetLength,
            title: p.title || undefined,
          }),
        });
        if (!res.ok) {
          console.warn(`[shorten] API ${res.status} for post ${p.id}`);
          continue;
        }
        const data = await res.json();
        if (data.shortenedText && data.shortenedText !== p.content) {
          p._shortened_content = data.shortenedText;
          cache[p.id] = data.shortenedText;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
          } catch {
            /* quota 超過 */
          }
        }
      } catch (e) {
        console.warn(`[shorten] Error for post ${p.id}:`, e);
      }
      processed++;
      progressDirty = true;
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));
  onProgress(processed, targets.length);
  console.log(`[shorten] Done. ${processed}/${targets.length} processed, ${cacheHits + processed} total cached.`);
}

/**
 * 取得 post 的「顯示用」content: 優先用 _shortened_content (≤ 200 字), fallback 回原文
 */
function displayContent(post: PostRow): string {
  return post._shortened_content || post.content || "";
}

/**
 * 方案 C 共頁判斷:
 *   - 兩篇都 < 100 字
 *   - 圖片 orientation 相同 (避免一橫一直勉強湊)
 *   - 若 _orient 缺失 (image 抓不到) → 保守不共頁
 */
function canPairInC(a: PostRow, b: PostRow): boolean {
  if (!a.image_url || !b.image_url) return false;
  const aLen = (a.content || "").length;
  const bLen = (b.content || "").length;
  if (aLen >= 100 || bLen >= 100) return false;
  if (!a._orient || !b._orient) return false;
  return a._orient === b._orient;
}

/**
 * 🆕 9-20 v9: 聖上要求「照片隨機左右讓視覺不易疲勞」
 *
 * 用 post.id 字串 hash 算 stable 隨機值 (0 或 1)
 * - stable: 同一篇 post 永遠是同方向, 不會 reload / 列印時跳
 * - hash-based: 不依賴 React state, SSR/CSR 一致
 * - 只在 B 共頁啟用, 其他方案不受影響
 */
function useImageFlip(postId: string, mode: LayoutMode, paired: boolean): boolean {
  // 只在 B 共頁啟用
  if (!(mode === "B" && paired)) return true; // 預設右 (向後相容)
  // 簡單 djb2 hash
  let hash = 5381;
  for (let i = 0; i < postId.length; i++) {
    hash = ((hash << 5) + hash) + postId.charCodeAt(i);
    hash = hash & hash; // 32-bit
  }
  return Math.abs(hash) % 2 === 1; // 0 = 左, 1 = 右
}

/**
 * 把 day 內 posts 按方案切成「頁」(每頁 = 1 或 2 篇 post 陣列)
 *
 * A / D: 每篇獨立頁
 * B: 🆕 每 2 篇一頁 (上下分割, 不限長度 — 上下排版對長文也友善)
 * C: 短篇 (< 100 字) + 同 orientation 共頁 (左右並排)
 */
function paginateDay(posts: PostRow[], mode: LayoutMode): PostRow[][] {
  if (mode === "B") {
    // 🆕 9-20 v21: 聖上要求「不要按字數分頁, 條件不適合」
    //   放棄嚴格字數門檻, 改為「兩篇都還合理就配對」, 只在太極端 (任一篇 > 350 字) 才拆
    //   - 任一篇 ≤ 350 字才考慮配對 (超過幾乎一定會截斷)
    //   - 不設合計上限 — 改用 client 渲染後的實際高度判斷 (見 PostArticle + paginateFlow)
    //   - 奇數尾巴一篇獨立
    //   - 目的: 盡量配對, 1 頁 2 則
    const out: PostRow[][] = [];
    for (let i = 0; i < posts.length; i++) {
      const cur = posts[i];
      const next = posts[i + 1];
      const curLen = displayContent(cur).length;
      const nextLen = next ? displayContent(next).length : 0;
      // 只在「任一篇 > 350」或「都沒圖」時才拆 (沒圖無法配對 — 單圖才好看)
      const hasImg1 = !!cur.image_url;
      const hasImg2 = next ? !!next.image_url : false;
      const canPair =
        next &&
        curLen <= 350 &&
        nextLen <= 350 &&
        hasImg1 && hasImg2;
      if (canPair) {
        out.push([cur, next]);
        i += 1; // 跳過 next
      } else {
        out.push([cur]);
      }
    }
    return out;
  }
  if (mode === "C") {
    const out: PostRow[][] = [];
    let i = 0;
    while (i < posts.length) {
      const cur = posts[i];
      const next = posts[i + 1];
      if (next && canPairInC(cur, next)) {
        out.push([cur, next]);
        i += 2;
      } else {
        out.push([cur]);
        i += 1;
      }
    }
    return out;
  }
  // A / D: 每篇獨立頁
  return posts.map((p) => [p]);
}

/**
 * 決定頁面內每篇 post 的版面 class
 * - A 攝影: 圖 65% / 文 35% (大圖為主)
 * - B 故事: 圖 45% / 文 55% (圖文平衡)
 * - C 共頁: 兩篇並排, 各佔 50% 寬, 圖文 40:60
 */
function layoutClassFor(mode: LayoutMode, index: number, total: number, post: PostRow): string {
  if (mode === "A") return "print-book-post--photo-major";
  if (mode === "B") return "print-book-post--balanced";
  if (mode === "C") {
    if (total === 2) {
      return index === 0 ? "print-book-post--paired-left" : "print-book-post--paired-right";
    }
    return "print-book-post--solo";
  }
  return "print-book-post--balanced";
}

/**
 * 切換器 UI — 三顆 chip + 頁數預估
 */
function LayoutSwitcher({
  mode,
  setMode,
  pageCount,
  pairCount,
}: {
  mode: LayoutMode;
  setMode: (m: LayoutMode) => void;
  pageCount: number;
  pairCount: number;
}) {
  const opts: { id: LayoutMode; label: string; sub: string }[] = [
    { id: "A", label: "A · 攝影雜誌", sub: "大照片為主 · 每篇獨立" },
    { id: "B", label: "B · 故事閱讀", sub: "圖文平衡 · 每篇獨立" },
    { id: "C", label: "C · 高密度", sub: `短篇共頁 · 省 ${pairCount} 頁` },
    { id: "D", label: "D · 原文呈現", sub: "沿用原本版型 · 標題 11pt" },
  ];
  return (
    <div className="print-book-layout-switcher" role="radiogroup" aria-label="排版方案">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={mode === o.id}
          className={`print-book-chip ${mode === o.id ? "print-book-chip--active" : ""}`}
          onClick={() => setMode(o.id)}
        >
          <span className="print-book-chip-label">{o.label}</span>
          <span className="print-book-chip-sub">{o.sub}</span>
        </button>
      ))}
      <span className="print-book-page-estimate">
        預估 <b>{pageCount}</b> 頁
      </span>
    </div>
  );
}
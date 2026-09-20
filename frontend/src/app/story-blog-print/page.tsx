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
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { qrSvg } from "./lib/qr-svg";
import "./print-book.css";

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
  | { kind: "chapter-stories"; day: number; posts: PostRow[]; layoutMode: LayoutMode; continueFromPage?: number };

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
        pages.push({ kind: "chapter-stories", day: 0, posts: slice, layoutMode });
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
        pages.push({ kind: "chapter-stories", day: d, posts: slice, layoutMode });
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
        pages.push({ kind: "chapter-stories", day: 9, posts: slice, layoutMode });
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
        <ChapterStories day={page.day} posts={page.posts} layoutMode={page.layoutMode} />
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
function ChapterStories({ day, posts, layoutMode }: { day: number; posts: PostRow[]; layoutMode: LayoutMode }) {
  const paired = posts.length === 2;
  // 🆕 9-20 v3: B 模式 → 上下分割 (B-stacked-container), C 模式 → 左右並排 (paired-container)
  const containerClass = paired && layoutMode === "B"
    ? "print-book-chapter print-book-b-stacked-container"
    : paired
    ? "print-book-chapter print-book-paired-container"
    : "print-book-chapter";

  return (
    <div className={containerClass}>
      <div className="print-book-chapter-header" style={{ paddingBottom: "4mm" }}>
        <p className="print-book-day-label" style={{ fontSize: "9pt", letterSpacing: "0.4em" }}>
          {day === 9 ? "E P I L O G U E · 續" : day === 0 ? "P R O L O G U E · 續" : `D A Y  ${String(day).padStart(2, "0")} · 續`}
        </p>
        <div className="print-book-day-divider" style={{ margin: "2mm 0 4mm" }} />
      </div>

      {posts.map((post, idx) => (
        <PostArticle
          key={post.id}
          post={post}
          index={idx}
          isLast={idx === posts.length - 1}
          day={day}
          mode={layoutMode}
          paired={paired}
        />
      ))}
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
}: {
  post: PostRow;
  index: number;
  isLast: boolean;
  day: number;
  mode: LayoutMode;
  paired: boolean;
}) {
  // 🆕 9-20 v9: 聖上要求「隨機左右讓視覺不易疲勞」
  // 用 post.id 字串 hash 算 stable 隨機值 (0 = 左, 1 = 右)
  // 用 hash 而不是 Math.random: 確保 reload / 列印時方向不變
  // 預設右 (向後相容)
  const flipImage = useImageFlip(post.id, mode, paired);

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
  const photoFit = isBStacked && post._orient === "portrait" ? "cover" : "contain";
  const photoMaxH =
    paired && mode === "B"
      ? (post._orient === "portrait" ? "85mm" : "70mm")  // 🆕 v12b: portrait 放寬
      : paired ? "60mm" :                   // C 共頁: 左右並排
      mode === "A" ? (post._orient === "portrait" ? "110mm" : "95mm") :
      "95mm";
  const photoPos = post._orient === "portrait" ? "center top" : "center center";

  return (
    <article
      className={`print-book-post print-book-frame-${post.frame_style || "vermilion"} ${layoutClass} ${imageSideClass}`}
      style={{ marginBottom: isLast ? 0 : "5mm" }}
    >
      {post.title && (
        <h3 className="print-book-story-title">{post.title}</h3>
      )}

      {post.image_url && (
        <figure className="print-book-photo" data-orientation={post._orient || undefined}>
          <img
            src={post.image_url}
            alt={post.title || "旅行照片"}
            className={`print-book-photo-img ${photoClass}`}
            loading="lazy"
            style={{
              maxHeight: photoMaxH,
              objectFit: photoFit,
              objectPosition: photoPos,
              width: "100%",
            }}
          />
        </figure>
      )}

      {displayContent(post) && (
        <div className="print-book-story">
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
      img.crossOrigin = "anonymous"; // 重要: Supabase storage 要 CORS
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
          p._orient = null;
        }
      } catch {
        p._w = p._h = p._ratio = null;
        p._orient = null;
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
    // 🆕 9-20 v3: B 每 2 篇一頁, 上下分割, 不限長度 (不像 C 只限短篇)
    const out: PostRow[][] = [];
    for (let i = 0; i < posts.length; i += 2) {
      out.push(posts.slice(i, i + 2));
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
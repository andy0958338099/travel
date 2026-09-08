"use client";

/**
 * 🆕 2026-09-06 聖上指示: 江南水鄉八日之旅 A5 印刷收藏版
 *
 * 最高原則 (聖上指示):
 *   - 完全獨立頁面, 不修改現有 /travel/story-blog
 *   - URL 故意放在 /story-blog-print (不是 /travel/* 下)
 *     → 自動逃離 TravelLayout (頂部 nav / 排序按鈕 / Footer)
 *     → 不影響其他頁面的任何 markup / CSS / routing
 *   - 資料來源: 直接讀 Supabase posts + trips
 *     跟原 /travel/story-blog 共用同一份資料,「一份資料兩種呈現」
 *   - 所有樣式 scoped 到 .print-book-* 與列印媒體查詢, 不污染全域
 *
 * 排版策略:
 *   - 每個 Day 章節切 1-N 頁, 每頁最多 3 篇 post
 *   - 每頁用 <img> 而非 background-image,確保 PDF 列印能渲染
 *   - 章節第一篇用大照片 + 標題開場, 後續每篇「照片+文字」交錯
 */
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { qrSvg } from "./lib/qr-svg";
import "./print-book.css";

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
}

const TRIP_ID = "00000000-0000-0000-0000-000000000001";
const TRIP_START = "2026-07-17";
const SITE_BASE = "https://travel-china.netlify.app";

// 章節資料型別 (分頁用)
type Page =
  | { kind: "cover"; trip: TripRow }
  | { kind: "frontispiece"; trip: TripRow }
  | { kind: "toc"; trip: TripRow; tocItems: { num: string; title: string; pageNum: number }[] }
  | { kind: "chapter-intro"; day: number; dayTitle: string; dateStr: string; firstPost: PostRow | null }
  | { kind: "chapter-stories"; day: number; posts: PostRow[]; continueFromPage?: number };

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
        setTrip((tripData || null) as TripRow | null);
        setPosts((postData || []) as PostRow[]);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(`讀取失敗: ${(e as Error).message ?? e}`);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // === 計算 day 對應日期 ===
  const dayDate = (d: number): string => {
    if (d === 0) return "序章";
    if (d === 9) return "後記";
    const start = new Date(TRIP_START);
    const dt = new Date(start);
    dt.setDate(start.getDate() + d - 1);
    return `${dt.getFullYear()} / ${String(dt.getMonth() + 1).padStart(2, "0")} / ${String(dt.getDate()).padStart(2, "0")}`;
  };

  // === 切分章節 → 多頁 ===
  const { pages, tocItems } = useMemo(() => {
    if (!trip) return { pages: [] as Page[], tocItems: [] as { num: string; title: string; pageNum: number }[] };
    const dayPosts: Record<number, PostRow[]> = {};
    for (const p of posts) {
      if (!dayPosts[p.day_number]) dayPosts[p.day_number] = [];
      dayPosts[p.day_number].push(p);
    }
    for (const k of Object.keys(dayPosts)) dayPosts[+k].sort((a, b) => a.sort_order - b.sort_order);

    const pages: Page[] = [];
    const toc: { num: string; title: string; pageNum: number }[] = [];

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
      });
      chapterPage++;
      const rest = d0Posts.slice(1);
      for (let i = 0; i < rest.length; i += 1) {
        const slice = rest.slice(i, i + 1);
        pages.push({ kind: "chapter-stories", day: 0, posts: slice });
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
        dayTitle: dPosts[0].title || `Day ${d}`,
        dateStr: dayDate(d),
        firstPost: dPosts[0],
      });
      chapterPage++;
      const rest = dPosts.slice(1);
      for (let i = 0; i < rest.length; i += 1) {
        const slice = rest.slice(i, i + 1);
        pages.push({ kind: "chapter-stories", day: d, posts: slice });
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
        dayTitle: epPosts[0].title || "後記",
        dateStr: "後記",
        firstPost: epPosts[0],
      });
      chapterPage++;
      const rest = epPosts.slice(1);
      for (let i = 0; i < rest.length; i += 1) {
        const slice = rest.slice(i, i + 1);
        pages.push({ kind: "chapter-stories", day: 9, posts: slice });
        chapterPage++;
      }
    }

    // 把 toc 回填到第 3 頁
    if (pages[2]?.kind === "toc") {
      (pages[2] as Extract<Page, { kind: "toc" }>).tocItems = toc;
    }

    return { pages, tocItems: toc };
  }, [trip, posts]);

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
  const pageClass = `print-book-page${showPageNum ? "" : " print-book-no-page-num"}`;

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
        />
      )}
      {page.kind === "chapter-stories" && (
        <ChapterStories day={page.day} posts={page.posts} />
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
        <div
          className="print-book-cover-image"
          aria-label="封面照片"
        >
          {/* 江南水墨風 SVG placeholder — 確保沒 hero_image 也有質感封面 */}
          <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"
               style={{ width: "100%", height: "100%", display: "block" }}>
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e8dcc0" />
                <stop offset="0.5" stopColor="#d4c5a0" />
                <stop offset="1" stopColor="#a89476" />
              </linearGradient>
              <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#5a6f7a" />
                <stop offset="1" stopColor="#3a4f5a" />
              </linearGradient>
            </defs>
            {/* 天空 */}
            <rect width="200" height="160" fill="url(#sky)" />
            {/* 遠山 */}
            <path d="M0,160 Q40,130 80,150 T160,140 T200,150 L200,160 Z" fill="#7a8470" opacity="0.6" />
            <path d="M0,150 Q30,125 70,145 T130,135 T200,140 L200,160 L0,160 Z" fill="#5a6f5a" opacity="0.7" />
            {/* 水 */}
            <rect y="155" width="200" height="125" fill="url(#water)" />
            {/* 水面倒影線 */}
            <g stroke="#fafaf9" strokeWidth="0.3" opacity="0.4">
              <line x1="20" y1="180" x2="180" y2="180" />
              <line x1="10" y1="195" x2="190" y2="195" />
              <line x1="25" y1="210" x2="175" y2="210" />
              <line x1="15" y1="225" x2="185" y2="225" />
              <line x1="30" y1="240" x2="170" y2="240" />
              <line x1="20" y1="255" x2="180" y2="255" />
            </g>
            {/* 船 */}
            <ellipse cx="60" cy="195" rx="12" ry="2" fill="#3a2820" />
            <path d="M55,195 L65,195 L62,180 Z" fill="#5a3a2a" />
            <line x1="62" y1="180" x2="62" y2="170" stroke="#3a2820" strokeWidth="0.5" />
            {/* 屋頂剪影 */}
            <g fill="#1e293b" opacity="0.85">
              <path d="M130,160 L150,140 L170,160 Z" />
              <path d="M160,160 L180,140 L200,160 L200,170 L160,170 Z" />
              <rect x="148" y="155" width="6" height="10" />
              <rect x="172" y="155" width="6" height="10" />
            </g>
            {/* 月 */}
            <circle cx="40" cy="50" r="8" fill="#fafaf9" opacity="0.7" />
          </svg>
        </div>
      </div>
      <div>
        <p className="print-book-cover-subtitle">江 南 水 鄉</p>
        <h1 className="print-book-cover-title">{trip.title}</h1>
        <p className="print-book-cover-season">2026 · 夏</p>
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
}: {
  day: number;
  dayTitle: string;
  dateStr: string;
  firstPost: PostRow | null;
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
            className="print-book-photo-full-img"
            loading="eager"
          />
          {firstPost.title && firstPost.title !== dayTitle && (
            <figcaption className="print-book-photo-caption">{firstPost.title}</figcaption>
          )}
        </figure>
      )}

      {firstPost && (
        <div className="print-book-story">
          {firstPost.content.split("\n").filter((l) => l.trim()).map((para, i) => (
            <p key={i}>{para}</p>
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

// === 章節故事頁 (3 篇 post / 每頁) ===
function ChapterStories({ day, posts }: { day: number; posts: PostRow[] }) {
  return (
    <div className="print-book-chapter">
      <div className="print-book-chapter-header" style={{ paddingBottom: "4mm" }}>
        <p className="print-book-day-label" style={{ fontSize: "9pt", letterSpacing: "0.4em" }}>
          {day === 9 ? "E P I L O G U E · 續" : day === 0 ? "P R O L O G U E · 續" : `D A Y  ${String(day).padStart(2, "0")} · 續`}
        </p>
        <div className="print-book-day-divider" style={{ margin: "2mm 0 4mm" }} />
      </div>

      {posts.map((post, idx) => (
        <PostArticle key={post.id} post={post} index={idx} isLast={idx === posts.length - 1} day={day} />
      ))}
    </div>
  );
}

// === 單篇 post 在印刷版的呈現 ===
function PostArticle({ post, index, isLast, day }: { post: PostRow; index: number; isLast: boolean; day: number }) {
  // 版型:第一篇→大圖;後續→照片+短文交錯
  return (
    <article className={`print-book-post print-book-frame-${post.frame_style || "vermilion"}`} style={{ marginBottom: isLast ? 0 : "5mm" }}>
      {post.title && (
        <h3 className="print-book-story-title">{post.title}</h3>
      )}

      {post.image_url && (
        <figure className="print-book-photo">
          <img
            src={post.image_url}
            alt={post.title || "旅行照片"}
            className={`print-book-photo-img ${index === 0 ? "print-book-photo-full-img" : "print-book-photo-half-img"}`}
            loading="lazy"
            onLoad={(event) => {
              const image = event.currentTarget;
              const orientation = image.naturalHeight > image.naturalWidth ? "portrait" : "landscape";
              image.closest(".print-book-photo")?.setAttribute("data-orientation", orientation);
            }}
          />
        </figure>
      )}

      {post.content && (
        <div className="print-book-story">
          {post.content.split("\n").filter((l) => l.trim()).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <p className="print-book-story-author">✍ {post.author_name || "匿名"}</p>
        </div>
      )}

      {/* 章節結尾插入 QR (D4 / D8) */}
      {isLast && (day === 4 || day === 8) && (
        <aside className="print-book-qr-inline">
          <span
            className="print-book-qr-svg"
            dangerouslySetInnerHTML={{
              __html: qrSvg(`${SITE_BASE}/travel/story-blog?day=${day}`, { size: 64 }),
            }}
          />
          <div className="print-book-qr-inline-text">
            <b>掃碼觀看完整旅程</b>
            Day {day} 的所有照片、補充故事、即時互動留言都在線上版
          </div>
        </aside>
      )}
    </article>
  );
}
"use client";

/**
 * 🆕 2026-10-20 聖上指示: 個人化客製書勾選頁
 *
 * 業務目標:
 *   - 8 天所有 posts 列出,使用者勾選篇章
 *   - 即時顯示「已選 N 篇 ≈ 約 N 頁」 (live estimate)
 *   - 重排勾選順序(預設 = posts.sort_order,可拖動)
 *   - 勾選狀態 autosave 到 localStorage (不上傳)
 *   - 按「儲存並公開」→ POST /api/story-books → 拿到 share_slug + book_id + author_token
 *   - 拿到後產生可分享 URL (bookId + token 進 URL hash)
 *   - 從 ?book_id= 進來時 → 載入那本書 + 校驗 token
 *
 * 設計:
 *   - 章節 = Day 0 (序) / Day 1-8 / Day 9 (後記) + 章節頂部 Checkbox
 *   - 三方案 A/B/C 切換跟 print 同步
 *   - 不污染全域 CSS — 全 scoped 到 .custom-book-*
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { estimatePageCount } from "@/utils/story-books/page-math";
import "./custom-book.css";
import { toDisplayImageUrl } from "@/lib/imageSource"; // 🆕 2026-11-14: gdrive:<fileId> → Google 圖片網址
import { fetchPostsWithFallback, fetchTripWithFallback } from "@/lib/postsFallback"; // 🆕 2026-11-14: Supabase 掛掉時改走本地 pooler

// ============================================================
// 型別
// ============================================================
type PostRow = {
  id: string;
  trip_id: string;
  day_number: number;
  sort_order: number;
  title: string | null;
  content: string;
  image_url: string | null;
  layout_type: "left-image" | "right-image" | "top-image";
  frame_style: "vermilion" | "polaroid" | "ink" | "wash";
  author_name: string | null;
};

type TripRow = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  days: number;
  hero_image: string | null;
  description: string | null;
};

type LayoutMode = "A" | "B" | "C";

// ============================================================
// localStorage keys
// ============================================================
const LS_DRAFT_KEY = "custom-story-book-draft";
const LS_DRAFT_VERSION = "2026-10-20-v1";
// 🆕 2026-11-15: 「最後公開的那本」獨立存放。
//   為什麼要分開存?因為草稿的 owned_book 為了防「跨書覆寫」會被清掉,
//   清掉後編輯器重載就找不到分享面板了。但分享面板只需要 share_slug,
//   不參與存檔 payload,所以可以安全地另存一份。
const LS_SHARE_KEY = "custom-story-book-last-published";

type Draft = {
  version: string;
  title: string;
  layout_mode: LayoutMode;
  author_name: string;
  selected_post_ids: string[];
  // 對應到 book_id 的 server token(用來編輯/刪除既有書)
  owned_book?: { book_id: string; share_slug: string; author_token: string };
  updated_at: string;
};

const emptyDraft = (): Draft => ({
  version: LS_DRAFT_VERSION,
  title: "我的江南之旅",
  // 🆕 2026-11-14: 預設改成 B(每頁 2 則)。
  //   原本預設 A(每頁 1 則) → 使用者新建書後直接下載 PDF,
  //   拿到的是「一頁 1 則」,與「PDF 一頁要有 2 個故事」的需求不符,
  //   而且預覽頁當時也沒辦法改 mode,只能回編輯頁 → 流程迂迴容易忘。
  layout_mode: "B",
  author_name: "",
  selected_post_ids: [],
  updated_at: new Date().toISOString(),
});

// ============================================================
// Day 中文標題 — 跟 print 頁對齊
// ============================================================
const DAY_LABEL: Record<number, string> = {
  0: "序章",
  1: "Day 01 · 搭乘春秋航空抵達上海",
  2: "Day 02 · 體會上海魔都",
  3: "Day 03 · 西塘古鎮體搖擼船",
  4: "Day 04 · 烏鎮西柵沈浸式體驗",
  5: "Day 05 · 烏鎮早茶客體驗",
  6: "Day 06 · 杭州宋城千古情",
  7: "Day 07 · 杭州宮宴遊西湖",
  8: "Day 08 · 遊南宋御街後返台",
  9: "後記",
};

// ============================================================
// 主元件
// ============================================================
// 🆕 2026-11-14: useSearchParams() 在 static prerender 時會讓 Next 直接
//   報錯「should be wrapped in a suspense boundary」(整包 build 失敗)。
//   → 把用到 useSearchParams 的部分拆成 Inner,外層用 <Suspense> 包起來。
function CustomStoryBookInner() {
  const sp = useSearchParams();
  const router = useRouter();

  // ── 從 query 讀 book_id(由分享 URL 進來) ──
  const editingBookId = sp.get("book_id");

  // ── DB fetch state ──
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── draft state ──
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [draftReady, setDraftReady] = useState(false);

  // ── save / share state ──
  const [saving, setSaving] = useState(false);
  // 🆕 2026-11-15: 分享連結複製成功的提示
  const [shareCopied, setShareCopied] = useState(false);
  const [savedBook, setSavedBook] = useState<{
    book_id: string;
    share_slug: string;
    author_token: string;
  } | null>(null);
  // 🆕 2026-11-15: 最後公開的那本(獨立於草稿,重載後分享面板仍在)
  const [lastPublished, setLastPublished] = useState<{
    book_id: string;
    share_slug: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── 過濾/搜尋 ──
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState<number | "all">("all");

  // ============================================================
  // 1. 載入 trip + posts
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [{ rows: tripRows }, { rows: postData, error: postErr }] =
          await Promise.all([
            // 🆕 2026-11-14: Supabase 掛掉時自動改走本地 pooler fallback
            fetchTripWithFallback<TripRow>(
              "00000000-0000-0000-0000-000000000001"
            ),
            fetchPostsWithFallback<PostRow>(
              "00000000-0000-0000-0000-000000000001"
            ),
          ]);
        if (cancelled) return;
        if (postErr) {
          setLoadError(`無法讀取文章資料: ${postErr}`);
          return;
        }
        setTrip((tripRows?.[0] || null) as TripRow | null);
        // 🆕 2026-11-14: gdrive:<fileId> token 解析成 Google 圖片網址 (顯示層, DB 不動)
        setPosts(
          ((postData || []) as PostRow[]).map((p) => ({
            ...p,
            image_url: toDisplayImageUrl(p.image_url),
          }))
        );
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoadError(`讀取失敗: ${(e as Error).message ?? e}`);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // 2. 載入 draft(localStorage 或 既有書)
  // ============================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    const tryLoadFromUrl = async () => {
      if (!editingBookId) return null;
      // 從 URL 進來:帶 hash 的 token 用 header 驗證
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const params = new URLSearchParams(hash);
      const token = params.get("token") || "";
      if (!token) return null;
      const res = await fetch(
        `/api/story-books?book_id=${encodeURIComponent(editingBookId)}`,
        { headers: { "x-author-token": token } },
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.is_owner) return null;
      return json;
    };

    (async () => {
      const fromUrl = await tryLoadFromUrl();
      if (fromUrl) {
        const b = fromUrl.book;
        setDraft({
          version: LS_DRAFT_VERSION,
          title: b.title ?? "我的江南之旅",
          layout_mode: b.layout_mode ?? "A",
          author_name: b.author_name ?? "",
          selected_post_ids: b.selected_post_ids ?? [],
          owned_book: {
            book_id: b.book_id,
            share_slug: b.share_slug,
            author_token: b.author_token ?? "",
          },
          updated_at: new Date().toISOString(),
        });
        setDraftReady(true);
        return;
      }

      // 否則 → 從 localStorage 讀
      try {
        // 🆕 2026-11-15: 讀出「最後公開的那本」,讓分享面板在重載後仍然存在
        const rawPub = localStorage.getItem(LS_SHARE_KEY);
        if (rawPub) {
          try {
            const pub = JSON.parse(rawPub) as {
              book_id: string;
              share_slug: string;
            };
            if (pub?.share_slug) {
              setLastPublished({ book_id: pub.book_id, share_slug: pub.share_slug });
            }
          } catch (e) {
            console.warn("[share] load failed:", e);
          }
        }
        const raw = localStorage.getItem(LS_DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Draft;
          if (parsed?.version === LS_DRAFT_VERSION) {
            // 🆕 2026-11-14 修掉「跨書覆蓋」bug。
            //   情境:先編輯了書 A(草稿存進 localStorage,內含 owned_book=A),
            //   之後不帶參數進入 /story-blog-custom 想「新建另一本」→
            //   草稿被讀出來,owned_book 仍指向 A,選篇/模式也是 A 的 →
            //   按儲存會把 A 整本覆蓋掉,而不是建立新書。
            //   修正:owned_book 只有在「確實指向 URL 上那本書」時才保留,
            //   其餘情況一律清掉 → 存檔時會安全地新建一本。
            const owned = parsed.owned_book;
            const ownedMatchesTarget =
              !!owned && !!editingBookId && owned.book_id === editingBookId;
            setDraft({
              ...parsed,
              owned_book: ownedMatchesTarget ? owned : undefined,
            });
          }
        }
      } catch (e) {
        console.warn("[draft] load failed:", e);
      }
      setDraftReady(true);
    })();
  }, [editingBookId]);

  // ============================================================
  // 3. draft autosave → localStorage
  // ============================================================
  useEffect(() => {
    if (!draftReady) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(draft));
      } catch (e) {
        console.warn("[draft] save failed:", e);
      }
    }, 400); // debounce
    return () => clearTimeout(t);
  }, [draft, draftReady]);

  // ============================================================
  // 4. 派生:章節分組 + 過濾後 posts
  // ============================================================
  const postsByDay = useMemo(() => {
    const m: Record<number, PostRow[]> = {};
    for (const p of posts) {
      if (!m[p.day_number]) m[p.day_number] = [];
      m[p.day_number].push(p);
    }
    return m;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let out = posts;
    if (filterDay !== "all") {
      out = out.filter((p) => p.day_number === filterDay);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (p) =>
          (p.title ?? "").toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q),
      );
    }
    return out;
  }, [posts, filterDay, search]);

  // ============================================================
  // 5. 派生:已選 posts(依 selected_post_ids 順序)
  // ============================================================
  const selectedPosts = useMemo(() => {
    const set = new Set(draft.selected_post_ids);
    const sel = posts.filter((p) => set.has(p.id));
    // 依 selected_post_ids 順序排
    const idx = new Map(draft.selected_post_ids.map((id, i) => [id, i]));
    sel.sort((a, b) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0));
    return sel;
  }, [draft.selected_post_ids, posts]);

  // ============================================================
  // 6. 派生:live 頁數估算
  // ============================================================
  const pageEstimate = useMemo(
    () =>
      estimatePageCount(draft.selected_post_ids.length, draft.layout_mode),
    [draft.selected_post_ids.length, draft.layout_mode],
  );

  // ============================================================
  // 7. 操作:勾選/取消
  // ============================================================
  const togglePost = useCallback((id: string) => {
    setDraft((d) => {
      const s = new Set(d.selected_post_ids);
      if (s.has(id)) {
        // 移除:保留其他順序
        return {
          ...d,
          selected_post_ids: d.selected_post_ids.filter((x) => x !== id),
          updated_at: new Date().toISOString(),
        };
      }
      s.add(id);
      return {
        ...d,
        selected_post_ids: [...d.selected_post_ids, id],
        updated_at: new Date().toISOString(),
      };
    });
  }, []);

  const toggleDay = useCallback((day: number) => {
    setDraft((d) => {
      const dayIds = (postsByDay[day] || []).map((p) => p.id);
      const set = new Set(d.selected_post_ids);
      const allSelected = dayIds.every((id) => set.has(id));
      let next: string[];
      if (allSelected) {
        // 全部移除
        next = d.selected_post_ids.filter((id) => !set.has(id) || !dayIds.includes(id));
      } else {
        // 加入缺的
        const missing = dayIds.filter((id) => !set.has(id));
        next = [...d.selected_post_ids, ...missing];
      }
      return { ...d, selected_post_ids: next, updated_at: new Date().toISOString() };
    });
  }, [postsByDay]);

  const clearAll = useCallback(() => {
    if (!confirm("確定清空所有已選的篇章? 本地草稿會被清掉(已儲存並公開的書不會動)")) return;
    setDraft((d) => ({
      ...d,
      selected_post_ids: [],
      updated_at: new Date().toISOString(),
    }));
  }, []);

  const movePost = useCallback((id: string, direction: -1 | 1) => {
    setDraft((d) => {
      const idx = d.selected_post_ids.indexOf(id);
      if (idx < 0) return d;
      const j = idx + direction;
      if (j < 0 || j >= d.selected_post_ids.length) return d;
      const arr = [...d.selected_post_ids];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...d, selected_post_ids: arr, updated_at: new Date().toISOString() };
    });
  }, []);

  // ============================================================
  // 8. 操作:儲存並公開 → POST/PATCH /api/story-books
  // ============================================================
  const handleSave = useCallback(async () => {
    if (draft.selected_post_ids.length === 0) {
      if (!confirm("目前還沒勾選任何篇章,書會是空的。要繼續嗎?")) return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const owned = draft.owned_book;
      const payload = {
        ...(owned ? { book_id: owned.book_id, author_token: owned.author_token } : {}),
        title: draft.title.trim() || "我的江南之旅",
        layout_mode: draft.layout_mode,
        author_name: draft.author_name.trim() || "匿名旅人",
        selected_post_ids: draft.selected_post_ids,
        is_public: true,
      };
      const res = await fetch("/api/story-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const ownedBook = {
        book_id: data.book_id,
        share_slug: data.share_slug,
        author_token: data.author_token,
      };
      setSavedBook(ownedBook);
      // 🆕 2026-11-15: 記住「最後公開的那本」→ 重載編輯器頁分享面板仍在
      setLastPublished({ book_id: data.book_id, share_slug: data.share_slug });
      try {
        localStorage.setItem(
          LS_SHARE_KEY,
          JSON.stringify({ book_id: data.book_id, share_slug: data.share_slug }),
        );
      } catch (e) {
        console.warn("[share] save failed:", e);
      }
      setDraft((d) => ({
        ...d,
        title: data.title ?? d.title,
        layout_mode: data.layout_mode ?? d.layout_mode,
        author_name: data.author_name ?? d.author_name,
        selected_post_ids: data.selected_post_ids ?? d.selected_post_ids,
        owned_book: ownedBook,
        updated_at: new Date().toISOString(),
      }));
      // URL hash 帶 token,讓使用者可以複製「含編輯權」的 URL
      const url = new URL(window.location.href);
      url.searchParams.set("book_id", data.book_id);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      setSaveError(`儲存失敗: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const handleDelete = useCallback(async () => {
    const owned = draft.owned_book;
    if (!owned) {
      alert("這本書還沒公開過,直接清空本地草稿就好");
      return;
    }
    if (!confirm("刪除這本公開書嗎? 分享 URL 會失效,別人再也看不到。")) return;
    try {
      const res = await fetch(
        `/api/story-books?book_id=${encodeURIComponent(owned.book_id)}`,
        { method: "DELETE", headers: { "x-author-token": owned.author_token } },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      alert("已刪除書本");
      localStorage.removeItem(LS_DRAFT_KEY);
      // 🆕 2026-11-15: 刪掉的若是「最後公開的那本」,分享面板也應該消失
      if (lastPublished?.book_id === owned.book_id) {
        localStorage.removeItem(LS_SHARE_KEY);
        setLastPublished(null);
      }
      setSavedBook(null);
      setDraft((d) => ({ ...d, owned_book: undefined }));
      router.push("/story-blog-custom");
    } catch (e) {
      alert(`刪除失敗: ${(e as Error).message}`);
    }
  }, [draft.owned_book, lastPublished, router]);

  // ============================================================
  // 9. render
  // ============================================================
  if (loading) {
    return (
      <main className="custom-book-root p-12 text-center text-jn-ink/60">
        <p>⏳ 載入 370 篇故事中...</p>
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="custom-book-root p-12 text-center text-rose-700">
        <p>❌ {loadError}</p>
      </main>
    );
  }

  // 🆕 2026-11-15: 分享面板要在「重新載入編輯器頁」時也出現,
  // 所以來源是草稿裡的 owned_book(會存進 localStorage),不只是剛按儲存時的 savedBook。
  const shareBook =
    savedBook ??
    draft.owned_book ??
    (lastPublished ? { ...lastPublished, author_token: "" } : null);
  const renderShareUrl = shareBook
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/story-blog-custom/preview/${shareBook.share_slug}`
    : null;

  // 下載已公開的客製書 A5 PDF
  // ⚠️ 2026-11-16: 線上若沒有這本書的預生成 PDF，端點會回 503 JSON。
  //    直接讓瀏覽器跳 <a download> 會把那份 JSON 錯誤訊息存成 .pdf，
  //    使用者看到「下載的檔案打不開」。改成先取 blob 再存，
  //    失敗時帶去「列印 → 另存為 PDF」（版面與 PDF 相同）。
  const downloadSharePdf = async () => {
    if (!shareBook) return;
    try {
      const res = await fetch(
        `/api/story-books/pdf?slug=${encodeURIComponent(
          shareBook.share_slug
        )}&range=full`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || `HTTP ${res.status}`;
        if (err.code === "PDF_NOT_PREBUILT" || /尚未產生/i.test(msg)) {
          const goPrint = confirm(
            `${msg}\n\n要直接用「列印 → 另存為 PDF」取得 A5 檔案嗎？\n（版面與下載的 PDF 完全相同）`
          );
          if (goPrint) {
            window.open(
              `/story-blog-custom/preview/${encodeURIComponent(
                shareBook.share_slug
              )}?print=1`,
              "_blank"
            );
          }
          return;
        }
        alert(`下載失敗: ${msg}`);
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `custom-story-book-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    } catch (e) {
      alert(`下載失敗: ${(e as Error).message}`);
    }
  };

  return (
    <main className="custom-book-root">
      {/* Header */}
      <header className="custom-book-header">
        <div className="custom-book-header-inner">
          <div className="flex items-center gap-3">
            <Link href="/story-blog-print" className="text-xs text-jn-ink/50 hover:text-jn-ink">
              ← 返回印刷全本
            </Link>
            <span className="text-jn-ink/30">·</span>
            <span className="text-xs text-jn-ink/40">
              {trip?.title ?? "江南 8 天"}
            </span>
          </div>
          <h1 className="custom-book-title">📖 我的客製書</h1>
          <p className="custom-book-subtitle">
            從 370 篇故事自由勾選 → 即時估算頁數 → 儲存並公開 → 別人點 URL 也能看
          </p>
        </div>
      </header>

      <div className="custom-book-grid">
        {/* 左側:勾選區 */}
        <section className="custom-book-left">
          {/* 控制列 */}
          <div className="custom-book-controls">
            <input
              className="custom-book-input"
              placeholder="🔍 搜尋標題或內文..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="custom-book-select"
              value={filterDay}
              onChange={(e) =>
                setFilterDay(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">全部 Day</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <option key={d} value={d}>
                  {DAY_LABEL[d] ?? `Day ${d}`}
                </option>
              ))}
            </select>
            <select
              className="custom-book-select"
              value={draft.layout_mode}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  layout_mode: e.target.value as LayoutMode,
                }))
              }
            >
              <option value="A">🅐 攝影雜誌 · 每頁 1 則</option>
              <option value="B">🅑 故事閱讀 · 每頁 2 則（字級自適應）</option>
              <option value="C">🅒 高密度 · 每頁 2 則（固定 8pt）</option>
            </select>
          </div>

          {/* 章節樹 */}
          {Object.keys(postsByDay)
            .map((k) => Number(k))
            .sort((a, b) => a - b)
            .map((day) => {
              const dayPosts = postsByDay[day] || [];
              const selectedSet = new Set(draft.selected_post_ids);
              const selectedCount = dayPosts.filter((p) => selectedSet.has(p.id)).length;
              const allSelected = selectedCount === dayPosts.length;
              return (
                <section key={day} className="custom-book-day">
                  <header className="custom-book-day-header">
                    <label className="custom-book-day-label">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el)
                            el.indeterminate = !allSelected && selectedCount > 0;
                        }}
                        onChange={() => toggleDay(day)}
                      />
                      <span className="custom-book-day-title">
                        {DAY_LABEL[day] ?? `Day ${day}`}
                      </span>
                      <span className="custom-book-day-count">
                        {selectedCount} / {dayPosts.length}
                      </span>
                    </label>
                  </header>

                  <ul className="custom-book-post-list">
                    {dayPosts
                      .filter((p) =>
                        search.trim()
                          ? (p.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
                            p.content.toLowerCase().includes(search.toLowerCase())
                          : true,
                      )
                      .map((p) => {
                        const isSelected = selectedSet.has(p.id);
                        return (
                          <li
                            key={p.id}
                            className={`custom-book-post ${isSelected ? "is-selected" : ""}`}
                          >
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePost(p.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {p.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={p.image_url}
                                      alt=""
                                      className="w-12 h-12 object-cover rounded border border-jn-ink/15"
                                      loading="lazy"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-jn-ink truncate">
                                      {p.title || "（無標題）"}
                                    </p>
                                    <p className="text-xs text-jn-ink/55 line-clamp-2">
                                      {/* 2026-11-14: 摘要也去掉與標題重複的開頭 */}
                                      {(() => {
                                        const raw = p.content || "";
                                        const title = (p.title || "").trim();
                                        let body = raw;
                                        if (title) {
                                          if (raw.trim() === title) body = "";
                                          else if (raw.trimStart().startsWith(title))
                                            body = raw.trimStart().slice(title.length).replace(/^\n+/, "");
                                        }
                                        return body.slice(0, 80);
                                      })()}
                                      {p.content.length > 80 ? "…" : ""}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              );
            })}
        </section>

        {/* 右側:已選 + 儲存面板 */}
        <aside className="custom-book-right">
          <div className="custom-book-panel">
            <h2 className="custom-book-panel-title">📚 我的書</h2>

            <div className="custom-book-stat">
              <div className="custom-book-stat-num">
                {draft.selected_post_ids.length}
              </div>
              <div className="custom-book-stat-label">已選篇數</div>
            </div>
            <div className="custom-book-stat">
              <div className="custom-book-stat-num">~{pageEstimate}</div>
              <div className="custom-book-stat-label">頁數估算</div>
            </div>
            <div
              className={`custom-book-stat-warning ${
                pageEstimate > 150 ? "is-over" : pageEstimate < 100 ? "is-under" : "is-good"
              }`}
            >
              {pageEstimate > 150
                ? `超過 150 頁上限 ${pageEstimate - 150} 頁,建議取消勾選`
                : pageEstimate < 100
                ? `少於 100 頁,可再加 ${100 - pageEstimate}~30 頁`
                : `✅ 落在聖上指定 100-150 頁甜蜜區`}
            </div>

            {/* 書名 + 作者 */}
            <div className="custom-book-form">
              <label>
                <span className="custom-book-form-label">書名</span>
                <input
                  className="custom-book-input"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </label>
              <label>
                <span className="custom-book-form-label">作者</span>
                <input
                  className="custom-book-input"
                  placeholder="匿名旅人"
                  value={draft.author_name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, author_name: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="custom-book-actions">
              <button
                onClick={handleSave}
                disabled={saving}
                className="custom-book-btn-primary"
              >
                {saving
                  ? "⏳ 儲存中..."
                  : draft.owned_book
                  ? "🔄 更新已公開的書"
                  : "💾 儲存並公開"}
              </button>
              {draft.owned_book && (
                <button
                  onClick={handleDelete}
                  className="custom-book-btn-danger"
                >
                  🗑️ 刪除這本
                </button>
              )}
              <button
                onClick={clearAll}
                className="custom-book-btn-ghost"
              >
                ✖ 清空草稿
              </button>
            </div>

            {saveError && (
              <p className="text-sm text-rose-700 mt-2">{saveError}</p>
            )}

            {/* Share URL */}
            {shareBook && renderShareUrl && (
              <div className="custom-book-share">
                <p className="text-sm text-jn-ink/70 mb-1">
                  ✨ 已公開!任何人點下面 URL 都能看見你選的書:
                </p>
                <code className="custom-book-share-url">{renderShareUrl}</code>
                <button
                  className="custom-book-btn-ghost mt-2 w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(renderShareUrl!);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                >
                  {shareCopied ? "✅ 已複製" : "📋 複製分享 URL"}
                </button>
                {/* 🆕 2026-11-15: 公開後直接給「觀看 / 下載」兩個入口,
                    不用自己組 URL 給別人。 */}
                <Link
                  href={`${renderShareUrl}?read=1`}
                  className="custom-book-btn-primary mt-2 block text-center"
                  target="_blank"
                >
                  👁️ 線上閱讀(訪客看到的樣子)
                </Link>
                <a
                  href={`/api/story-books/pdf?slug=${encodeURIComponent(
                    shareBook.share_slug
                  )}&range=full`}
                  className="custom-book-btn-ghost mt-1 block text-center"
                  download
                  onClick={(e) => {
                    // ⚠️ 2026-11-16: 線上缺預生成 PDF 時（503），
                    //    直接跳轉會讓瀏覽器下載一個 JSON 錯誤檔。
                    //    改成先測試端點，失敗就帶去「列印成 PDF」。
                    e.preventDefault();
                    void downloadSharePdf();
                  }}
                >
                  ⬇️ 下載 A5 列印版 PDF
                </a>
                <Link
                  href={renderShareUrl}
                  className="custom-book-btn-ghost mt-1 block text-center"
                  target="_blank"
                >
                  📄 開新分頁預覽
                </Link>
              </div>
            )}
          </div>

          {/* 已選列表 + 排序 */}
          <div className="custom-book-panel">
            <h2 className="custom-book-panel-title">
              📖 目錄 ({selectedPosts.length})
            </h2>
            {selectedPosts.length === 0 ? (
              <p className="text-sm text-jn-ink/50 py-4 text-center">
                還沒勾選任何篇章。在左邊點 ☑ 開始
              </p>
            ) : (
              <ol className="custom-book-toc">
                {selectedPosts.map((p, idx) => (
                  <li key={p.id} className="custom-book-toc-item">
                    <span className="custom-book-toc-num">{idx + 1}</span>
                    <span className="custom-book-toc-title">
                      {p.title || "（無標題）"}
                    </span>
                    <span className="custom-book-toc-day">
                      {DAY_LABEL[p.day_number]?.split(" · ")[0] || `D${p.day_number}`}
                    </span>
                    <button
                      onClick={() => movePost(p.id, -1)}
                      disabled={idx === 0}
                      className="custom-book-toc-move"
                      title="上移"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => movePost(p.id, 1)}
                      disabled={idx === selectedPosts.length - 1}
                      className="custom-book-toc-move"
                      title="下移"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => togglePost(p.id)}
                      className="custom-book-toc-rm"
                      title="移除"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      <footer className="custom-book-footer">
        <p className="text-xs text-jn-ink/40">
          草稿自動存 localStorage · 公開書存 Supabase `custom_story_books` table · 完全匿名協作
        </p>
        <p className="text-xs text-jn-ink/40">
          🆕 2026-10-20 聖上指示: 個人化客製書 — 選 ~{pageEstimate} 頁輸出 A5 印刷版
        </p>
      </footer>
    </main>
  );
}

// 🆕 2026-11-14: Suspense wrapper(見上方說明)
export default function CustomStoryBookPage() {
  return (
    <Suspense
      fallback={
        <main className="custom-book-page custom-book-loading">
          <p className="text-sm text-jn-ink/50">載入中…</p>
        </main>
      }
    >
      <CustomStoryBookInner />
    </Suspense>
  );
}

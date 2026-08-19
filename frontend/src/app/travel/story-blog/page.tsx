"use client";

/**
 * 🆕 2026-08-10 聖上拍板: 江南 8 天 7 夜故事部落格
 *
 * 🆕 8-10 聖上拍板 (第 2 輪): single-day view
 *   - URL `?day=N` 控制當前章節 (default 1)
 *   - 點 chip / 點 ◀▶ 切換 URL (書籤友善)
 *   - 只 render 當前 day 的 posts
 *   - TimelineStory 拿掉 article 內的 day chip
 */
import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import TimelineStory, { type PostRow } from "@/components/story/TimelineStory";
import type { FrameStyle } from "@/components/story/PhotoFrame";
import AddStoryModal from "@/components/story/AddStoryModal";
import RepolishModal from "@/components/story/RepolishModal";
import BackgroundMusicPlayer from "@/components/story/BackgroundMusicPlayer"; // 🆕 2026-08-14 聖上拍板: 部落格背景音樂
import { toast } from "@/components/GlobalToastHost"; // 🆕 2026-08-15 聖上拍板 🅐: 送出後 router.refresh() + toast 接到全域 host

interface TripRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  days: number;
  hero_image: string | null;
  description: string | null;
}

const TRIP_ID = "00000000-0000-0000-0000-000000000001";
const TRIP_START = "2026-07-17";
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // 前言 / D1-8 / 後記

export default function StoryBlogPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-jn-paper flex items-center justify-center">
        <div className="text-jn-ink/60 text-lg">載入中…</div>
      </main>
    }>
      <StoryBlogPageInner />
    </Suspense>
  );
}

function StoryBlogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 🆕 8-10 single-day view: URL ?day=N 決定當前章節
  const dayParam = searchParams.get("day");
  const activeDay = (() => {
    const n = dayParam !== null ? parseInt(dayParam, 10) : 1;
    if (isNaN(n) || n < 0 || n > 9) return 1;
    return n;
  })();

  const setActiveDay = useCallback((d: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("day", String(d));
    router.push(`/travel/story-blog?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const [trip, setTrip] = useState<TripRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState(1);
  // 🆕 8-10 聖上拍板: 重新潤飾 modal state (article ⚙ 按鈕觸發)
  const [repolishPost, setRepolishPost] = useState<PostRow | null>(null);
  // 🆕 2026-08-14 聖上拍板: hero 自動隱藏 (滾過後 sticky 起來 + 3 秒無動作 → fade out)
  const [heroHidden, setHeroHidden] = useState(false);
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let heroEl: HTMLElement | null = null;
    let lastY = window.scrollY;

    const resetTimer = () => {
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
      if (heroEl && heroHidden) setHeroHidden(false); // 任一動作 → 重現
      // 只有 hero 被滾出 viewport (sticky 起來了) 才開始計時
      const heroOut = heroEl ? heroEl.getBoundingClientRect().bottom < 0 : window.scrollY > 300;
      if (heroOut) {
        heroTimerRef.current = setTimeout(() => setHeroHidden(true), 3000);
      }
    };

    const onScroll = () => {
      // scroll 本身也算動作 → reset
      lastY = window.scrollY;
      resetTimer();
    };
    const onMove = () => resetTimer();
    const onClick = () => resetTimer();

    // 等 DOM 跑完用 querySelector 找 hero
    const setupObserver = () => {
      heroEl = document.querySelector("main header");
      if (!heroEl) return;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("click", onClick);
      resetTimer();
    };
    // 給 100ms 等 hydration 完成
    const t = setTimeout(setupObserver, 100);

    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    };
  }, [heroHidden]);

  // 🆕 2026-08-15 聖上拍板 🅐 修法: 把 fetchPosts 抽成 named callback
  // page.tsx 是 client component + posts 從 Supabase useEffect 進 useState,
  // router.refresh() 只重跑 RSC tree,client 的 useEffect 不會重跑,所以新 post 不會出現。
  // 正解:送出後直接呼叫 fetchPosts 重抓,client state 直接更新。
  const fetchPosts = useCallback(async () => {
    const supabase = createClient();
    const { data: postData } = await supabase
      .from("posts").select("*").eq("trip_id", TRIP_ID)
      .order("sort_order", { ascending: true });
    if (!postData) {
      setPosts([]);
      return;
    }
    // 🆕 2026-08-16 聖上拍板 🅑 修法: DB 為 source of truth, localStorage 退為 mirror
    // - DB frame_style 缺失 (column 還沒建) → 預設 'vermilion'
    // - DB 是最新狀態 (任何用戶最後一次切換都會同步到所有裝置)
    // - localStorage 只用來 offline optimistic UI (切了立刻看到, 不等 PATCH 回來)
    const VALID: ReadonlyArray<string> = ["vermilion", "polaroid", "ink", "wash"];
    const normalized = postData.map((p: any) => {
      const fromDb = p.frame_style;
      const candidate = (fromDb && VALID.includes(fromDb)) ? fromDb : "vermilion";
      return { ...p, frame_style: candidate };
    });
    setPosts(normalized as PostRow[]);
  }, []);

  // 初次載入 (含 trip + realtime 訂閱)
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: tripData } = await supabase
        .from("trips").select("*").eq("id", TRIP_ID).maybeSingle();
      if (tripData) setTrip(tripData as TripRow);
      await fetchPosts();
      setLoading(false);

      // realtime (try/catch — publishable key 沒 realtime 權限時 graceful 降級)
      try {
        channel = supabase
          .channel("story-blog-posts-all")
          .on("postgres_changes",
            { event: "*", schema: "public", table: "posts", filter: `trip_id=eq.${TRIP_ID}` },
            (payload) => {
              if (payload.eventType === "INSERT") {
                setPosts((prev) => {
                  if (prev.find((p) => p.id === (payload.new as PostRow).id)) return prev;
                  return [...prev, payload.new as PostRow].sort((a, b) => a.sort_order - b.sort_order);
                });
              } else if (payload.eventType === "UPDATE") {
                setPosts((prev) => {
                  const VALID = ["vermilion", "polaroid", "ink", "wash"];
                  const incoming = payload.new as PostRow;
                  // � 2026-08-16 聖上拍板 🅑 修法: DB 為 source of truth (跟 fetchPosts 一致)
                  // realtime payload 帶回的 frame_style 可能因 DB column 未建而是 undefined
                  const fromDb = incoming.frame_style;
                  const candidate = (fromDb && VALID.includes(fromDb)) ? fromDb : "vermilion";
                  const normalized = { ...incoming, frame_style: candidate as FrameStyle };
                  return prev.map((p) => p.id === normalized.id ? normalized : p);
                });
              } else if (payload.eventType === "DELETE") {
                setPosts((prev) => prev.filter((p) => p.id !== (payload.old as { id: string }).id));
              }
            })
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              console.warn("[story-blog] realtime:", status, "— fallback to refresh-only");
            }
          });
      } catch (e) {
        console.warn("[story-blog] realtime setup failed:", e);
      }
    })();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  // 🆕 2026-08-14 聖上拍板: 章節 chip 列已換成 ◀ ▶ + select, dayCounts 不再需要

  // 天數對應日期
  const dayDates: Record<number, string> = useMemo(() => {
    const start = new Date(TRIP_START);
    const map: Record<number, string> = { 0: "前言", 9: "後記" };
    for (let d = 1; d <= 8; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + d - 1);
      map[d] = `7/${String(date.getDate()).padStart(2, "0")}`;
    }
    return map;
  }, []);

  const openModal = useCallback((day: number) => {
    setModalDay(day);
    setModalOpen(true);
  }, []);

  // 🆕 2026-08-15 聖上拍板 🅐 修法 v2:
  // 前版用 router.refresh() 在 client-only fetch 模式下無效(只重跑 RSC tree)。
  // 改成直接呼叫 fetchPosts 重抓 → setPosts → React 重 render → 新 post 立刻出現。
  // 副作用為 0:不閃白、保留 scroll、保留 active day、不重複 pageview、modal 仍由 AddStoryModal onClose 處理。
  const handleSubmitted = useCallback(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 🆕 刪除 / 上下移動 callback
  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) { toast.error(`刪除失敗: ${error.message}`); return; }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // 🆕 8-10 聖上拍板: 重新潤飾 — 點 article ⚙ 觸發
  const handleRepolish = useCallback((id: string) => {
    const target = posts.find((p) => p.id === id);
    if (target) setRepolishPost(target);
  }, [posts]);

  // 採納潤飾版 → 寫回 DB (RepolishModal 內已 PATCH, 這裡做樂觀更新)
  const handleAdoptedPolished = useCallback((id: string, newContent: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, content: newContent } : p)));
  }, []);

  const handleMove = useCallback(async (id: string, direction: "up" | "down") => {
    const supabase = createClient();
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const sameDay = posts
      .filter((p) => p.day_number === target.day_number)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = sameDay.findIndex((p) => p.id === id);
    const swapWith = direction === "up" ? sameDay[idx - 1] : sameDay[idx + 1];
    if (!swapWith) return;
    let a = target.sort_order;
    let b = swapWith.sort_order;

    // 🆕 2026-08-19 聖上拍板 🅐: 若 a === b (撞到重複 sort_order),
    //   自動 renumber 整個 day 一次,確保唯一後再 swap
    //   原因: D1 之前有 8 對重複 sort_order,swap 等於沒換 → 「無法調整上下」
    if (a === b) {
      console.warn(`[handleMove] sort_order 撞到重複 (${a}), 自動 renumber day=${target.day_number}`);
      const renumbered = sameDay.map((p, i) => ({
        ...p,
        sort_order: (i + 1) * 1000,
      }));
      const newTargetSort = renumbered[idx].sort_order;
      const newSwapSort = direction === "up" ? renumbered[idx - 1].sort_order : renumbered[idx + 1].sort_order;
      // 樂觀更新
      setPosts((prev) =>
        prev.map((p) => {
          const r = renumbered.find((x) => x.id === p.id);
          return r ? { ...p, sort_order: r.sort_order } : p;
        }).sort((x, y) => x.sort_order - y.sort_order)
      );
      // 批量 PATCH (best-effort, 不阻塞 swap)
      const patchPromises = renumbered.map((r) => {
        const orig = sameDay.find((o) => o.id === r.id);
        if (orig && orig.sort_order !== r.sort_order) {
          return supabase.from("posts").update({ sort_order: r.sort_order }).eq("id", r.id);
        }
        return Promise.resolve({ error: null });
      });
      const results = await Promise.all(patchPromises);
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        toast.error(`自動 renumber 部分失敗: ${failed.error.message}`);
      }
      // 後續 swap 改用新的 sort_order 繼續
      a = newTargetSort;
      b = newSwapSort;
    }

    // 樂觀更新 swap
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === target.id) return { ...p, sort_order: b };
        if (p.id === swapWith.id) return { ...p, sort_order: a };
        return p;
      }).sort((x, y) => x.sort_order - y.sort_order)
    );
    const results = await Promise.all([
      supabase.from("posts").update({ sort_order: b }).eq("id", target.id),
      supabase.from("posts").update({ sort_order: a }).eq("id", swapWith.id),
    ]);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(`移動失敗: ${failed.error.message}`);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === target.id) return { ...p, sort_order: a };
          if (p.id === swapWith.id) return { ...p, sort_order: b };
          return p;
        }).sort((x, y) => x.sort_order - y.sort_order)
      );
    }
  }, [posts]);

  const handleMoveUp = useCallback((id: string) => handleMove(id, "up"), [handleMove]);
  const handleMoveDown = useCallback((id: string) => handleMove(id, "down"), [handleMove]);

  // 🆕 2026-08-14 聖上拍板: 循環切換排版 (left-image → right-image → top-image → left-image)
  const handleChangeLayout = useCallback(async (id: string) => {
    const supabase = createClient();
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const cycle: Record<typeof target.layout_type, typeof target.layout_type> = {
      "left-image": "right-image",
      "right-image": "top-image",
      "top-image": "left-image",
    };
    const next = cycle[target.layout_type];
    // 樂觀更新
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, layout_type: next } : p))
    );
    const { error } = await supabase
      .from("posts")
      .update({ layout_type: next })
      .eq("id", id);
    if (error) {
      // 🆕 8-17: toast.error 取代 alert() — alert 阻塞 event loop (8-16 慘案)
      toast.error(`排版切換失敗: ${error.message} — 請重新操作`);
      // rollback
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, layout_type: target.layout_type } : p))
      );
    }
  }, [posts]);

  // 🆕 2026-08-16 聖上拍板: 循環切換相框風格 (vermilion → polaroid → ink → wash → vermilion)
  // - localStorage 為主 (個人偏好立即生效, 跨 page reload 保留)
  // - DB PATCH 是 best-effort (若 DB 還沒建 frame_style column, PATCH 失敗也不 rollback, 因 localStorage 才是 source of truth)
  // - 🆕 8-16 修法: cycle lookup 加 ?? 'vermilion' 保險
  // - 🆕 8-16 修法 v2: 連點時用 functional setPosts 讀最新 frame_style, 避免 closure stale
  //   (同 7-30 marquee select 教訓: closure 把舊值死鎖)
  // - 🆕 8-16 修法 v3: alert() 改 console.warn — alert 是 modal 阻塞整個 event loop, 嚴重破壞 UX
  const handleChangeFrame = useCallback(async (id: string) => {
    const cycle: Record<string, string> = {
      vermilion: "polaroid",
      polaroid: "ink",
      ink: "wash",
      wash: "vermilion",
    };
    let next: FrameStyle = "vermilion";
    // 樂觀更新 + 讀最新 state 用 functional form
    setPosts((prev) => {
      const target = prev.find((p) => p.id === id);
      const current = target?.frame_style ?? "vermilion";
      next = (cycle[current] ?? "vermilion") as FrameStyle;
      return prev.map((p) => (p.id === id ? { ...p, frame_style: next } : p));
    });
    // localStorage mirror (個人偏好立即生效, 跨 page reload 保留)
    if (typeof window !== "undefined") {
      try {
        const map = JSON.parse(localStorage.getItem("story-blog-frame-style") || "{}");
        map[id] = next;
        localStorage.setItem("story-blog-frame-style", JSON.stringify(map));
      } catch {
        /* localStorage 寫入失敗不阻擋主流程 */
      }
    }
    // DB PATCH (best-effort, 🆕 8-17 聖上拍板: 失敗時用 toast.error 取代 console.warn — 用戶看得到)
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("posts")
        .update({ frame_style: next })
        .eq("id", id);
      if (error) {
        // 🆕 8-17: toast.error (GlobalToastHost),不是 console.warn — 聖上看得到失敗可手動 retry
        toast.error(`相框切換失敗: ${error.message} — 請重新操作`);
      }
    } catch (e) {
      toast.error(`相框切換失敗: ${(e as Error).message ?? e} — 請重新操作`);
    }
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-jn-paper flex items-center justify-center">
        <div className="text-jn-ink/60 text-lg">載入中…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-jn-paper">
      {/* 🆕 2026-08-14 聖上拍板: 章節導覽列 (◀ 標題 ▶ + 下拉選單) sticky top-0 在 hero 上面
          (取代原本的 10 個 chip 列, 改用 ◀ ▶ + select 跳任一天) */}
      <nav
        className="sticky top-0 z-30 bg-jn-paper/95 backdrop-blur-sm border-b-2 border-jn-vermilion/20 py-3 px-4 shadow-sm"
        aria-label="章節導覽"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => {
              const prev = ALL_DAYS[ALL_DAYS.indexOf(activeDay) - 1];
              if (prev !== undefined) setActiveDay(prev);
            }}
            disabled={activeDay === ALL_DAYS[0]}
            className="text-sm bg-jn-paper hover:bg-jn-gold-light/30 border border-jn-ink/20 text-jn-ink px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
          >
            ◀ {(() => {
              const prev = ALL_DAYS[ALL_DAYS.indexOf(activeDay) - 1];
              if (prev === undefined) return "—";
              if (prev === 0) return "前言";
              if (prev === 9) return "後記";
              return `D${prev}`;
            })()}
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            {/* 下拉選單: 快速跳到任一天 */}
            <select
              value={activeDay}
              onChange={(e) => setActiveDay(Number(e.target.value))}
              className="text-sm bg-jn-gold-light border-2 border-jn-vermilion rounded px-2 py-1.5 font-bold text-jn-ink cursor-pointer hover:bg-jn-gold"
              aria-label="跳到指定章節"
            >
              <option value={0}>📜 前言</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                <option key={d} value={d}>D{d} · {dayDates[d] || `Day ${d}`}</option>
              ))}
              <option value={9}>🎁 後記</option>
            </select>
          </div>
          <button
            onClick={() => {
              const next = ALL_DAYS[ALL_DAYS.indexOf(activeDay) + 1];
              if (next !== undefined) setActiveDay(next);
            }}
            disabled={activeDay === ALL_DAYS.length - 1}
            className="text-sm bg-jn-paper hover:bg-jn-gold-light/30 border border-jn-ink/20 text-jn-ink px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
          >
            {(() => {
              const next = ALL_DAYS[ALL_DAYS.indexOf(activeDay) + 1];
              if (next === undefined) return "—";
              if (next === 0) return "前言";
              if (next === 9) return "後記";
              return `D${next}`;
            })()} ▶
          </button>
        </div>
      </nav>

      {/* Hero — 🆕 2026-08-14 聖上拍板: 3 秒無動作自動 fade + collapse */}
      <header
        className={`relative bg-gradient-to-br from-jn-vermilion via-jn-vermilion-deep to-jn-ink text-jn-paper overflow-hidden transition-all duration-700 ease-in-out ${
          heroHidden ? "max-h-0 opacity-0" : "max-h-[600px] opacity-100"
        }`}
        style={{ transitionProperty: "max-height, opacity" }}
      >
        <div className="max-w-4xl mx-auto text-center py-10 md:py-16 px-4">
          <p className="text-jn-gold-light text-sm tracking-widest mb-2">江南水鄉 · 八日遊記</p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight mb-4">
            {trip?.title || "2026 江南 8 天 7 夜遊記"}
          </h1>
          {trip?.description && (
            <p className="text-jn-paper/85 text-lg max-w-2xl mx-auto">{trip.description}</p>
          )}
          <div className="mt-6 flex justify-center gap-6 text-sm text-jn-paper/70">
            <span>📍 上海 → 西塘 → 烏鎮 → 杭州</span>
            <span>👥 13 位親友</span>
            <span>📝 {posts.length} 個故事</span>
          </div>
        </div>
      </header>

      {/* 🆕 2026-08-14 聖上拍板: 章節導覽列已移到 hero 上面 (sticky top-0), 不再重複渲染 */}

      {/* 當前 day 的 posts */}
      <CurrentDayContent
        activeDay={activeDay}
        dayDates={dayDates}
        posts={posts}
        handleDelete={handleDelete}
        handleMoveUp={handleMoveUp}
        handleMoveDown={handleMoveDown}
        handleRepolish={handleRepolish}
        handleChangeLayout={handleChangeLayout}  // 🆕 2026-08-14 聖上拍板
        handleChangeFrame={handleChangeFrame}    // 🆕 2026-08-16 聖上拍板
        onOpenModal={openModal}
      />

      {/* 浮動按鈕 (聖上寫新故事, 改回右下角 — 音樂 widget 移到左下避讓) */}
      <button
        onClick={() => openModal(activeDay)}
        className="fixed bottom-20 right-6 md:bottom-6 z-40 bg-jn-gold-light text-jn-ink font-bold px-5 py-3 rounded-full shadow-lg hover:bg-jn-gold transition-all hover:scale-105 border-2 border-jn-vermilion"
      >
        ✍️ 補充故事
      </button>

      {/* 🆕 2026-08-14 聖上拍板: 部落格背景音樂 (左下浮動, 不影響閱讀) */}
      <BackgroundMusicPlayer />

      {/* Modal */}
      <AddStoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tripId={TRIP_ID}
        existingPosts={posts}
        defaultDay={modalDay}
        onSubmitted={handleSubmitted}
        // 🆕 2026-08-15 聖上拍板 🅐: toast 接到全域 host,使用者才看得到「✨ 故事已送出」
        toast={(msg, kind) => {
          if (kind === "success") toast.success(msg);
          else if (kind === "error") toast.error(msg);
          else toast.info(msg);
        }}
      />

      {/* 🆕 8-10 聖上拍板: 重新潤飾 modal (article ⚙ 按鈕觸發) */}
      <RepolishModal
        open={repolishPost !== null}
        onClose={() => setRepolishPost(null)}
        post={repolishPost}
        onAdopted={handleAdoptedPolished}
        toast={(msg, kind) => { console.log(`[toast ${kind}] ${msg}`); }}
        // 🆕 8-11 聖上拍板 🅐: 同 day 其它 post (排除自己) 供 LLM 串場
        siblingPosts={
          repolishPost
            ? posts
                .filter((p) => p.day_number === repolishPost.day_number && p.id !== repolishPost.id)
                .map((p) => ({
                  author: p.author_name || "親友",
                  content: p.content,
                }))
            : []
        }
      />
    </main>
  );
}

function CurrentDayContent({
  activeDay,
  dayDates,
  posts,
  handleDelete,
  handleMoveUp,
  handleMoveDown,
  handleRepolish,
  handleChangeLayout,  // 🆕 2026-08-14 聖上拍板
  handleChangeFrame,   // 🆕 2026-08-16 聖上拍板
  onOpenModal,
}: {
  activeDay: number;
  dayDates: Record<number, string>;
  posts: PostRow[];
  handleDelete: (id: string) => void;
  handleMoveUp: (id: string) => void;
  handleMoveDown: (id: string) => void;
  handleRepolish: (id: string) => void;  // 🆕 8-10
  handleChangeLayout: (id: string) => void;  // 🆕 2026-08-14 聖上拍板
  handleChangeFrame: (id: string) => void;   // 🆕 2026-08-16 聖上拍板
  onOpenModal: (day: number) => void;
}) {
  const dayPosts = posts
    .filter((p) => p.day_number === activeDay)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex-1 h-px bg-gradient-to-r from-jn-vermilion/40 to-transparent" />
        <button
          onClick={() => onOpenModal(activeDay)}
          className="text-sm bg-jn-gold-light/20 hover:bg-jn-gold-light/40 text-jn-ink px-3 py-1.5 rounded transition-colors"
        >
          ✍️ 補這天
        </button>
      </div>
      {dayPosts.length === 0 ? (
        <div className="bg-jn-paper-warm/40 border-2 border-dashed border-jn-ink/15 rounded-lg p-8 text-center text-jn-ink/50">
          <p className="text-2xl mb-2">📷</p>
          <p>這天還沒有故事 — 點「✍️ 補這天」當第一個</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayPosts.map((post, idx) => (
            <TimelineStory
              key={post.id}
              post={post}
              isFirst={idx === 0 && activeDay === 0}
              onDelete={handleDelete}
              onMoveUp={idx > 0 ? handleMoveUp : undefined}
              onMoveDown={idx < dayPosts.length - 1 ? handleMoveDown : undefined}
              onPolish={handleRepolish}  // 🆕 8-10
              onChangeLayout={handleChangeLayout}  // 🆕 2026-08-14 聖上拍板
              onChangeFrame={handleChangeFrame}    // � 2026-08-16 聖上拍板
            />
          ))}
        </div>
      )}
    </div>
  );
}

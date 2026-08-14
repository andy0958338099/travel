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
import AddStoryModal from "@/components/story/AddStoryModal";
import RepolishModal from "@/components/story/RepolishModal";

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
  // 🆕 8-11 聖上拍板: 滾動過 hero 就隱藏章節 chip 列, 回頂再顯示
  const [heroInView, setHeroInView] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const r = heroRef.current?.getBoundingClientRect();
      if (!r) return;
      // hero 底部還在 viewport 60px 以下時, 算還可見 (60px = sticky nav 高度)
      setHeroInView(r.bottom > 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll(); // 初始檢查
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: tripData } = await supabase
        .from("trips").select("*").eq("id", TRIP_ID).maybeSingle();
      if (tripData) setTrip(tripData as TripRow);

      const { data: postData } = await supabase
        .from("posts").select("*").eq("trip_id", TRIP_ID)
        .order("sort_order", { ascending: true });
      setPosts((postData ?? []) as PostRow[]);
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
                setPosts((prev) => prev.map((p) =>
                  p.id === (payload.new as PostRow).id ? (payload.new as PostRow) : p
                ));
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

  // 計算每天有幾則
  const dayCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    posts.forEach((p) => { counts[p.day_number] = (counts[p.day_number] ?? 0) + 1; });
    return counts;
  }, [posts]);

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

  // 🆕 刪除 / 上下移動 callback
  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) { alert(`刪除失敗: ${error.message}`); return; }
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
    const a = target.sort_order;
    const b = swapWith.sort_order;
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
      alert(`移動失敗: ${failed.error.message}`);
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
      alert(`排版切換失敗: ${error.message}`);
      // rollback
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, layout_type: target.layout_type } : p))
      );
    }
  }, [posts]);

  if (loading) {
    return (
      <main className="min-h-screen bg-jn-paper flex items-center justify-center">
        <div className="text-jn-ink/60 text-lg">載入中…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-jn-paper">
      {/* Hero */}
      <header ref={heroRef} className="relative bg-gradient-to-br from-jn-vermilion via-jn-vermilion-deep to-jn-ink text-jn-paper py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-jn-gold-light text-sm tracking-widest mb-2">江南水鄉 · 八日遊記</p>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4">
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

      {/* 8 天章節索引 (點 chip 換 URL) — 🆕 8-11 聖上拍板: 過 hero 後隱藏 */}
      <nav
        className={`sticky top-0 z-30 bg-jn-paper/95 backdrop-blur-sm border-b-2 border-jn-vermilion/20 py-3 px-4 shadow-sm transition-transform duration-300 ease-in-out ${
          heroInView ? "translate-y-0" : "-translate-y-full"
        }`}
        aria-hidden={!heroInView}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap gap-2 justify-center">
          {[
            { d: 0, label: "前言" },
            ...Array.from({ length: 8 }, (_, i) => ({ d: i + 1, label: `D${i + 1}` })),
            { d: 9, label: "後記" },
          ].map(({ d, label }) => {
            const count = dayCounts[d] ?? 0;
            const isActive = d === activeDay;
            return (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`px-3 py-1.5 border rounded text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-jn-vermilion text-white border-jn-vermilion shadow-md"
                    : "bg-jn-paper-warm hover:bg-jn-vermilion/20 border-jn-vermilion/30 text-jn-ink"
                }`}
              >
                {label}
                {dayDates[d] && <span className={`ml-1 text-xs ${isActive ? "opacity-90" : "opacity-60"}`}>{dayDates[d]}</span>}
                {count > 0 && (
                  <span className={`ml-1.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-jn-paper text-jn-vermilion" : "bg-jn-vermilion text-white"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 🆕 當前章節導覽列 ◀ 標題 ▶ */}
      <div className="sticky top-[60px] z-20 bg-jn-paper-warm/95 backdrop-blur-sm border-b border-jn-ink/10 py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => {
              const prev = ALL_DAYS[ALL_DAYS.indexOf(activeDay) - 1];
              if (prev !== undefined) setActiveDay(prev);
            }}
            disabled={activeDay === ALL_DAYS[0]}
            className="text-sm bg-jn-paper hover:bg-jn-gold-light/30 border border-jn-ink/20 text-jn-ink px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ◀ {(() => {
              const prev = ALL_DAYS[ALL_DAYS.indexOf(activeDay) - 1];
              if (prev === undefined) return "—";
              if (prev === 0) return "前言";
              if (prev === 9) return "後記";
              return `D${prev}`;
            })()}
          </button>
          <div className="text-center flex-1">
            <h2 className="text-xl md:text-2xl font-bold text-jn-ink">
              {activeDay === 0 ? "📜 前言" : activeDay === 9 ? "🎁 後記" : `${dayDates[activeDay] || `Day ${activeDay}`}`}
            </h2>
            {activeDay > 0 && activeDay < 9 && (
              <p className="text-xs text-jn-ink/50">D{activeDay} · {dayDates[activeDay]}</p>
            )}
          </div>
          <button
            onClick={() => {
              const next = ALL_DAYS[ALL_DAYS.indexOf(activeDay) + 1];
              if (next !== undefined) setActiveDay(next);
            }}
            disabled={activeDay === ALL_DAYS[ALL_DAYS.length - 1]}
            className="text-sm bg-jn-paper hover:bg-jn-gold-light/30 border border-jn-ink/20 text-jn-ink px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
      </div>

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
        onOpenModal={openModal}
      />

      {/* 浮動按鈕 */}
      <button
        onClick={() => openModal(activeDay)}
        className="fixed bottom-6 right-6 z-40 bg-jn-vermilion text-white font-bold px-5 py-3 rounded-full shadow-2xl hover:bg-jn-vermilion-deep transition-all hover:scale-105"
        style={{ boxShadow: "0 10px 30px -5px rgba(220, 38, 38, 0.5)" }}
      >
        ✍️ 補充故事
      </button>

      {/* Modal */}
      <AddStoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tripId={TRIP_ID}
        existingPosts={posts}
        defaultDay={modalDay}
        toast={(msg, kind) => { console.log(`[toast ${kind}] ${msg}`); }}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

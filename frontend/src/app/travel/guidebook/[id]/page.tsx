"use client";

/**
 * /travel/guidebook/[id] — Single manga view
 *
 * Shows 4 panels stacked vertically + descriptions + like button.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface TravelManga {
  id: string;
  source_type: "attraction" | "food";
  source_id: string;
  source_name: string;
  character_name: string;
  panel_1_url: string | null;
  panel_1_title: string | null;
  panel_1_caption: string | null;
  panel_2_url: string | null;
  panel_2_title: string | null;
  panel_2_caption: string | null;
  panel_3_url: string | null;
  panel_3_title: string | null;
  panel_3_caption: string | null;
  panel_4_url: string | null;
  panel_4_title: string | null;
  panel_4_caption: string | null;
  short_desc: string | null;
  medium_desc: string | null;
  long_desc: string | null;
  status: string;
  like_count: number;
  view_count: number;
}

export default function SingleMangaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [manga, setManga] = useState<TravelManga | null>(null);
  const [loading, setLoading] = useState(true);
  const [descTab, setDescTab] = useState<"short" | "medium" | "long">("medium");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [regenerating, setRegenerating] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("travel_mangas")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setManga(data);
        setLikeCount(data?.like_count || 0);
        setLoading(false);
        if (data) {
          // increment view
          supabase.rpc("increment_view_count" as any, { manga_id: id }).then(() => {});
        }
      });

    // check liked
    const fp = localStorage.getItem("manga-fingerprint");
    if (fp) {
      supabase
        .from("manga_likes")
        .select("id")
        .eq("manga_id", id)
        .eq("user_fingerprint", fp)
        .maybeSingle()
        .then(({ data }) => setLiked(!!data));
    }
  }, [id]);

  const handleLike = async () => {
    if (!manga) return;
    const fp = localStorage.getItem("manga-fingerprint");
    if (!fp) return;

    const res = await fetch("/api/manga/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mangaId: manga.id,
        fingerprint: fp,
        action: liked ? "unlike" : "like",
      }),
    });
    const data = await res.json();
    setLiked(data.liked);
    setLikeCount(data.likeCount);
  };

  const handleRegenerate = async (panel: number) => {
    if (!manga) return;
    setRegenerating(panel);
    try {
      const res = await fetch("/api/manga/regenerate-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mangaId: manga.id, panel }),
      });
      const data = await res.json();
      if (data.manga) {
        setManga(data.manga);
      } else {
        alert(`重生失敗: ${data.error}`);
      }
    } catch (e: any) {
      alert(`重生失敗: ${e.message}`);
    }
    setRegenerating(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 to-white">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-700 font-bold">找不到這個漫畫</p>
          <Link
            href="/travel/guidebook"
            className="mt-4 inline-block text-rose-600 hover:text-rose-700 font-bold"
          >
            ← 回圖鑑首頁
          </Link>
        </div>
      </div>
    );
  }

  const panels = [
    { idx: 1, url: manga.panel_1_url, title: manga.panel_1_title, caption: manga.panel_1_caption },
    { idx: 2, url: manga.panel_2_url, title: manga.panel_2_title, caption: manga.panel_2_caption },
    { idx: 3, url: manga.panel_3_url, title: manga.panel_3_title, caption: manga.panel_3_caption },
    { idx: 4, url: manga.panel_4_url, title: manga.panel_4_title, caption: manga.panel_4_caption },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50">
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/travel/guidebook"
            className="text-rose-600 hover:text-rose-700 font-bold text-sm"
          >
            ← 圖鑑
          </Link>
          <div className="text-xs text-gray-500">
            {manga.source_type === "attraction" ? "📍 景點" : "🍜 美食"} · {manga.view_count} 次瀏覽
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">
          {manga.source_name}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          🎭 導遊：{manga.character_name} · 狀態：{manga.status}
        </p>

        {/* 4 Panels */}
        <div className="space-y-4 mb-8">
          {panels.map((p) => (
            <div
              key={p.idx}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
            >
              {p.url ? (
                <img
                  src={p.url}
                  alt={p.title || `Panel ${p.idx}`}
                  className="w-full aspect-[4/5] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/5] bg-gradient-to-br from-rose-100 to-amber-100 flex items-center justify-center text-6xl">
                  {regenerating === p.idx ? "⏳" : "🎨"}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {p.idx}. {p.title}
                  </h3>
                  <button
                    onClick={() => handleRegenerate(p.idx)}
                    disabled={regenerating !== null}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold disabled:opacity-50"
                  >
                    {regenerating === p.idx ? "⏳ 生成中..." : "🔄 重生"}
                  </button>
                </div>
                {p.caption && (
                  <p className="text-sm text-gray-700 leading-relaxed">{p.caption}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Descriptions */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-3">📖 介紹文</h2>
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-full p-1 w-fit">
            {(["short", "medium", "long"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDescTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  descTab === t ? "bg-white text-rose-600 shadow" : "text-gray-600"
                }`}
              >
                {t === "short" ? "100 字" : t === "medium" ? "300 字" : "800 字"}
              </button>
            ))}
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-line">
            {descTab === "short" && (manga.short_desc || "(尚未生成)")}
            {descTab === "medium" && (manga.medium_desc || "(尚未生成)")}
            {descTab === "long" && (manga.long_desc || "(尚未生成)")}
          </div>
        </div>

        {/* Like */}
        <div className="bg-white rounded-2xl shadow-md p-6 text-center">
          <button
            onClick={handleLike}
            className={`text-4xl transition-transform hover:scale-110 ${
              liked ? "" : "grayscale opacity-60"
            }`}
            aria-label="按讚"
          >
            {liked ? "❤️" : "🤍"}
          </button>
          <p className="text-sm text-gray-500 mt-2">{likeCount} 個讚</p>
        </div>
      </div>
    </div>
  );
}

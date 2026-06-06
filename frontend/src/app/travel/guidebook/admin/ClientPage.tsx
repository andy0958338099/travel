"use client";

/**
 * /travel/guidebook/admin — Batch generation control panel.
 *
 * 82 sources = 56 attractions + 26 restaurants.
 * Each gets 4 panels × ~25s = ~100s per source.
 * Full batch: ~2.3 hours sequential, ~1.1h with 2 concurrent.
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ATTRACTIONS, Attraction } from "../../data";
import { getRestaurants } from "../../dining/data";

interface MangaStatus {
  sourceType: "attraction" | "food";
  sourceId: string;
  status: "ready" | "partial" | "generating" | "failed" | "missing";
  mangaId?: string;
  likeCount?: number;
  panelCount?: number;
}

export default function AdminPage() {
  const [statuses, setStatuses] = useState<MangaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: "" });

  const allAttractions = useMemo(
    () => [...ATTRACTIONS.westLake, ...ATTRACTIONS.wuzhen, ...ATTRACTIONS.other],
    []
  );
  const restaurants = useMemo(() => getRestaurants(), []);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("travel_mangas")
      .select("id, source_type, source_id, status, like_count, panel_1_url, panel_2_url, panel_3_url, panel_4_url");

    const mangaMap = new Map<string, any>();
    for (const m of data || []) {
      mangaMap.set(`${m.source_type}:${m.source_id}`, m);
    }

    const result: MangaStatus[] = [];

    for (const a of allAttractions) {
      const m = mangaMap.get(`attraction:${a.name}`);
      result.push({
        sourceType: "attraction",
        sourceId: a.name,
        status: m?.status || "missing",
        mangaId: m?.id,
        likeCount: m?.like_count,
        panelCount: [m?.panel_1_url, m?.panel_2_url, m?.panel_3_url, m?.panel_4_url].filter(Boolean).length,
      });
    }

    for (const r of restaurants) {
      const m = mangaMap.get(`food:${r.id}`);
      result.push({
        sourceType: "food",
        sourceId: r.id,
        status: m?.status || "missing",
        mangaId: m?.id,
        likeCount: m?.like_count,
        panelCount: [m?.panel_1_url, m?.panel_2_url, m?.panel_3_url, m?.panel_4_url].filter(Boolean).length,
      });
    }

    setStatuses(result);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const triggerOne = async (s: MangaStatus) => {
    const source = s.sourceType === "attraction"
      ? allAttractions.find((a) => a.name === s.sourceId)
      : restaurants.find((r) => r.id === s.sourceId);
    if (!source) return;

    await fetch("/api/manga/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType: s.sourceType,
        sourceId: s.sourceId,
        sourceName: s.sourceType === "attraction" ? (source as Attraction).name : (source as any).name,
        region: s.sourceType === "attraction" ? (source as Attraction).category : undefined,
      }),
    });
    await load();
  };

  const triggerBatch = async (sources: MangaStatus[]) => {
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: sources.length, current: "" });

    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      const source = s.sourceType === "attraction"
        ? allAttractions.find((a) => a.name === s.sourceId)
        : restaurants.find((r) => r.id === s.sourceId);
      if (!source) continue;

      setBatchProgress({ done: i, total: sources.length, current: s.sourceId });

      await fetch("/api/manga/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: s.sourceType,
          sourceId: s.sourceId,
          sourceName: s.sourceType === "attraction" ? (source as Attraction).name : (source as any).name,
          region: s.sourceType === "attraction" ? (source as Attraction).category : undefined,
        }),
      }).catch(() => {});
    }

    setBatchProgress({ done: sources.length, total: sources.length, current: "" });
    setBatchRunning(false);
    await load();
  };

  const missing = statuses.filter((s) => s.status === "missing");
  const failed = statuses.filter((s) => s.status === "failed" || s.status === "partial");

  const counts = {
    ready: statuses.filter((s) => s.status === "ready").length,
    partial: statuses.filter((s) => s.status === "partial").length,
    generating: statuses.filter((s) => s.status === "generating").length,
    failed: statuses.filter((s) => s.status === "failed").length,
    missing: missing.length,
    total: statuses.length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            ⚙️ 漫畫圖鑑管理
          </h1>
          <Link
            href="/travel/guidebook"
            className="text-sm text-rose-600 hover:text-rose-700 font-bold"
          >
            ← 回圖鑑
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { l: "已完成", v: counts.ready, c: "bg-green-50 text-green-700 border-green-200" },
            { l: "部分", v: counts.partial, c: "bg-amber-50 text-amber-700 border-amber-200" },
            { l: "生成中", v: counts.generating, c: "bg-blue-50 text-blue-700 border-blue-200" },
            { l: "失敗", v: counts.failed, c: "bg-red-50 text-red-700 border-red-200" },
            { l: "未生成", v: counts.missing, c: "bg-gray-50 text-gray-700 border-gray-200" },
          ].map((s) => (
            <div key={s.l} className={`p-3 rounded-xl border ${s.c}`}>
              <p className="text-xs font-bold opacity-80">{s.l}</p>
              <p className="text-2xl font-black">{s.v}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => load()}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-bold disabled:opacity-50"
          >
            🔄 重新整理
          </button>
          <button
            onClick={() => triggerBatch(missing)}
            disabled={batchRunning || missing.length === 0}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-sm font-bold disabled:opacity-50"
          >
            🚀 批次生成未完成的 {missing.length} 個
          </button>
          {failed.length > 0 && (
            <button
              onClick={() => triggerBatch(failed)}
              disabled={batchRunning}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-bold disabled:opacity-50"
            >
              🔁 重試失敗 {failed.length} 個
            </button>
          )}
        </div>

        {/* Progress */}
        {batchRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-sm font-bold text-blue-900 mb-2">
              批次生成中... {batchProgress.done} / {batchProgress.total}
            </p>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
              />
            </div>
            {batchProgress.current && (
              <p className="text-xs text-blue-700 mt-2">目前：{batchProgress.current}</p>
            )}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <p className="text-center py-10 text-gray-500">載入中...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-3 py-3 text-left">類型</th>
                  <th className="px-3 py-3 text-left">名稱</th>
                  <th className="px-3 py-3 text-left">狀態</th>
                  <th className="px-3 py-3 text-left">面板</th>
                  <th className="px-3 py-3 text-left">按讚</th>
                  <th className="px-3 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((s) => (
                  <tr key={`${s.sourceType}:${s.sourceId}`} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{s.sourceType === "attraction" ? "📍" : "🍜"}</td>
                    <td className="px-3 py-2 font-medium">
                      {s.sourceType === "attraction"
                        ? allAttractions.find((a) => a.name === s.sourceId)?.name
                        : restaurants.find((r) => r.id === s.sourceId)?.name}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          s.status === "ready"
                            ? "bg-green-100 text-green-700"
                            : s.status === "partial"
                            ? "bg-amber-100 text-amber-700"
                            : s.status === "generating"
                            ? "bg-blue-100 text-blue-700"
                            : s.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{s.panelCount ?? 0}/4</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{s.likeCount ?? 0}</td>
                    <td className="px-3 py-2 text-right">
                      {s.mangaId && (
                        <Link
                          href={`/travel/guidebook/${s.mangaId}`}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold mr-3"
                        >
                          查看
                        </Link>
                      )}
                      <button
                        onClick={() => triggerOne(s)}
                        disabled={batchRunning}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold disabled:opacity-50"
                      >
                        {s.status === "missing" ? "生成" : "重生"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

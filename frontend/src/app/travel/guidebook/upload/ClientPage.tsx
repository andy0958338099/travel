"use client";

/**
 * /travel/guidebook/upload — User photo → AI manga
 *
 * Workflow:
 *   1. 拖曳/選照片 (JPG/PNG/WEBP/HEIC, max 20MB each, up to 20 photos)
 *   2. 對應景點/美食（從下拉選）
 *   3. 點「生成」→ 觸發 /api/manga/generate
 *   4. 等 100s 看結果
 *
 * Note: 大量作品建議用 /travel/guidebook/admin 批次生成
 */

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ATTRACTIONS, Attraction } from "../../data";
import { getRestaurants } from "../../dining/data";

const MAX_FILES = 20;
const MAX_SIZE_MB = 20;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

interface QueuedItem {
  id: string;
  file: File;
  previewUrl: string;
  sourceType: "attraction" | "food";
  sourceId: string;
  status: "queued" | "generating" | "ready" | "failed";
  mangaId?: string;
  error?: string;
}

export default function UploadPage() {
  const [items, setItems] = useState<QueuedItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allAttractions = useMemo(
    () => [...ATTRACTIONS.westLake, ...ATTRACTIONS.wuzhen, ...ATTRACTIONS.other],
    []
  );
  const restaurants = useMemo(() => getRestaurants(), []);

  // 清理 object URL
  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
  }, [items]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: QueuedItem[] = [];
    for (let i = 0; i < files.length && items.length + newItems.length < MAX_FILES; i++) {
      const f = files[i];
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`${f.name} 超過 ${MAX_SIZE_MB}MB`);
        continue;
      }
      newItems.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        sourceType: "attraction",
        sourceId: allAttractions[0]?.name || "",
        status: "queued",
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  };

  const updateItem = (id: string, patch: Partial<QueuedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const generateOne = async (item: QueuedItem) => {
    updateItem(item.id, { status: "generating" });
    const source = item.sourceType === "attraction"
      ? allAttractions.find((a) => a.name === item.sourceId)
      : restaurants.find((r) => r.id === item.sourceId);
    if (!source) {
      updateItem(item.id, { status: "failed", error: "找不到對應 source" });
      return;
    }

    try {
      const res = await fetch("/api/manga/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          sourceName: item.sourceType === "attraction" ? (source as Attraction).name : (source as any).name,
          region: item.sourceType === "attraction" ? (source as Attraction).category : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        updateItem(item.id, { status: "failed", error: data.error });
      } else {
        updateItem(item.id, { status: "ready", mangaId: data.manga?.id });
      }
    } catch (e: any) {
      updateItem(item.id, { status: "failed", error: e.message });
    }
  };

  const generateAll = async () => {
    const queued = items.filter((i) => i.status === "queued");
    for (const item of queued) {
      await generateOne(item);
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            📤 上傳照片 → Q版漫畫
          </h1>
          <Link
            href="/travel/guidebook"
            className="text-sm text-rose-600 hover:text-rose-700 font-bold"
          >
            ← 回圖鑑
          </Link>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors mb-6 ${
            dragging
              ? "border-rose-500 bg-rose-50"
              : "border-gray-300 bg-white hover:border-rose-400"
          }`}
        >
          <p className="text-5xl mb-3">📷</p>
          <p className="text-base sm:text-lg font-bold text-slate-700 mb-1">
            拖曳照片到這裡，或點擊選擇
          </p>
          <p className="text-xs text-gray-500">
            支援 JPG / PNG / WEBP / HEIC · 單張 ≤ {MAX_SIZE_MB}MB · 最多 {MAX_FILES} 張
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Queue */}
        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-700">
                待處理佇列：{items.length} 張
              </p>
              <button
                onClick={generateAll}
                disabled={items.every((i) => i.status !== "queued")}
                className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50"
              >
                🎨 全部生成
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row gap-3"
                >
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded-xl bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <select
                        value={item.sourceType}
                        onChange={(e) =>
                          updateItem(item.id, {
                            sourceType: e.target.value as any,
                            sourceId:
                              e.target.value === "attraction"
                                ? allAttractions[0]?.name
                                : restaurants[0]?.id,
                          })
                        }
                        className="text-xs border rounded-lg px-2 py-1"
                      >
                        <option value="attraction">景點</option>
                        <option value="food">美食</option>
                      </select>
                      <select
                        value={item.sourceId}
                        onChange={(e) => updateItem(item.id, { sourceId: e.target.value })}
                        className="text-xs border rounded-lg px-2 py-1 flex-1 min-w-0"
                      >
                        {(item.sourceType === "attraction" ? allAttractions : restaurants).map(
                          (s: any) => (
                            <option key={s.id || s.name} value={s.id || s.name}>
                              {s.name}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-400">
                      {(item.file.size / 1024).toFixed(0)} KB
                    </p>
                    {item.status === "failed" && (
                      <p className="text-xs text-red-600 mt-1">❌ {item.error}</p>
                    )}
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:items-end justify-between">
                    {item.status === "queued" && (
                      <button
                        onClick={() => generateOne(item)}
                        className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-full font-bold"
                      >
                        生成
                      </button>
                    )}
                    {item.status === "generating" && (
                      <span className="text-xs text-blue-600 font-bold">⏳ 生成中...</span>
                    )}
                    {item.status === "ready" && (
                      <Link
                        href={`/travel/guidebook/${item.mangaId}`}
                        className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-full font-bold"
                      >
                        查看
                      </Link>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

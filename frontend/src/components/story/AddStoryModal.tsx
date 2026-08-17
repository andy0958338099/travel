"use client";

/**
 * 🆕 2026-08-10 聖上拍板: 上傳 + 插隊 + LLM 靈感彈窗
 *
 * 觸發: 主頁右下角浮動按鈕「✍️ 補充故事」或「📷 補照片」
 *
 * 流程:
 *   1. 聖上輸入名字 (lightweight identity, localStorage 記憶)
 *   2. 選擇「第幾天」(0 前言 / 1-8 / 9 後記)
 *   3. 選擇「插隊位置」(插到最前/中間/最後/追加)
 *   4. 選擇「排版樣式」(left-image / right-image / top-image)
 *   5. 輸入小標題 (可選)
 *   6. 輸入文字 (textarea, 必填至少 10 字)
 *   7. (可選) 上傳照片 或 貼照片 URL
 *   8. (可選) 按「💡 靈感」叫出 3 條 prompt, 點擊自動填進 textarea
 *   9. 按「✨ 送出」→ 上傳照片 (若有) + insert posts row
 *
 * 設計重點:
 *   - backdrop onClick close + inner onClick stopPropagation (modal trap 防呆)
 *   - 不鎖 ESC, ESC 也能關
 *   - 樂觀更新: insert 完直接關 modal, realtime 收到再 refresh
 */
import { useState, useEffect, useRef } from "react";
import { computeInsertOrder, buildStoryInspirations } from "@/lib/ai/storyPrompts";
import type { StoryInspiration } from "@/lib/ai/storyPrompts";

interface AddStoryModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  existingPosts: { sort_order: number }[];
  defaultDay?: number;
  /** realtime 收到時由 parent 決定 (例如 reload) */
  onSubmitted?: () => void;
  /** toast helper (沿用 GlobalToastHost 模式) */
  toast?: (msg: string, kind: "success" | "error" | "info") => void;
}

export default function AddStoryModal({
  open,
  onClose,
  tripId,
  existingPosts,
  defaultDay = 1,
  onSubmitted,
  toast,
}: AddStoryModalProps) {
  // ── 表單 state ──
  const [authorName, setAuthorName] = useState("");
  const [dayNumber, setDayNumber] = useState(defaultDay);
  const [position, setPosition] = useState<"first" | "middle" | "last" | "append" | "smart">("last"); // 🆕 8-17 聖上拍板 🅑: 預設改 last (max+1000), 故事自然接續
  const [layoutType, setLayoutType] = useState<"left-image" | "right-image" | "top-image">("right-image");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  // 🅒 8-10 聖上拍板: 潤飾功能 (LLM)
  const [polishedContent, setPolishedContent] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [polishSeed, setPolishSeed] = useState(0); // 重試按鈕: 改 seed 強制 LLM 重新生成
  const [polishWarning, setPolishWarning] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fetchingGoogle, setFetchingGoogle] = useState(false); // Google 相簿下載中
  const [googleUrl, setGoogleUrl] = useState("");     // Google 相簿 URL 輸入
  const [googleError, setGoogleError] = useState(""); // 錯誤訊息
  const [submitting, setSubmitting] = useState(false);
  const [inspirations, setInspirations] = useState<StoryInspiration[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // localStorage 記憶名字
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("story-blog-author-name");
    if (saved) setAuthorName(saved);
  }, []);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 🅒 8-10 聖上拍板: open=true 重置「content/position/day/title」,但**不重置 authorName** —
  //   任何人用過一次, 之後自動帶入同樣名字 (localStorage 已讀進 state, 持續保留)
  useEffect(() => {
    if (open) {
      setDayNumber(defaultDay);
      setPosition("last"); // 🆕 8-17 聖上拍板 🅑: 預設 last, 故事延續接在最尾段
      setTitle("");
      setContent("");
      setImageUrl("");
      setInspirations(null);
      setPolishedContent("");   // 潤飾結果也重置
      setPolishSeed(0);          // 重置 seed (讓下次按重試從 1 開始)
      setPolishWarning("");
      setGoogleUrl("");          // Google URL input 重置
      setGoogleError("");
    }
  }, [open, defaultDay]);

  if (!open) return null;

  // ── 處理照片上傳 (直接走 Supabase Storage) ──
  async function handleFileUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast?.("只能上傳圖片", "error");
      return;
    }
    setUploading(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `story-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("travel-photos")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("travel-photos").getPublicUrl(path);
      setImageUrl(pub.publicUrl);
      toast?.("照片上傳成功", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "上傳失敗";
      toast?.(`上傳失敗: ${msg}`, "error");
    } finally {
      setUploading(false);
    }
  }

  // ── 處理靈感按鈕 ──
  // 🆕 8-10 聖上拍板: 3 條靈感真的根據「小標題」發想
  function handleInspiration() {
    const insp = buildStoryInspirations({
      title: title.trim(),  // 之前 bug: title 完全沒用, 永遠傳空字串
      dayNumber,
      layoutType,
    });
    setInspirations(insp);
  }

  function applyInspiration(prompt: string) {
    // 若 content 已空, 直接填; 否則 append
    setContent(prev => prev.trim() ? `${prev}\n\n${prompt}\n` : prompt);
    setInspirations(null);
  }

  // 🆕 8-10 聖上拍板: Google 公開相簿 URL → 自動下載到 Supabase Storage
  async function handleGoogleFetch() {
    if (!googleUrl.trim()) {
      setGoogleError("請貼 Google 相簿連結");
      return;
    }
    setFetchingGoogle(true);
    setGoogleError("");
    try {
      const res = await fetch("/api/story-blog/fetch-google-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googleUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      // 成功: 自動填進 imageUrl
      setImageUrl(data.publicUrl);
      setGoogleUrl(""); // 清空 input
      toast?.("✅ Google 相簿照片已下載到資料庫", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "下載失敗";
      setGoogleError(msg);
    } finally {
      setFetchingGoogle(false);
    }
  }

  // 🆕 8-10 聖上拍板: LLM 潤飾內容
  async function handlePolish() {
    if (content.trim().length < 5) {
      toast?.("先寫 5 個字以上才能潤飾", "error");
      return;
    }
    setPolishing(true);
    setPolishWarning("");
    try {
      // 重試按鈕: 改 seed 強制 LLM 重新生成
      const newSeed = polishSeed + 1;
      setPolishSeed(newSeed);

      const res = await fetch("/api/story-blog/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: content,
          title: title.trim() || undefined,
          dayNumber,
          seed: newSeed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setPolishedContent(data.polishedText);
      if (data.fallback && data.warning) {
        setPolishWarning(data.warning);
        toast?.(`⚠️ ${data.warning}`, "info");
      } else {
        toast?.("✨ 潤飾完成 — 可編輯或「📋 採納這版」", "success");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "潤飾失敗";
      toast?.(`潤飾失敗: ${msg}`, "error");
    } finally {
      setPolishing(false);
    }
  }

  // 🆕 8-10 聖上拍板: 採納潤飾版 → 覆蓋回 content
  function adoptPolished() {
    if (!polishedContent.trim()) return;
    setContent(polishedContent);
    setPolishedContent(""); // 清掉潤飾版 (已採納)
    toast?.("📋 已採納潤飾版到你的內容", "success");
  }

  // ── 送出 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim()) {
      toast?.("請輸入你的名字", "error");
      return;
    }
    if (!title.trim()) {
      toast?.("小標題是必填的 — 當文章的標題用", "error");
      return;
    }
    if (content.trim().length < 10) {
      toast?.("內容至少 10 個字", "error");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      localStorage.setItem("story-blog-author-name", authorName.trim());
      const { sortOrder, needsRebalance } = computeInsertOrder(existingPosts, position);
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("posts").insert({
        trip_id: tripId,
        day_number: dayNumber,
        sort_order: sortOrder,
        title: title.trim() || null,
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        layout_type: layoutType,
        author_name: authorName.trim() || "匿名",
      });
      if (error) throw error;
      if (needsRebalance) {
        // 重排 sort_order
        await supabase.rpc("rebalance_post_sort_order", { p_trip_id: tripId });
      }
      toast?.("✨ 故事已送出", "success");
      onSubmitted?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "送出失敗";
      toast?.(`送出失敗: ${msg}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-jn-paper w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.4)" }}
      >
        {/* 標題列 + 關閉 */}
        <div className="sticky top-0 bg-jn-paper border-b-2 border-jn-vermilion/30 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-jn-ink">✍️ 補充新故事</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-jn-ink/60 hover:text-jn-vermilion text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 名字 */}
          <div>
            <label className="block text-sm font-bold text-jn-ink mb-1">
              👤 你的名字 <span className="text-jn-vermilion">*</span>
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="例: Brian / 阿美 / 恩齊"
              className="w-full px-3 py-2 border border-jn-ink/20 rounded focus:outline-none focus:border-jn-vermilion"
              required
            />
          </div>

          {/* 天數 + 插隊位置 + 排版 (3 個 select 同行) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-bold text-jn-ink mb-1">📅 第幾天</label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full px-3 py-2 border border-jn-ink/20 rounded bg-white"
              >
                <option value={0}>📜 前言</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                  <option key={d} value={d}>第 {d} 天</option>
                ))}
                <option value={9}>🎁 後記</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-jn-ink mb-1">📍 插隊位置</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as typeof position)}
                className="w-full px-3 py-2 border border-jn-ink/20 rounded bg-white"
              >
                <option value="smart">🎯 智慧自動（0/1 筆末段, ≥2 筆擠中間）</option>
                <option value="first">⏮ 插到最前</option>
                <option value="middle">🔀 插到中間</option>
                <option value="last">⏭ 插到最後</option>
                <option value="append">➕ 追加到尾</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-jn-ink mb-1">🎨 排版</label>
              <select
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value as typeof layoutType)}
                className="w-full px-3 py-2 border border-jn-ink/20 rounded bg-white"
              >
                <option value="left-image">圖左 文右</option>
                <option value="right-image">圖右 文左</option>
                <option value="top-image">圖上 文下</option>
              </select>
            </div>
          </div>

          {/* 標題 — 🅒 8-10 聖上拍板改為必填 (當小標題用) */}
          <div>
            <label className="block text-sm font-bold text-jn-ink mb-1">
              🏷️ 小標題 <span className="text-jn-vermilion">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                // 🆕 2026-08-14 聖上拍板: 小標題打字時若內容是空, 自動用 title 當 content 預設值
                //   聖上不喜歡可自己覆寫或按「✨ 潤飾」讓 LLM 改
                if (content === "") {
                  setContent(newTitle);
                }
              }}
              placeholder="例: 凌晨桃園的報到櫃台"
              className="w-full px-3 py-2 border border-jn-ink/20 rounded focus:outline-none focus:border-jn-vermilion"
              required
              minLength={2}
            />
          </div>

          {/* 內容 — 聖上原文 + 潤飾並陳 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-jn-ink">
                📝 你的內容 <span className="text-jn-vermilion">*</span>
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleInspiration}
                  className="text-xs bg-jn-gold-light/20 hover:bg-jn-gold-light/40 text-jn-ink px-2 py-1 rounded transition-colors"
                >
                  💡 寫作靈感
                </button>
                <button
                  type="button"
                  onClick={handlePolish}
                  disabled={polishing || content.trim().length < 5}
                  className="text-xs bg-jn-vermilion/10 hover:bg-jn-vermilion/20 text-jn-vermilion-deep px-2 py-1 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={content.trim().length < 5 ? "先寫 5 個字以上" : "用 LLM 潤飾一版"}
                >
                  {polishing ? "⏳ 潤飾中…" : "✨ 潤飾內容"}
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="把那天的畫面寫下來…"
              className="w-full px-3 py-2 border border-jn-ink/20 rounded focus:outline-none focus:border-jn-vermilion font-serif"
              required
              minLength={10}
            />
            {/* 靈感 prompt 列表 */}
            {inspirations && (
              <div className="mt-2 space-y-1">
                {inspirations.map((insp) => (
                  <button
                    key={insp.label}
                    type="button"
                    onClick={() => applyInspiration(insp.prompt)}
                    className="block w-full text-left text-sm bg-jn-paper-warm hover:bg-jn-gold-light/30 px-3 py-2 rounded border-l-4 border-jn-gold transition-colors"
                  >
                    <span className="font-bold text-jn-vermilion">{insp.label}:</span>{" "}
                    <span className="text-jn-ink/80">{insp.prompt}</span>
                  </button>
                ))}
              </div>
            )}
            {/* 潤飾結果 — 出現在原文下方, 可編輯, 採納按鈕覆蓋回 content */}
            {polishedContent && (
              <div className="mt-3 p-3 bg-jn-paper-warm border-l-4 border-jn-vermilion rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-jn-vermilion-deep">
                    ✨ 潤飾版本 (可再編輯)
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handlePolish}
                      disabled={polishing}
                      className="text-xs text-jn-ink/70 hover:text-jn-vermilion px-2 py-1 rounded transition-colors disabled:opacity-40"
                      title="換一個版本"
                    >
                      🔄 換一版
                    </button>
                    <button
                      type="button"
                      onClick={adoptPolished}
                      className="text-xs bg-jn-vermilion text-white px-2 py-1 rounded hover:bg-jn-vermilion-deep transition-colors"
                      title="用這版替換原文"
                    >
                      📋 採納這版
                    </button>
                  </div>
                </div>
                <textarea
                  value={polishedContent}
                  onChange={(e) => setPolishedContent(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-jn-vermilion/30 rounded focus:outline-none focus:border-jn-vermilion font-serif bg-white text-sm"
                />
                {polishWarning && (
                  <p className="text-xs text-amber-700 mt-1">⚠️ {polishWarning}</p>
                )}
              </div>
            )}
          </div>

          {/* 照片: 3 種方式 — 本機上傳 / Google 公開相簿 short URL / 直接貼 URL */}
          <div>
            <label className="block text-sm font-bold text-jn-ink mb-1">📷 照片 (選填)</label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="貼照片 URL (https://...)"
                className="flex-1 px-3 py-2 border border-jn-ink/20 rounded text-sm focus:outline-none focus:border-jn-vermilion"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-2 bg-jn-ink text-jn-paper text-sm rounded hover:bg-jn-ink/80 disabled:opacity-50"
              >
                {uploading ? "上傳中…" : "📤 上傳"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                  e.target.value = ""; // 允許重複選同一檔
                }}
              />
            </div>
            {/* Google 相簿 short URL (photos.app.goo.gl/xxx) — 自動下載到 Supabase */}
            <div className="flex gap-2">
              <input
                type="url"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="或貼 Google 公開相簿連結 (photos.app.goo.gl/... 或 lh3.googleusercontent.com/...)"
                className="flex-1 px-3 py-2 border border-jn-gold-light/40 rounded text-sm focus:outline-none focus:border-jn-gold bg-jn-paper-warm"
              />
              <button
                type="button"
                onClick={handleGoogleFetch}
                disabled={fetchingGoogle || !googleUrl.trim()}
                className="px-3 py-2 bg-jn-gold text-jn-ink text-sm font-bold rounded hover:bg-jn-gold-light disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                title="從 Google 相簿自動下載到我們的資料庫"
              >
                {fetchingGoogle ? "下載中…" : "🌐 Google 下載"}
              </button>
            </div>
            {googleError && (
              <p className="text-xs text-red-700 mt-1">❌ {googleError}</p>
            )}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="預覽" className="max-h-32 rounded border border-jn-ink/10 mt-2" />
            )}
          </div>

          {/* 送出 */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-jn-vermilion text-white font-bold py-3 rounded hover:bg-jn-vermilion-deep transition-colors disabled:opacity-50"
            >
              {submitting ? "送出中…" : "✨ 送出故事"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-jn-ink/20 text-jn-ink rounded hover:bg-jn-ink/5"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

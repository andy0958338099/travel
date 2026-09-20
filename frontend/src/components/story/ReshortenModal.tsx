"use client";

/**
 * 🆕 2026-09-20 聖上拍板: 把已發布的 article 精簡至 ≤150 字
 *
 * 觸發: TimelineStory 右上角 ✂️ 精簡按鈕
 *
 * 流程:
 *   1. 開 modal → 顯示原文 (content)
 *   2. 自動 call /api/story-blog/shorten 拿 LLM 精簡版
 *   3. 顯示 原文 + 精簡版 兩版並陳 (可編輯精簡版)
 *   4. 聖上按「📋 採納這版」→ PATCH 寫回 DB (樂觀更新)
 *   5. 聖上按「🔄 換一版」→ 改 seed 重新叫 LLM
 *   6. 聖上按「取消」→ 不動 DB
 *
 * 跟 RepolishModal 差異:
 *   - RepolishModal 是「潤飾 + 擴寫」(讓文章變豐富)
 *   - ReshortenModal 是「精簡 + 保留意思」(讓文章變短)
 *   - 兩者共用同一份 DB posts.content, 不能同時採納兩版
 */
import { useState, useEffect } from "react";

interface ReshortenModalProps {
  open: boolean;
  onClose: () => void;
  post: {
    id: string;
    title: string | null;
    content: string;
    day_number: number;
  } | null;
  /** 採納後 PATCH 寫回 DB + 樂觀更新 posts state */
  onAdopted?: (id: string, newContent: string) => void;
  /** toast helper */
  toast?: (msg: string, kind: "success" | "error" | "info") => void;
  /** 🆕 9-20 v2: 聖上拍板改為範圍
   *  - minLength: 精簡後字數下限 (預設 150)
   *  - maxLength: 精簡後字數上限 (預設 200) */
  minLength?: number;
  maxLength?: number;
}

export default function ReshortenModal({
  open,
  onClose,
  post,
  onAdopted,
  toast,
  minLength = 150,
  maxLength = 200,
}: ReshortenModalProps) {
  const [shortenedContent, setShortenedContent] = useState("");
  const [shortening, setShortening] = useState(false);
  const [shortenSeed, setShortenSeed] = useState(0);
  const [shortenWarning, setShortenWarning] = useState("");
  const [shortenStats, setShortenStats] = useState<{
    originalLength: number;
    shortenedLength: number;
    overflow?: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // 開 modal 自動精簡一次
  useEffect(() => {
    if (open && post) {
      setShortenedContent("");
      setShortenWarning("");
      setShortenStats(null);
      setShortenSeed(0);
      void runShorten(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !post) return null;

  async function runShorten(seed: number) {
    if (shortening) return;
    setShortening(true);
    setShortenWarning("");
    try {
      const res = await fetch("/api/story-blog/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: post!.content,
          title: post!.title || undefined,
          minLength,
          maxLength,
          seed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setShortenedContent(data.shortenedText);
      setShortenStats({
        originalLength: data.originalLength,
        shortenedLength: data.shortenedLength,
        overflow: data.overflow,
      });
      if (data.fallback && data.warning) {
        setShortenWarning(data.warning);
        toast?.(`⚠️ ${data.warning}`, "info");
      } else {
        toast?.(`✂️ 精簡完成 — ${data.originalLength} → ${data.shortenedLength} 字`, "success");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "精簡失敗";
      toast?.(`精簡失敗: ${msg}`, "error");
    } finally {
      setShortening(false);
    }
  }

  async function handleAdopt() {
    if (!shortenedContent.trim()) {
      toast?.("沒有可採納的內容", "error");
      return;
    }
    if (!confirm(`採納這版精簡, 寫回資料庫?\n\n原文 ${post!.content.length} 字 → 精簡 ${shortenedContent.trim().length} 字\n(原文會被覆蓋, 確定要嗎?)`)) {
      return;
    }
    setSaving(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("posts")
        .update({ content: shortenedContent.trim() })
        .eq("id", post!.id);
      if (error) throw error;
      onAdopted?.(post!.id, shortenedContent.trim());
      toast?.("📋 已採納精簡版到資料庫", "success");
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "寫入失敗";
      toast?.(`寫入失敗: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  }

  const originalLen = post!.content.length;
  const shortenedLen = shortenedContent.length;
  const ratio = originalLen > 0 ? Math.round((shortenedLen / originalLen) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-jn-paper w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.4)" }}
      >
        <div className="sticky top-0 bg-jn-paper border-b-2 border-jn-vermilion/30 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-jn-ink">
            ✂️ 精簡「{post!.title || "這篇"}」至 {minLength}-{maxLength} 字之間
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-jn-ink/60 hover:text-jn-vermilion text-2xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="關閉"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 原文 (唯讀) */}
          <div>
            <h3 className="text-sm font-bold text-jn-ink mb-2">
              📜 原文 ({originalLen} 字)
            </h3>
            <div className="bg-jn-paper-warm/40 border border-jn-ink/10 rounded p-3 max-h-40 overflow-y-auto">
              <p className="text-sm text-jn-ink/80 font-serif whitespace-pre-wrap leading-relaxed">
                {post!.content}
              </p>
            </div>
          </div>

          {/* 精簡版 (可編輯) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-jn-vermilion-deep">
                ✂️ 精簡版本 ({shortenedLen} 字 · {ratio}% 原文長度)
                {shortenStats?.overflow && (
                  <span className="ml-2 text-xs text-amber-700">⚠️ 超出 {minLength}-{maxLength} 範圍</span>
                )}
              </h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const newSeed = shortenSeed + 1;
                    setShortenSeed(newSeed);
                    void runShorten(newSeed);
                  }}
                  disabled={shortening}
                  className="text-xs text-jn-ink/70 hover:text-jn-vermilion px-2 py-1 rounded transition-colors disabled:opacity-40"
                  title="換一個版本"
                >
                  {shortening ? "⏳ 精簡中…" : "🔄 換一版"}
                </button>
              </div>
            </div>
            {shortening && !shortenedContent && (
              <div className="bg-jn-paper-warm border-l-4 border-jn-gold rounded p-4 text-center text-jn-ink/60">
                <p className="text-sm">⏳ LLM 正在精簡 (3-8 秒) ...</p>
              </div>
            )}
            {shortenedContent && (
              <>
                <textarea
                  value={shortenedContent}
                  onChange={(e) => setShortenedContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-jn-vermilion/30 rounded focus:outline-none focus:border-jn-vermilion font-serif bg-white text-sm"
                />
                {shortenWarning && (
                  <p className="text-xs text-amber-700 mt-1">⚠️ {shortenWarning}</p>
                )}
                <p className="text-xs text-jn-ink/50 mt-1">
                  意思是與原文一致 — 聖上可再手動微調用詞或節奏
                </p>
              </>
            )}
          </div>

          {/* 採納 / 取消 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleAdopt}
              disabled={saving || !shortenedContent.trim() || shortening}
              className="flex-1 bg-jn-vermilion text-white font-bold py-3 rounded hover:bg-jn-vermilion-deep transition-colors disabled:opacity-50"
            >
              {saving ? "寫入中…" : `📋 採納這版 (${originalLen} → ${shortenedLen} 字)`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-jn-ink/20 text-jn-ink rounded hover:bg-jn-ink/5"
            >
              取消
            </button>
          </div>

          <p className="text-xs text-jn-ink/50 text-center">
            採納會用精簡版覆蓋原文。如果想保留原文, 請先複製貼到別處再採納。
          </p>
        </div>
      </div>
    </div>
  );
}

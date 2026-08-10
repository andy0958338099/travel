"use client";

/**
 * 🆕 2026-08-10 聖上拍板: 重新潤飾已發布的 article
 *
 * 觸發: TimelineStory 右上角 ⚙ 潤飾按鈕
 *
 * 流程:
 *   1. 開 modal → 顯示原文 (content)
 *   2. 自動 call /api/story-blog/polish 拿 LLM 潤飾版
 *   3. 顯示 原文 + 潤飾版 兩版並陳 (可編輯潤飾版)
 *   4. 聖上按「📋 採納這版」→ PATCH 寫回 DB (樂觀更新)
 *   5. 聖上按「🔄 換一版」→ 改 seed 重新叫 LLM
 *   6. 聖上按「取消」→ 不動 DB
 *
 * 設計: 跟寫新故事的 AddStoryModal 共用同個 /api/story-blog/polish endpoint
 *   (polish API 不在意 source 是新寫還是舊 post — 都收 originalText + title + dayNumber)
 */
import { useState, useEffect } from "react";

interface RepolishModalProps {
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
}

export default function RepolishModal({
  open,
  onClose,
  post,
  onAdopted,
  toast,
}: RepolishModalProps) {
  const [polishedContent, setPolishedContent] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [polishSeed, setPolishSeed] = useState(0);
  const [polishWarning, setPolishWarning] = useState("");
  const [saving, setSaving] = useState(false);

  // 開 modal 自動潤飾一次
  useEffect(() => {
    if (open && post) {
      setPolishedContent("");
      setPolishWarning("");
      setPolishSeed(0);
      void runPolish(1);
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

  async function runPolish(seed: number) {
    if (polishing) return;
    setPolishing(true);
    setPolishWarning("");
    try {
      const res = await fetch("/api/story-blog/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: post!.content,
          title: post!.title || undefined,
          dayNumber: post!.day_number,
          seed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
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

  async function handleAdopt() {
    if (!polishedContent.trim()) {
      toast?.("沒有可採納的內容", "error");
      return;
    }
    if (!confirm(`採納這版潤飾, 寫回資料庫?\n\n(原文會被覆蓋, 確定要嗎?)`)) {
      return;
    }
    setSaving(true);
    try {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("posts")
        .update({ content: polishedContent.trim() })
        .eq("id", post!.id);
      if (error) throw error;
      onAdopted?.(post!.id, polishedContent.trim());
      toast?.("📋 已採納潤飾版到資料庫", "success");
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "寫入失敗";
      toast?.(`寫入失敗: ${msg}`, "error");
    } finally {
      setSaving(false);
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
        className="relative bg-jn-paper w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.4)" }}
      >
        <div className="sticky top-0 bg-jn-paper border-b-2 border-jn-vermilion/30 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-jn-ink">
            ⚙ 重新潤飾「{post.title || "這篇"}」
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
            <h3 className="text-sm font-bold text-jn-ink mb-2">📜 原文 (目前資料庫內容)</h3>
            <div className="bg-jn-paper-warm/40 border border-jn-ink/10 rounded p-3 max-h-40 overflow-y-auto">
              <p className="text-sm text-jn-ink/80 font-serif whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            </div>
          </div>

          {/* 潤飾版 (可編輯) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-jn-vermilion-deep">
                ✨ 潤飾版本 (可再編輯)
              </h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const newSeed = polishSeed + 1;
                    setPolishSeed(newSeed);
                    void runPolish(newSeed);
                  }}
                  disabled={polishing}
                  className="text-xs text-jn-ink/70 hover:text-jn-vermilion px-2 py-1 rounded transition-colors disabled:opacity-40"
                  title="換一個版本"
                >
                  {polishing ? "⏳ 潤飾中…" : "🔄 換一版"}
                </button>
              </div>
            </div>
            {polishing && !polishedContent && (
              <div className="bg-jn-paper-warm border-l-4 border-jn-gold rounded p-4 text-center text-jn-ink/60">
                <p className="text-sm">⏳ LLM 正在潤飾 (6-12 秒) ...</p>
              </div>
            )}
            {polishedContent && (
              <>
                <textarea
                  value={polishedContent}
                  onChange={(e) => setPolishedContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-jn-vermilion/30 rounded focus:outline-none focus:border-jn-vermilion font-serif bg-white text-sm"
                />
                {polishWarning && (
                  <p className="text-xs text-amber-700 mt-1">⚠️ {polishWarning}</p>
                )}
              </>
            )}
          </div>

          {/* 採納 / 取消 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleAdopt}
              disabled={saving || !polishedContent.trim() || polishing}
              className="flex-1 bg-jn-vermilion text-white font-bold py-3 rounded hover:bg-jn-vermilion-deep transition-colors disabled:opacity-50"
            >
              {saving ? "寫入中…" : "📋 採納這版 (覆蓋原文)"}
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
            採納會用潤飾版覆蓋原文。如果想保留原文, 請先複製貼到別處再採納。
          </p>
        </div>
      </div>
    </div>
  );
}

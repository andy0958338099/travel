"use client";
/**
 * PromptEditor — 編輯某 attraction 的 4-panel prompt
 *
 * 流程:
 * 1. Mount → 讀 localStorage fingerprint
 * 2. 從 Supabase 撈 character.style_prompt (for default) + user 既有 custom prompts
 * 3. 顯示 4 個 panel 的 prompt (default 或 user override)
 * 4. User 編輯 → 標記為 customize
 * 5. 儲存 → upsert to user_manga_prompts
 * 6. 還原預設 → delete row → 回到 default
 *
 * 存儲: Supabase `user_manga_prompts` table
 *   - user_fingerprint (localStorage `manga-fingerprint`)
 *   - attraction_name
 *   - panel_1_prompt ~ panel_4_prompt (null = 用 default)
 */

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildPanelPrompt, PanelIndex } from "@/lib/ai/mangaPrompts";

interface Props {
  attractionName: string;
  region?: string;
  onClose: () => void;
  onSaved?: () => void;
}

const PANEL_META = {
  1: { title: "歡迎光臨", icon: "👋" },
  2: { title: "歷史文化", icon: "📜" },
  3: { title: "必吃美食", icon: "🍜" },
  4: { title: "打卡 tips", icon: "📸" },
} as const;

type PanelIdx = 1 | 2 | 3 | 4;

export default function PromptEditor({ attractionName, region, onClose, onSaved }: Props) {
  const [activePanel, setActivePanel] = useState<PanelIdx>(1);
  const [prompts, setPrompts] = useState<Record<PanelIdx, string>>({ 1: "", 2: "", 3: "", 4: "" });
  const [defaultPrompts, setDefaultPrompts] = useState<Record<PanelIdx, string>>({ 1: "", 2: "", 3: "", 4: "" });
  const [isCustomized, setIsCustomized] = useState<Record<PanelIdx, boolean>>({ 1: false, 2: false, 3: false, 4: false });
  const [fingerprint, setFingerprint] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1) fingerprint
  useEffect(() => {
    let fp = localStorage.getItem("manga-fingerprint");
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem("manga-fingerprint", fp);
    }
    setFingerprint(fp);
  }, []);

  // 2) 載入 default style prompt + user custom prompts
  useEffect(() => {
    if (!fingerprint) return;
    (async () => {
      const supabase = createClient();
      // 撈 active character 拿 style_prompt
      const { data: chars } = await supabase
        .from("ai_characters")
        .select("style_prompt, region")
        .eq("is_active", true);
      const r = (region || "").toLowerCase();
      const match =
        chars?.find((c: any) => c.region === r) ||
        chars?.find((c: any) => c.region === "qstyle") ||
        chars?.[0];
      const style = match?.style_prompt || "";
      // 跟 buildPanelPrompt 同一個 source of truth（v2 寫實風格）
      const defaults: Record<PanelIdx, string> = {
        1: buildPanelPrompt(style, attractionName, 1 as PanelIndex),
        2: buildPanelPrompt(style, attractionName, 2 as PanelIndex),
        3: buildPanelPrompt(style, attractionName, 3 as PanelIndex),
        4: buildPanelPrompt(style, attractionName, 4 as PanelIndex),
      };
      setDefaultPrompts(defaults);
      // 撈 user custom prompts
      const { data: userRow } = await supabase
        .from("user_manga_prompts")
        .select("*")
        .eq("user_fingerprint", fingerprint)
        .eq("attraction_name", attractionName)
        .maybeSingle();

      const newPrompts: Record<PanelIdx, string> = { ...defaults };
      const newCustomized: Record<PanelIdx, boolean> = { 1: false, 2: false, 3: false, 4: false };
      if (userRow) {
        for (const p of [1, 2, 3, 4] as PanelIdx[]) {
          const v = userRow[`panel_${p}_prompt`];
          if (v && v.trim()) {
            newPrompts[p] = v;
            newCustomized[p] = true;
          }
        }
      }
      setPrompts(newPrompts);
      setIsCustomized(newCustomized);
      setLoading(false);
    })();
  }, [fingerprint, attractionName, region]);

  async function handleSave() {
    if (!fingerprint) return;
    setSaving(true);
    const supabase = createClient();
    const upsertData: any = {
      user_fingerprint: fingerprint,
      attraction_name: attractionName,
      updated_at: new Date().toISOString(),
    };
    for (const p of [1, 2, 3, 4] as PanelIdx[]) {
      const key = `panel_${p}_prompt`;
      // 只存 isCustomized = true 的 panel, 其他 = null (用 default)
      upsertData[key] = isCustomized[p] ? prompts[p].trim() : null;
    }
    const { error } = await supabase
      .from("user_manga_prompts")
      .upsert(upsertData, { onConflict: "user_fingerprint,attraction_name" });
    setSaving(false);
    if (error) {
      alert("儲存失敗：" + error.message);
    } else {
      onSaved?.();
      onClose();
    }
  }

  async function handleReset() {
    if (!fingerprint) return;
    if (!confirm("確定要還原成預設 prompt？\n（你之前自訂的會被刪除）")) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_manga_prompts")
      .delete()
      .eq("user_fingerprint", fingerprint)
      .eq("attraction_name", attractionName);
    setSaving(false);
    if (error) {
      alert("還原失敗：" + error.message);
    } else {
      setIsCustomized({ 1: false, 2: false, 3: false, 4: false });
      setPrompts({ ...defaultPrompts });
      onSaved?.();
    }
  }

  function handlePanelChange(p: PanelIdx, v: string) {
    setPrompts((prev) => ({ ...prev, [p]: v }));
    setIsCustomized((prev) => ({ ...prev, [p]: v !== defaultPrompts[p] }));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">📝 編輯 prompt · {attractionName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              自訂每個 panel 的圖片 prompt，影響下次生成
            </p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-500 hover:text-gray-800">
            ×
          </button>
        </div>

        {/* Tabs — 🅒 2026-07-02: indigo-500 → 江楠 jn-tab */}
        <div className="flex gap-1 p-2 border-b bg-stone-50">
          {([1, 2, 3, 4] as PanelIdx[]).map((p) => (
            <button
              key={p}
              onClick={() => setActivePanel(p)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePanel === p
                  ? "jn-tab-active"
                  : "bg-white text-stone-600 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>{PANEL_META[p].icon}</span>
                <span>Panel {p} · {PANEL_META[p].title}</span>
                {isCustomized[p] && <span className="text-xs">✏️</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 py-8">載入中…</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  {isCustomized[activePanel]
                    ? "✏️ 自訂 prompt（會覆寫預設）"
                    : "📋 預設 prompt（未修改）"}
                </span>
                <span className="text-xs text-gray-400">
                  {prompts[activePanel].length} 字
                </span>
              </div>
              <textarea
                value={prompts[activePanel]}
                onChange={(e) => handlePanelChange(activePanel, e.target.value)}
                // 🅒 2026-07-02: gray-300/focus:indigo-500 → amber-300/focus:red-500 江楠
                className="w-full h-72 p-3 border border-amber-300/40 rounded-lg text-xs font-mono leading-relaxed resize-none focus:outline-none focus:border-red-500"
                placeholder="輸入 prompt..."
              />
              <p className="text-xs text-stone-500 mt-2">
                💡 修改任何字都會標記為「自訂」。按「還原預設」可一鍵還原成 default。
              </p>
            </>
          )}
        </div>

        {/* Footer — 🅒 2026-07-02: indigo-500/600 → 江楠朱紅 CTA */}
        <div className="flex items-center justify-between p-4 border-t bg-stone-50 gap-2">
          <button
            onClick={handleReset}
            disabled={saving || loading}
            className="px-4 py-2 text-sm text-stone-600 hover:text-red-700 disabled:opacity-50"
          >
            🔄 還原預設
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-stone-200 hover:bg-stone-300 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="jn-cta-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "儲存中…" : "💾 儲存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

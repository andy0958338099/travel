/**
 * MangaViewer — 4 格 Q版漫畫查看器
 *
 * ⚠️ v3.0 規則（user 2026-06-03）：
 *   - 圖片完全不放任何文字（NO TEXT rule）
 *   - 所有文字由程式第二階段 HTML/CSS overlay 疊加
 *   - 字體：Noto Sans TC
 *   - 每張卡：title（固定）+ subtitle（景點名）+ description（caption）
 *
 * 🔄 v2.0 fire-and-forget regenerate（2026-06-04）：
 *   - 點 🔄 → POST /api/manga/regenerate-panel → Netlify function 立即回
 *   - Netlify function call Worker `manga/panel` → Worker 立即回 202
 *   - Worker 背景跑 MiniMax + Supabase upload + DB update (~30s)
 *   - 前端訂閱 Supabase Realtime on `travel_mangas` UPDATE
 *   - 收到 panel_N_url 變化 → 自動更新 UI + clear regenerating state
 *   - 30s 保險 timeout：如果 Realtime 沒收到，30s 後手動 clear
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { PanelIndex } from "@/lib/ai/mangaPrompts";
import { PANEL_META, buildPanelPrompt } from "@/lib/ai/mangaPrompts";
import { createClient } from "@/utils/supabase/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface MangaData {
  id: string;
  source_type: string;
  source_id: string;
  source_name: string;
  character_id: string;
  character_name: string;
  panel_1_url: string | null;
  panel_1_title: string;
  panel_1_caption: string;
  panel_2_url: string | null;
  panel_2_title: string;
  panel_2_caption: string;
  panel_3_url: string | null;
  panel_3_title: string;
  panel_3_caption: string;
  panel_4_url: string | null;
  panel_4_title: string;
  panel_4_caption: string;
  short_desc: string;
  medium_desc: string;
  long_desc: string;
  status: string;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  manga: MangaData;
  onClose: () => void;
  onUpdate?: (updated: MangaData) => void;
}

const NOTO_SANS_TC =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap";
const REGEN_TIMEOUT_MS = 45_000; // safety: if Realtime doesn't fire in 45s, clear spinner

export default function MangaViewer({ manga, onClose, onUpdate }: Props) {
  const [regenerating, setRegenerating] = useState<PanelIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<MangaData>(manga);
  const [showLong, setShowLong] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Share URL (always built from current manga + window origin) ──
  // 分享 URL = `/travel/manga?open={mangaId}`，接收者開連結會自動打開該 manga modal
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/travel/manga?open=${manga.id}`
      : `https://travel-china.netlify.app/travel/manga?open=${manga.id}`;
  const shareText = current.short_desc
    ? `${current.source_name} 的 Q版漫畫 🎨\n${current.short_desc}`
    : `${current.source_name} 的 Q版漫畫 🎨`;
  const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText + "\n" + shareUrl)}`;
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        alert("複製失敗，請手動複製：" + shareUrl);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // ── 下載 PDF (LINE 分享附件用, 1 頁 A4 含 4 格漫畫 + 標題/caption/景點名/URL) ──
  // 流程：html2canvas 抓隱藏 div (position: fixed; top: -10000px) → jsPDF 拼 A4 portrait → 觸發瀏覽器下載
  async function handleDownloadPDF() {
    if (!pdfRef.current || pdfGenerating) return;
    setPdfGenerating(true);
    try {
      // 1) 等隱藏 div 內所有 <img> 載入完（含 crossOrigin fetch + decode）
      const imgs = pdfRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(imgs).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) return resolve();
              img.onload = () => resolve();
              img.onerror = () => resolve(); // 失敗不擋流程,讓畫面保留 alt
            })
        )
      );

      // 2) html2canvas 抓隱藏 div (scale: 2 高清 + useCORS for Supabase CORS)
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794, // A4 @ 96dpi
      });

      // 3) jsPDF 拼 A4 portrait (595x842 pt)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 595
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 842
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      // 內容超過 A4 高度就裁到 1 頁（不溢出第二頁）
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        imgWidth,
        Math.min(imgHeight, pdfHeight)
      );
      pdf.save(
        `${current.source_name}_Q版漫畫_${current.id.slice(0, 8)}.pdf`
      );
    } catch (e: any) {
      console.error("[MangaViewer] PDF generation failed:", e);
      alert("PDF 生成失敗，請重試");
    } finally {
      setPdfGenerating(false);
    }
  }

  // ── Supabase Realtime 訂閱 ──
  // 收到 travel_mangas row UPDATE 時，自動更新對應的 panel_N_url 並 clear spinner
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`manga-${manga.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "travel_mangas",
          filter: `id=eq.${manga.id}`,
        },
        (payload) => {
          const newRow = payload.new as MangaData;
          // 只要 Realtime 推了 UPDATE = row 有變 → 直接換 current
          // (不要在 handler 內判斷「哪些欄位變」, 因為 PATCH 文字時 URL/status/updated_at 都不一定變,
          //  例如: Supabase PATCH 不會自動更新 updated_at, 圖也沒變,
          //  結果「caption/title/desc 補上」這種變化會被 ignore, UI 卡在 "—")
          setCurrent(newRow);
          // 自動通知 parent（更新 grid 上的封面圖等）
          onUpdate?.(newRow);

          // 如果有 panel 在重生中、且 row 變了、視為完成
          setRegenerating((regenPanel) => {
            if (regenPanel && newRow[`panel_${regenPanel}_url` as keyof MangaData]) {
              return null;
            }
            return regenPanel;
          });

          // 如果 row status=failed、視為失敗、顯示錯誤
          if (newRow.status === "failed") {
            setError("Worker pipeline 失敗，請重試或聯絡管理員");
            setRegenerating(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [manga.id, onUpdate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleRegenerate(panel: PanelIndex) {
    setRegenerating(panel);
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 🔥 立刻把舊圖刪掉 (UI 顯示 spinner)，等 Worker 完成後 Realtime 推播貼回新圖
    const oldUrl = current[`panel_${panel}_url` as keyof MangaData];
    setCurrent((prev) => ({ ...prev, [`panel_${panel}_url`]: null }));

    try {
      // 1) 撈 character → 拿 style_prompt (角色) + reference_image_url (ref)
      const supabase = createClient();
      const { data: char, error: charErr } = await supabase
        .from("ai_characters")
        .select("style_prompt, reference_image_url")
        .eq("id", current.character_id)
        .single();
      if (charErr || !char) throw new Error(`character not found: ${charErr?.message || "no row"}`);

      // 2) 組 prompt (用 buildPanelPrompt — 跟 server route 同一個 source of truth)
      const prompt = buildPanelPrompt(char.style_prompt || "", current.source_name, panel);

      // 3) 處理 ref image: 已是 data:/http(s) 直接用；local /public/ path 用 fetch 轉 data URL
      let refImageUrl: string | undefined;
      const ref = char.reference_image_url;
      if (ref) {
        if (ref.startsWith("data:") || ref.startsWith("http")) {
          refImageUrl = ref;
        } else {
          // local path (e.g. /refs/xxx.jpg) — 試 fetch 轉 base64
          try {
            const r = await fetch(ref);
            if (r.ok) {
              const blob = await r.blob();
              refImageUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error("FileReader failed"));
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            // 抓不到就當作沒 ref（MiniMax 沒 ref image 也會用 prompt 風格生成）
          }
        }
      }

      // 4) 直連 Cloudflare Worker（繞過 Netlify 30s timeout）
      const workerUrl = "https://jiangnan-trip.andy0958338099.workers.dev";
      const res = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "manga/panel",
          payload: {
            mangaId: current.id,
            panel,
            prompt,
            ...(refImageUrl ? { refImageUrl } : {}),
            aspectRatio: "3:4",
          },
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Worker ${res.status}`);
      }
      // 啟動保險 timeout：如果 Realtime 沒收到，45s 後手動 clear
      timeoutRef.current = setTimeout(() => {
        setRegenerating((curr) => {
          if (curr) {
            setError("重生逾時，請重新整理頁面檢查");
            return null;
          }
          return curr;
        });
      }, REGEN_TIMEOUT_MS);
    } catch (e: any) {
      // 失敗時恢復舊圖
      setCurrent((prev) => ({ ...prev, [`panel_${panel}_url`]: oldUrl }));
      setError(e.message);
      setRegenerating(null);
    }
  }

  const panels: PanelIndex[] = [1, 2, 3, 4];
  const successCount = panels.filter(
    (p) => current[`panel_${p}_url` as keyof MangaData]
  ).length;

  return (
    <>
      {/* 載入 Noto Sans TC */}
      <link rel="stylesheet" href={NOTO_SANS_TC} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{ fontFamily: "'Noto Sans TC', system-ui, sans-serif" }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-5 rounded-t-2xl flex items-center justify-between gap-3 z-10">
            <div className="min-w-0 flex-1">
              <div className="text-xs opacity-80">
                🎨 Q版漫畫 · {current.character_name}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mt-0.5 truncate">
                {current.source_name}
              </h2>
              <div className="text-xs opacity-80 mt-1">
                {successCount}/4 格 · 狀態：{current.status}
                {regenerating && ` · 正在重生 ${regenerating}/4`}
              </div>
            </div>

            {/* 分享按鈕群（LINE / FB / 複製） */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <a
                href={lineShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="分享到 LINE"
                aria-label="分享到 LINE"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#00C300] hover:bg-[#00A800] text-white text-lg font-bold shadow-sm transition-colors"
              >
                L
              </a>
              <a
                href={fbShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="分享到 Facebook"
                aria-label="分享到 Facebook"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1877F2] hover:bg-[#0E62D1] text-white text-lg font-black shadow-sm transition-colors"
              >
                f
              </a>
              <button
                onClick={handleCopy}
                title="複製連結"
                aria-label="複製連結"
                className={`relative w-9 h-9 flex items-center justify-center rounded-full text-white text-base shadow-sm transition-colors ${
                  copied
                    ? "bg-emerald-500"
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {copied ? "✓" : "🔗"}
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfGenerating}
                title="下載 PDF（LINE 分享用）"
                aria-label="下載 PDF"
                className={`relative w-9 h-9 flex items-center justify-center rounded-full text-white text-base shadow-sm transition-colors ${
                  pdfGenerating
                    ? "bg-amber-500 animate-pulse cursor-wait"
                    : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                }`}
              >
                {pdfGenerating ? "⏳" : "📄"}
              </button>
              <button
                onClick={onClose}
                title="關閉"
                aria-label="關閉"
                className="ml-1 w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:text-white text-2xl leading-none hover:bg-white/10 transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              ❌ {error}
            </div>
          )}

          {/* 4 Panel grid — 圖片純淨 + 文字完全在圖外（下方） */}
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {panels.map((p) => {
                const urlKey = `panel_${p}_url` as const;
                const captionKey = `panel_${p}_caption` as const;
                const url = current[urlKey];
                const isRegen = regenerating === p;
                const meta = PANEL_META[p];

                return (
                  <div key={p} className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {/* Panel 圖（純圖，無 overlay） */}
                    <div className="relative aspect-[3/4] bg-gradient-to-br from-indigo-50 to-purple-50">
                      {url ? (
                        <img
                          src={url}
                          alt={`${meta.title} - ${current.source_name}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          {isRegen ? "⏳ 生成中…" : "❌ 缺圖"}
                        </div>
                      )}
                      {isRegen && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                          <div className="text-white text-xs font-semibold animate-pulse">
                            🎨 {p}/4
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 文字區（圖下方，白底 + 邊框） */}
                    <div className="p-2.5 sm:p-3 space-y-1 border-t border-gray-100 flex-1">
                      {/* 序號 + title + icon */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                          {p}/4
                        </span>
                        <span className="text-sm sm:text-base font-black text-gray-800">
                          {meta.title}
                        </span>
                        <span className="text-sm sm:text-base">{meta.icon}</span>
                      </div>
                      {/* 副標題 = 景點名 */}
                      <div className="text-[11px] font-bold text-gray-600 truncate">
                        📍 {current.source_name}
                      </div>
                      {/* 描述 = chat 生成的 caption */}
                      <div className="text-[11px] sm:text-xs leading-snug text-gray-700 line-clamp-3">
                        {current[captionKey] || "—"}
                      </div>
                    </div>

                    {/* Regenerate 按鈕（卡片下方） */}
                    <button
                      onClick={() => handleRegenerate(p)}
                      disabled={isRegen}
                      className="text-xs py-1.5 px-2 bg-gray-50 hover:bg-indigo-50 border-t border-gray-100 text-gray-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRegen ? "⏳ 重生中…" : "🔄 重新生成此格"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Descriptions (短/中/長 — 程式文字) */}
          <div className="px-4 sm:p-5 pb-5 space-y-3">
            {current.short_desc && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                <div className="text-xs font-bold text-amber-700 mb-1">
                  ⚡ 一句話
                </div>
                <div className="text-sm text-gray-800">{current.short_desc}</div>
              </div>
            )}
            {current.medium_desc && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-bold text-blue-700 mb-1">
                  📖 300 字介紹
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {current.medium_desc}
                </div>
              </div>
            )}
            {current.long_desc && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                <div className="text-xs font-bold text-purple-700 mb-1 flex items-center justify-between">
                  <span>📚 完整攻略 {showLong ? "" : "（點擊展開）"}</span>
                  <button
                    onClick={() => setShowLong((s) => !s)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    {showLong ? "收合 ▲" : "展開 ▼"}
                  </button>
                </div>
                {showLong ? (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap mt-2">
                    {current.long_desc}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 line-clamp-3 mt-1">
                    {current.long_desc}
                  </div>
                )}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span>ID: {current.id.slice(0, 8)}</span>
              <span>更新：{new Date(current.updated_at).toLocaleString("zh-TW")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 隱藏 PDF 模板 (html2canvas 抓這個 div) ──
          位置 off-screen, 不影響 modal UI; 1 頁 A4 版型 (794x1123 @ 96dpi)
          v3.1 改動 (2026-06-06):
            - 圖改 180x240 (3:4 Q版原比例, 不裁切不變形)
            - 縮 outer padding 40→32 + header 字級 (32→26) 騰出 footer 空間
            - caption 取消 line-clamp 3 行 (完整呈現)
            - footer padding/間距微調, 確保 4 元素 (景點/short_desc/URL/日期) 都在 1 頁 A4
            - 整 div 高度 < 1124px (A4 @ 96dpi) → 1 頁 */}
      <div
        ref={pdfRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-10000px",
          left: "-10000px",
          width: "794px",
          background: "#ffffff",
          color: "#1e293b",
          fontFamily: "'Noto Sans TC', system-ui, sans-serif",
          padding: "32px",
          boxSizing: "border-box",
        }}
      >
        {/* Header (縮字級 + 縮 padding, 騰空間給 footer) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #f59e0b",
            paddingBottom: "12px",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "#6366f1",
                fontWeight: 700,
                letterSpacing: "0.5px",
              }}
            >
              🎨 江南水鄉 Q版漫畫 · 江南水鄉八日
            </div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#1e293b",
                margin: "4px 0 0 0",
                lineHeight: 1.2,
              }}
            >
              {current.source_name} · 4 格 Q版漫畫
            </h1>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#94a3b8",
              fontWeight: 700,
              background: "#f1f5f9",
              padding: "6px 12px",
              borderRadius: "8px",
            }}
          >
            {current.character_name}
          </div>
        </div>

        {/* 4 panel 2x2 grid — 圖 180x240 (3:4, Q版原比例, 不變形不裁切) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 200px)",  // 固定欄寬 = 圖 180 + padding 10*2
            gap: "16px",
            justifyContent: "center",  // grid 整體置中
            marginBottom: "20px",
          }}
        >
          {([1, 2, 3, 4] as PanelIndex[]).map((p) => {
            const urlKey = `panel_${p}_url` as const;
            const titleKey = `panel_${p}_title` as const;
            const captionKey = `panel_${p}_caption` as const;
            const url = current[urlKey];
            const meta = PANEL_META[p];
            return (
              <div
                key={p}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "10px",
                }}
              >
                {url ? (
                  <div
                    style={{
                      width: "180px",
                      height: "240px",  // 3:4 比例 (Q版原比例)
                      background: "#e2e8f0",
                      borderRadius: "8px",
                      overflow: "hidden",
                      margin: "0 auto",
                    }}
                  >
                    <img
                      src={url}
                      crossOrigin="anonymous"
                      alt={`${meta.title} - ${current.source_name}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",  // 維持 3:4 不變形
                        display: "block",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "180px",
                      height: "240px",  // 3:4 比例
                      background: "#e2e8f0",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "14px",
                      margin: "0 auto",
                    }}
                  >
                    ❌ 缺圖
                  </div>
                )}
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "14px",
                    fontWeight: 900,
                    color: "#1e293b",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      background: "#e0e7ff",
                      color: "#4338ca",
                      fontSize: "11px",
                      fontWeight: 900,
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {p}/4
                  </span>
                  <span>{current[titleKey] || meta.title}</span>
                  <span>{meta.icon}</span>
                </div>
                {/* caption: 取消 line-clamp, 完整呈現 (不裁字) */}
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "11px",
                    color: "#475569",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {current[captionKey] || "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer (完整呈現: 景點名 + short_desc + URL + 日期, 不 line-clamp) */}
        <div
          style={{
            borderTop: "2px solid #f59e0b",
            paddingTop: "14px",
            fontSize: "12px",
            color: "#475569",
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "14px" }}>
            📍 景點：{current.source_name}
          </div>
          {current.short_desc && (
            <div style={{ marginTop: "4px" }}>
              ⚡ {current.short_desc}
            </div>
          )}
          <div style={{ marginTop: "4px", wordBreak: "break-all" }}>
            🔗 {shareUrl}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: "#94a3b8",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>© 江南水鄉八日之旅</span>
            <span>
              {current.updated_at
                ? new Date(current.updated_at).toLocaleDateString("zh-TW")
                : ""}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

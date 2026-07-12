"use client";

/**
 * ScriptZipDownload — 一鍵下載整劇本 8 天 ZIP
 *
 * 2026-07-12 聖上拍板:
 *   - 點按鈕 → fetch 8 個 PDF → JSZip 打包 → 觸發瀏覽器下載
 *   - 預期 8 PDF × 800KB = 6.4MB / 5-10s (Netlify CDN)
 *   - 比一張一張下載方便 (聖上去杭州前備齊 1 劇本 8 PDF)
 *
 * 使用方式:
 *   <ScriptZipDownload scriptId="D" scriptName="愛美食的同事" />
 */

import { useState } from "react";

export interface ScriptZipDownloadProps {
  scriptId: string;
  scriptName: string;
}

const DAYS = 8;

export default function ScriptZipDownload({
  scriptId,
  scriptName,
}: ScriptZipDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: DAYS });

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setProgress({ done: 0, total: DAYS });

    try {
      // Dynamic import JSZip (避免 SSR + 節省 initial bundle)
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // 平行 fetch 8 PDF (8 個 ~800KB 平行下載 5-8s 完成)
      const tasks = Array.from({ length: DAYS }, (_, i) => i + 1).map(
        async (day) => {
          const url = `/vlog-pdfs/${scriptId}/day${day}.pdf`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`Day ${day}: HTTP ${resp.status}`);
          const blob = await resp.blob();
          zip.file(`day${day}.pdf`, blob);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      );

      await Promise.all(tasks);

      // 打包 ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // 觸發瀏覽器下載
      const filename = `Vlog_${scriptId}_${scriptName.replace(/[\\/:*?"<>|]/g, "_")}_all-8-days.zip`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 釋放 blob URL
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) {
      alert(
        "ZIP 下載失敗, 請重新嘗試\n" +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: "var(--jn-paper)",
        color: "var(--jn-vermilion-deep)",
        border: "2px solid var(--jn-vermilion)",
        fontFamily: "var(--font-noto-serif-tc), serif",
      }}
      title={`一鍵下載劇本 ${scriptId} 全部 8 天 PDF (約 6.4 MB ZIP)`}
    >
      {downloading ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>
            打包中... {progress.done}/{progress.total}
          </span>
        </>
      ) : (
        <>
          <span className="text-base">📦</span>
          <span>整劇本 8 天 ZIP 下載</span>
          <span className="text-[10px] font-normal opacity-70 ml-1">
            ~6 MB
          </span>
        </>
      )}
    </button>
  );
}
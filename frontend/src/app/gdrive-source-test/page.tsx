/**
 * 🆕 2026-11-14: Google Drive 圖片來源可行性測試頁
 *
 * 目的：驗證「照片放在 Google Drive，部落格用同一套 PhotoFrame 呈現」這條路
 *   走得通，且完全不需要動既有 371 筆 posts 資料。
 *
 * 這個頁面：
 *   - 從 Drive 資料夾列出圖片（走 /api/gdrive/files）
 *   - 用 toDisplayImageUrl() 把 gdrive:<fileId> 解析成可顯示網址
 *   - 用部落格同一顆 PhotoFrame 渲染，確認畫面與相簿一致
 *
 * 這是測試頁，純唯讀，不會寫入任何資料。
 */

"use client";

import { useEffect, useState } from "react";
import PhotoFrame from "@/components/story/PhotoFrame";
import { toDisplayImageUrl, toGdriveToken } from "@/lib/imageSource";

interface DriveFileRow {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  token: string;
}

export default function GdriveSourceTestPage() {
  const [files, setFiles] = useState<DriveFileRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/gdrive/files?mimeType=image/&limit=12");
        const data = await res.json();
        if (!data.ok) {
          setStatus("error");
          setErrorMsg(data.error || "未知錯誤");
          return;
        }
        setFiles(data.files || []);
        setStatus("ok");
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-jn-paper px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-jn-ink">Google Drive 圖片來源測試</h1>
          <p className="mt-2 text-sm text-jn-ink/70">
            照片存放在 Google Drive 指定資料夾，部落格用同一顆 PhotoFrame 呈現。
            本頁唯讀，不會寫入任何資料。
          </p>
        </header>

        {status === "loading" && (
          <div className="animate-pulse text-jn-ink/60">載入 Drive 檔案中…</div>
        )}

        {status === "error" && (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">載入失敗</p>
            <p className="mt-1">{errorMsg}</p>
          </div>
        )}

        {status === "ok" && (
          <>
            <p className="mb-6 text-sm text-jn-ink/70">
              讀到 <span className="font-semibold text-jn-ink">{files.length}</span> 張 Drive
              圖片。下方每一張都由 <code className="rounded bg-black/5 px-1">gdrive:&lt;fileId&gt;</code>{" "}
              token 解析而來。
            </p>

            {files.length === 0 ? (
              <p className="text-jn-ink/60">這個資料夾沒有圖片。</p>
            ) : (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                {files.map((f) => (
                  <figure key={f.id} className="space-y-2">
                    <PhotoFrame
                      src={toDisplayImageUrl(toGdriveToken(f.id))}
                      caption={f.name}
                      frameStyle="vermilion"
                      alt={f.name}
                    />
                    <figcaption className="break-all text-xs text-jn-ink/50">
                      {f.token}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

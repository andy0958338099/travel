"use client";

/**
 * SyncIndicator — small status pill for the /travel page header.
 * Renders one of:
 *   🟢 已同步        (synced, count > 0)
 *   ⚪ 初始化中…     (loading, count = 0)
 *   🟡 同步中 (N)   (syncing, N pending)
 *   🔴 離線          (offline)
 *   ⚫ 同步失敗 (N)  (error, N failed)
 *
 * Click → opens a popover listing each key + its status.
 */

import { useState } from "react";
import { useSyncStatus } from "./SyncStatusProvider";

const LABELS: Record<string, { text: string; bg: string; text2: string; dot: string }> = {
  synced: {
    text: "已同步",
    bg: "bg-emerald-50 border-emerald-200",
    text2: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  loading: {
    text: "初始化中…",
    bg: "bg-gray-50 border-gray-200",
    text2: "text-gray-600",
    dot: "bg-gray-400",
  },
  syncing: {
    text: "同步中",
    bg: "bg-amber-50 border-amber-200",
    text2: "text-amber-700",
    dot: "bg-amber-500",
  },
  offline: {
    text: "離線",
    bg: "bg-red-50 border-red-200",
    text2: "text-red-700",
    dot: "bg-red-500",
  },
  error: {
    text: "同步失敗",
    bg: "bg-red-50 border-red-200",
    text2: "text-red-700",
    dot: "bg-red-500",
  },
};

export function SyncIndicator() {
  const { status, count, syncingCount, errorCount, entries } = useSyncStatus();
  const [open, setOpen] = useState(false);

  if (count === 0 && status === "synced") return null;

  const style = LABELS[status];
  const detail =
    status === "syncing" && syncingCount > 0
      ? ` (${syncingCount})`
      : status === "error" && errorCount > 0
        ? ` (${errorCount})`
        : "";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${style.bg} ${style.text2} hover:shadow-sm transition-shadow`}
        title="雲端同步狀態"
        aria-label="雲端同步狀態"
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${style.dot} ${
            status === "syncing" || status === "loading" ? "animate-pulse" : ""
          }`}
        />
        <span className="font-medium">
          {status === "synced" ? "☁️" : status === "offline" ? "📡" : "☁️"}
        </span>
        <span>{style.text}{detail}</span>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700">
              雲端同步狀態 ({count} 個項目)
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {Object.entries(entries).map(([key, entry]) => {
                const s = LABELS[entry.status];
                return (
                  <li
                    key={key}
                    className="px-3 py-1.5 text-xs flex items-center gap-2 border-b border-gray-50 last:border-0"
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${s.dot} ${
                        entry.status === "syncing" || entry.status === "loading"
                          ? "animate-pulse"
                          : ""
                      }`}
                    />
                    <span className="font-mono text-gray-700 truncate flex-1" title={key}>
                      {key}
                    </span>
                    <span className={`flex-shrink-0 ${s.text2}`}>{s.text}</span>
                  </li>
                );
              })}
            </ul>
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500">
              跨裝置即時同步 · 離線時自動排隊
            </div>
          </div>
        </>
      )}
    </div>
  );
}

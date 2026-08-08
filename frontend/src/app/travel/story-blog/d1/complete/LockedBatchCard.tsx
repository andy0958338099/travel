"use client";

/**
 * 🅒 2026-08-08 聖上拍板: 「整體刪除」批次按鈕
 *   聖上要求點 🗑 整體刪除 → 真的把整個 LOCK 範圍從 Supabase 移除
 *   - 接收 batch 的所有 LOCK id (groupKey), 用 regex 移除 text 內所有 LOCK:GROUP_KEY 範圍
 *   - 透過 /api/story-blog/delete-batch API 操作 (server-side)
 *   - 刪除成功後 reload 頁面
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubBlock {
  type: "h1" | "h2" | "p" | "quote" | "image" | "other";
  text: string;
  imageUrl?: string;
}

interface LockedBatchCardProps {
  batchId: string;
  startLine: number;
  subBlocks: SubBlock[];
  groupKey: string;  // 前 8 字, 用來識別同批的所有 LOCK id
}

export default function LockedBatchCard({
  batchId,
  startLine,
  subBlocks,
  groupKey,
}: LockedBatchCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`確定刪除 #${startLine} 批次 (${subBlocks.length} 段)？此操作不可復原。`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/story-blog/delete-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "刪除失敗");
      }
      // 成功 → reload 頁面
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  };

  return (
    <div
      key={batchId}
      className="ed-locked-zone-card"
      style={{
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
      }}
    >
      {/* 區塊 header: #N + 段數 + 🗑 整體刪除 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              color: "#92400e",
              fontWeight: 700,
              minWidth: 24,
              textAlign: "center",
            }}
          >
            #{startLine}
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#b45309",
              fontWeight: 700,
              padding: "2px 8px",
              background: "#fef3c7",
              borderRadius: 4,
            }}
          >
            {subBlocks.length} 段
          </span>
        </div>
        <button
          type="button"
          className="ed-locked-zone-unlock"
          onClick={handleDelete}
          disabled={deleting}
          title="整體刪除這個送出批次 (從 Supabase 移除對應 LOCK 範圍)"
          style={{ background: "#dc2626", color: "white", border: "none", cursor: "pointer" }}
        >
          {deleting ? "⏳ 刪除中..." : "🗑 整體刪除"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #dc2626",
            color: "#7f1d1d",
            padding: "8px 12px",
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* 🅒 8-8 聖上拍板: 「2段直接以圖文呈現」— 每個 sub block 用「圖+文」方式渲染 */}
      <div style={{ paddingLeft: 4 }}>
        {subBlocks.map((sb, j) => (
          <div
            key={j}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              alignItems: "flex-start",
            }}
          >
            {/* 圖 (若有) */}
            {sb.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sb.imageUrl}
                alt=""
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 4,
                  border: "1px solid #fde68a",
                  flexShrink: 0,
                }}
                loading="lazy"
              />
            )}
            {/* 文 (依 type 渲染) */}
            {sb.type === "h1" && (
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  fontStyle: "italic",
                  color: "#1e293b",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                {sb.text}
              </h2>
            )}
            {sb.type === "h2" && (
              <h3
                style={{
                  fontSize: 17,
                  color: "#92400e",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                {sb.text}
              </h3>
            )}
            {sb.type === "quote" && (
              <blockquote
                style={{
                  margin: 0,
                  padding: "8px 14px",
                  borderLeft: "3px solid #f59e0b",
                  background: "#fffbeb",
                  color: "#1e293b",
                  fontStyle: "italic",
                  flex: 1,
                }}
              >
                {sb.text}
              </blockquote>
            )}
            {sb.type === "p" && (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#1e293b",
                  lineHeight: 1.6,
                  fontFamily:
                    "var(--font-noto-serif-tc), 'Noto Serif TC', serif",
                  flex: 1,
                }}
              >
                {sb.text}
              </p>
            )}
            {sb.type === "image" && !sb.text && (
              <span style={{ color: "#92400e", fontSize: 12 }}>📷 純圖</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
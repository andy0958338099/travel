// � 2026-08-05 聖上拍板: D1 完稿徽章 — 從 Supabase 讀 polished_text,
//   顯示「✅ 有完稿 · Vogue 風」+ 「📖 閱讀完稿」連結
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface PolishedMeta {
  polishedText: string;
  polishedAt: string;
  polishedBy: string;
}

export default function D1PolishedBadge() {
  const [meta, setMeta] = useState<PolishedMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from("story_blog_drafts")
      .select("polished_text, polished_at, polished_by")
      .eq("id", "d1")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.polished_text) {
          setMeta({
            polishedText: data.polished_text,
            polishedAt: data.polished_at ?? "",
            polishedBy: data.polished_by ?? "",
          });
        }
        setLoading(false);
      });
  }, []);

  if (loading) return null;
  if (!meta) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #f59e0b",
          marginTop: 12,
        }}
      >
        📝 待潤稿
      </span>
    );
  }

  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 700,
          background: "#059669",
          color: "white",
          letterSpacing: 1,
        }}
      >
        ✅ 完稿 · Vogue 風
      </span>
      {meta.polishedBy && (
        <span style={{ fontSize: 11, color: "#6a6a6a" }}>
          潤稿者 {meta.polishedBy}
        </span>
      )}
      <Link
        href="/travel/story-blog/d1/read"
        style={{
          marginLeft: "auto",
          padding: "6px 14px",
          background: "#c41e3a",
          color: "white",
          textDecoration: "none",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        📖 閱讀完稿 →
      </Link>
    </div>
  );
}

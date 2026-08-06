// 🅒 2026-08-06 聖上拍板: read page 改為 Server Component
//   - 之前 "use client" + useEffect fetch → SSR 永遠顯示「載入中...」
//   - 現在 server-side fetch Supabase → SSR 直接含 Vogue HTML + 潤稿內容
//   - EXIF hydrate 拆到 ReadExifHydrator.tsx (client component)
//
// 🅒 2026-08-05 聖上拍板: D1 完稿閱讀頁 — 從 Supabase 讀 polished_text + Vogue 渲染
// 🅒 2026-08-06 聖上拍板: append 累積 polished_text, read page 顯示所有送出段累積

import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { parseBlocks, renderBlocksHtml } from "../d1-shared";
import ReadExifHydrator from "./ReadExifHydrator";

export const dynamic = "force-dynamic"; // SSR 每次 fetch 最新 Supabase 內容

export default async function D1ReadPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_blog_drafts")
    .select("polished_text, polished_at, polished_by")
    .eq("id", "d1")
    .maybeSingle();

  const polished = data?.polished_text ?? "";
  const polishedBy = data?.polished_by ?? "";
  const polishedAt = data?.polished_at ?? "";

  // 沒完稿 → 顯示引導空狀態
  if (!polished) {
    return (
      <main style={{ padding: 60, maxWidth: 640, margin: "0 auto", textAlign: "center", fontFamily: "'Noto Serif TC', serif" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, fontStyle: "italic", margin: "0 0 16px" }}>
          D1 · 7/17
        </h1>
        <p style={{ fontSize: 18, color: "#6a6a6a", marginBottom: 24 }}>
          📝 D1 還沒潤稿完成
        </p>
        <Link
          href="/travel/story-blog/d1/edit"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "#c41e3a",
            color: "white",
            textDecoration: "none",
            borderRadius: 6,
            fontWeight: 700,
          }}
        >
          ✍️ 前往編輯後台
        </Link>
      </main>
    );
  }

  // 有完稿 → Vogue 渲染 (SSR 直接含內容, 不用等 client fetch)
  const html = renderBlocksHtml(parseBlocks(polished));

  return (
    <div className="vd-root">
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap"
        rel="stylesheet"
      />
      <header className="vd-masthead">
        <div className="vd-container" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <div className="vd-logo">VOGUE</div>
          <div className="vd-meta">江南水鄉 · 八日 · 2026</div>
        </div>
      </header>
      <section className="vd-hero">
        <div className="vd-container">
          {/* 🅒 8-6 聖上拍板: 移除 Day One kicker (太冗) + 潤稿者 metadata */}
          {/*   - deck 只顯示「最後潤稿時間 + 留有江南水鄉八日2026」字串 */}
          <p className="vd-deck">
            {polishedAt
              ? `${new Date(polishedAt).toLocaleString("zh-TW")}  留有江南水鄉八日2026`
              : "留有江南水鄉八日2026"}
          </p>
          <div style={{ marginTop: 16 }}>
            <Link
              href="/travel/story-blog/d1/edit"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "rgba(255,255,255,0.2)",
                border: "1px solid white",
                color: "white",
                textDecoration: "none",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✍️ 繼續編輯
            </Link>
            <Link
              href="/travel/story-blog"
              style={{
                display: "inline-block",
                marginLeft: 12,
                padding: "8px 16px",
                color: "rgba(255,255,255,0.7)",
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              ← 回到總覽
            </Link>
          </div>
        </div>
      </section>
      <section className="vd-content">
        <div className="vd-container">
          {/* 🅒 8-6: Vogue HTML 直接 SSR render, EXIF hydrate 由 client component 補 */}
          <div className="vd-rendered" dangerouslySetInnerHTML={{ __html: html }} />
          <ReadExifHydrator />
        </div>
      </section>
    </div>
  );
}
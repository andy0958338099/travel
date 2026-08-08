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
// 🅒 8-8 聖上拍板: read page 改回 SSR Vogue editorial-row 渲染 (圖左文右 / 圖右文左)
//   - 之前 edit page 的 Vogue 預覽 modal 用 renderBlocksHtml 渲染
//   - 聖上後來要逐段編輯 (ReadBlockList), 但把 Vogue 排版破壞了
//   - 8-8 第三次拍板: 刪除逐段編輯, 改回 SSR renderBlocksHtml (Vogue 風完整呈現)
//   - 要改內容請回 edit page 編輯後重新 confirm
import "./read-page.css";
import "../edit/editor.css";
import ReadExifHydrator from "./ReadExifHydrator";

export const dynamic = "force-dynamic"; // SSR 每次 fetch 最新 Supabase 內容

export default async function D1ReadPage() {
  const supabase = await createClient();
  // 🅒 8-8 聖上拍板: read page 讀取「聖上已 confirm 的完稿」(text 欄位的 LOCK 段)
  //   - text 欄位: 編輯後台 [✅ Confirm 潤稿完成] 寫入的 LOCK 段 (聖上真正確認的內容)
  //   - polished_text 欄位: 之前測試的累積垃圾 (read page 編輯可另外存)
  //   - 之前 read page 讀 polished_text 邏輯已廢, 聖上要的是「真正 confirm 完稿」
  const { data } = await supabase
    .from("story_blog_drafts")
    .select("text, polished_at, polished_by")
    .eq("id", "d1")
    .maybeSingle();

  const textContent = data?.text ?? "";
  const polishedAt = data?.polished_at ?? "";

  // 🅒 8-8 (三改): 用 parseBlocks → filter locked → renderBlocksHtml
  //   - renderBlocksHtml 是 d1-shared.ts 內建的 Vogue 編輯風渲染器
  //   - 自動處理: 圖左文右 (偶數 idx), 圖右文左 (奇數 idx)
  //   - SSR 直接含 HTML, 不需 client-side 編輯 (聖上已撤銷逐段編輯功能)
  const allBlocks = parseBlocks(textContent);
  const lockedBlocks = allBlocks.filter((b) => b.status === "locked");

  // 沒完稿 → 顯示引導空狀態
  if (lockedBlocks.length === 0) {
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

  // SSR Vogue 渲染 (圖文並排 editorial-row)
  const html = renderBlocksHtml(lockedBlocks);

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
          {/* 🅒 8-8 (三改): 改回 SSR Vogue editorial-row 渲染, 移除逐段編輯 UI */}
          <div className="vd-rendered" dangerouslySetInnerHTML={{ __html: html }} />
          <ReadExifHydrator />
        </div>
      </section>
    </div>
  );
}
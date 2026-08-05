// 🅒 2026-08-05 聖上拍板: D1 完稿閱讀頁 — 從 Supabase 讀 polished_text + Vogue 渲染
//   給「不編輯，只想讀」的成員看 — 直接看完整 Vogue 風完稿

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { renderVogueMarkdown, D1_PLACEHOLDER } from "../d1-shared";

export default function D1ReadPage() {
  const [polished, setPolished] = useState<string>("");
  const [polishedBy, setPolishedBy] = useState<string>("");
  const [polishedAt, setPolishedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from("story_blog_drafts")
      .select("polished_text, polished_at, polished_by")
      .eq("id", "d1")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.polished_text) {
          setPolished(data.polished_text);
          setPolishedBy(data.polished_by ?? "");
          setPolishedAt(data.polished_at ?? "");
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main style={{ padding: 60, textAlign: "center", fontFamily: "serif" }}>
        <p style={{ color: "#8a8a8a" }}>載入中…</p>
      </main>
    );
  }

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

  // 有完稿 → Vogue 渲染
  const html = renderVogueMarkdown(polished);

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
          <div className="vd-kicker">Day One · Departure · 完稿</div>
          <p className="vd-deck">
            {polishedBy && <>潤稿者 {polishedBy} · </>}
            {polishedAt && <>{new Date(polishedAt).toLocaleString("zh-TW")}</>}
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
          <div className="vd-rendered" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </section>
    </div>
  );
}

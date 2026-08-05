// 🅒 2026-08-05 聖上拍板: D1 完稿閱讀頁 — 從 Supabase 讀 polished_text + Vogue 渲染
//   給「不編輯，只想讀」的成員看 — 直接看完整 Vogue 風完稿
//   8-5 加 EXIF 數位相框: client fetch D1 photos → 用 data-photo-url 對照 → inject EXIF

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { parseBlocks, renderBlocksHtml } from "../d1-shared";
import { fetchAllPhotos, type TravelPhoto } from "@/utils/travelPhotos";

// 格式化 EXIF chip HTML (聖上要數位相框樣式)
function renderExifChip(photo: TravelPhoto): string {
  const time = photo.datetime_original
    ? new Date(photo.datetime_original).toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "時間不詳";
  const uploader = photo.uploader_name ?? "未標";
  const loc = photo.location_name ?? "未標地點";
  return `<div class="vd-exif-bar">
    <span class="vd-exif-filename">${photo.filename}</span>
    <span class="vd-exif-time">📅 ${time}</span>
    <span class="vd-exif-uploader">👤 ${uploader}</span>
    <span class="vd-exif-loc">📍 ${loc}</span>
  </div>`;
}

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

  // 🅒 8-5: EXIF 數位相框 hydrate — polished 載入後,
  //   fetch D1 photos, 用 data-photo-url 對照, inject EXIF chip 到 <figure>
  useEffect(() => {
    if (!polished) return;
    console.log("[EXIF hydrate] start, polished len:", polished.length);
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchAllPhotos();
        const d1Photos = all.filter((p) => p.day === 1);
        console.log("[EXIF hydrate] got", all.length, "total,", d1Photos.length, "D1");
        if (cancelled) return;
        // url → photo 對照表
        const urlMap = new Map<string, TravelPhoto>();
        for (const p of d1Photos) {
          if (p.google_photos_thumb_url) urlMap.set(p.google_photos_thumb_url, p);
        }
        // 找出所有 figure[data-photo-url] inject EXIF
        const figures = document.querySelectorAll<HTMLElement>(".vd-rendered figure[data-photo-url]");
        console.log("[EXIF hydrate] found", figures.length, "figures in DOM");
        figures.forEach((fig) => {
          const url = fig.dataset.photoUrl;
          if (!url) return;
          const slot = fig.querySelector<HTMLElement>(".vd-exif-slot");
          if (!slot) return;
          const photo = urlMap.get(url);
          if (photo) {
            slot.innerHTML = renderExifChip(photo);
            slot.removeAttribute("data-pending");
            console.log("[EXIF hydrate] injected EXIF for", photo.filename);
          } else {
            slot.innerHTML = '<span class="vd-exif-empty">無 EXIF 資料 (picsum/外部 URL)</span>';
            slot.removeAttribute("data-pending");
            console.log("[EXIF hydrate] no match for", url.slice(-50));
          }
        });
      } catch (e) {
        console.error("[EXIF hydrate] error:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [polished]);

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
  // 🅒 8-5: 用 block system 渲染 — locked 跟 editing 視覺區分
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

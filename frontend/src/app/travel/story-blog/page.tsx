// 🅒 2026-08-05 聖上拍板: Story Blog 總覽 hub + D1 Supabase 共享編輯 + D2-D8 stub
//   8/2 原本標「不寫進 git」, 8/5 聖上拍板「所有用戶專注 D1」整套上線

import Link from "next/link";
import D1PolishedBadge from "./D1PolishedBadge";

export default function StoryBlogIndexPage() {
  const days = [
    {
      n: 1,
      title: "桃園啟程",
      sub: "The Long Goodbye",
      date: "7/17",
      desc: "凌晨桃園 → 上海浦東, 行李箱比人多",
    },
    {
      n: 2,
      title: "上海 → 西塘",
      sub: "Into the Water Town",
      date: "7/18",
      desc: "城市天際線 → 千年水鄉煙雨",
    },
    {
      n: 3,
      title: "西塘 → 烏鎮東柵",
      sub: "The Eastern Gate",
      date: "7/19",
      desc: "白牆黛瓦, 搖櫓船穿過晨霧",
    },
    {
      n: 4,
      title: "烏鎮西柵",
      sub: "The Western Gate",
      date: "7/20",
      desc: "夜宿水閣, 戲台燈影",
    },
    {
      n: 5,
      title: "烏鎮 → 杭州",
      sub: "To the Capital",
      date: "7/21",
      desc: "雷暴冰雹中抵達, 西子湖畔",
    },
    {
      n: 6,
      title: "宋城",
      sub: "Song Dynasty",
      date: "7/22",
      desc: "穿越千年, 杭州宋城千古情",
    },
    {
      n: 7,
      title: "運河宮宴",
      sub: "Grand Canal Feast",
      date: "7/23",
      desc: "京杭大運河夜宴",
    },
    {
      n: 8,
      title: "杭州 → 桃園",
      sub: "Coming Home",
      date: "7/24",
      desc: "告別江南, 行李箱多了伴手禮",
    },
  ];

  return (
    <main style={{ padding: "60px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 48, borderBottom: "2px solid #0a0a0a", paddingBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, textTransform: "uppercase", color: "#c41e3a" }}>
          Vogue Editorial · 8 Days
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: 72,
            margin: "16px 0 8px",
            fontStyle: "italic",
          }}
        >
          江南水鄉八日
        </h1>
        <p style={{ fontSize: 18, color: "#8a8a8a", fontStyle: "italic" }}>
          八個獨立完整故事 · 50-100 張精選照片 · Vogue 編輯風
        </p>
        <div
          style={{
            marginTop: 16,
            background: "#c41e3a",
            color: "white",
            display: "inline-block",
            padding: "6px 12px",
            borderRadius: 4,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          🅒 Preview · 不寫進 git
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {days.map((d) => (
          <Link
            key={d.n}
            href={`/travel/story-blog/d${d.n}/edit`}
            style={{
              display: "block",
              padding: 32,
              border: "1px solid #d4d4d4",
              borderRadius: 8,
              textDecoration: "none",
              color: "#0a0a0a",
              transition: "all 0.2s",
              background: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 11,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: "#c41e3a",
                }}
              >
                Day {d.n} · {d.date}
              </div>
              <div style={{ fontSize: 11, color: "#8a8a8a" }}>編輯 →</div>
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 36,
                margin: "8px 0 4px",
                fontStyle: "italic",
              }}
            >
              {d.sub}
            </h2>
            <div
              style={{
                fontFamily: "'Noto Serif TC', serif",
                fontSize: 20,
                letterSpacing: 4,
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              {d.title}
            </div>
            <p style={{ fontSize: 14, color: "#2a2a2a", margin: 0 }}>{d.desc}</p>
            {/* � 8-5: D1 卡片加完稿徽章 + 閱讀連結 */}
            {d.n === 1 && <D1PolishedBadge />}
          </Link>
        ))}
      </section>
    </main>
  );
}
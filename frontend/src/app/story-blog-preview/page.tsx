// 🅒 2026-08-02 聖上拍板: Vogue 風 story-blog preview — 純靜態示意, 不接真實資料, 不寫進 git
// 路徑: /story-blog-preview (top-level, 不在 /travel/ 內, 避免污染 nav)

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Story Blog Preview (Vogue Mock)",
  description: "Vogue 編輯風 mock — 8 天故事部落格動工前視覺驗收",
};

export default function StoryBlogPreviewPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .vogue-root {
              --ink: #0a0a0a;
              --paper: #fafaf7;
              --accent: #c41e3a;
              --muted: #8a8a8a;
              --rule: #d4d4d4;
              font-family: "Playfair Display", "Noto Serif TC", serif;
              background: var(--paper);
              color: var(--ink);
              line-height: 1.6;
              margin: -32px -16px; /* 撐滿 layout 留白 */
            }
            .vogue-root * { box-sizing: border-box; }
            .vogue-root .container { max-width: 1200px; margin: 0 auto; padding: 0 40px; }
            .vogue-root .masthead {
              border-bottom: 1px solid var(--ink);
              padding: 24px 0;
              display: flex; justify-content: space-between; align-items: baseline;
            }
            .vogue-root .masthead .logo {
              font-family: "Playfair Display", serif;
              font-weight: 900; font-size: 36px; letter-spacing: 4px;
              font-style: italic;
            }
            .vogue-root .masthead .meta {
              font-family: "Playfair Display", serif;
              font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
              color: var(--muted);
            }
            .vogue-root .hero { padding: 80px 0 60px; text-align: center; }
            .vogue-root .hero .kicker {
              font-size: 12px; letter-spacing: 6px; text-transform: uppercase;
              color: var(--accent); margin-bottom: 24px;
            }
            .vogue-root .hero h1 {
              font-family: "Playfair Display", serif;
              font-weight: 900; font-size: 96px; line-height: 0.95;
              letter-spacing: -2px; margin-bottom: 16px;
            }
            .vogue-root .hero h1 .chinese {
              font-family: "Noto Serif TC", serif; font-weight: 700;
              font-size: 48px; display: block; margin-top: 16px; letter-spacing: 8px;
            }
            .vogue-root .hero .deck {
              font-family: "Playfair Display", serif; font-style: italic;
              font-size: 22px; color: var(--muted); margin: 32px auto 0;
              max-width: 700px;
            }
            .vogue-root .feature { margin: 60px 0; }
            .vogue-root .feature img {
              width: 100%; height: 600px; object-fit: cover;
              filter: contrast(1.05) saturate(0.95);
            }
            .vogue-root .feature .caption {
              font-family: "Playfair Display", serif; font-style: italic;
              font-size: 12px; color: var(--muted);
              margin-top: 12px; letter-spacing: 1px;
            }
            .vogue-root .spread {
              display: grid; grid-template-columns: 1fr 1fr;
              gap: 60px; align-items: center; padding: 80px 0;
              border-top: 1px solid var(--rule);
            }
            .vogue-root .spread .text h2 {
              font-family: "Playfair Display", serif;
              font-weight: 700; font-size: 48px; line-height: 1.05;
              margin-bottom: 24px;
            }
            .vogue-root .spread .text .dropcap::first-letter {
              font-family: "Playfair Display", serif;
              font-weight: 900; font-size: 96px; float: left;
              line-height: 0.8; margin: 8px 12px 0 0; color: var(--accent);
            }
            .vogue-root .spread .text p {
              font-family: "Noto Serif TC", serif;
              font-size: 16px; line-height: 1.9; margin-bottom: 16px;
              color: #2a2a2a;
            }
            .vogue-root .spread img { width: 100%; height: 700px; object-fit: cover; }
            .vogue-root .gallery { padding: 60px 0; border-top: 1px solid var(--rule); }
            .vogue-root .gallery .section-head {
              display: flex; justify-content: space-between; align-items: baseline;
              margin-bottom: 40px;
            }
            .vogue-root .gallery .section-head h3 {
              font-family: "Playfair Display", serif; font-weight: 700;
              font-size: 14px; letter-spacing: 4px; text-transform: uppercase;
            }
            .vogue-root .gallery .grid {
              display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
            }
            .vogue-root .gallery .grid .item img {
              width: 100%; aspect-ratio: 3/4; object-fit: cover;
              transition: transform 0.4s ease;
            }
            .vogue-root .gallery .grid .item:hover img { transform: scale(1.03); }
            .vogue-root .gallery .grid .item .label {
              font-family: "Playfair Display", serif; font-style: italic;
              font-size: 11px; color: var(--muted); margin-top: 8px; letter-spacing: 1px;
            }
            .vogue-root .pullquote {
              padding: 100px 60px; text-align: center;
              background: #0a0a0a; color: #fafaf7; margin: 80px 0;
            }
            .vogue-root .pullquote blockquote {
              font-family: "Playfair Display", serif;
              font-style: italic; font-weight: 400;
              font-size: 42px; line-height: 1.2; max-width: 900px; margin: 0 auto;
            }
            .vogue-root .pullquote blockquote .chinese {
              font-family: "Noto Serif TC", serif;
              font-style: normal; font-weight: 700;
              font-size: 28px; display: block; margin-top: 24px;
              letter-spacing: 6px;
            }
            .vogue-root .pullquote cite {
              display: block; margin-top: 32px;
              font-style: normal; font-size: 11px;
              letter-spacing: 4px; text-transform: uppercase;
              color: var(--accent);
            }
            .vogue-root .faces { padding: 60px 0; }
            .vogue-root .faces h2 {
              font-family: "Playfair Display", serif;
              font-weight: 700; font-size: 36px;
              margin-bottom: 40px; text-align: center;
            }
            .vogue-root .faces .grid {
              display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
            }
            .vogue-root .faces .grid .face img {
              width: 100%; aspect-ratio: 1/1; object-fit: cover;
              filter: grayscale(0.2);
            }
            .vogue-root .faces .grid .face .name {
              font-family: "Playfair Display", serif; font-style: italic;
              font-size: 12px; margin-top: 6px; text-align: center;
            }
            .vogue-root .next-day {
              border-top: 1px solid var(--ink);
              padding: 60px 0; display: flex; justify-content: space-between;
            }
            .vogue-root .next-day .arrow { font-size: 32px; font-weight: 700; }
            .vogue-root .next-day .label {
              font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--muted);
            }
            .vogue-root .preview-badge {
              position: fixed; top: 16px; right: 16px;
              background: #c41e3a; color: white;
              padding: 8px 16px; border-radius: 4px;
              font-family: "Playfair Display", serif;
              font-size: 11px; letter-spacing: 2px;
              text-transform: uppercase; font-weight: 700;
              z-index: 9999;
              box-shadow: 0 4px 12px rgba(196, 30, 58, 0.4);
            }
          `,
        }}
      />
      <div className="vogue-root">
        <div className="preview-badge">🅒 Preview · 不寫進 git</div>

        <header className="masthead">
          <div className="container" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <div className="logo">VOGUE</div>
            <div className="meta">江南水鄉 · 八日 · 2026</div>
          </div>
        </header>

        <section className="hero">
          <div className="container">
            <div className="kicker">Day One · Departure</div>
            <h1>
              The Long Goodbye
              <span className="chinese">桃 園 啟 程</span>
            </h1>
            <p className="deck">
              凌晨的桃園機場,十五個家庭把行李箱推成一座小山。從這裡開始,八天的江南水鄉慢慢走,慢慢說。
            </p>
          </div>
        </section>

        <section className="feature">
          <div className="container">
            <img
              src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1600&q=80"
              alt="桃園機場"
            />
            <div className="caption">桃園機場第二航廈 · 06:47 AM · 7 月 17 日清晨 · 攝影 / Brian</div>
          </div>
        </section>

        <section className="spread">
          <div className="container" style={{ display: "contents" }}>
            <div className="text">
              <h2>
                05:30
                <br />
                <span style={{ fontFamily: "'Noto Serif TC',serif", fontSize: 24 }}>
                  十五個家庭,一台遊覽車
                </span>
              </h2>
              <p className="dropcap">
                天還沒亮透,我們已經在大宇家樓下的巷口集合了。每一個行李箱都被塞到極限 — 有人帶了兩隻電鍋,有人帶了一整箱烏龍茶當伴手禮預備。Brian
                拿著點名板一個一個唱名,十五個家庭終於在 06:30
                全部到齊,遊覽車司機阿龍師傅笑著說「你們這團行李比我跑歐洲還多」。
              </p>
              <p>
                車子駛上國道二號的瞬間,天邊剛好開始亮。第一個小時誰都沒說話 — 因為前一天打包到三點才睡。後座的小宇跟宸瑋擠在一起看動畫,阿美已經把圍巾圍好預備等會兒冷氣太強。Brian
                開始翻開他的小筆記本 — 上面密密麻麻寫滿了八天的路線、餐廳電話、導遊緊急聯絡人。
              </p>
              <p>
                <em>「這不是旅行,是一次策展。」</em> 後來他在車上對阿伸這樣說。
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80"
              alt="遊覽車"
            />
          </div>
        </section>

        <section className="pullquote">
          <div className="container">
            <blockquote>
              &ldquo;Every great trip begins with the right luggage.
              <br />
              And the wrong amount of sleep.&rdquo;
              <span className="chinese">— 啟 程 日 · 7 月 17 日 · 05:30 AM</span>
            </blockquote>
            <cite>— Brian, 領隊筆記</cite>
          </div>
        </section>

        <section className="gallery">
          <div className="container">
            <div className="section-head">
              <h3>The Departure · 啟程群像</h3>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted)" }}>8 OF 165</div>
            </div>
            <div className="grid">
              {[
                { url: "photo-1539635278303-d4002c07eae3", label: "阿喜在機場報到櫃台前 / 06:52" },
                { url: "photo-1507003211169-0a1dd7228f2d", label: "吳董與行李箱 / 07:15" },
                { url: "photo-1438761681033-6461ffad8d80", label: "黃倩 / 機場咖啡廳 / 07:30" },
                { url: "photo-1573497019940-1c28c88b4f3e", label: "阿美與圍巾 / 候機室 / 07:45" },
                { url: "photo-1500648767791-00dcc994a43e", label: "大宇 / 候機室閱讀 / 08:10" },
                { url: "photo-1544005313-94ddf0286df2", label: "小宇與宸瑋 / 後座 / 08:30" },
              ].map((p, i) => (
                <div key={i} className="item">
                  <img src={`https://images.unsplash.com/${p.url}?w=600&q=80`} alt={p.label} />
                  <div className="label">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="faces">
          <div className="container">
            <h2>The Travelers · 啟程人物</h2>
            <div className="grid">
              {[
                { url: "photo-1494790108377-be9c29b29330", name: "阿 喜" },
                { url: "photo-1438761681033-6461ffad8d80", name: "黃 倩" },
                { url: "photo-1573496359142-b8d87734a5a2", name: "阿 美" },
                { url: "photo-1580489944761-15a19d654956", name: "阿 茹" },
              ].map((p, i) => (
                <div key={i} className="face">
                  <img src={`https://images.unsplash.com/${p.url}?w=400&q=80`} alt={p.name} />
                  <div className="name">{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="next-day">
          <div
            className="container"
            style={{ display: "flex", justifyContent: "space-between", width: "100%" }}
          >
            <div>
              <div className="label">Day Zero · Cover</div>
              <div className="arrow">←</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="label">Day Two · 上海→西塘</div>
              <div className="arrow">→</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
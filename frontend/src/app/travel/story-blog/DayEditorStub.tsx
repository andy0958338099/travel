// 🅒 2026-08-05 聖上拍板: D2-D8 編輯後台 stub page
//   所有用戶專注 D1 — D2-D8 路徑仍存在, 但點進去看見「D1 才是焦點」提示
//   真正 D2-D8 editor 等聖上之後拍板再建

import Link from "next/link";

interface DayInfo {
  n: number;
  date: string;
  title: string;
  sub: string;
}

export default function DayEditorStub({ day }: { day: DayInfo }) {
  return (
    <div className="ed-stub-root">
      <div className="ed-stub-card">
        <div className="ed-stub-badge">🅒 STUB · 不開放編輯</div>
        <h1 className="ed-stub-title">
          D{day.n} · {day.date}
        </h1>
        <p className="ed-stub-sub">
          {day.title} — <em>{day.sub}</em>
        </p>

        <div className="ed-stub-message">
          <div className="ed-stub-icon">📍</div>
          <h2>D1 才是焦點</h2>
          <p>
            聖上 8/5 拍板：所有用戶先專注於 <strong>D1 桃園啟程</strong> 的編輯。
            <br />
            D{day.n} 的故事內容等 D1 完成後再開啟。
          </p>
          <Link href="/travel/story-blog/d1/edit" className="ed-stub-cta">
            ✍️ 前往 D1 編輯
          </Link>
        </div>

        <div className="ed-stub-back">
          <Link href="/travel/story-blog">← 回到 8 天總覽</Link>
        </div>
      </div>

      <style>{`
        .ed-stub-root {
          min-height: 80vh;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
          background: linear-gradient(135deg, #fafaf7 0%, #f5f1ea 100%);
        }
        .ed-stub-card {
          max-width: 540px; width: 100%;
          background: white;
          border: 2px solid #d4c5a0;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }
        .ed-stub-badge {
          display: inline-block;
          background: #fef3c7; color: #92400e;
          padding: 4px 12px; border-radius: 4px;
          font-size: 12px; font-weight: 600;
          margin-bottom: 16px;
        }
        .ed-stub-title {
          font-family: "Playfair Display", "Noto Serif TC", serif;
          font-size: 36px; font-weight: 700;
          margin: 0 0 8px; color: #1a1a1a;
        }
        .ed-stub-sub {
          font-size: 16px; color: #666;
          margin: 0 0 32px;
        }
        .ed-stub-sub em { color: #c41e3a; font-style: italic; }
        .ed-stub-message {
          padding: 24px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 8px;
          margin-bottom: 24px;
        }
        .ed-stub-icon { font-size: 48px; margin-bottom: 12px; }
        .ed-stub-message h2 {
          font-size: 24px; margin: 0 0 12px;
          font-family: "Playfair Display", "Noto Serif TC", serif;
          color: #78350f;
        }
        .ed-stub-message p {
          font-size: 15px; line-height: 1.6;
          color: #92400e; margin: 0 0 20px;
        }
        .ed-stub-message strong { color: #c41e3a; }
        .ed-stub-cta {
          display: inline-block;
          background: #c41e3a; color: white;
          padding: 12px 32px; border-radius: 6px;
          text-decoration: none; font-weight: 700;
          font-size: 16px;
          transition: background 0.2s;
        }
        .ed-stub-cta:hover { background: #9d1530; }
        .ed-stub-back {
          margin-top: 16px; font-size: 14px;
        }
        .ed-stub-back a {
          color: #666; text-decoration: none;
        }
        .ed-stub-back a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

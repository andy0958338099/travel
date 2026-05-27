"use client";

import { useState, useEffect } from "react";

interface Diary {
  id: number;
  character_id: number;
  title: string;
  content: string;
  mood: string;
  weather: string;
  location: string;
  tags: string;
  related_character_id: number | null;
  created_at: string;
}

interface Character {
  id: number;
  name: string;
  gender: string;
}

const MOOD_EMOJI: Record<string, string> = {
  excited: "🌟", happy: "😊", calm: "☁️", touched: "💗",
  sad: "😢", anxious: "😰", hopeful: "🌱", grateful: "🙏",
};
const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️", cloudy: "☁️", rainy: "🌧️", snowy: "❄️",
  "陰天": "🌥️", "晴天": "☀️", "雨天": "🌧️",
};

const MOOD_COLORS: Record<string, string> = {
  excited: "#f59e0b", happy: "#22c55e", calm: "#3b82f6",
  touched: "#ec4899", sad: "#6b7280", anxious: "#ef4444",
  hopeful: "#8b5cf6", grateful: "#14b8a6",
};

const CHAR_COLORS: Record<number, string> = {
  1: "#ec4899", 3: "#f59e0b", 4: "#06b6d4",
  5: "#8b5cf6", 6: "#22c55e", 7: "#3b82f6", 8: "#f97316",
};

export default function TimelinePage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filterMood, setFilterMood] = useState<string>("all");
  const [filterChar, setFilterChar] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:8000/api/characters").then(r => r.json()).catch(() => []),
      fetch("http://localhost:8000/api/diaries").then(r => r.json()).catch(() => []),
    ]).then(([chars, dias]) => {
      setCharacters(Array.isArray(chars) ? chars : []);
      setDiaries(Array.isArray(dias) ? dias : []);
    });
  }, []);

  const getChar = (id: number) => characters.find(c => c.id === id);
  const filtered = diaries.filter(d =>
    (filterMood === "all" || d.mood === filterMood) &&
    (filterChar === "all" || String(d.character_id) === filterChar)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e0e0e0", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>
          📅 日記時間軸
        </h1>
        <p style={{ color: "#888", margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
          每一篇日記都是角色生命的片段 — 心情、天氣、與誰同行
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <select
          value={filterMood}
          onChange={e => setFilterMood(e.target.value)}
          style={selectStyle}
        >
          <option value="all">所有心情</option>
          {Object.keys(MOOD_EMOJI).map(m => (
            <option key={m} value={m}>{MOOD_EMOJI[m]} {m}</option>
          ))}
        </select>
        <select
          value={filterChar}
          onChange={e => setFilterChar(e.target.value)}
          style={selectStyle}
        >
          <option value="all">所有角色</option>
          {characters.map(c => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        <div style={{ color: "#666", fontSize: "0.85rem", alignSelf: "center" }}>
          共 {filtered.length} 篇日記
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        background: "#111827",
        borderRadius: "16px",
        padding: "1.5rem",
        border: "1px solid #1f2937",
        maxWidth: 900,
      }}>
        {/* ASCII Timeline Header */}
        <pre style={{ color: "#444", fontSize: "0.75rem", marginBottom: "1.5rem", lineHeight: 1.4 }}>
{`┌──────────────────────────────────────────────────────────────────────────────────────┐
│                              📖 日記時間軸 (2026年5月)                                │
└──────────────────────────────────────────────────────────────────────────────────────┘`}
        </pre>

        {/* Vertical Timeline */}
        <div style={{ position: "relative", paddingLeft: "2rem" }}>
          {/* Vertical Line */}
          <div style={{
            position: "absolute",
            left: "1rem",
            top: 0,
            bottom: 0,
            width: "3px",
            background: "linear-gradient(180deg, #3b82f6, #8b5cf6, #ec4899)",
          }} />

          {filtered.map((diary, i) => {
            const char = getChar(diary.character_id);
            const color = CHAR_COLORS[diary.character_id] || "#888";
            const moodColor = MOOD_COLORS[diary.mood] || "#888";
            const moodEmoji = MOOD_EMOJI[diary.mood] || "📝";
            const weatherEmoji = WEATHER_EMOJI[diary.weather] || "🌤️";
            const isLeft = i % 2 === 0;

            return (
              <div key={diary.id} style={{
                position: "relative",
                marginBottom: i === filtered.length - 1 ? 0 : "2rem",
              }}>
                {/* Node */}
                <div style={{
                  position: "absolute",
                  left: "-1.6rem",
                  top: "1rem",
                  width: 20, height: 20,
                  borderRadius: "50%",
                  background: color,
                  border: "3px solid #0a0a0f",
                  zIndex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem",
                }}>
                  {moodEmoji}
                </div>

                {/* Content Card */}
                <div style={{
                  background: "#1f2937",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  borderLeft: `4px solid ${color}`,
                  marginLeft: isLeft ? 0 : "1rem",
                  marginRight: isLeft ? "1rem" : 0,
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${color}, ${color}60)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.9rem", color: "#fff", fontWeight: 700,
                      }}>
                        {char?.name?.[0] || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.95rem" }}>{char?.name}</div>
                        <div style={{ color: "#666", fontSize: "0.75rem" }}>{diary.created_at?.slice(0, 16)}</div>
                      </div>
                    </div>
                    <div style={{
                      background: `${moodColor}30`,
                      color: moodColor,
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}>
                      {moodEmoji} {diary.mood}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 style={{ color: "#fff", fontSize: "1.05rem", margin: "0 0 0.5rem 0", fontWeight: 600 }}>
                    {diary.title}
                  </h3>

                  {/* Content Preview */}
                  <p style={{ color: "#aaa", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>
                    {diary.content?.slice(0, 150)}{diary.content?.length > 150 ? "..." : ""}
                  </p>

                  {/* Meta */}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#666", fontSize: "0.8rem" }}>
                      {weatherEmoji} {diary.weather || "普通"}
                    </span>
                    <span style={{ color: "#666", fontSize: "0.8rem" }}>
                      📍 {diary.location || "未記錄"}
                    </span>
                    {diary.tags && (
                      <span style={{ color: "#666", fontSize: "0.8rem" }}>
                        🏷️ {diary.tags}
                      </span>
                    )}
                    {diary.related_character_id && (
                      <span style={{ color: "#888", fontSize: "0.8rem" }}>
                        👤 #{diary.related_character_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mood Legend */}
      <div style={{
        marginTop: "1.5rem",
        background: "#111827",
        borderRadius: "12px",
        padding: "1rem 1.5rem",
        border: "1px solid #1f2937",
        display: "flex",
        gap: "1.5rem",
        flexWrap: "wrap",
      }}>
        <span style={{ color: "#888", fontSize: "0.85rem" }}>心情圖例：</span>
        {Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
          <span key={mood} style={{ color: MOOD_COLORS[mood] || "#888", fontSize: "0.85rem" }}>
            {emoji} {mood}
          </span>
        ))}
      </div>

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <a href="/automation" style={{ color: "#888", textDecoration: "none", fontSize: "0.85rem" }}>
          ← 返回自動化儀表板
        </a>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#1f2937",
  color: "#e0e0e0",
  border: "1px solid #374151",
  borderRadius: "8px",
  padding: "0.5rem 1rem",
  fontSize: "0.9rem",
  cursor: "pointer",
};
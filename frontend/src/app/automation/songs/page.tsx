"use client";

import { useState, useEffect, useRef } from "react";

interface Song {
  id: number;
  character_id: number;
  title: string;
  song_url: string;
  genre: string | null;
  mood: string | null;
  created_at: string;
}

interface Character {
  id: number;
  name: string;
  gender: string;
  music_genre: string;
  music_mood: string;
  voice_id: string;
}

// 角色顏色
const CHAR_COLORS: Record<number, string> = {
  1: "#e879a9", // 沈予曦
  2: "#7dd3fc", // 簡怡然
  3: "#86efac", // 姜以甯
  4: "#fca5a5", // 陸思珩
  5: "#c4b5fd", // 溫芯蕾
  6: "#fdba74", // 周敘明
  7: "#94a3b8", // 季允辰
};

// 曲風顏色
const GENRE_COLORS: Record<string, string> = {
  ballad: "#3b82f6",
  pop: "#f59e0b",
  electronic: "#8b5cf6",
  rock: "#ef4444",
  jazz: "#6366f1",
  "r&b": "#ec4899",
  "hip-hop": "#22c55e",
  country: "#14b8a6",
  other: "#888888",
};

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [currentPlaying, setCurrentPlaying] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [charsRes, songsRes] = await Promise.all([
        fetch("http://localhost:8000/api/characters"),
        fetch("http://localhost:8000/api/songs"),
      ]);
      if (charsRes.ok) setCharacters(await charsRes.json());
      if (songsRes.ok) setSongs(await songsRes.json());
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  const getCharName = (id: number) => {
    const char = characters.find((c) => c.id === id);
    return char?.name || `角色${id}`;
  };

  const getCharColor = (id: number) => CHAR_COLORS[id] || "#94a3b8";

  // 曲風列表（包含未分類）
  const genreList = ["all", "未分類", "ballad", "pop", "electronic", "rock", "jazz", "r&b", "hip-hop", "country", "other"];

  const filteredSongs = songs.filter((song) => {
    const charMatch = selectedChar === "all" || String(song.character_id) === selectedChar;
    const genreMatch =
      selectedGenre === "all" ||
      (selectedGenre === "未分類" && !song.genre) ||
      song.genre?.toLowerCase() === selectedGenre.toLowerCase();
    return charMatch && genreMatch;
  });

  // 統計
  const totalSongs = songs.length;
  const charCounts = characters.map((c) => ({
    id: c.id,
    name: c.name,
    count: songs.filter((s) => s.character_id === c.id).length,
  }));

  const playSong = (song: Song) => {
    if (currentPlaying === song.id) {
      // 暫停
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // 播放新歌曲
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(song.song_url);
      audio.play().then(() => {
        setCurrentPlaying(song.id);
        setIsPlaying(true);
        audioRef.current = audio;
      }).catch(() => {
        setCurrentPlaying(null);
        setIsPlaying(false);
      });
      audio.onended = () => {
        setCurrentPlaying(null);
        setIsPlaying(false);
        audioRef.current = null;
      };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e0e0e0", padding: "2rem" }}>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .wave-bar { animation: wave 0.5s ease-in-out infinite; }
        .wave-bar:nth-child(1) { animation-delay: 0s; }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>
          🎵 角色音樂廳
        </h1>
        <p style={{ color: "#888", margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
          共 {totalSongs} 首歌曲
          {charCounts.slice(0, 3).map((c) => ` · ${c.name}${c.count > 0 ? ` ${c.count}首` : ""}`).join("")}
          {charCounts.length > 3 && " ..."}
        </p>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: "1.5rem" }}>
        {/* 按角色 */}
        <div style={{ marginBottom: "1rem" }}>
          <span style={{ color: "#666", fontSize: "0.85rem", marginRight: "0.75rem" }}>角色：</span>
          <button
            onClick={() => setSelectedChar("all")}
            style={{
              ...filterBtnStyle,
              background: selectedChar === "all" ? "#8b5cf6" : "#1e293b",
            }}
          >
            全部 ({totalSongs})
          </button>
          {characters.map((char) => {
            const count = songs.filter((s) => s.character_id === char.id).length;
            return (
              <button
                key={char.id}
                onClick={() => setSelectedChar(String(char.id))}
                style={{
                  ...filterBtnStyle,
                  background: selectedChar === String(char.id) ? CHAR_COLORS[char.id] || "#888" : "#1e293b",
                }}
              >
                {char.name} ({count})
              </button>
            );
          })}
        </div>
        {/* 按曲風 */}
        <div>
          <span style={{ color: "#666", fontSize: "0.85rem", marginRight: "0.75rem" }}>曲風：</span>
          {genreList.map((g) => {
            const count = g === "all"
              ? totalSongs
              : g === "未分類"
              ? songs.filter((s) => !s.genre).length
              : songs.filter((s) => s.genre?.toLowerCase() === g.toLowerCase()).length;
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                style={{
                  ...filterBtnStyle,
                  background: selectedGenre === g ? "#06b6d4" : "#1e293b",
                }}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Song Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "1.25rem",
      }}>
        {filteredSongs.map((song) => {
          const isCurrentPlaying = currentPlaying === song.id && isPlaying;
          const charColor = getCharColor(song.character_id);
          const charName = getCharName(song.character_id);
          const genreLabel = song.genre || "未分類";
          const genreColor = GENRE_COLORS[song.genre?.toLowerCase() || "other"] || "#888";

          return (
            <div
              key={song.id}
              style={{
                background: "#1e293b",
                borderRadius: "12px",
                padding: "1.25rem",
                paddingLeft: "1.5rem",
                borderLeft: `4px solid ${charColor}`,
                transition: "all 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#334155")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#1e293b")}
            >
              {/* 播放按鈕與波形 */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <button
                  onClick={(e) => { e.stopPropagation(); playSong(song); }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: isCurrentPlaying ? charColor : "#334155",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    transition: "all 0.2s",
                  }}
                >
                  {isCurrentPlaying ? (
                    <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: 16 }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="wave-bar"
                          style={{ width: 3, background: "#fff", borderRadius: 2 }}
                        />
                      ))}
                    </div>
                  ) : (
                    "▶"
                  )}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                    {song.title}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    {charName}
                  </div>
                </div>
              </div>

              {/* 曲風標籤 */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{
                  background: `${genreColor}30`,
                  color: genreColor,
                  padding: "0.25rem 0.75rem",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}>
                  {genreLabel}
                </span>
                {song.mood && (
                  <span style={{
                    background: "#334155",
                    color: "#94a3b8",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                  }}>
                    {song.mood}
                  </span>
                )}
              </div>

              {/* 日期 */}
              <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                生成日期：{formatDate(song.created_at)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredSongs.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          color: "#64748b",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎵</div>
          <div style={{ fontSize: "1.1rem" }}>目前沒有歌曲</div>
          <div style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>試試切換篩選條件</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <a href="/automation" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>
          ← 返回自動化儀表板
        </a>
      </div>
    </div>
  );
}

const filterBtnStyle: React.CSSProperties = {
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "0.4rem 0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.85rem",
  marginRight: "0.5rem",
  marginBottom: "0.5rem",
  transition: "all 0.2s",
};
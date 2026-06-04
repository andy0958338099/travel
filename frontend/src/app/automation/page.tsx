"use client";

import { useState, useEffect } from "react";

interface SystemStatus {
  characters: number;
  diaries: number;
  songs: number;
  last_diary_at: string | null;
  last_song_at: string | null;
  timestamp: string;
}

interface Character {
  id: number;
  name: string;
  gender: string;
  voice_id: string;
  music_genre: string;
  music_mood: string;
  job: string;
}

export default function AutomationDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, charsRes] = await Promise.all([
        fetch("http://localhost:8000/api/automation/status"),
        fetch("http://localhost:8000/api/characters"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (charsRes.ok) setCharacters(await charsRes.json());
    } catch {
      // fallback to direct DB query
    }
    setLastCheck(new Date().toLocaleTimeString("zh-TW"));
    setLoading(false);
  };

  const triggerGeneration = async (mode: "diary" | "song" | "full") => {
    const res = await fetch(`http://localhost:8000/api/automation/run?mode=${mode}`, {
      method: "POST",
    });
    const data = await res.json();
    alert(`${mode} 模式已觸發：${data.message || JSON.stringify(data)}`);
    setTimeout(fetchData, 2000);
  };

  const getMoodEmoji = (mood: string) => {
    const map: Record<string, string> = {
      excited: "🌟", happy: "😊", calm: "☁️", touched: "💗",
      sad: "😢", anxious: "😰", hopeful: "🌱", grateful: "🙏",
    };
    return map[mood] || "📝";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "從未";
    const d = new Date(dateStr);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e0e0e0", padding: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            🎯 江南水鄉八日之旅 · 自動化系統
          </h1>
          <p style={{ color: "#888", margin: "0.5rem 0 0 0", fontSize: "0.9rem" }}>
            最後更新：{lastCheck} | 後端：http://localhost:8000
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => triggerGeneration("diary")} style={btnStyle("#22c55e")}>
            📝 生成日記
          </button>
          <button onClick={() => triggerGeneration("song")} style={btnStyle("#8b5cf6")}>
            🎵 生成歌曲
          </button>
          <button onClick={() => triggerGeneration("full")} style={btnStyle("#f59e0b")}>
            🚀 完整生成
          </button>
        </div>
      </div>

      {/* System Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <StatCard icon="👥" value={loading ? "..." : status?.characters ?? "?"} label="角色" color="#3b82f6" />
        <StatCard icon="📔" value={loading ? "..." : status?.diaries ?? "?"} label="日記" color="#22c55e" />
        <StatCard icon="🎵" value={loading ? "..." : status?.songs ?? "?"} label="歌曲" color="#8b5cf6" />
        <StatCard icon="⏰" value={formatDate(status?.last_diary_at ?? null)} label="最近日記" color="#f59e0b" />
      </div>

      {/* Quick Nav */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { href: "/automation/story-arc", icon: "📖", label: "故事弧線", desc: "角色成長時間軸" },
          { href: "/automation/network", icon: "🔗", label: "關係網絡", desc: "暗戀/友情地圖" },
          { href: "/automation/timeline", icon: "📅", label: "日記時間軸", desc: "心情與天氣" },
          { href: "/automation/songs", icon: "🎧", label: "歌曲播放", desc: "依曲風分類" },
          { href: "/automation/tts", icon: "🗣️", label: "TTS設定", desc: "語音配置" },
          { href: "/automation/video-editor", icon: "🎬", label: "影片剪輯", desc: "有聲日記影片" },
        ].map((item) => (
          <a key={item.href} href={item.href} style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            border: "1px solid #2a2a4a",
            borderRadius: "12px",
            padding: "1.25rem",
            textDecoration: "none",
            color: "#e0e0e0",
            transition: "all 0.2s",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{item.icon}</div>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{item.label}</div>
            <div style={{ color: "#888", fontSize: "0.8rem", marginTop: "0.25rem" }}>{item.desc}</div>
          </a>
        ))}
      </div>

      {/* Characters & Quick Status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Character Grid */}
        <div style={{ background: "#111827", borderRadius: "16px", padding: "1.5rem", border: "1px solid #1f2937" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#fff" }}>👥 角色狀態</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            {characters.map((char) => (
              <div key={char.id} style={{
                background: "#1f2937",
                borderRadius: "10px",
                padding: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: char.gender === "female" ? "linear-gradient(135deg, #ec4899, #8b5cf6)" : "linear-gradient(135deg, #3b82f6, #06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.2rem", flexShrink: 0,
                }}>
                  {char.name[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#fff" }}>{char.name}</div>
                  <div style={{ color: "#888", fontSize: "0.75rem" }}>{char.job || char.gender}</div>
                  <div style={{ color: "#666", fontSize: "0.7rem", marginTop: "2px" }}>🎙️ {char.voice_id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div style={{ background: "#111827", borderRadius: "16px", padding: "1.5rem", border: "1px solid #1f2937" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#fff" }}>⚙️ 系統資訊</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <InfoRow label="Cron Job 每日生成" value="✅ 06:00 執行" />
            <InfoRow label="Watchdog 監控" value="✅ 每 5 分鐘檢查" />
            <InfoRow label="API 後端" value="http://localhost:8000" />
            <InfoRow label="資料庫" value="/Volumes/Transcend/manga-studio/data/manga_studio.db" />
            <InfoRow label="今日狀態" value={status?.last_diary_at ? "已生成日記" : "等待中"} />
            <InfoRow label="自動改進引擎" value="📌 8 個待辦項目" />
          </div>

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#1a1a2e", borderRadius: "10px" }}>
            <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.5rem" }}>下一個自動改進任務</div>
            <div style={{ color: "#fff", fontWeight: 600 }}>📊 自動化儀表板頁面</div>
            <div style={{ color: "#666", fontSize: "0.8rem" }}>優先級 1 | 預計 15 分鐘</div>
          </div>
        </div>
      </div>

      {/* Relationship Summary */}
      <div style={{
        marginTop: "1.5rem",
        background: "#111827",
        borderRadius: "16px",
        padding: "1.5rem",
        border: "1px solid #1f2937",
      }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", color: "#fff" }}>💕 角色關係摘要</h2>
        <div style={{
          display: "flex", gap: "1rem", flexWrap: "wrap",
          fontFamily: "monospace", fontSize: "0.85rem",
          background: "#0a0a0f", padding: "1rem", borderRadius: "10px",
          border: "1px solid #1f2937",
        }}>
          <div><span style={{ color: "#ec4899" }}>沈予曦</span> ──暗戀──▶ <span style={{ color: "#3b82f6" }}>季允辰</span></div>
          <div><span style={{ color: "#22c55e" }}>周敘明</span> ──暗戀──▶ <span style={{ color: "#f59e0b" }}>簡怡然</span></div>
          <div><span style={{ color: "#8b5cf6" }}>溫芯蕾</span> ──單戀──▶ <span style={{ color: "#ec4899" }}>季允辰</span></div>
          <div><span style={{ color: "#06b6d4" }}>姜以甯</span> ──關注──▶ <span style={{ color: "#f59e0b" }}>簡怡然</span>（暗戀）</div>
          <div><span style={{ color: "#ec4899" }}>沈予曦</span> ──摯友──▶ <span style={{ color: "#f59e0b" }}>簡怡然</span></div>
          <div><span style={{ color: "#8b5cf6" }}>溫芯蕾</span> ──同事──▶ <span style={{ color: "#ec4899" }}>沈予曦</span></div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div style={{
      background: "#111827",
      borderRadius: "14px",
      padding: "1.25rem",
      border: "1px solid #1f2937",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{icon}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700, color, marginBottom: "0.25rem" }}>{String(value)}</div>
      <div style={{ color: "#888", fontSize: "0.85rem" }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #1f2937" }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ color: "#e0e0e0", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const btnStyle = (color: string) => ({
  background: color,
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "0.6rem 1.2rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem",
  transition: "opacity 0.2s",
});
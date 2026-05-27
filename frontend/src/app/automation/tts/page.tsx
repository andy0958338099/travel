"use client";

import { useState, useEffect, useRef } from "react";

interface Voice {
  value: string;
  label: string;
}

interface Character {
  id: number;
  name: string;
  gender: string;
  voice_id: string;
  voice_speed: number;
  voice_pitch: number;
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

export default function TTSPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 試聽實驗室狀態
  const [testVoice, setTestVoice] = useState("");
  const [testText, setTestText] = useState("這是角色沈予曦測試語音，請問今天過得還好嗎？");
  const [testSpeed, setTestSpeed] = useState(1.0);
  const [testPitch, setTestPitch] = useState(0.0);

  // 角色編輯狀態
  const [charSettings, setCharSettings] = useState<Record<number, {
    voice_id: string;
    speed: number;
    pitch: number;
    saved: boolean;
  }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [voicesRes, charsRes] = await Promise.all([
        fetch("http://localhost:8000/api/tts/voices"),
        fetch("http://localhost:8000/api/characters"),
      ]);
      if (voicesRes.ok) {
        const data = await voicesRes.json();
        setVoices(data);
        if (data.length > 0) setTestVoice(data[0].value);
      }
      if (charsRes.ok) {
        const chars = await charsRes.json();
        setCharacters(chars);
        // 初始化角色設定（需要 voices data，所以放在外面確保訪問得到）
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
    // 在 fetchData 最後初始化設定，確保 voices data 在作用域內
    try {
      const [voicesRes2, charsRes2] = await Promise.all([
        fetch("http://localhost:8000/api/tts/voices"),
        fetch("http://localhost:8000/api/characters"),
      ]);
      const voiceData = voicesRes2.ok ? await voicesRes2.json() : [];
      const chars = charsRes2.ok ? await charsRes2.json() : [];
      const settings: Record<number, {voice_id: string; speed: number; pitch: number; saved: boolean}> = {};
      chars.forEach((c: { id: number; voice_id: string; voice_speed: number | null; voice_pitch: number | null }) => {
        settings[c.id] = {
          voice_id: c.voice_id || (voiceData.length > 0 ? voiceData[0].value : ""),
          speed: c.voice_speed ?? 1.0,
          pitch: c.voice_pitch ?? 0.0,
          saved: true,
        };
      });
      setCharSettings(settings);
    } catch (e) {
      console.error("Failed to init settings", e);
    }
    setLoading(false);
  };

  const handlePreview = async () => {
    if (!testVoice || !testText) return;
    setGenerating(true);
    setPlaying(false);
    try {
      const res = await fetch("http://localhost:8000/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText,
          voice_id: testVoice,
          speed: testSpeed,
          pitch: testPitch,
        }),
      });
      if (res.ok) {
        // 等待生成完成後播放
        await new Promise(r => setTimeout(r, 500));
        setPlaying(true);
        const audio = new Audio("/voice_test/test.mp3");
        audio.play().catch(() => {
          setPlaying(false);
          setGenerating(false);
        });
        audio.onended = () => {
          setPlaying(false);
          setGenerating(false);
        };
      }
    } catch (e) {
      console.error("Preview failed", e);
    }
    setGenerating(false);
  };

  const handleSaveCharacter = async (charId: number) => {
    const settings = charSettings[charId];
    if (!settings) return;
    setSavingId(charId);
    try {
      const res = await fetch(`http://localhost:8000/api/characters/${charId}/voice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_id: settings.voice_id,
          speed: settings.speed,
          pitch: settings.pitch,
        }),
      });
      if (res.ok) {
        setCharSettings(prev => ({
          ...prev,
          [charId]: { ...prev[charId], saved: true }
        }));
      }
    } catch (e) {
      console.error("Save failed", e);
    }
    setSavingId(null);
  };

  const updateCharSetting = (charId: number, field: string, value: string | number) => {
    setCharSettings(prev => ({
      ...prev,
      [charId]: { ...prev[charId], [field]: value, saved: false }
    }));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>載入中...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
        }
        .wave-bar { animation: wave 0.5s ease-in-out infinite; }
        .wave-bar:nth-child(1) { animation-delay: 0s; }
        .wave-bar:nth-child(2) { animation-delay: 0.15s; }
        .wave-bar:nth-child(3) { animation-delay: 0.3s; }
        .wave-bar:nth-child(4) { animation-delay: 0.45s; }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          background: #334155;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
        }
        select {
          background: #1e293b;
          color: #fff;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
          cursor: pointer;
          outline: none;
        }
        select:focus {
          border-color: #8b5cf6;
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.breadcrumb}>
          <a href="/automation" style={styles.breadcrumbLink}>Home</a>
          <span style={styles.breadcrumbSep}>→</span>
          <a href="/automation" style={styles.breadcrumbLink}>自動化</a>
          <span style={styles.breadcrumbSep}>→</span>
          <span style={styles.breadcrumbCurrent}>TTS設定</span>
        </div>
        <h1 style={styles.title}>🗣️ TTS 音色設定</h1>
        <p style={styles.subtitle}>配置角色語音參數，選擇適合的音色讓角色開口說話</p>
      </div>

      {/* 兩欄版面 */}
      <div style={styles.twoColumn}>
        {/* 左欄：音色實驗室 */}
        <div style={styles.leftColumn}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>🎤 音色實驗室</h2>
            
            {/* 音色選擇 */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>選擇音色</label>
              <select
                value={testVoice}
                onChange={(e) => setTestVoice(e.target.value)}
                style={styles.select}
              >
                {voices.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* 試聽文字 */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>試聽文字</label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                style={styles.textarea}
                rows={3}
              />
            </div>

            {/* Speed Slider */}
            <div style={styles.fieldGroup}>
              <div style={styles.sliderHeader}>
                <label style={styles.label}>Speed</label>
                <span style={styles.sliderValue}>{testSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={testSpeed}
                onChange={(e) => setTestSpeed(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>0.5</span>
                <span>1.0</span>
                <span>2.0</span>
              </div>
            </div>

            {/* Pitch Slider */}
            <div style={styles.fieldGroup}>
              <div style={styles.sliderHeader}>
                <label style={styles.label}>Pitch</label>
                <span style={styles.sliderValue}>{testPitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.1"
                value={testPitch}
                onChange={(e) => setTestPitch(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>-1.0</span>
                <span>0.0</span>
                <span>+1.0</span>
              </div>
            </div>

            {/* 試聽按鈕 */}
            <button
              onClick={handlePreview}
              disabled={generating || !testVoice}
              style={{
                ...styles.previewBtn,
                opacity: (generating || !testVoice) ? 0.5 : 1,
              }}
            >
              {generating ? (
                <>
                  <span style={styles.spinner} />
                  生成中...
                </>
              ) : playing ? (
                <>
                  <span style={styles.waveContainer}>
                    <div className="wave-bar" style={styles.waveBar} />
                    <div className="wave-bar" style={styles.waveBar} />
                    <div className="wave-bar" style={styles.waveBar} />
                    <div className="wave-bar" style={styles.waveBar} />
                  </span>
                  播放中...
                </>
              ) : (
                <>🔊 試聽</>
              )}
            </button>
          </div>
        </div>

        {/* 右欄：角色音色分配 */}
        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>👥 角色音色分配</h2>
            <div style={styles.charList}>
              {characters.map((char) => {
                const settings = charSettings[char.id] || { voice_id: "", speed: 1.0, pitch: 0.0, saved: true };
                return (
                  <div key={char.id} style={styles.charCard} className="fade-in">
                    {/* 角色名 */}
                    <div style={styles.charInfo}>
                      <div style={{
                        ...styles.charAvatar,
                        background: CHAR_COLORS[char.id] || "#888",
                      }}>
                        {char.name[0]}
                      </div>
                      <span style={{
                        ...styles.charName,
                        color: CHAR_COLORS[char.id] || "#fff",
                      }}>
                        {char.name}
                      </span>
                    </div>

                    {/* 音色選擇 */}
                    <div style={styles.charField}>
                      <select
                        value={settings.voice_id}
                        onChange={(e) => updateCharSetting(char.id, "voice_id", e.target.value)}
                        style={styles.select}
                      >
                        {voices.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Speed */}
                    <div style={styles.charFieldInline}>
                      <label style={styles.inlineLabel}>Speed</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.speed}
                        onChange={(e) => updateCharSetting(char.id, "speed", parseFloat(e.target.value))}
                        style={styles.inlineSlider}
                      />
                      <span style={styles.inlineValue}>{settings.speed.toFixed(1)}</span>
                    </div>

                    {/* Pitch */}
                    <div style={styles.charFieldInline}>
                      <label style={styles.inlineLabel}>Pitch</label>
                      <input
                        type="range"
                        min="-1.0"
                        max="1.0"
                        step="0.1"
                        value={settings.pitch}
                        onChange={(e) => updateCharSetting(char.id, "pitch", parseFloat(e.target.value))}
                        style={styles.inlineSlider}
                      />
                      <span style={styles.inlineValue}>{settings.pitch.toFixed(1)}</span>
                    </div>

                    {/* 儲存按鈕 */}
                    <button
                      onClick={() => handleSaveCharacter(char.id)}
                      disabled={savingId === char.id}
                      style={{
                        ...styles.saveBtn,
                        background: settings.saved ? "#22c55e" : "#8b5cf6",
                      }}
                    >
                      {savingId === char.id ? "儲存中..." : settings.saved ? "✓ 已儲存" : "儲存"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <a href="/automation" style={styles.footerLink}>← 返回自動化儀表板</a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e0e0e0",
    padding: "2rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  loading: {
    textAlign: "center",
    padding: "4rem",
    color: "#888",
    fontSize: "1.2rem",
  },
  header: {
    marginBottom: "2rem",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1rem",
    fontSize: "0.85rem",
  },
  breadcrumbLink: {
    color: "#64748b",
    textDecoration: "none",
  },
  breadcrumbSep: {
    color: "#475569",
  },
  breadcrumbCurrent: {
    color: "#94a3b8",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 700,
    color: "#fff",
    margin: 0,
  },
  subtitle: {
    color: "#64748b",
    margin: "0.5rem 0 0 0",
    fontSize: "0.9rem",
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "40% 60%",
    gap: "1.5rem",
  },
  leftColumn: {},
  rightColumn: {},
  card: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "1.5rem",
    border: "1px solid #334155",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#fff",
    marginBottom: "1.25rem",
    paddingBottom: "0.75rem",
    borderBottom: "1px solid #334155",
  },
  fieldGroup: {
    marginBottom: "1.25rem",
  },
  label: {
    display: "block",
    color: "#94a3b8",
    fontSize: "0.8rem",
    marginBottom: "0.5rem",
    fontWeight: 500,
  },
  select: {
    width: "100%",
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "0.6rem 0.75rem",
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "0.75rem",
    fontSize: "0.85rem",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  sliderValue: {
    color: "#8b5cf6",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  slider: {
    width: "100%",
  },
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    color: "#475569",
    fontSize: "0.7rem",
    marginTop: "0.25rem",
  },
  previewBtn: {
    width: "100%",
    padding: "0.85rem",
    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "all 0.2s",
  },
  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid #fff",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  waveContainer: {
    display: "flex",
    gap: "3px",
    alignItems: "flex-end",
    height: 16,
  },
  waveBar: {
    width: 3,
    background: "#fff",
    borderRadius: 2,
  },
  charList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  charCard: {
    background: "#0f172a",
    borderRadius: "12px",
    padding: "1rem",
    display: "grid",
    gridTemplateColumns: "140px 1fr auto",
    gridTemplateRows: "auto auto",
    gap: "0.75rem 1rem",
    alignItems: "center",
  },
  charInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  charAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1rem",
    color: "#fff",
    flexShrink: 0,
  },
  charName: {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  charField: {
    minWidth: 0,
  },
  charFieldInline: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  inlineLabel: {
    color: "#64748b",
    fontSize: "0.75rem",
    width: 40,
    flexShrink: 0,
  },
  inlineSlider: {
    flex: 1,
    minWidth: 80,
  },
  inlineValue: {
    color: "#8b5cf6",
    fontWeight: 600,
    fontSize: "0.8rem",
    width: 35,
    textAlign: "right",
    flexShrink: 0,
  },
  saveBtn: {
    padding: "0.5rem 1rem",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    gridColumn: "3",
    gridRow: "1 / 3",
    alignSelf: "center",
  },
  footer: {
    marginTop: "2rem",
    textAlign: "center",
  },
  footerLink: {
    color: "#475569",
    textDecoration: "none",
    fontSize: "0.85rem",
  },
};
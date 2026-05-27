"use client";

import { useState, useEffect } from "react";

interface Diary {
  id: number;
  title: string;
  content: string;
  character_id: number;
  character_name: string;
}

interface Character {
  id: number;
  name: string;
  character_number: string;
  image_path: string;
  voice_id?: string;
}

interface PortfolioImage {
  id: number;
  image_path: string;
  scene_type: string;
  scene_description: string;
}

const API = "http://localhost:8000/api";

export default function VideoEditorPage() {
  const [step, setStep] = useState<"select" | "generating" | "done">("select");
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>([]);

  const [selectedDiaryId, setSelectedDiaryId] = useState<number | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [selectedImagePath, setSelectedImagePath] = useState<string>("");
  const [autoSubtitle, setAutoSubtitle] = useState<boolean>(true);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  useEffect(() => {
    fetch(`${API}/diaries`)
      .then(r => r.json())
      .then(data => setDiaries(Array.isArray(data) ? data : (data.diaries || [])));
    fetch(`${API}/characters`)
      .then(r => r.json())
      .then(data => setCharacters(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (!selectedCharId) return;
    fetch(`${API}/characters/${selectedCharId}/portfolio`)
      .then(r => r.json())
      .then(data => setPortfolioImages(Array.isArray(data) ? data : (data.images || [])));
  }, [selectedCharId]);

  const selectedDiary = diaries.find(d => d.id === selectedDiaryId);
  const selectedChar = characters.find(c => c.id === selectedCharId);

  async function handleGenerateClip() {
    if (!selectedDiaryId || !selectedCharId || !selectedImagePath) {
      setError("請選擇日記、角色與圖片");
      return;
    }

    setStep("generating");
    setError("");
    setLogs([]);
    setVideoUrl("");

    try {
      // Step 1: 生成 TTS 配音
      addLog("🎙 開始生成語音配音...");
      setProgress("生成語音配音中...");
      const voiceRes = await fetch(`${API}/diaries/${selectedDiaryId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice_id: selectedChar?.voice_id || "Chinese (Mandarin)_Warm_Girl",
        }),
      });
      const voiceData = await voiceRes.json();
      if (!voiceData.audio_url) throw new Error(voiceData.detail || "音頻生成失敗");
      const audioUrl = voiceData.audio_url;
      const audioPath = voiceData.audio_path; // 實體路徑供 Whisper 使用
      addLog(`✅ 語音生成完成: ${audioUrl}`);
      setProgress("語音生成完成，自動生成字幕中...");

      // Step 2: Whisper 自動生成字幕
      let subtitleText = "";
      if (autoSubtitle && audioPath) {
        addLog("🔤 使用 Whisper 自動生成字幕...");
        setProgress("Whisper 自動生成字幕中...");
        const subRes = await fetch(`${API}/whisper/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio_path: audioPath,
            language: "zh",
            model: "base",
          }),
        });
        const subData = await subRes.json();
        if (!subData.success) {
          addLog(`⚠️ 字幕生成失敗: ${subData.error}，將不使用字幕`);
        } else {
          addLog(`✅ 字幕生成完成`);
        }
      }

      // Step 3: FFmpeg 合成影片
      addLog("🎬 開始合成影片...");
      setProgress("合成影片中...");
      const clipRes = await fetch(`${API}/video/editor/compose-clip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_path: selectedImagePath,
          audio_path: audioPath || audioUrl.replace("/diary_audio/", "/Volumes/Transcend/manga-studio/data/diary_audio/"),
          subtitle_text: autoSubtitle ? undefined : undefined, // 讓後端自己燒 SRT
          output_name: `diary_clip_${selectedDiaryId}_${Date.now()}`,
        }),
      });
      const clipData = await clipRes.json();
      if (!clipData.success) throw new Error(clipData.error || "影片合成失敗");
      addLog(`✅ 影片合成完成: ${clipData.clip_url}`);
      setVideoUrl(clipData.clip_url);
      setStep("done");
      addLog("🎉 完成！");
      setProgress("");
    } catch (e: any) {
      setError("錯誤: " + (e.message || "未知錯誤"));
      addLog(`❌ 錯誤: ${e.message || e}`);
      setStep("select");
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
          🎬 影片剪輯器 — 日記有聲影片
        </h1>
        <span style={{ fontSize: "12px", background: "#ede9fe", color: "#7c3aed", padding: "2px 10px", borderRadius: "99px", fontWeight: 600 }}>
          TTS + Whisper 自動字幕
        </span>
      </div>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f88", borderRadius: "8px", padding: "12px", marginBottom: "16px", color: "#c00", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {step === "select" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* 說明卡 */}
          <div style={{ background: "linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%)", borderRadius: "12px", padding: "16px 20px", display: "flex", gap: "24px", fontSize: "13px", color: "#444" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "18px" }}>🎙</span>
              <span>TTS 配音</span>
            </div>
            <div style={{ color: "#aaa" }}>→</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "18px" }}>🔤</span>
              <span>Whisper 自動字幕</span>
            </div>
            <div style={{ color: "#aaa" }}>→</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "18px" }}>🎬</span>
              <span>FFmpeg 合成</span>
            </div>
          </div>

          {/* Step 1: 選擇日記 */}
          <section style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ background: "#6366f1", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>1</span>
              選擇日記
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
              {diaries.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDiaryId(d.id)}
                  style={{
                    padding: "10px",
                    border: selectedDiaryId === d.id ? "2px solid #6366f1" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: selectedDiaryId === d.id ? "#eef" : "#fff",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{d.title}</div>
                  <div style={{ color: "#888", fontSize: "12px" }}>{d.character_name}</div>
                </button>
              ))}
            </div>
            {diaries.length === 0 && <p style={{ color: "#999", fontSize: "13px" }}>尚無日記資料</p>}
          </section>

          {/* Step 2: 選擇角色 */}
          <section style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ background: "#6366f1", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>2</span>
              選擇角色
            </h2>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {characters.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCharId(c.id)}
                  style={{
                    padding: "10px 16px",
                    border: selectedCharId === c.id ? "2px solid #6366f1" : "1px solid #ddd",
                    borderRadius: "8px",
                    background: selectedCharId === c.id ? "#eef" : "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {characters.length === 0 && <p style={{ color: "#999", fontSize: "13px" }}>尚無角色資料</p>}
          </section>

          {/* Step 3: 選擇圖片 */}
          <section style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ background: "#6366f1", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>3</span>
              選擇角色圖片
            </h2>
            {selectedCharId ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
                {portfolioImages.map(img => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImagePath(img.image_path)}
                    style={{
                      padding: "4px",
                      border: selectedImagePath === img.image_path ? "2px solid #6366f1" : "1px solid #ddd",
                      borderRadius: "8px",
                      background: selectedImagePath === img.image_path ? "#eef" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={img.image_path.startsWith("/") ? img.image_path : "/" + img.image_path}
                      alt={img.scene_description}
                      style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: "6px" }}
                    />
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "2px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {img.scene_type}
                    </div>
                  </button>
                ))}
                {portfolioImages.length === 0 && (
                  <p style={{ color: "#999", fontSize: "13px", gridColumn: "1/-1" }}>
                    此角色尚無影集圖片，請先至角色影集頁面生成
                  </p>
                )}
              </div>
            ) : (
              <p style={{ color: "#999", fontSize: "13px" }}>請先選擇角色</p>
            )}
          </section>

          {/* Step 4: 字幕選項 */}
          <section style={{ background: "#f9f9f9", borderRadius: "12px", padding: "16px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ background: "#6366f1", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>4</span>
              字幕選項
            </h2>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoSubtitle}
                onChange={e => setAutoSubtitle(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              <span>🔤 使用 Whisper 自動從語音生成字幕</span>
            </label>
            <p style={{ color: "#888", fontSize: "12px", marginTop: "6px", marginLeft: "28px" }}>
              會自動為配音生成 SRT 字幕檔並燒入影片（需要 30-90 秒）
            </p>
          </section>

          <button
            onClick={handleGenerateClip}
            disabled={!selectedDiaryId || !selectedCharId || !selectedImagePath}
            style={{
              padding: "14px",
              background: selectedDiaryId && selectedCharId && selectedImagePath ? "#6366f1" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: selectedDiaryId && selectedCharId && selectedImagePath ? "pointer" : "not-allowed",
            }}
          >
            🎬 開始生成影片（含自動字幕）
          </button>
        </div>
      )}

      {step === "generating" && (
        <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>生成中...</h2>
          <p style={{ color: "#666", marginBottom: "16px", fontSize: "14px" }}>{progress}</p>

          {/* 日誌輸出 */}
          <div style={{ background: "#1a1a2e", borderRadius: "8px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#a5f3fc", maxHeight: "300px", overflowY: "auto" }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: "4px" }}>{log}</div>
            ))}
            <div style={{ color: "#4ade80", marginTop: "8px" }}>▋</div>
          </div>
        </div>
      )}

      {step === "done" && videoUrl && (
        <div style={{ textAlign: "center", padding: "24px", background: "#f9f9f9", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>✅ 影片生成完成！</h2>
          <video
            controls
            src={videoUrl}
            style={{ width: "100%", maxWidth: "640px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
          />
          <div style={{ marginTop: "16px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setStep("select"); setVideoUrl(""); setLogs([]); setError(""); }}
              style={{ padding: "10px 20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              再次製作
            </button>
            <a
              href={videoUrl}
              download
              style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", textDecoration: "none" }}
            >
              ⬇️ 下載影片
            </a>
          </div>

          {/* 操作日誌 */}
          <details style={{ marginTop: "24px", textAlign: "left" }}>
            <summary style={{ cursor: "pointer", color: "#666", fontSize: "13px" }}>📋 查看生成日誌</summary>
            <div style={{ background: "#1a1a2e", borderRadius: "8px", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#a5f3fc", marginTop: "8px" }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: "4px" }}>{log}</div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
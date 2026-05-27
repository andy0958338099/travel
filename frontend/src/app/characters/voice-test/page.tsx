"use client";
import { useState, useEffect, useRef } from "react";
import { getCharacters, listTTSVoices, getCharacterVoice, updateCharacterVoice, testTTS, TTSVoice, Character } from "@/lib/api";

export default function VoiceTestPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingCharacterId, setPlayingCharacterId] = useState<number | null>(null);
  const [savingCharacterId, setSavingCharacterId] = useState<number | null>(null);
  const [testingCharacterId, setTestingCharacterId] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [characterVoices, setCharacterVoices] = useState<Record<number, string>>({});
  // per-character speed/pitch settings
  const [characterSpeed, setCharacterSpeed] = useState<Record<number, number>>({});
  const [characterPitch, setCharacterPitch] = useState<Record<number, number>>({});
  const [filterLang, setFilterLang] = useState<string>("全部");
  const [filterGender, setFilterGender] = useState<string>("全部");
  const [searchVoice, setSearchVoice] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chars, voiceList] = await Promise.all([
        getCharacters(),
        listTTSVoices(),
      ]);
      setCharacters(chars);
      setVoices(voiceList);

      // 載入每個角色的當前音色
      const voiceMap: Record<number, string> = {};
      const speedMap: Record<number, number> = {};
      const pitchMap: Record<number, number> = {};
      for (const char of chars) {
        try {
          const v = await getCharacterVoice(char.id);
          voiceMap[char.id] = v.voice_id;
        } catch {
          voiceMap[char.id] = "Chinese (Mandarin)_Warm_Girl";
        }
        // 預設 speed=1.0, pitch=0
        speedMap[char.id] = 1.0;
        pitchMap[char.id] = 0;
      }
      setCharacterVoices(voiceMap);
      setCharacterSpeed(speedMap);
      setCharacterPitch(pitchMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    return `http://localhost:8000${imagePath.replace("/Volumes/Transcend/manga-studio", "")}`;
  };

  const filteredVoices = voices.filter((v) => {
    const matchLang = filterLang === "全部" || v.lang === filterLang;
    const matchGender = filterGender === "全部" || v.gender === filterGender;
    const matchSearch = !searchVoice || v.id.toLowerCase().includes(searchVoice.toLowerCase()) || v.name.toLowerCase().includes(searchVoice.toLowerCase());
    return matchLang && matchGender && matchSearch;
  });

  // 為每個角色產生預設測試文字
  const getDefaultText = (charName: string) => {
    const texts: Record<string, string> = {
      "雨桐": "嗨，你好呀！今天天氣超好的，很適合出去走走呢～你最近在忙什麼呀？",
      "羽晨": "早安！新的一天又要開始了，我已經準備好迎接所有的挑戰了！",
      "思妍": "嗯...今天的心情有點複雜，不過還是要微笑面對每一天呢。",
    };
    return texts[charName] || `哈囉！我是${charName}，很高興認識你！今天想跟你分享一些有趣的事情～`;
  };

  const handleTestVoice = async (charId: number, text: string, voiceId: string, speed: number, pitch: number) => {
    if (!text.trim()) return;
    setTestingCharacterId(charId);
    setPlayingCharacterId(null);
    try {
      const result = await testTTS(text, voiceId, speed, pitch);
      setAudioUrl(`http://localhost:8000${result.audio_url}?t=${Date.now()}`);
      setPlayingCharacterId(charId);
    } catch (err) {
      console.error(err);
      alert("生成失敗，請稍後再試");
    } finally {
      setTestingCharacterId(null);
    }
  };

  const handleSaveVoice = async (charId: number, voiceId: string) => {
    setSavingCharacterId(charId);
    try {
      await updateCharacterVoice(charId, voiceId);
      setCharacterVoices((prev) => ({ ...prev, [charId]: voiceId }));
      alert("音色已儲存為角色預設！");
    } catch (err) {
      console.error(err);
      alert("儲存失敗");
    } finally {
      setSavingCharacterId(null);
    }
  };

  const getVoiceName = (voiceId: string) => {
    const voice = voices.find((v) => v.id === voiceId);
    return voice ? `${voice.name} (${voice.lang})` : voiceId;
  };

  const currentVoiceId = playingCharacterId ? characterVoices[playingCharacterId] : null;
  const currentSpeed = playingCharacterId ? characterSpeed[playingCharacterId] ?? 1.0 : 1.0;
  const currentPitch = playingCharacterId ? characterPitch[playingCharacterId] ?? 0 : 0;

  const speedLabels: Record<number, string> = {
    0.5: "0.5x 慢", 0.75: "0.75x 較慢", 1.0: "1.0x 正常",
    1.25: "1.25x 稍快", 1.5: "1.5x 快", 1.75: "1.75x 很快", 2.0: "2.0x 極快",
  };
  const pitchLabels: Record<number, string> = {
    [-12]: "-12 低", [-6]: "-6 較低", [0]: "0 正常", [6]: "+6 較高", [12]: "+12 高",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🎤 音色測試</h1>
            <p className="text-sm text-gray-500 mt-1">為每個角色選擇最合適的音色與參數，試聽滿意後再儲存</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/characters/diaries" className="text-purple-600 hover:underline font-medium">📔 角色日記</a>
            <a href="/characters" className="text-blue-500 hover:underline">← 角色列表</a>
          </div>
        </div>
      </div>

      {/* Global Audio Player */}
      {audioUrl && (
        <div className="sticky top-0 z-50 bg-indigo-600 text-white px-6 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
            <span className="font-medium whitespace-nowrap">
              🎧 {getVoiceName(currentVoiceId || "")}
              {currentSpeed !== 1.0 && <span className="ml-2 text-indigo-200">速度 {speedLabels[currentSpeed] || currentSpeed + "x"}</span>}
              {currentPitch !== 0 && <span className="ml-2 text-indigo-200">音高 {pitchLabels[currentPitch] || currentPitch}</span>}
            </span>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              autoPlay
              className="flex-1 max-w-md h-8"
              onEnded={() => setPlayingCharacterId(null)}
            />
            <button
              onClick={() => { setAudioUrl(null); setPlayingCharacterId(null); }}
              className="text-white hover:text-gray-200 text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {/* Voice Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h2 className="font-medium mb-3">音色篩選</h2>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-xs text-gray-500 mr-2">語言：</label>
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="全部">全部</option>
                <option value="中文">中文</option>
                <option value="English">英文</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mr-2">性別：</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="全部">全部</option>
                <option value="female">女聲</option>
                <option value="male">男聲</option>
                <option value="neutral">中性</option>
              </select>
            </div>
            <div className="flex-1">
              <input
                placeholder="搜尋音色..."
                value={searchVoice}
                onChange={(e) => setSearchVoice(e.target.value)}
                className="w-full border rounded px-3 py-1 text-sm"
              />
            </div>
            <span className="text-xs text-gray-400">
              共 {filteredVoices.length} 個音色可選
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">載入中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {characters.map((char) => {
              const imageUrl = getImageUrl(char.image_path);
              const currentVoice = characterVoices[char.id] || "Chinese (Mandarin)_Warm_Girl";
              const currentCharSpeed = characterSpeed[char.id] ?? 1.0;
              const currentCharPitch = characterPitch[char.id] ?? 0;
              const isTesting = testingCharacterId === char.id;
              const isSaving = savingCharacterId === char.id;
              const isPlaying = playingCharacterId === char.id;

              return (
                <div key={char.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* 角色抬頭 */}
                  <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
                    {imageUrl ? (
                      <img src={imageUrl} alt={char.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">?</div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{char.name}</h3>
                      <p className="text-sm text-gray-500">
                        目前音色：{getVoiceName(currentVoice)}
                      </p>
                    </div>
                    {isPlaying && (
                      <span className="ml-auto text-indigo-600 animate-pulse">🔊 播放中</span>
                    )}
                  </div>

                  {/* 測試區 */}
                  <div className="p-4 space-y-3">
                    {/* 測試文字 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">測試文字</label>
                      <textarea
                        id={`text-${char.id}`}
                        defaultValue={getDefaultText(char.name)}
                        className="w-full border rounded-lg p-2 text-sm h-20 resize-none"
                        placeholder="輸入想測試的文字..."
                      />
                    </div>

                    {/* 音色選擇 */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">選擇音色</label>
                      <select
                        value={currentVoice}
                        onChange={(e) => setCharacterVoices((prev) => ({ ...prev, [char.id]: e.target.value }))}
                        className="w-full border rounded-lg p-2 text-sm"
                        size={1}
                      >
                        {filteredVoices.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.lang === "中文" ? "🗣 " : "🗨 "}{v.name} [{v.gender === "female" ? "女" : v.gender === "male" ? "男" : "中"}] {v.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Speed 控制 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">語速 (Speed)</label>
                        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {speedLabels[currentCharSpeed] || currentCharSpeed + "x"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 whitespace-nowrap">慢</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.25"
                          value={currentCharSpeed}
                          onChange={(e) => setCharacterSpeed((prev) => ({ ...prev, [char.id]: parseFloat(e.target.value) }))}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">快</span>
                      </div>
                    </div>

                    {/* Pitch 控制 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">音高 (Pitch)</label>
                        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {pitchLabels[currentCharPitch] || (currentCharPitch > 0 ? "+" + currentCharPitch : currentCharPitch)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 whitespace-nowrap">低</span>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="3"
                          value={currentCharPitch}
                          onChange={(e) => setCharacterPitch((prev) => ({ ...prev, [char.id]: parseInt(e.target.value) }))}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-400 whitespace-nowrap">高</span>
                      </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          const text = (document.getElementById(`text-${char.id}`) as HTMLTextAreaElement)?.value;
                          handleTestVoice(char.id, text || getDefaultText(char.name), currentVoice, currentCharSpeed, currentCharPitch);
                        }}
                        disabled={isTesting}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          isTesting
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : isPlaying
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                      >
                        {isTesting ? "🔊 生成中..." : isPlaying ? "🔊 重新播放" : "▶ 試聽音色"}
                      </button>
                      <button
                        onClick={() => handleSaveVoice(char.id, currentVoice)}
                        disabled={isSaving}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          isSaving
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {isSaving ? "儲存中..." : "💾 儲存為預設"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {characters.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-20">還沒有角色，請先新增角色</p>
        )}
      </div>
    </div>
  );
}

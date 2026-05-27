"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getCharacters,
  getCharacterSongs,
  generateCharacterSong,
  deleteSong,
  getMusicGenres,
  getMusicMoods,
  getMusicTempos,
  Character,
} from "@/lib/api";
import MVConceptModal from "@/components/mv-concept-modal";

interface Song {
  id: number;
  character_id: number;
  title: string;
  song_path: string | null;
  song_url: string | null;
  prompt: string;
  genre: string;
  mood: string;
  tempo: string;
  duration: number;
  lyrics: string | null;
  song_type: string;
  status: string;
  created_at: string;
  character_number?: string;
  character_name?: string;
}

interface MusicOption {
  value: string;
  label: string;
}

export default function CharacterSongsPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [genres, setGenres] = useState<MusicOption[]>([]);
  const [moods, setMoods] = useState<MusicOption[]>([]);
  const [tempos, setTempos] = useState<MusicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mvModalSong, setMvModalSong] = useState<{id: number, title: string} | null>(null);

  // Form state
  const [songForm, setSongForm] = useState({
    title: "",
    song_type: "theme",
    genre: "pop",
    mood: "warm",
    tempo: "medium",
    duration: 60,
    lyrics: "",
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedChar) {
      loadSongs(selectedChar.id);
      // Set default title
      setSongForm((prev) => ({
        ...prev,
        title: `${selectedChar.name} 的主題曲`,
        genre: selectedChar.music_genre || "pop",
        mood: selectedChar.music_mood || "warm",
        tempo: selectedChar.music_tempo || "medium",
      }));
    }
  }, [selectedChar]);

  const loadInitialData = async () => {
    try {
      const [chars, genreData, moodData, tempoData] = await Promise.all([
        getCharacters(),
        getMusicGenres(),
        getMusicMoods(),
        getMusicTempos(),
      ]);
      setCharacters(chars);
      setGenres(genreData);
      setMoods(moodData);
      setTempos(tempoData);
      if (chars.length > 0) {
        setSelectedChar(chars[0]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSongs = async (charId: number) => {
    try {
      const data = await getCharacterSongs(charId);
      setSongs(data);
    } catch (error) {
      console.error("Failed to load songs:", error);
    }
  };

  const handleGenerateSong = async () => {
    if (!selectedChar) return;

    setGenerating(true);
    try {
      await generateCharacterSong(selectedChar.id, songForm);
      await loadSongs(selectedChar.id);
      setShowModal(false);
      setSongForm({
        title: `${selectedChar.name} 的主題曲`,
        song_type: "theme",
        genre: selectedChar.music_genre || "pop",
        mood: selectedChar.music_mood || "warm",
        tempo: selectedChar.music_tempo || "medium",
        duration: 60,
        lyrics: "",
      });
    } catch (error) {
      console.error("Failed to generate song:", error);
      alert("生成失敗");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSong = async (songId: number) => {
    if (!confirm("確定要刪除這首歌曲嗎？")) return;
    try {
      await deleteSong(songId);
      if (selectedChar) {
        await loadSongs(selectedChar.id);
      }
    } catch (error) {
      console.error("Failed to delete song:", error);
      alert("刪除失敗");
    }
  };

  const getSongTypeLabel = (type: string) => {
    return type === "theme" ? "主題曲" : "背景音樂";
  };

  const getSongTypeBadgeColor = (type: string) => {
    return type === "theme" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/characters" className="text-blue-500 hover:underline">
                ← 返回角色管理
              </Link>
              <h1 className="text-2xl font-bold">🎵 角色音樂</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Character List */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="font-semibold mb-4">選擇角色</h2>
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedChar(char)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedChar?.id === char.id
                        ? "bg-blue-50 border-2 border-blue-500"
                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {char.character_number}
                      </div>
                      <div>
                        <div className="font-medium">{char.name}</div>
                        <div className="text-xs text-gray-500">
                          {char.music_genre || "流行"} · {char.music_mood || "溫暖"}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {characters.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    尚無角色
                    <Link href="/characters" className="block text-blue-500 mt-2">
                      前往創建 →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedChar ? (
              <div className="bg-white rounded-lg shadow-sm">
                {/* Character Header */}
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                        {selectedChar.character_number}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{selectedChar.name}</h2>
                        <p className="text-gray-500 text-sm mt-1">
                          {selectedChar.core_features?.slice(0, 100)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <span>🎵</span> 生成新歌曲
                    </button>
                  </div>

                  {/* Music Settings Summary */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    <div className="bg-gray-50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">音樂類型</span>
                      <div className="font-medium">{selectedChar.music_genre || "流行"}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">音樂情緒</span>
                      <div className="font-medium">{selectedChar.music_mood || "溫暖"}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-2">
                      <span className="text-xs text-gray-500">節奏</span>
                      <div className="font-medium">{selectedChar.music_tempo || "中速"}</div>
                    </div>
                    {selectedChar.voice_description && (
                      <div className="bg-gray-50 rounded-lg px-4 py-2">
                        <span className="text-xs text-gray-500">音色</span>
                        <div className="font-medium">{selectedChar.voice_description}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Songs List */}
                <div className="p-6">
                  <h3 className="font-semibold mb-4">已生成的歌曲 ({songs.length})</h3>
                  {songs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {songs.map((song) => (
                        <div
                          key={song.id}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{song.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded ${getSongTypeBadgeColor(
                                    song.song_type
                                  )}`}
                                >
                                  {getSongTypeLabel(song.song_type)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDuration(song.duration)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteSong(song.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              刪除
                            </button>
                          </div>

                          {/* Song Info */}
                          <div className="text-sm text-gray-600 space-y-1">
                            {song.genre && <div>類型：{song.genre}</div>}
                            {song.mood && <div>情緒：{song.mood}</div>}
                            {song.tempo && <div>節奏：{song.tempo}</div>}
                          </div>

                          {/* Status */}
                          {song.status === "generating" && (
                            <div className="mt-3 flex items-center gap-2 text-blue-500">
                              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                              <span className="text-sm">生成中...</span>
                            </div>
                          )}

                          {/* Audio Player */}
                          {song.status === "completed" && song.song_url && (
                            <div className="mt-3">
                              <audio
                                controls
                                className="w-full h-8"
                                src={song.song_url}
                              />
                            </div>
                          )}

                          {/* Lyrics Display */}
                          {song.status === "completed" && song.lyrics && (
                            <div className="mt-3">
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                                  <span className="transition-transform group-open:rotate-90">▶</span>
                                  查看歌詞
                                </summary>
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                                  {song.lyrics}
                                </div>
                              </details>
                            </div>
                          )}

                          {/* MV Concept Button */}
                          {song.status === "completed" && (
                            <button
                              onClick={() => setMvModalSong({ id: song.id, title: song.title })}
                              className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center justify-center gap-2"
                            >
                              <span>🎬</span>
                              MV 腳本
                            </button>
                          )}

                          <div className="text-xs text-gray-400 mt-2">
                            {new Date(song.created_at).toLocaleString("zh-TW")}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-5xl mb-4">🎶</div>
                      <p>尚未為這個角色生成歌曲</p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="mt-4 text-blue-500 hover:underline"
                      >
                        點擊生成第一首歌曲 →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🎵</div>
                <h2 className="text-xl font-semibold mb-2">選擇一個角色</h2>
                <p className="text-gray-500">從左側列表選擇角色以管理其音樂</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Song Modal */}
      {showModal && selectedChar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {selectedChar.character_number}
                  </span>
                  <h2 className="text-xl font-bold">為 {selectedChar.name} 生成歌曲</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Character Music Identity */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                <h3 className="font-medium mb-2 text-sm text-gray-600">角色音樂屬性</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">類型：</span>
                    <span className="font-medium">{selectedChar.music_genre || "流行"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">情緒：</span>
                    <span className="font-medium">{selectedChar.music_mood || "溫暖"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">節奏：</span>
                    <span className="font-medium">{selectedChar.music_tempo || "中速"}</span>
                  </div>
                </div>
                {selectedChar.voice_description && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">音色：</span>
                    <span className="font-medium">{selectedChar.voice_description}</span>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">歌曲標題</label>
                  <input
                    type="text"
                    value={songForm.title}
                    onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="輸入歌曲標題"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">歌曲類型</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="song_type"
                        value="theme"
                        checked={songForm.song_type === "theme"}
                        onChange={(e) =>
                          setSongForm({ ...songForm, song_type: e.target.value })
                        }
                      />
                      主題曲
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="song_type"
                        value="bgm"
                        checked={songForm.song_type === "bgm"}
                        onChange={(e) =>
                          setSongForm({ ...songForm, song_type: e.target.value })
                        }
                      />
                      背景音樂
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">音樂類型</label>
                  <select
                    value={songForm.genre}
                    onChange={(e) => setSongForm({ ...songForm, genre: e.target.value })}
                    className="w-full border p-2 rounded"
                  >
                    {genres.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">音樂情緒</label>
                  <select
                    value={songForm.mood}
                    onChange={(e) => setSongForm({ ...songForm, mood: e.target.value })}
                    className="w-full border p-2 rounded"
                  >
                    {moods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">節奏</label>
                  <select
                    value={songForm.tempo}
                    onChange={(e) => setSongForm({ ...songForm, tempo: e.target.value })}
                    className="w-full border p-2 rounded"
                  >
                    {tempos.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">時長（秒）</label>
                  <select
                    value={songForm.duration}
                    onChange={(e) =>
                      setSongForm({ ...songForm, duration: parseInt(e.target.value) })
                    }
                    className="w-full border p-2 rounded"
                  >
                    <option value={30}>30 秒</option>
                    <option value={60}>60 秒</option>
                    <option value={120}>120 秒</option>
                    <option value={180}>180 秒</option>
                    <option value={300}>300 秒</option>
                  </select>
                </div>

                {songForm.song_type === "theme" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      歌詞（可選，用英文填寫）
                    </label>
                    <textarea
                      value={songForm.lyrics}
                      onChange={(e) => setSongForm({ ...songForm, lyrics: e.target.value })}
                      className="w-full border p-2 rounded h-24"
                      placeholder="輸入歌詞（可選）"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateSong}
                disabled={generating}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {generating ? "生成中..." : "🎵 生成歌曲"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MV Concept Modal */}
      {mvModalSong && (
        <MVConceptModal
          songId={mvModalSong.id}
          songTitle={mvModalSong.title}
          onClose={() => setMvModalSong(null)}
        />
      )}
    </div>
  );
}

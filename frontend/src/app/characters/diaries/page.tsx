'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  getFemaleCharacters,
  getCharacterDiaries,
  createDiary,
  deleteDiary,
  getDiaryMoods,
  getDiaryWeathers,
  getDiaryLocations,
  getDiaryTags,
  getCharacters,
  generateDiary,
  listTTSVoices,
  getDiaryAudio,
  generateDiaryAudio,
  getCharacterVoice,
  updateCharacterVoice,
  TTSVoice,
} from '@/lib/api';

interface Diary {
  id: number;
  character_id: number;
  title: string;
  content: string;
  mood: string;
  weather: string;
  location: string;
  tags: string[];
  related_character_id: number | null;
  related_character_name: string | null;
  character_name: string;
  character_number: string;
  is_published?: number;
  created_at: string;
  updated_at: string;
}

interface DiaryCharacter {
  id: number;
  character_number: string;
  name: string;
  diary_count?: number;
}

interface Option {
  value: string;
  label: string;
  icon?: string;
}

export default function DiariesPage() {
  const [femaleChars, setFemaleChars] = useState<DiaryCharacter[]>([]);
  const [allCharacters, setAllCharacters] = useState<DiaryCharacter[]>([]);
  const [selectedChar, setSelectedChar] = useState<DiaryCharacter | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContinuation, setShowContinuation] = useState(false);
  const [loadingContinuation, setLoadingContinuation] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    mood: '',
    weather: '',
    location: '',
    tags: [] as string[],
    related_character_id: '' as string,
    is_published: 0,
  });

  // Options
  const [moods, setMoods] = useState<Option[]>([]);
  const [weathers, setWeathers] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);

  // TTS 有聲日記 state
  const [ttsVoices, setTtsVoices] = useState<TTSVoice[]>([]);
  const [playingDiaryId, setPlayingDiaryId] = useState<number | null>(null);
  const [characterVoiceId, setCharacterVoiceId] = useState<string>('Chinese (Mandarin)_Warm_Girl');
  const [characterSpeed, setCharacterSpeed] = useState<number>(1.0);
  const [characterPitch, setCharacterPitch] = useState<number>(0.0);
  const [diaryAudioUrls, setDiaryAudioUrls] = useState<Record<number, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [ttsLoadingDiaryId, setTtsLoadingDiaryId] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const voices = await listTTSVoices();
      setTtsVoices(voices);
    } catch (e) {
      console.error('載入音色失敗', e);
    }
  };

  const loadData = async () => {
    try {
      const [chars, moodData, weatherData, locationData, tagData, allChars] = await Promise.all([
        getFemaleCharacters(),
        getDiaryMoods(),
        getDiaryWeathers(),
        getDiaryLocations(),
        getDiaryTags(),
        getCharacters(),
      ]);
      setFemaleChars(chars);
      setAllCharacters(allChars as unknown as DiaryCharacter[]);
      setMoods(moodData);
      setWeathers(weatherData);
      setLocations(locationData);
      setTags(tagData);

      if (chars.length > 0 && !selectedChar) {
        setSelectedChar(chars[0]);
        loadDiaries(chars[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
      setLoading(false);
    }
  };

  const loadDiaries = async (charId: number) => {
    setLoading(true);
    try {
      const data = await getCharacterDiaries(charId);
      const diaryList = data.diaries || [];
      setDiaries(diaryList);

      // 預先檢查每篇日記的音訊是否存在
      const audioUrls: Record<number, string> = {};
      for (const d of diaryList) {
        try {
          const audioData = await getDiaryAudio(d.id);
          if (audioData.exists && audioData.audio_url) {
            audioUrls[d.id] = audioData.audio_url;
          }
        } catch (e) { /* skip */ }
      }
      setDiaryAudioUrls(audioUrls);
    } catch (error) {
      console.error('載入日記失敗:', error);
      setDiaries([]);
    }
    setLoading(false);
  };

  const handleSelectChar = async (char: DiaryCharacter) => {
    setSelectedChar(char);
    setPlayingDiaryId(null);
    setShowForm(false);

    // 停止正在播放的音訊
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 載入角色預設音色 + speed + pitch
    try {
      const voiceData = await getCharacterVoice(char.id);
      setCharacterVoiceId(voiceData.voice_id || 'Chinese (Mandarin)_Warm_Girl');
      setCharacterSpeed(voiceData.speed ?? 1.0);
      setCharacterPitch(voiceData.pitch ?? 0.0);
    } catch (e) {
      setCharacterVoiceId('Chinese (Mandarin)_Warm_Girl');
      setCharacterSpeed(1.0);
      setCharacterPitch(0.0);
    }

    loadDiaries(char.id);
  };

  // 播放有聲日記
  const handlePlayDiary = async (diary: Diary) => {
    // 如果正在播放同一篇，則停止
    if (playingDiaryId === diary.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingDiaryId(null);
      return;
    }

    // 停止之前播放的
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // 已有音訊 URL，直接播放
    if (diaryAudioUrls[diary.id]) {
      const audio = new Audio(`http://localhost:8000${diaryAudioUrls[diary.id]}`);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingDiaryId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingDiaryId(null);
        audioRef.current = null;
      };
      setPlayingDiaryId(diary.id);
      await audio.play();
      return;
    }

    // 沒有音訊 URL，直接播放（後端會自動套用角色設定的 voice/speed/pitch）
    setTtsLoadingDiaryId(diary.id);
    try {
      // 不傳 voice_id，讓後端自動抓角色的設定
      const data = await generateDiaryAudio(diary.id);
      const newUrl = data.audio_url;
      setDiaryAudioUrls(prev => ({ ...prev, [diary.id]: newUrl }));

      const audio = new Audio(`http://localhost:8000${newUrl}`);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingDiaryId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingDiaryId(null);
        audioRef.current = null;
      };
      setPlayingDiaryId(diary.id);
      setTtsLoadingDiaryId(null);
      await audio.play();
    } catch (e) {
      console.error('生成有聲配音失敗', e);
      setTtsLoadingDiaryId(null);
      alert('生成有聲配音失敗，請稍後再試');
    }
  };

  // 變更角色預設音色
  const handleVoiceChange = async (voiceId: string) => {
    if (!selectedChar) return;
    setCharacterVoiceId(voiceId);
    try {
      await updateCharacterVoice(selectedChar.id, voiceId);
    } catch (e) {
      console.error('儲存音色失敗', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar) return;

    try {
      await createDiary(selectedChar.id, {
        title: formData.title,
        content: formData.content,
        mood: formData.mood,
        weather: formData.weather,
        location: formData.location,
        tags: formData.tags,
        related_character_id: formData.related_character_id ? parseInt(formData.related_character_id) : undefined,
        is_published: formData.is_published,
      });

      // Reset form
      setFormData({
        title: '',
        content: '',
        mood: '',
        weather: '',
        location: '',
        tags: [],
        related_character_id: '',
        is_published: 0,
      });
      setShowForm(false);

      // Reload diaries
      loadDiaries(selectedChar.id);
    } catch (error) {
      console.error('創建日記失敗:', error);
      alert('創建日記失敗');
    }
  };

  const handleDeleteDiary = async (diaryId: number) => {
    if (!confirm('確定要刪除這篇日記嗎？')) return;

    try {
      await deleteDiary(diaryId);
      if (selectedChar) {
        loadDiaries(selectedChar.id);
      }
    } catch (error) {
      console.error('刪除日記失敗:', error);
      alert('刪除失敗');
    }
  };

  const handleGenerateWithAI = async (direction: string) => {
    if (!selectedChar) return;
    setLoadingContinuation(true);
    try {
      const data = await generateDiary(selectedChar.id, direction);
      // Fill form with generated content
      setFormData(prev => ({
        ...prev,
        title: data.title || '',
        content: data.content || '',
        mood: data.mood_value || '',
        weather: data.weather || '',
        location: data.location || '',
        tags: data.tags || [],
      }));
      setShowContinuation(false);
      setShowForm(true);
    } catch (error) {
      console.error('生成日記失敗:', error);
      alert('生成失敗，請稍後再試');
    }
    setLoadingContinuation(false);
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const getMoodIcon = (moodValue: string) => {
    const mood = moods.find(m => m.value === moodValue);
    return mood?.icon || '📝';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/characters" className="text-blue-500 hover:underline">
              ← 返回角色管理
            </Link>
            <h1 className="text-2xl font-bold">📔 角色日記</h1>
            <span className="text-sm text-gray-500">
              {femaleChars.length > 0
                ? `共 ${femaleChars.length} 位女性角色擁有日記`
                : '載入中...'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Character List */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">👧 女性角色</h2>
              {femaleChars.length === 0 ? (
                <p className="text-gray-500 text-sm">目前沒有女性角色</p>
              ) : (
                <div className="space-y-2">
                  {femaleChars.map(char => (
                    <button
                      key={char.id}
                      onClick={() => handleSelectChar(char)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedChar?.id === char.id
                          ? 'bg-pink-100 border-2 border-pink-300'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-medium">{char.name}</div>
                      <div className="text-xs text-gray-500">
                        {char.character_number} · {char.diary_count || 0} 篇日記
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow p-4 mt-4">
              <h3 className="font-medium text-sm text-gray-600 mb-3">快速連結</h3>
              <div className="space-y-2">
                <Link href="/characters/songs" className="block text-pink-600 hover:underline text-sm">
                  🎵 角色音樂
                </Link>
                <Link href="/characters/gallery" className="block text-blue-600 hover:underline text-sm">
                  📖 角色圖集
                </Link>
              </div>
            </div>

            {/* 音色選擇器 */}
            {selectedChar && (
              <div className="bg-white rounded-lg shadow p-4 mt-4">
                <h3 className="font-medium text-sm text-gray-600 mb-3">🎤 日記音色</h3>
                <select
                  value={characterVoiceId}
                  onChange={e => setCharacterVoiceId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {ttsVoices.map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>語速</span>
                    <span className="font-mono text-indigo-600">{characterSpeed}x</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>音高</span>
                    <span className="font-mono text-indigo-600">
                      {characterPitch > 0 ? '+' : ''}{characterPitch}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  切換音色 / 調整參數請至
                </p>
                <a
                  href="/characters/voice-test"
                  className="text-xs text-pink-600 hover:underline font-medium"
                  target="_blank"
                >
                  🎤 音色測試頁面 →
                </a>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedChar ? (
              <>
                {/* Character Header */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedChar.name}</h2>
                      <p className="text-gray-500">{selectedChar.character_number} 的日記集</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowContinuation(true)}
                        className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
                      >
                        ✨ AI 續寫
                      </button>
                      <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition"
                      >
                        {showForm ? '取消撰寫' : '✏️ 寫日記'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* New Diary Form */}
                {showForm && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="font-bold text-lg mb-4">撰寫新日記</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          標題 *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="今天發生了什麼事..."
                          required
                        />
                      </div>

                      {/* Content */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          內容 *
                        </label>
                        <textarea
                          value={formData.content}
                          onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 h-40 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="寫下今天的心情故事..."
                          required
                        />
                      </div>

                      {/* Mood & Weather */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            心情
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {moods.map(mood => (
                              <button
                                key={mood.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, mood: mood.value }))}
                                className={`px-3 py-1 rounded-full text-sm ${
                                  formData.mood === mood.value
                                    ? 'bg-pink-500 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                {mood.icon} {mood.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            天氣
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {weathers.map(weather => (
                              <button
                                key={weather.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, weather: weather.value }))}
                                className={`px-3 py-1 rounded-full text-sm ${
                                  formData.weather === weather.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                              >
                                {weather.icon} {weather.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          地點
                        </label>
                        <select
                          value={formData.location}
                          onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="">選擇地點...</option>
                          {locations.map(loc => (
                            <option key={loc.value} value={loc.value}>
                              {loc.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Related Character */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          記錄互動的對象
                        </label>
                        <select
                          value={formData.related_character_id}
                          onChange={e => setFormData(prev => ({ ...prev, related_character_id: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="">選擇角色...</option>
                          {allCharacters
                            .filter(c => c.id !== selectedChar.id)
                            .map(char => (
                              <option key={char.id} value={char.id}>
                                {char.name} ({char.character_number})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          標籤
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {tags.map(tag => (
                            <button
                              key={tag.value}
                              type="button"
                              onClick={() => handleTagToggle(tag.value)}
                              className={`px-3 py-1 rounded-full text-sm ${
                                formData.tags.includes(tag.value)
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                            >
                              {tag.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Publish Toggle */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_published"
                          checked={formData.is_published === 1}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            is_published: e.target.checked ? 1 : 0
                          }))}
                          className="w-4 h-4 text-pink-500"
                        />
                        <label htmlFor="is_published" className="text-sm text-gray-700">
                          公開這篇日記
                        </label>
                      </div>

                      {/* Submit */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition"
                        >
                          儲存日記
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForm(false)}
                          className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Diary List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h3 className="font-bold text-lg">日記列表</h3>
                    <p className="text-sm text-gray-500">共 {diaries.length} 篇</p>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-gray-500">載入中...</div>
                  ) : diaries.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="text-4xl mb-2">📝</p>
                      <p>還沒有寫過日記</p>
                      <p className="text-sm">點擊「寫日記」開始記錄吧！</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {diaries.map(diary => (
                        <div key={diary.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Header */}
                              <div className="flex items-center gap-2 mb-2">
                                {diary.mood && (
                                  <span className="text-xl">{getMoodIcon(diary.mood)}</span>
                                )}
                                <h4 className="font-bold text-lg">{diary.title}</h4>
                                {diary.is_published === 1 && (
                                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                                    公開
                                  </span>
                                )}
                              </div>

                              {/* Meta */}
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                                <span>{formatDate(diary.created_at)}</span>
                                {diary.weather && (
                                  <span className="flex items-center gap-1">
                                    {weathers.find(w => w.value === diary.weather)?.icon || '🌤️'}{' '}
                                    {weathers.find(w => w.value === diary.weather)?.label || diary.weather}
                                  </span>
                                )}
                                {diary.location && (
                                  <span>
                                    📍 {locations.find(l => l.value === diary.location)?.label || diary.location}
                                  </span>
                                )}
                              </div>

                              {/* Content Preview */}
                              <p className="text-gray-700 line-clamp-3 mb-2">
                                {diary.content}
                              </p>

                              {/* Tags */}
                              {diary.tags && diary.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {diary.tags.map(tag => (
                                    <span
                                      key={tag}
                                      className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded"
                                    >
                                      #{tags.find(t => t.value === tag)?.label || tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Related Character */}
                              {diary.related_character_name && (
                                <p className="text-sm text-pink-600">
                                  💕 與 {diary.related_character_name} 的互動
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col items-center gap-2 ml-4">
                              {/* 播放有聲日記按鈕 */}
                              <button
                                onClick={() => handlePlayDiary(diary)}
                                disabled={ttsLoadingDiaryId === diary.id}
                                className={`text-sm px-3 py-1 rounded-full transition flex items-center gap-1 ${
                                  playingDiaryId === diary.id
                                    ? 'bg-pink-500 text-white'
                                    : diaryAudioUrls[diary.id]
                                    ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600'
                                }`}
                                title={diaryAudioUrls[diary.id] ? '播放有聲日記' : '生成並播放有聲日記'}
                              >
                                {ttsLoadingDiaryId === diary.id ? (
                                  <>
                                    <span className="animate-spin">⏳</span>
                                    <span className="text-xs">生成中</span>
                                  </>
                                ) : playingDiaryId === diary.id ? (
                                  <>
                                    <span>⏹</span>
                                    <span className="text-xs">停止</span>
                                  </>
                                ) : diaryAudioUrls[diary.id] ? (
                                  <>
                                    <span>🔊</span>
                                    <span className="text-xs">播放</span>
                                  </>
                                ) : (
                                  <>
                                    <span>🎙</span>
                                    <span className="text-xs">配音</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteDiary(diary.id)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                刪除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">📔</p>
                <p>請選擇一位女性角色查看日記</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI 續寫 Modal - 簡化版 */}
      {showContinuation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">✨ AI 幫我寫日記</h2>
                  <p className="text-purple-100 text-sm mt-1">
                    選擇一個方向，AI 會幫你生成完整日記
                  </p>
                </div>
                <button
                  onClick={() => setShowContinuation(false)}
                  className="text-white hover:text-purple-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Direction Buttons */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleGenerateWithAI('love')}
                  disabled={loadingContinuation}
                  className="p-6 bg-pink-50 hover:bg-pink-100 border-2 border-pink-200 hover:border-pink-400 rounded-xl transition text-center group disabled:opacity-50"
                >
                  <div className="text-4xl mb-2">💕</div>
                  <div className="font-bold text-pink-700 group-hover:text-pink-800">暗戀心事</div>
                  <div className="text-xs text-pink-500 mt-1">心動、期待、害羞</div>
                </button>

                <button
                  onClick={() => handleGenerateWithAI('work')}
                  disabled={loadingContinuation}
                  className="p-6 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl transition text-center group disabled:opacity-50"
                >
                  <div className="text-4xl mb-2">💼</div>
                  <div className="font-bold text-blue-700 group-hover:text-blue-800">工作日常</div>
                  <div className="text-xs text-blue-500 mt-1">壓力、成就、思考</div>
                </button>

                <button
                  onClick={() => handleGenerateWithAI('friendship')}
                  disabled={loadingContinuation}
                  className="p-6 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-xl transition text-center group disabled:opacity-50"
                >
                  <div className="text-4xl mb-2">👫</div>
                  <div className="font-bold text-purple-700 group-hover:text-purple-800">友情互動</div>
                  <div className="text-xs text-purple-500 mt-1">傾訴、陪伴、分享</div>
                </button>

                <button
                  onClick={() => handleGenerateWithAI('daily')}
                  disabled={loadingContinuation}
                  className="p-6 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-xl transition text-center group disabled:opacity-50"
                >
                  <div className="text-4xl mb-2">☀️</div>
                  <div className="font-bold text-green-700 group-hover:text-green-800">日常隨想</div>
                  <div className="text-xs text-green-500 mt-1">平靜、小確幸、感悟</div>
                </button>
              </div>

              {/* Loading State */}
              {loadingContinuation && (
                <div className="mt-6 text-center">
                  <div className="animate-spin text-4xl mb-2">⚙️</div>
                  <p className="text-gray-500">AI 正在為你生成日記...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

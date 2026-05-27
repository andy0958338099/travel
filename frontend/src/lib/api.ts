const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Character types
export interface Character {
  id: number;
  number: string;
  character_number?: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  job: string;
  core_features: string;
  anchor_features: string;
  style: string;
  image_path?: string;
  prompt?: string;
  image_count?: number;
  outfit_options?: string[];
  expression_options?: string[];
  angle_options?: string[];
  // Music fields
  music_genre?: string;
  music_mood?: string;
  music_tempo?: string;
  voice_description?: string;
  theme_tags?: string[];
}

// Character API
export async function getCharacters(): Promise<Character[]> {
  const res = await fetch(`${API_BASE}/characters`);
  return res.json();
}

// Character Gallery API
export async function getCharactersGallery() {
  const res = await fetch(`${API_BASE}/characters/gallery`);
  return res.json();
}

export async function getCharacterGallery(charId: number, type?: string) {
  const url = type
    ? `${API_BASE}/characters/${charId}/gallery?type=${type}`
    : `${API_BASE}/characters/${charId}/gallery`;
  const res = await fetch(url);
  return res.json();
}

export async function getCharacterImages(charId: number) {
  const res = await fetch(`${API_BASE}/characters/${charId}/images`);
  return res.json();
}

export async function deleteCharacter(charId: number) {
  const res = await fetch(`${API_BASE}/characters/${charId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("刪除失敗");
  return res.json();
}

export async function deleteCharacterImage(charId: number, imageId: number) {
  const res = await fetch(`${API_BASE}/characters/${charId}/images/${imageId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("刪除圖片失敗");
  return res.json();
}

// Character Songs API
export async function getCharacterSongs(charId: number) {
  const res = await fetch(`${API_BASE}/characters/${charId}/songs`);
  return res.json();
}

export async function generateCharacterSong(charId: number, data: any) {
  const res = await fetch(`${API_BASE}/characters/${charId}/songs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("生成失敗");
  return res.json();
}

export async function getSong(songId: number) {
  const res = await fetch(`${API_BASE}/songs/${songId}`);
  return res.json();
}

export async function deleteSong(songId: number) {
  const res = await fetch(`${API_BASE}/songs/${songId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("刪除失敗");
  return res.json();
}

// MV Concept APIs
export async function generateMVConcept(songId: number, options?: {
  character_ids?: number[];
  visual_style?: string;
  aspect_ratio?: string;
}) {
  const res = await fetch(`${API_BASE}/songs/${songId}/mv-concept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });
  if (!res.ok) throw new Error("生成 MV 腳本失敗");
  return res.json();
}

export async function getMVConcept(songId: number) {
  const res = await fetch(`${API_BASE}/songs/${songId}/mv-concept`);
  if (!res.ok) throw new Error("取得 MV 腳本失敗");
  return res.json();
}

export async function getMVConceptById(conceptId: number) {
  const res = await fetch(`${API_BASE}/mv-concepts/${conceptId}`);
  if (!res.ok) throw new Error("取得 MV 腳本失敗");
  return res.json();
}

export async function exportMVConcept(conceptId: number, format: 'json' | 'markdown' = 'json') {
  const res = await fetch(`${API_BASE}/mv-concepts/${conceptId}/export?format=${format}`);
  if (!res.ok) throw new Error("匯出 MV 腳本失敗");
  return res.json();
}

export async function getMusicGenres() {
  const res = await fetch(`${API_BASE}/music/genres`);
  return res.json();
}

export async function getMusicMoods() {
  const res = await fetch(`${API_BASE}/music/moods`);
  return res.json();
}

export async function getMusicTempos() {
  const res = await fetch(`${API_BASE}/music/tempos`);
  return res.json();
}

export async function createCharacter(data: any) {
  const res = await fetch(`${API_BASE}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateCharacter(data: any) {
  const res = await fetch(`${API_BASE}/characters/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("生成失敗");
  return res.json();
}

export async function generateCharacterVariant(charId: number, data: any) {
  const res = await fetch(`${API_BASE}/characters/${charId}/generate-variant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("生成變體失敗");
  return res.json();
}

export async function uploadCharacterImage(charId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/characters/${charId}/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

// Scene API
export async function getScenes() {
  const res = await fetch(`${API_BASE}/scenes`);
  return res.json();
}

export async function createScene(data: any) {
  const res = await fetch(`${API_BASE}/scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function uploadSceneImage(sceneId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/scenes/${sceneId}/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

// Episode API
export async function getEpisodes() {
  const res = await fetch(`${API_BASE}/episodes`);
  return res.json();
}

export async function createEpisode(data: any) {
  const res = await fetch(`${API_BASE}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Generation API
export async function generateFrame(data: any) {
  const res = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getJobs() {
  const res = await fetch(`${API_BASE}/jobs`);
  return res.json();
}

// Diary API
export async function getFemaleCharacters() {
  const res = await fetch(`${API_BASE}/characters/female`);
  return res.json();
}

export async function getCharacterDiaries(charId: number, limit = 20, offset = 0) {
  const res = await fetch(`${API_BASE}/characters/${charId}/diaries?limit=${limit}&offset=${offset}`);
  return res.json();
}

export async function createDiary(charId: number, data: {
  title: string;
  content: string;
  mood?: string;
  weather?: string;
  location?: string;
  tags?: string[];
  related_character_id?: number;
  is_published?: number;
}) {
  const res = await fetch(`${API_BASE}/characters/${charId}/diaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("創建日記失敗");
  return res.json();
}

export async function getDiary(diaryId: number) {
  const res = await fetch(`${API_BASE}/diaries/${diaryId}`);
  return res.json();
}

export async function updateDiary(diaryId: number, data: any) {
  const res = await fetch(`${API_BASE}/diaries/${diaryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("更新日記失敗");
  return res.json();
}

export async function deleteDiary(diaryId: number) {
  const res = await fetch(`${API_BASE}/diaries/${diaryId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("刪除日記失敗");
  return res.json();
}

export async function getDiaryMoods() {
  const res = await fetch(`${API_BASE}/diary/moods`);
  return res.json();
}

export async function getDiaryWeathers() {
  const res = await fetch(`${API_BASE}/diary/weathers`);
  return res.json();
}

export async function getDiaryLocations() {
  const res = await fetch(`${API_BASE}/diary/locations`);
  return res.json();
}

export async function getDiaryTags() {
  const res = await fetch(`${API_BASE}/diary/tags`);
  return res.json();
}

export async function getDiaryContinuation(charId: number) {
  const res = await fetch(`${API_BASE}/diary/suggest-continuation/${charId}`);
  return res.json();
}

export async function generateDiary(charId: number, direction: string) {
  const res = await fetch(`${API_BASE}/diary/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_id: charId, direction }),
  });
  return res.json();
}

// Portfolio API
export interface PortfolioImage {
  id: number;
  character_id: number;
  image_path: string;
  thumbnail_path?: string;
  scene_type: string;
  scene_description: string;
  prompt_used: string;
  tags: string[];
  is_reference: number;
  sort_order: number;
  created_at: string;
  character_name?: string;
  character_number?: string;
  // SeedDance Prompt 欄位
  subject_segment?: string;
  setting_segment?: string;
  atmosphere_segment?: string;
  camera_segment?: string;
  technical_segment?: string;
  full_seeddance_prompt?: string;
  location_tags?: string[];
  emotion_tags?: string[];
  action_tags?: string[];
  diary_context?: string;
  seeddance_video_url?: string;
}

export async function getCharacterPortfolio(
  charId: number,
  options?: { scene_type?: string; is_reference?: number }
) {
  let url = `${API_BASE}/characters/${charId}/portfolio`;
  const params = new URLSearchParams();
  if (options?.scene_type) params.append("scene_type", options.scene_type);
  if (options?.is_reference !== undefined) params.append("is_reference", String(options.is_reference));
  if (params.toString()) url += `?${params.toString()}`;
  const res = await fetch(url);
  return res.json();
}

export async function addPortfolioImage(
  charId: number,
  data: { image_path: string; scene_type?: string; scene_description?: string; tags?: string[]; is_reference?: boolean }
) {
  const res = await fetch(`${API_BASE}/characters/${charId}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generatePortfolio(
  charId: number,
  options?: { scene_type?: string; count?: number; reference_paths?: string[] }
) {
  const res = await fetch(`${API_BASE}/characters/${charId}/portfolio/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });
  return res.json();
}

// 只生成 SeedDance 提示詞（不生成圖片）
export async function generatePortfolioPrompt(
  charId: number,
  options?: { scene_type?: string; scene_description?: string }
) {
  const res = await fetch(`${API_BASE}/characters/${charId}/portfolio/generate-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });
  return res.json();
}

export async function updatePortfolioImage(
  charId: number,
  portfolioId: number,
  data: { scene_type?: string; scene_description?: string; tags?: string[]; is_reference?: boolean; sort_order?: number; seeddance_video_url?: string }
) {
  const res = await fetch(`${API_BASE}/characters/${charId}/portfolio/${portfolioId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePortfolioImage(charId: number, portfolioId: number) {
  const res = await fetch(`${API_BASE}/characters/${charId}/portfolio/${portfolioId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function getAllReferenceImages() {
  const res = await fetch(`${API_BASE}/portfolio/reference-images`);
  return res.json();
}

// 搜尋角色影集圖片
export async function searchPortfolioImages(charId: number, query: string) {
  const res = await fetch(
    `${API_BASE}/characters/${charId}/portfolio/search?q=${encodeURIComponent(query)}`
  );
  return res.json();
}

// 上傳 SeedDance 影片到影集項目
export async function uploadPortfolioVideo(
  charId: number,
  portfolioId: number,
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${API_BASE}/characters/${charId}/portfolio/${portfolioId}/video`,
    {
      method: "POST",
      body: formData,
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "上傳失敗");
  }
  return res.json();
}

// ============ 日記有聲配音 TTS ============

export interface TTSVoice {
  id: string;
  name: string;
  gender: string;
  lang: string;
  quality?: string;
}

// 列出所有可用音色
export async function listTTSVoices(): Promise<TTSVoice[]> {
  const res = await fetch(`${API_BASE}/tts/voices`);
  return res.json();
}

// 取得日記音訊 URL
export async function getDiaryAudio(diaryId: number): Promise<{ audio_url: string | null; exists: boolean }> {
  const res = await fetch(`${API_BASE}/diaries/${diaryId}/audio`);
  return res.json();
}

// 為日記生成有聲配音
export async function generateDiaryAudio(
  diaryId: number,
  voiceId?: string
): Promise<{ audio_url: string }> {
  const res = await fetch(`${API_BASE}/diaries/${diaryId}/audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(voiceId ? { voice_id: voiceId } : {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "生成有聲配音失敗");
  }
  return res.json();
}

// 取得角色預設音色 + speed + pitch
export async function getCharacterVoice(characterId: number): Promise<{ voice_id: string; speed: number; pitch: number }> {
  const res = await fetch(`${API_BASE}/characters/${characterId}/voice`);
  return res.json();
}

// 更新角色預設音色 + speed + pitch
export async function updateCharacterVoice(
  characterId: number,
  voiceId: string,
  speed: number = 1.0,
  pitch: number = 0.0
): Promise<{ success: boolean; voice_id: string; speed: number; pitch: number }> {
  const res = await fetch(`${API_BASE}/characters/${characterId}/voice`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voice_id: voiceId, speed, pitch }),
  });
  return res.json();
}

// 測試 TTS 音色（輸入文字試聽）
export async function testTTS(
  text: string,
  voiceId: string,
  speed: number = 1.0,
  pitch: number = 0.0
): Promise<{ audio_url: string }> {
  const res = await fetch(`${API_BASE}/tts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId, speed, pitch }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "TTS 生成失敗");
  }
  return res.json();
}

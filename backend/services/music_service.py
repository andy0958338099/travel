import aiohttp
import asyncio
import base64
import time
import json
import random
import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

class MiniMaxMusicService:
    """
    MiniMax 音樂生成服務

    特色功能：
    - 根據角色日記動態生成歌詞
    - 融入生活環境與地點
    - 氣音、口氣等獨特唱法
    - 適當加入英文增添潮感
    - 從日常瑣事發想靈感
    - 每個角色有獨特聲線
    """

    def __init__(self):
        self.api_key = os.getenv("MINIMAX_API_KEY", "")
        self.group_id = "197964425"
        self.api_base = os.getenv("MINIMAX_API_URL", "https://api.minimax.io")

    def _parse_diary_text(self, content: str) -> str:
        """過濾日記內容，移除內心OS標記"""
        if not content:
            return ""
        # 過濾掉 [內心OS:xxx] 這類標記
        import re
        cleaned = re.sub(r'\[內心OS:[^\]]*\]', '', content)
        return cleaned.strip()

    def _generate_lyrics_prompt(
        self,
        character: dict,
        diary_entries: List[dict],
        inspiration: str = None
    ) -> dict:
        """
        根據角色日記生成歌詞 prompt

        核心重點：
        - 以角色的個人心境故事為基礎
        - 融入真實的情感經歷
        - 保持角色獨特的聲線特色
        - 自然加入英文點綴
        - 歌曲長度由模型根據內容決定（不限制）
        """
        name = character.get("name", "角色")
        job = character.get("job", "")
        personality = character.get("personality", "")
        voice_desc = character.get("voice_description", "")
        music_mood = character.get("music_mood", "温柔")

        # 分析日記內容，提取故事片段
        story_snippets = []
        emotions = []
        locations = []

        for diary in diary_entries[-5:]:  # 取最近5篇
            mood = diary.get("mood", "")
            location = diary.get("location", "")
            content = self._parse_diary_text(diary.get("content", ""))
            title = diary.get("title", "")

            if mood:
                emotions.append(mood)
            if location:
                locations.append(location)
            if content:
                # 取完整的一段作為故事片段
                story_snippets.append(f"「{title}」：{content[:200]}")

        # 決定主要情緒方向
        if emotions:
            dominant_mood = max(set(emotions), key=emotions.count)
        else:
            dominant_mood = music_mood

        # 根據角色名稱獲取特定元素
        voice_styles = {
            "沈予曦": "帶有氣音的溫柔嗓音，說話時帶著輕微的尾音上揚，時而喃喃自語",
            "簡怡然": "有力且有活力的聲線，咬字清晰，略帶自信的尾音，健康活力",
            "姜以甯": "清新透亮的嗓音，高音時帶有顫抖的氣音，少女感十足",
            "陸思珩": "低沉且有磁性的嗓音，說話節奏穩重，帶有成熟女性的韻味",
            "溫芯蕾": "柔和慵懶的嗓音，說話像在哼歌，偶爾夾帶氣音，慢節奏",
            "周敘明": "低沉有力，說話簡短有力，運動員的陽光氣息",
            "季允辰": "低沉且帶有空靈感的嗓音，說話節奏緩慢，像在敘事"
        }

        voice_style = voice_styles.get(name, voice_desc or "自然舒適的嗓音")

        # 構建故事敘述（用於歌詞生成）
        story_narrative = "\n".join(story_snippets) if story_snippets else f"{name}的日常心境故事"

        # 英文點綴單字
        english_words = ["baby", "tonight", "moment", "dream", "love", "spark",
                        "light", "night", "feel", "shine", "heart", "soul"]

        # 構建給 MiniMax 歌詞生成 API 的 prompt
        # 這個 prompt 會引導 AI 生成深度歌詞
        lyrics_prompt = f"""為角色「{name}」創作一首深度歌詞的歌曲。

【角色背景】
- 名字：{name}
- 職業：{job}
- 性格：{personality}
- 歌聲特色：{voice_style}

【角色最近的心境故事】
{story_narrative}

【這首歌的核心情緒】
{dominant_mood}

【額外靈感】
{inspiration or '從角色的真實心境出發，描繪一段深刻的情感歷程'}

【歌詞要求】
1. 以角色的第一人稱視角出發
2. 歌詞內容要像在訴說一個真實的故事（自己的暗戀心事、工作挑戰、友情溫暖等）
3. 自然融入角色經歷的具體場景
4. 適當加入英文單字如：{', '.join(random.sample(english_words, 5))}
5. 如果角色有暗戀對象，歌詞要能表達那種「想靠近又不敢靠近」的心情
6. 結構完整：前奏 → 主歌 → 副歌 → 主歌 → 副歌 → 橋段 → 副歌（結尾）
7. 歌曲長度由模型根據情感張力自由決定，不需要人為限制"""

        # 構建音樂 prompt（用於生成曲風）
        music_prompt = f"""Original emotional song for character {name}

Genre: {character.get('music_genre', 'pop ballad')}
Mood: {dominant_mood}
Tempo: {character.get('music_tempo', 'medium')}
Voice style: {voice_style}

The song should tell a personal emotional story, featuring:
- Character's unique singing style ({voice_style})
- Deep personal narrative about their feelings
- Natural mix of Chinese and occasional English words
- Cinematic arrangement that supports the emotional story

This is not a short 1-minute clip - the song should have proper length to tell the full emotional story."""

        return {
            "lyrics_prompt": lyrics_prompt,
            "music_prompt": music_prompt,
            "dominant_mood": dominant_mood,
            "voice_style": voice_style,
            "story_snippets": story_snippets,
            "suggested_title": f"「{name}」的心情故事"
        }

    async def generate_music(
        self,
        prompt: str,
        model: str = "music-2.6",
        duration: int = 60,
        lyrics: str = None
    ) -> dict:
        """
        生成音樂

        Args:
            prompt: 音樂描述 prompt (風格、情緒、場景)
            model: 音樂模型 (music-2.6)
            duration: 音樂時長（秒），最大 300 秒
            lyrics: 歌詞（可選）

        Returns:
            dict: 包含 status, audio_url 等
        """
        url = f"{self.api_base}/v1/music_generation"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # 根據 MiniMax 文件構建 payload
        # output_format: "url" 取得可訪問的音頻 URL
        payload = {
            "model": model,  # music-2.6
            "prompt": prompt,
            "output_format": "url",  # 取得 URL 而不是 hex
            "audio_setting": {
                "sample_rate": 44100,
                "bitrate": 256000,
                "format": "mp3"
            }
        }

        # 如果有歌詞，加入歌詞
        if lyrics:
            payload["lyrics"] = lyrics
        else:
            # 沒有歌詞時，讓系統自動從 prompt 生成歌詞
            payload["lyrics_optimizer"] = True

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers, ssl=False, timeout=aiohttp.ClientTimeout(total=300)) as response:
                    if response.status == 200:
                        result = await response.json()
                        # 檢查 API 回應
                        base_resp = result.get("base_resp", {})
                        status_code = base_resp.get("status_code", -1)
                        if status_code != 0:
                            return {
                                "status": "error",
                                "error": f"API Error {status_code}: {base_resp.get('status_msg', 'Unknown error')}",
                                "result": result
                            }
                        
                        data = result.get("data", {})
                        # 注意：MiniMax API 返回 "audio" 欄位，不是 "audio_url"
                        audio_url = data.get("audio") if data else None
                        
                        return {
                            "status": "success",
                            "result": result,
                            "audio_url": audio_url,
                            "status_info": data.get("status") if data else None
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "status": "error",
                            "error": f"API Error {response.status}: {error_text}"
                        }
        except asyncio.TimeoutError:
            return {"status": "error", "error": "Request timeout (300s)"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def download_audio_to_local(
        self,
        audio_url: str,
        character_id: int,
        song_id: int
    ) -> dict:
        """
        從 URL 下載音樂檔案並儲存到本地硬碟

        Args:
            audio_url: MiniMax 返回的音頻 URL
            character_id: 角色 ID
            song_id: 歌曲 ID

        Returns:
            dict: 包含 local_path 或 error
        """
        # 本地儲存路徑
        songs_dir = Path("/Volumes/Transcend/manga-studio/data/songs")
        songs_dir.mkdir(parents=True, exist_ok=True)

        # 檔案名稱：char_{id}_song_{id}_{timestamp}.mp3
        filename = f"char_{character_id}_song_{song_id}_{int(time.time())}.mp3"
        local_path = songs_dir / filename

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url, ssl=False) as response:
                    if response.status == 200:
                        content = await response.read()
                        with open(local_path, "wb") as f:
                            f.write(content)

                        # 同時複製到 static 目錄供前端訪問
                        static_dir = Path("/Volumes/Transcend/manga-studio/backend/static/songs")
                        static_dir.mkdir(parents=True, exist_ok=True)
                        static_path = static_dir / filename
                        with open(static_path, "wb") as f:
                            f.write(content)

                        return {
                            "status": "success",
                            "local_path": str(local_path),
                            "static_path": f"/songs/{filename}",
                            "file_size": len(content)
                        }
                    else:
                        return {
                            "status": "error",
                            "error": f"Download failed: HTTP {response.status}"
                        }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def generate_lyrics(self, prompt: str, mode: str = "write_full_song") -> dict:
        """
        生成歌詞

        根據給定的主題生成完整歌詞（含 Verse、Chorus、Bridge 等結構）

        Args:
            prompt: 歌詞主題描述
            mode: 生成模式 - write_full_song 或 optimize（優化現有歌詞）

        Returns:
            dict: 包含 lyrics 欄位的回應
        """
        url = f"{self.api_base}/v1/lyrics_generation"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "mode": mode,
            "prompt": prompt
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers, ssl=False, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        result = await response.json()
                        base_resp = result.get("base_resp", {})
                        status_code = base_resp.get("status_code", -1)
                        if status_code != 0:
                            return {
                                "status": "error",
                                "error": f"API Error {status_code}: {base_resp.get('status_msg', 'Unknown error')}",
                                "result": result
                            }
                        
                        # 注意：Lyrics API 的回應格式是直接包含 lyrics，不是 data.lyrics
                        lyrics = result.get("lyrics", "")
                        song_title = result.get("song_title", "")
                        style_tags = result.get("style_tags", "")
                        
                        return {
                            "status": "success",
                            "result": result,
                            "lyrics": lyrics,
                            "song_title": song_title,
                            "style_tags": style_tags
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "status": "error",
                            "error": f"API Error {response.status}: {error_text}"
                        }
        except asyncio.TimeoutError:
            return {"status": "error", "error": "Request timeout"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def generate_character_theme_song(
        self,
        character: dict,
        diary_entries: List[dict] = None,
        inspiration: str = None,
        duration: int = None  # 不再限制，讓模型決定
    ) -> dict:
        """
        為角色生成主題曲

        根據角色的：
        - 日記心情與故事
        - 生活環境地點
        - 氣音、口氣唱法
        - 英文點綴
        - 瑣事靈感
        - 獨特聲線

        注意：歌曲長度由模型根據情感張力自由決定，不人為限制

        Args:
            character: 角色資料
            diary_entries: 角色的日記 entries（用於生成歌詞靈感）
            inspiration: 額外的靈感描述
            duration: 保留參數但不使用，讓模型決定長度
        """
        diary_entries = diary_entries or []

        # 第一步：生成歌詞 prompt（用於構建 MiniMax 歌詞生成 prompt）
        if diary_entries:
            lyrics_data = self._generate_lyrics_prompt(
                character=character,
                diary_entries=diary_entries,
                inspiration=inspiration
            )
            lyrics_prompt = lyrics_data["lyrics_prompt"]
            music_prompt = lyrics_data["music_prompt"]
            suggested_title = lyrics_data.get("suggested_title", f"{character.get('name', '角色')}的主題曲")
            voice_style = lyrics_data.get("voice_style", "")
            story_snippets = lyrics_data.get("story_snippets", [])
        else:
            # 沒有日記時，使用角色基本資料
            name = character.get("name", "角色")
            job = character.get("job", "")
            personality = character.get("personality", "")
            genre = character.get("music_genre", "pop")
            mood = character.get("music_mood", "warm")
            tempo = character.get("music_tempo", "medium")
            voice_desc = character.get("voice_description", "")

            lyrics_prompt = f"""為角色「{name}」創作一首深度歌詞的歌曲。

【角色背景】
- 名字：{name}
- 職業：{job}
- 性格：{personality}
- 歌聲特色：{voice_desc}

【歌詞要求】
1. 以角色的第一人稱視角出發
2. 歌詞內容要像在訴說一個真實的故事
3. 自然融入角色經歷的具體場景
4. 適當加入英文單字點綴
5. 結構完整：前奏 → 主歌 → 副歌 → 主歌 → 副歌 → 橋段 → 副歌（結尾）
6. 歌曲長度由模型根據情感張力自由決定"""

            music_prompt = f"""{genre} music, {mood} mood, {tempo} tempo, featuring {voice_desc} vocals. The song should tell a personal emotional story with proper length to convey the full narrative."""

            suggested_title = f"{name}的心情故事"
            voice_style = voice_desc
            story_snippets = []

        # 第二步：使用 MiniMax Lyrics Generation API 生成歌詞
        lyrics_result = await self.generate_lyrics(prompt=lyrics_prompt)
        generated_lyrics = ""
        if lyrics_result.get("status") == "success":
            generated_lyrics = lyrics_result.get("lyrics", "")

        # 第三步：使用生成的歌詞和 prompt 生成音樂（不傳 duration，讓模型決定）
        result = await self.generate_music(
            prompt=music_prompt,
            lyrics=generated_lyrics  # 傳入真實歌詞
        )

        if result.get("status") == "success":
            result["lyrics"] = generated_lyrics
            result["voice_style"] = voice_style
            result["suggested_title"] = suggested_title
            result["story_reference"] = story_snippets

        return result

    async def generate_character_bgm(
        self,
        character: dict,
        duration: int = 30
    ) -> dict:
        """
        為角色生成背景音樂（純音樂，無歌詞）
        """
        genre = character.get("music_genre", "pop")
        mood = character.get("music_mood", "warm")
        tempo = character.get("music_tempo", "medium")
        theme_tags = character.get("theme_tags", "[]")

        if isinstance(theme_tags, str):
            try:
                theme_tags = json.loads(theme_tags)
            except:
                theme_tags = []

        # 構建純音樂 prompt
        prompt_parts = [
            f"instrumental {genre}",
            f"{mood} atmosphere",
            f"{tempo} tempo",
        ]

        if theme_tags:
            prompt_parts.extend(theme_tags[:5])

        if character.get("core_features"):
            prompt_parts.append(character["core_features"])

        # 加入純音樂標識
        prompt_parts.append("background music, no vocals, cinematic")

        full_prompt = ", ".join(filter(None, prompt_parts))

        return await self.generate_music(
            prompt=full_prompt,
            duration=duration
        )

    async def generate_song_variation(
        self,
        original_prompt: str,
        variation_type: str = "mood",
        duration: int = 60
    ) -> dict:
        """
        生成歌曲變體

        Args:
            original_prompt: 原始 prompt
            variation_type: 變體類型 (mood, tempo, genre, remix)
        """
        variations = {
            "mood": ["more energetic", "more melancholic", "more dreamy", "more elegant"],
            "tempo": ["faster tempo", "slower tempo", "moderate tempo"],
            "genre": ["acoustic version", "electronic version", "orchestral version"],
            "remix": ["dance remix", "chill version", "live acoustic version"]
        }

        modifiers = variations.get(variation_type, variations["mood"])
        modifier = modifiers[0]  # 隨機選擇或固定選擇

        new_prompt = f"{original_prompt}, {modifier}"

        return await self.generate_music(
            prompt=new_prompt,
            duration=duration
        )

    async def query_music_status(self, task_id: str) -> dict:
        """
        查詢音樂生成狀態

        MiniMax 音樂生成是非同步的，需要透過 task_id 輪詢查詢狀態

        Args:
            task_id: 任務 ID（從 generate_music 回應取得）

        Returns:
            dict: 包含 status, audio_url 等
        """
        url = f"{self.api_base}/v1/music_generation/query"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "task_id": task_id
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, headers=headers, ssl=False) as response:
                    if response.status == 200:
                        result = await response.json()
                        data = result.get("data", {})
                        return {
                            "status": "success",
                            "result": result,
                            "audio_url": data.get("audio_url") if data else None,
                            "task_status": data.get("status") if data else None
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "status": "error",
                            "error": f"API Error {response.status}: {error_text}"
                        }
        except asyncio.TimeoutError:
            return {"status": "error", "error": "Request timeout"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

"""
MV 場景生成服務
將歌曲歌詞拆解為適合 SeedDance 的 MV 場景腳本
"""

import json
import random
from typing import List, Dict, Any, Optional
from datetime import datetime

class MVSceneGenerator:
    """
    MV 場景生成器
    
    功能：
    - 分析歌詞結構
    - 拆解為 10-20 個影視化場景
    - 生成 SeedDance 格式的 prompt
    - 支援角色帶入
    """

    # 鏡頭運動選項
    CAMERA_MOVEMENTS = [
        "Pan left to right", "Pan right to left",
        "Tilt up", "Tilt down",
        "Zoom in slowly", "Zoom out dramatically",
        "Orbit around subject", "Dolly forward",
        "Handheld shake", "Static wide shot",
        "Dutch angle", "Rack focus"
    ]

    # 情緒氛圍選項
    MOOD_TAGS = [
        "romantic", "melancholic", "energetic", "dreamy",
        "nostalgic", "hopeful", "mysterious", "peaceful",
        "intense", "whimsical", "bittersweet", "ethereal"
    ]

    # 視覺風格選項
    VISUAL_STYLES = [
        "Cinematic real footage", "Anime aesthetic",
        "Cyberpunk neon", "Vintage film grain",
        "Soft pastel dreamscape", "High contrast noir",
        "DocUMENTARY style", "Fantasy illustration",
        "Retro 80s synthwave", "Japanese watercolor"
    ]

    def __init__(self):
        pass

    def _analyze_lyrics_structure(self, lyrics: str) -> List[Dict]:
        """
        分析歌詞結構，識別重複段落
        
        返回結構化段落列表
        """
        if not lyrics:
            return []
        
        lines = lyrics.strip().split('\n')
        segments = []
        current_segment = {"type": "verse", "lines": [], "content": ""}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # 識別段落類型
            upper_line = line.upper()
            if any(marker in upper_line for marker in ['[CHORUS', '[副歌', '♪']):
                if current_segment["lines"]:
                    segments.append(current_segment)
                current_segment = {"type": "chorus", "lines": [], "content": ""}
            elif any(marker in upper_line for marker in ['[VERSE', '[主歌', '【']):
                if current_segment["lines"]:
                    segments.append(current_segment)
                current_segment = {"type": "verse", "lines": [], "content": ""}
            elif any(marker in upper_line for marker in ['[BRIDGE', '[橋段']):
                if current_segment["lines"]:
                    segments.append(current_segment)
                current_segment = {"type": "bridge", "lines": [], "content": ""}
            
            current_segment["lines"].append(line)
            current_segment["content"] += line + " "
        
        if current_segment["lines"]:
            segments.append(current_segment)
        
        return segments

    def _extract_key_themes(self, lyrics: str, segments: List[Dict]) -> Dict[str, Any]:
        """
        提取歌詞中的關鍵主題和意象
        """
        themes = {
            "colors": [],
            "locations": [],
            "emotions": [],
            "actions": [],
            "objects": []
        }
        
        color_keywords = ["紅", "藍", "黑", "白", "金", "銀", "粉", "紫", "綠", "黃", "橙", "霓虹", "透明"]
        location_keywords = ["街", "咖啡廳", "海", "城市", "房間", "雨中", "天台", "公園", "學校", "辦公室", "暗房", "攝影棚"]
        emotion_keywords = ["心動", "孤獨", "快樂", "悲傷", "思念", "期待", "害怕", "溫暖", "冷漠"]
        action_keywords = ["奔跑", "走", "等待", "看", "擁抱", "牽手", "轉身", "微笑", "流淚", "跳舞"]
        
        full_text = lyrics
        for color in color_keywords:
            if color in full_text:
                themes["colors"].append(color)
        
        for loc in location_keywords:
            if loc in full_text:
                themes["locations"].append(loc)
        
        for emotion in emotion_keywords:
            if emotion in full_text:
                themes["emotions"].append(emotion)
        
        for action in action_keywords:
            if action in full_text:
                themes["actions"].append(action)
        
        return themes

    def _build_character_config(self, character: Dict, scenes_appearance: List[int]) -> Dict:
        """
        構建角色設定，用於維持角色一致性
        """
        return {
            "id": character.get("id"),
            "name": character.get("name"),
            "appearance": {
                "hair": character.get("hairstyle", "long black hair"),
                "outfit": character.get("default_outfit", "casual clothes"),
                "distinctive_features": character.get("core_features", "")
            },
            "appears_in_scenes": scenes_appearance,
            "mood_per_scene": {}  # 根據場景情緒調整表情
        }

    def generate_mv_concept(
        self,
        song_title: str,
        lyrics: str,
        characters: List[Dict],
        visual_style: str = "Cinematic real footage",
        aspect_ratio: str = "16:9"
    ) -> Dict[str, Any]:
        """
        生成完整的 MV 概念
        
        Args:
            song_title: 歌曲標題
            lyrics: 歌詞內容
            characters: 角色列表（用於帶入）
            visual_style: 視覺風格
            aspect_ratio: 比例
        
        Returns:
            包含 global_style, character_configs, scenes 的完整 MV 腳本
        """
        if not lyrics:
            return {"error": "沒有歌詞內容"}

        # 分析歌詞結構
        segments = self._analyze_lyrics_structure(lyrics)
        themes = self._extract_key_themes(lyrics, segments)
        
        # 決定場景數量（根據歌詞長度）
        total_lines = len([l for s in segments for l in s.get("lines", [])])
        scene_count = min(max(total_lines // 3, 10), 20)  # 10-20 個場景
        
        # 分配角色到場景
        char_assignments = self._assign_characters_to_scenes(characters, scene_count)
        # char_assignments is now {char_id: [scene_numbers]}

        # 生成全域風格描述
        global_style = self._generate_global_style(visual_style, themes)

        # 生成角色設定
        character_configs = []
        char_dict = {c["id"]: c for c in characters}  # Create lookup dict
        for char_id, scenes in char_assignments.items():
            char = char_dict.get(char_id)
            if char:
                config = self._build_character_config(char, scenes)
                character_configs.append(config)
        
        # 生成每個場景
        scenes = self._generate_scenes(
            lyrics=lyrics,
            segments=segments,
            themes=themes,
            character_configs=character_configs,
            scene_count=scene_count,
            visual_style=visual_style,
            aspect_ratio=aspect_ratio
        )
        
        return {
            "title": f"{song_title} - MV 腳本",
            "global_style": global_style,
            "visual_palette": self._generate_visual_palette(themes),
            "aspect_ratio": aspect_ratio,
            "duration_estimate": f"{len(scenes) * 5}-{len(scenes) * 8} 秒",
            "character_configs": character_configs,
            "scenes": scenes,
            "metadata": {
                "total_scenes": len(scenes),
                "style": visual_style,
                "generated_at": datetime.now().isoformat()
            }
        }

    def _assign_characters_to_scenes(
        self,
        characters: List[Dict],
        scene_count: int
    ) -> Dict[int, List[int]]:
        """
        將角色分配到場景
        每個角色出現在部分場景中
        """
        if not characters:
            return {}

        assignments = {}  # {char_id: [scene_numbers]}

        # 確保每個角色至少出現在 3 個場景
        min_appearances = min(3, scene_count // len(characters) + 1)

        for char in characters:
            char_id = char.get("id")
            if not char_id:
                continue
            # 隨機選擇出現的場景
            num_appearances = random.randint(min_appearances, min(scene_count // 2, 8))
            scenes = sorted(random.sample(range(1, scene_count + 1), num_appearances))
            assignments[char_id] = scenes

        return assignments

    def _generate_global_style(self, visual_style: str, themes: Dict) -> str:
        """
        生成全域風格描述
        """
        color_desc = ""
        if themes.get("colors"):
            colors = "、".join(set(themes["colors"]))
            color_desc = f"場景中始終有{colors}的視覺元素贯穿整体，"
        
        location_desc = ""
        if themes.get("locations"):
            locs = "、".join(set(themes["locations"]))
            location_desc = f"主要場景發生在{locs}，"
        
        base_style = f"""【全域視覺設定】
風格：{visual_style}
{color_desc}
{location_desc}
光影：柔和的 Natural lighting 搭配電影感 LUT
色調：統一的視覺 identity，確保所有片段剪輯在一起時有系列感
材質：保持一致的紋理質感"""

        return base_style

    def _generate_visual_palette(self, themes: Dict) -> str:
        """
        生成視覺色調描述
        """
        palette_parts = []
        
        if themes.get("colors"):
            palette_parts.append(f"主色調：{' + '.join(set(themes['colors']))}")
        
        if themes.get("emotions"):
            palette_parts.append(f"情緒色調：{'、'.join(set(themes['emotions']))}")
        
        palette_parts.append("輔助色：Soft neutrals 作為過渡")
        palette_parts.append("對比色：適度的暗部保留細節")
        
        return " | ".join(palette_parts) if palette_parts else "Cinematic natural palette"

    def _generate_scenes(
        self,
        lyrics: str,
        segments: List[Dict],
        themes: Dict,
        character_configs: List[Dict],
        scene_count: int,
        visual_style: str,
        aspect_ratio: str
    ) -> List[Dict]:
        """
        生成所有場景
        """
        scenes = []
        lines = [l.strip() for l in lyrics.strip().split('\n') if l.strip()]
        
        # 計算每個場景應該覆蓋多少行歌詞
        lines_per_scene = max(len(lines) // scene_count, 1)
        
        for i in range(scene_count):
            scene_num = i + 1
            
            # 計算這個場景對應的歌詞範圍
            start_line = i * lines_per_scene
            end_line = min((i + 1) * lines_per_scene, len(lines))
            scene_lines = lines[start_line:end_line]
            lyric_segment = " ".join(scene_lines) if scene_lines else ""
            
            # 決定段落類型
            if i == 0:
                segment_type = "intro"
            elif i == scene_count - 1:
                segment_type = "outro"
            elif i % 3 == 0:
                segment_type = "chorus"
            elif i % 7 == 0:
                segment_type = "bridge"
            else:
                segment_type = "verse"
            
            # 選擇參與的角色
            active_chars = [c for c in character_configs if scene_num in c.get("appears_in_scenes", [])]
            
            # 生成場景描述
            scene = self._generate_single_scene(
                scene_number=scene_num,
                lyric_segment=lyric_segment,
                segment_type=segment_type,
                themes=themes,
                active_characters=active_chars,
                character_configs=character_configs,
                visual_style=visual_style,
                aspect_ratio=aspect_ratio
            )
            
            scenes.append(scene)
        
        return scenes

    def _generate_single_scene(
        self,
        scene_number: int,
        lyric_segment: str,
        segment_type: str,
        themes: Dict,
        active_characters: List[Dict],
        character_configs: List[Dict],
        visual_style: str,
        aspect_ratio: str
    ) -> Dict:
        """
        生成單一場景的完整描述
        """
        # 選擇鏡頭運動
        camera = random.choice(self.CAMERA_MOVEMENTS)
        
        # 選擇情緒
        mood = random.choice(self.MOOD_TAGS)
        
        # 構建主體描述
        subject_parts = []
        if active_characters:
            for char in active_characters[:2]:  # 最多2個角色
                name = char.get("name", "character")
                appearance = char.get("appearance", {})
                hair = appearance.get("hair", "")
                outfit = appearance.get("outfit", "")
                subject_parts.append(f"{name} with {hair}, wearing {outfit}")
        subject = ", ".join(subject_parts) if subject_parts else "Single figure in frame"
        
        # 構建背景描述
        bg_parts = []
        if themes.get("locations"):
            loc = random.choice(themes["locations"])
            bg_parts.append(f"Location: {loc}")
        bg_parts.append(f"Style: {visual_style}")
        bg_parts.append(f"Ratio: {aspect_ratio}")
        background = " | ".join(bg_parts)
        
        # 構建氛圍描述
        atmosphere_parts = [f"Mood: {mood}"]
        if themes.get("colors"):
            color = random.choice(themes["colors"])
            atmosphere_parts.append(f"Color accent: {color} elements")
        atmosphere = " | ".join(atmosphere_parts)
        
        # 構建完整視覺 prompt
        visual_prompt = f"""Scene {scene_number} ({segment_type.upper()})
---
Visual: {subject}
Setting: {background}
Atmosphere: {atmosphere}
Camera: {camera}

Lyric: {lyric_segment[:100]}..."""

        # 建構 SeedDance prompt（使用新格式）
        seeddance_prompt = self._build_seeddance_prompt(
            scene={
                "scene_number": scene_number,
                "segment_type": segment_type,
                "mood": mood,
                "camera_movement": camera,
                "background": background,
                "atmosphere": atmosphere
            },
            character_configs=character_configs,
            visual_style=visual_style,
            aspect_ratio=aspect_ratio
        )
        
        # 參與角色 IDs
        character_ids = [c.get("id") for c in active_characters if c.get("id")]
        
        # 預估時長（根據段落類型）
        duration_hints = {
            "intro": "3-5 秒",
            "verse": "5-8 秒",
            "chorus": "8-12 秒",
            "bridge": "6-10 秒",
            "outro": "5-8 秒"
        }
        
        return {
            "scene_number": scene_number,
            "segment_type": segment_type,
            "lyric_segment": lyric_segment,
            "visual_prompt": visual_prompt,
            "camera_movement": camera,
            "mood": mood,
            "subject": subject,
            "background": background,
            "atmosphere": atmosphere,
            "character_ids": json.dumps(character_ids),
            "duration_hint": duration_hints.get(segment_type, "5-8 秒"),
            "seeddance_prompt": seeddance_prompt
        }

    def _get_specific_action(self, mood: str, segment_type: str) -> str:
        """
        根據情緒和段落類型生成具體動作
        """
        actions_by_mood = {
            "romantic": [
                "gently brushing hair behind ear while gazing softly",
                "slowly reaching hand toward camera with tender smile",
                "dancing barefoot on wet pavement with eyes closed",
                "holding a coffee cup with both hands, steam rising",
                "writing in a journal with focused expression"
            ],
            "melancholic": [
                "slowly turning away while clutching something to chest",
                "sitting alone at a cafe, staring at rain through window",
                "walking alone under streetlights with heavy steps",
                "holding a faded photograph with trembling hands",
                "looking down at phone screen, face illuminated blue"
            ],
            "energetic": [
                "running through neon-lit streets with wind in hair",
                "spinning joyfully with arms wide open",
                "laughing loudly while jumping on bed",
                "dancing enthusiastically at a crowded venue",
                "riding motorcycle through city at night"
            ],
            "peaceful": [
                "reading book on a quiet balcony at golden hour",
                "meditating by a lake with mist rising",
                "sipping tea while watching sunset from rooftop",
                "sleeping peacefully under cherry blossoms",
                "doing yoga on beach as waves crash gently"
            ],
            "mysterious": [
                "standing motionless in shadow, eyes glowing subtly",
                "walking through fog with lantern held high",
                "appearing suddenly from behind curtain",
                "glancing over shoulder with knowing smile",
                "writing something in the air that glows"
            ],
            "dramatic": [
                "storming out of building with determined stride",
                "confronting someone with intense eye contact",
                "catching falling leaves in slow motion",
                "turning dramatically as lightning flashes behind",
                "reaching desperately for something slipping away"
            ],
            "dreamy": [
                "floating weightlessly in mid-air with hair flowing",
                "walking on clouds with ethereal glow around",
                "teleporting with sparkles and light trails",
                "manipulating reality with hand gestures",
                "transforming between human and creature form"
            ],
            "nostalgic": [
                "looking through old photo album with sad smile",
                "riding bicycle through childhood neighborhood",
                "touching a memorial plaque with weathered hands",
                "watching home video on vintage TV",
                "holding a dried flower from long ago"
            ],
            "hopeful": [
                "breaking through wall into bright light",
                "spreading wings and soaring into blue sky",
                "planting seed that instantly blooms",
                "reaching for rainbow above mountains",
                "waking up with sunrise streaming through window"
            ],
            "whimsical": [
                "skipping through impossible geometric landscape",
                "playing with floating musical notes",
                "riding giant book through starry sky",
                "blowing bubbles that contain mini universes",
                "dancing with shadow creatures in moonlight"
            ],
            "bittersweet": [
                "smiling while wiping away a tear",
                "letting go of balloon into gray sky",
                "hugging goodbye at train station platform",
                "watching someone walk away into rain",
                "laughing at memory while sitting alone"
            ],
            "ethereal": [
                "phasing through solid objects with glow",
                "communing with spirits of nature",
                "channeling cosmic energy through hands",
                "dissolving into particles of light",
                "speaking with voice that echoes eternally"
            ],
            "calm": [
                "leaning casually against wall with relaxed posture",
                "walking slowly through park with hands in pockets",
                "sitting thoughtfully by window, gazing distant",
                "stretching lazily while waking up",
                "observing surroundings with curious eyes"
            ]
        }

        # 根據段落類型調整動作時長/強度
        if segment_type in ["intro", "outro"]:
            modifier = "slowly and gracefully"
        elif segment_type == "chorus":
            modifier = "dynamically and expressively"
        elif segment_type == "bridge":
            modifier = "poetically and contemplatively"
        else:  # verse
            modifier = "naturally and smoothly"

        # 選擇動作
        mood_lower = mood.lower()
        mood_actions = actions_by_mood.get(mood_lower, actions_by_mood.get("calm", []))
        if not mood_actions:
            mood_actions = actions_by_mood["calm"]

        action = random.choice(mood_actions)
        return f"{action}, {modifier}"

    def _get_style_details(self, visual_style: str) -> str:
        """
        根據視覺風格生成具體的視覺屬性描述
        """
        style_details = {
            "Cinematic real footage": "natural lighting, film-like depth of field, anamorphic lens flare, warm color grading",
            "Anime cel-shaded": "vibrant colors, clean linework, expressive character animation, Studio Ghibli inspired",
            "Cyberpunk neon": "rain-soaked streets, neon reflections, holographic billboards, blue and pink color palette",
            "Vintage film grain": "16mm film grain, light leaks, soft focus edges, nostalgic color tone",
            "Soft pastel dream": "soft diffused lighting, pastel color palette, bokeh background, ethereal glow",
            "Noir black and white": "high contrast black and white, dramatic shadows, deep blacks, film noir lighting",
            "Retro 90s MTV": "heavy film grain, slight chromatic aberration, saturated neon lighting, VHS aesthetic",
            "Gothic dark fantasy": "dark moody atmosphere, candle lighting, ornate details, medieval architecture"
        }

        # 搜尋關鍵字匹配
        style_lower = visual_style.lower()
        for key, details in style_details.items():
            if key.lower() in style_lower or style_lower in key.lower():
                return details

        return "cinematic quality, professional color grading, high detail"

    def _build_seeddance_prompt(
        self,
        scene: Dict,
        character_configs: List[Dict],
        visual_style: str,
        aspect_ratio: str
    ) -> str:
        """
        建構 SeedDance 專用 Prompt
        格式：Subject + Setting + Atmosphere + Camera + Technical
        """
        # 取得場景中出現的角色資訊
        scene_num = scene.get("scene_number", 1)
        active_chars = [c for c in character_configs if scene_num in c.get("appears_in_scenes", [])]

        # Subject: 角色特徵 + 具體動作
        if active_chars:
            char = active_chars[0]
            appearance = char.get("appearance", {})
            hair = appearance.get("hair", "long black hair")
            outfit = appearance.get("outfit", "casual clothes")
            features = appearance.get("distinctive_features", "")
            subject = f"Subject: A character with {hair}, wearing {outfit}"
            if features:
                subject += f", {features}"
            # 加入具體動作
            mood = scene.get("mood", "calm")
            segment_type = scene.get("segment_type", "verse")
            action = self._get_specific_action(mood, segment_type)
            subject += f", {action}"
        else:
            subject = f"Subject: Single figure with dynamic pose"
            mood = scene.get("mood", "calm")
            segment_type = scene.get("segment_type", "verse")
            action = self._get_specific_action(mood, segment_type)
            subject += f", {action}"

        # Background: 場景地點 + 關鍵道具/光影
        background = f"Setting: {scene.get('background', 'urban environment')}"
        if scene.get("atmosphere"):
            background += f", {scene.get('atmosphere')}"

        # Atmosphere: 風格細節 + 情緒
        atmosphere = f"Atmosphere: {scene.get('mood', 'cinematic')}"
        atmosphere += f", {self._get_style_details(visual_style)}"

        # Camera: 鏡頭運動
        camera = f"Camera: {scene.get('camera_movement', 'Static shot')}"

        # Technical: 比例 + 品質
        technical = f"Technical: {aspect_ratio}, High-bitrate, {visual_style}"

        return f"{subject}\n{background}\n{atmosphere}\n{camera}\n{technical}"

    def _optimize_for_seedance(
        self,
        subject: str,
        background: str,
        atmosphere: str,
        camera: str,
        visual_style: str
    ) -> str:
        """
        將場景描述優化為 SeedDance 格式的 prompt（保持向後相容）
        """
        # 直接使用新格式
        style_details = self._get_style_details(visual_style)

        return f"""Subject: {subject}
Background: {background}
Atmosphere: {atmosphere}
Camera: {camera}
Technical: {visual_style}, {style_details}"""

    def export_as_json(self, mv_concept: Dict) -> str:
        """
        匯出為 JSON 格式（可用於 SeedDance 批量處理）
        """
        return json.dumps(mv_concept, ensure_ascii=False, indent=2)

    def export_as_readable(self, mv_concept: Dict) -> str:
        """
        匯出為可讀格式（便於人類查看和編輯）
        """
        lines = [
            f"# {mv_concept.get('title', 'MV Script')}",
            "",
            "## 全域設定",
            f"風格：{mv_concept.get('global_style', '')}",
            f"色調：{mv_concept.get('visual_palette', '')}",
            f"比例：{mv_concept.get('aspect_ratio', '16:9')}",
            f"預估時長：{mv_concept.get('duration_estimate', '')}",
            "",
            "## 角色設定",
        ]
        
        for char_config in mv_concept.get("character_configs", []):
            lines.append(f"### {char_config.get('name', 'Unknown')}")
            lines.append(f"外觀：{char_config.get('appearance', {}).get('hair', '')}, {char_config.get('appearance', {}).get('outfit', '')}")
            lines.append(f"出現場景：{char_config.get('appears_in_scenes', [])}")
            lines.append("")
        
        lines.append("## 場景腳本")
        lines.append("")
        
        for scene in mv_concept.get("scenes", []):
            lines.append(f"### 場景 {scene.get('scene_number')} ({scene.get('segment_type', '').upper()})")
            lines.append(f"時長：{scene.get('duration_hint', '')}")
            lines.append(f"鏡頭：{scene.get('camera_movement', '')}")
            lines.append(f"情緒：{scene.get('mood', '')}")
            lines.append("")
            lines.append(f"**歌詞**：{scene.get('lyric_segment', '')[:80]}...")
            lines.append("")
            lines.append(f"**SeedDance Prompt**：")
            lines.append(f"```")
            lines.append(scene.get('seeddance_prompt', ''))
            lines.append(f"```")
            lines.append("")
        
        return "\n".join(lines)


# 便捷函數
def generate_mv_for_song(
    song_title: str,
    lyrics: str,
    characters: List[Dict],
    visual_style: str = "Cinematic real footage"
) -> Dict[str, Any]:
    """
    為歌曲生成 MV 腳本
    """
    generator = MVSceneGenerator()
    return generator.generate_mv_concept(
        song_title=song_title,
        lyrics=lyrics,
        characters=characters,
        visual_style=visual_style
    )

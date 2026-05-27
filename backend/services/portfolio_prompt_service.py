"""
角色影集 Prompt 生成服務
根據角色設定 + 日記內容生成 SeedDance 格式的 MV 提示詞

功能：
- 結合角色外觀特色與日記心事，生成獨特的 SeedDance prompt
- 拆解為 Subject / Setting / Atmosphere / Camera / Technical 五大區塊
- 自動萃取地點、情緒、動作等標籤
- 生成結果可供後續影片片段調用
"""

import json
import random
from typing import List, Dict, Any, Optional


class PortfolioPromptGenerator:
    """
    影集 SeedDance Prompt 生成器
    
    輸入：角色資料 + 日記內容 + 場景類型
    輸出：完整 SeedDance 提示詞 + 拆分片段 + 標籤
    """

    # 預設鏡頭運動
    CAMERA_MOVEMENTS = [
        "Pan left to right slowly", "Pan right to left gently",
        "Tilt up from ground", "Tilt down from sky",
        "Zoom in on face", "Zoom out revealing environment",
        "Orbit around subject", "Dolly forward tracking shot",
        "Handheld natural shake", "Static wide establishing",
        "Dutch angle dramatic", "Rack focus between subjects"
    ]

    # 預設情緒氛圍（英文 SeedDance 用）
    MOOD_TAGS_EN = [
        "romantic", "melancholic", "energetic", "dreamy",
        "nostalgic", "hopeful", "mysterious", "peaceful",
        "intense", "whimsical", "bittersweet", "ethereal",
        "tender", "anxious", "serene", "passionate"
    ]

    # 中文情緒對應（萃取用）
    MOOD_TAGS_ZH = {
        "心動": "romantic", "暗戀": "romantic", "喜歡": "romantic",
        "悲傷": "melancholic", "孤獨": "melancholic", "失落": "melancholic",
        "快樂": "hopeful", "開心": "hopeful", "期待": "hopeful",
        "懷念": "nostalgic", "過往": "nostalgic", "回憶": "nostalgic",
        "神秘": "mysterious", "迷惘": "mysterious",
        "平靜": "peaceful", "溫暖": "peaceful", "舒適": "peaceful",
        "緊張": "intense", "害怕": "anxious", "擔心": "anxious",
        "浪漫": "tender", "溫柔": "tender", "甜蜜": "tender"
    }

    # 地點關鍵字
    LOCATION_KEYWORDS = [
        "捷運", "地鐵", "火車", "車站", "月台",
        "咖啡廳", "咖啡店", "餐廳", "酒吧", "小吃店",
        "海邊", "沙灘", "海", "河邊", "湖畔",
        "城市", "街", "路口", "天橋", "公園",
        "學校", "大學", "教室", "圖書館",
        "公司", "辦公室", "工作室",
        "房間", "臥室", "陽台", "屋頂",
        "雨中", "雨", "雪", "夜景", "夕陽", "清晨"
    ]

    # 動作關鍵字
    ACTION_KEYWORDS = [
        "奔跑", "走", "漫步", "漫步", "站立", "坐",
        "等待", "凝視", "看", "望向", "注視",
        "擁抱", "牽手", "依靠", "靠近",
        "轉身", "回頭", "奔跑", "追逐",
        "微笑", "流淚", "沉默", "深呼吸",
        "拿著", "提著", "揹著", "戴著",
        "跳舞", "唱歌", "彈吉他", "寫字"
    ]

    def __init__(self):
        pass

    def generate_portfolio_prompt(
        self,
        character: Dict,
        diaries: List[Dict],
        scene_type: str = "solo",
        scene_description: str = ""
    ) -> Dict[str, Any]:
        """
        生成完整的影集 SeedDance Prompt
        
        Args:
            character: 角色資料（包含 name, core_features, anchor_features, hairstyle, skin_tone, default_outfit 等）
            diaries: 日記列表（按時間倒序）
            scene_type: 場景類型（solo, outfit, expression, angle, action）
            scene_description: 場景描述（可選，用於指定特定場景）
        
        Returns:
            {
                "full_seeddance_prompt": str,  # 完整 prompt
                "subject_segment": str,        # 主體描述
                "setting_segment": str,        # 場景/地點
                "atmosphere_segment": str,      # 氛圍/情緒
                "camera_segment": str,         # 鏡頭運動
                "technical_segment": str,       # 技術規格
                "location_tags": List[str],    # 地點標籤
                "emotion_tags": List[str],     # 情緒標籤
                "action_tags": List[str],      # 動作標籤
                "diary_context": str,          # 使用的日記內容摘要
            }
        """
        # 1. 分析日記內容，萃取情緒、地點、動作
        diary_analysis = self._analyze_diaries(diaries)
        
        # 2. 根據場景類型決定主體描述方向
        subject = self._build_subject(character, scene_type, diary_analysis)
        
        # 3. 建構場景設定（地點 + 背景）
        setting = self._build_setting(character, scene_type, diary_analysis, scene_description)
        
        # 4. 建構氛圍描述（情緒 + 風格）
        atmosphere = self._build_atmosphere(character, scene_type, diary_analysis)
        
        # 5. 選擇鏡頭運動
        camera = self._build_camera(scene_type)
        
        # 6. 技術規格
        technical = self._build_technical(character)
        
        # 7. 組合完整 SeedDance prompt
        full_prompt = self._compose_seeddance_prompt(
            subject, setting, atmosphere, camera, technical
        )
        
        # 8. 萃取標籤
        location_tags = diary_analysis.get("locations", [])
        emotion_tags = diary_analysis.get("emotions", [])
        action_tags = diary_analysis.get("actions", [])
        
        # 9. 組合日記上下文摘要
        diary_context = diary_analysis.get("summary", "")

        return {
            "full_seeddance_prompt": full_prompt,
            "subject_segment": subject,
            "setting_segment": setting,
            "atmosphere_segment": atmosphere,
            "camera_segment": camera,
            "technical_segment": technical,
            "location_tags": location_tags,
            "emotion_tags": emotion_tags,
            "action_tags": action_tags,
            "diary_context": diary_context,
        }

    def _analyze_diaries(self, diaries: List[Dict]) -> Dict[str, Any]:
        """
        分析日記內容，萃取關鍵資訊
        """
        if not diaries:
            return {
                "locations": [],
                "emotions": [],
                "actions": [],
                "summary": ""
            }
        
        # 合併所有日記內容
        all_content = ""
        moods = []
        
        for diary in diaries[:5]:  # 最多取5篇
            content = diary.get("content", "")
            mood = diary.get("mood", "")
            if content:
                all_content += content + " "
            if mood:
                moods.append(mood)
        
        # 萃取地點
        locations = []
        for loc in self.LOCATION_KEYWORDS:
            if loc in all_content:
                locations.append(loc)
        locations = list(set(locations))[:5]  # 最多5個
        
        # 萃取情緒（從 mood 欄位 + 內容）
        emotions = []
        for mood in moods:
            if mood in self.MOOD_TAGS_ZH:
                emotions.append(mood)
        # 也從內容萃取
        for zh_mood, en_mood in self.MOOD_TAGS_ZH.items():
            if zh_mood in all_content:
                emotions.append(zh_mood)
        emotions = list(set(emotions))[:5]
        
        # 萃取動作
        actions = []
        for action in self.ACTION_KEYWORDS:
            if action in all_content:
                actions.append(action)
        actions = list(set(actions))[:5]
        
        # 生成摘要（取前200字）
        summary = all_content[:200].strip() if all_content else ""
        
        return {
            "locations": locations,
            "emotions": emotions,
            "actions": actions,
            "summary": summary,
            "dominant_mood": self._get_dominant_mood(moods)
        }

    def _get_dominant_mood(self, moods: List[str]) -> str:
        """取得主要情緒"""
        if not moods:
            return random.choice(self.MOOD_TAGS_EN)
        
        # 統計最常出現的情緒
        mood_count = {}
        for m in moods:
            mood_count[m] = mood_count.get(m, 0) + 1
        
        dominant = max(mood_count, key=mood_count.get)
        
        # 轉換為英文
        if dominant in self.MOOD_TAGS_ZH:
            return self.MOOD_TAGS_ZH[dominant]
        return dominant if dominant in self.MOOD_TAGS_EN else random.choice(self.MOOD_TAGS_EN)

    def _build_subject(
        self,
        character: Dict,
        scene_type: str,
        diary_analysis: Dict
    ) -> str:
        """
        建構主體描述（Subject）
        包含：角色外觀特色 + 具體動作/表情
        """
        name = character.get("name", "The character")
        hairstyle = character.get("hairstyle", "long hair")
        outfit = character.get("default_outfit", "casual clothes")
        core_features = character.get("core_features", "")
        anchor_features = character.get("anchor_features", "")
        
        # 根據場景類型調整主體描述
        subject_actions = {
            "solo": "standing naturally, looking into camera with subtle expression",
            "outfit": "wearing a stylish outfit, full body shot",
            "expression": "showing emotional facial expression, close-up portrait",
            "angle": "posing from dynamic camera angle",
            "action": "in natural action pose, mid-movement"
        }
        action = subject_actions.get(scene_type, subject_actions["solo"])
        
        # 加入日記中的動作（如果有的話）
        if diary_analysis.get("actions"):
            # 翻譯為英文 SeedDance 動作
            action_map = {
                "奔跑": "running", "走": "walking", "漫步": "strolling",
                "等待": "waiting", "凝視": "gazing", "微笑": "smiling gently",
                "流淚": "tears in eyes", "轉身": "turning around",
                "擁抱": "hugging someone", "牽手": "holding hands",
                "跳舞": "dancing gracefully", "深呼吸": "taking a deep breath"
            }
            for zh_action in diary_analysis["actions"][:2]:
                en_action = action_map.get(zh_action)
                if en_action and en_action not in action:
                    action = en_action
                    break
        
        # 組合成主體描述
        subject_parts = [f"{name}"]
        
        # 髮型
        if hairstyle:
            subject_parts.append(f"with {hairstyle}")
        
        # 穿著
        subject_parts.append(f"wearing {outfit}")
        
        # 核心特徵
        if core_features:
            subject_parts.append(f", {core_features}")
        
        # 動作
        subject_parts.append(f", {action}")
        
        return "Subject: " + ", ".join(subject_parts)

    def _build_setting(
        self,
        character: Dict,
        scene_type: str,
        diary_analysis: Dict,
        scene_description: str
    ) -> str:
        """
        建構場景設定（Setting）
        包含：地點 + 背景環境 + 光影
        """
        # 如果有指定的場景描述，直接使用
        if scene_description:
            return f"Setting: {scene_description}"
        
        # 從日記萃取地點
        locations = diary_analysis.get("locations", [])
        
        # 根據場景類型建構預設場景
        default_settings = {
            "solo": "urban city environment, soft natural lighting from window",
            "outfit": "stylish street location, fashion photography setting",
            "expression": "intimate indoor space, warm ambient lighting",
            "angle": "architectural space with interesting angles",
            "action": "dynamic outdoor location with movement space"
        }
        
        # 加入地點（如果有）
        if locations:
            location_map = {
                "捷運": "Taipei MRT station platform, modern transit environment",
                "地鐵": "subway station, urban transit setting",
                "咖啡廳": "cozy coffee shop, warm interior lighting",
                "海邊": "beach at golden hour, ocean waves",
                "城市": "bustling city street, neon lights at night",
                "公園": "peaceful park, trees and natural light",
                "雨中": "rainy street, reflections on wet pavement",
                "房間": "comfortable bedroom, soft window light",
                "陽台": "balcony overlooking city, twilight atmosphere"
            }
            
            setting_parts = []
            for loc in locations[:2]:
                if loc in location_map:
                    setting_parts.append(location_map[loc])
                else:
                    setting_parts.append(f"{loc}")
            
            if setting_parts:
                return "Setting: " + ", ".join(setting_parts)
        
        return "Setting: " + default_settings.get(scene_type, default_settings["solo"])

    def _build_atmosphere(
        self,
        character: Dict,
        scene_type: str,
        diary_analysis: Dict
    ) -> str:
        """
        建構氛圍描述（Atmosphere）
        包含：情緒 + 視覺風格 + 色調
        """
        # 取得情緒
        mood = diary_analysis.get("dominant_mood", "peaceful")
        
        # 根據角色風格調整
        style = character.get("style", "anime")
        
        # 風格細節
        style_details = {
            "anime": "anime cel-shaded aesthetic, vibrant colors, Studio Ghibli inspired warmth",
            "realistic": "cinematic natural lighting, film-like depth of field, anamorphic lens",
            "semi-realistic": "illustrated style with realistic lighting, soft painterly quality",
            "vintage": "retro film grain, warm nostalgic color tone, 80s aesthetic"
        }
        
        style_detail = style_details.get(style, style_details["anime"])
        
        # 情緒氛圍描述
        mood_descriptions = {
            "romantic": "soft golden hour light, dreamy bokeh background, tender atmosphere",
            "melancholic": "muted blue tones, overcast sky, contemplative mood",
            "hopeful": "bright warm light, optimistic atmosphere, soft focus",
            "nostalgic": "vintage color grading, warm sepia undertones, memory-like quality",
            "mysterious": "dramatic shadows, low key lighting, intrigue in the air",
            "peaceful": "serene natural light, calm and harmonious feeling",
            "intense": "high contrast lighting, dramatic atmosphere, emotional tension",
            "whimsical": "fairy lights, magical sparkle, playful wonder",
            "bittersweet": "warm but muted tones, beautiful sadness, poetic feeling",
            "ethereal": "soft glow, translucent light rays, otherworldly quality"
        }
        
        mood_desc = mood_descriptions.get(mood, mood_descriptions["peaceful"])
        
        return f"Atmosphere: {mood_desc}, {style_detail}"

    def _build_camera(self, scene_type: str) -> str:
        """
        建構鏡頭運動描述（Camera）
        """
        camera = random.choice(self.CAMERA_MOVEMENTS)
        return f"Camera: {camera}"

    def _build_technical(self, character: Dict) -> str:
        """
        建構技術規格（Technical）
        """
        style = character.get("style", "anime")
        aspect_ratio = "16:9"  # 影集用 16:9
        
        technical_styles = {
            "anime": "anime style, high quality animation feel, 4K detail",
            "realistic": "photorealistic, high dynamic range, cinema quality",
            "semi-realistic": "illustrated photography, soft painterly, professional grade",
            "vintage": "analog film quality, light leaks, organic texture"
        }
        
        tech = technical_styles.get(style, technical_styles["anime"])
        
        return f"Technical: {aspect_ratio}, High quality, {tech}"

    def _compose_seeddance_prompt(
        self,
        subject: str,
        setting: str,
        atmosphere: str,
        camera: str,
        technical: str
    ) -> str:
        """
        組合完整的 SeedDance Prompt
        """
        parts = [
            subject,
            setting,
            atmosphere,
            camera,
            technical
        ]
        
        return "\n".join(parts)

    def generate_searchable_tags(
        self,
        diaries: List[Dict],
        character: Dict
    ) -> Dict[str, List[str]]:
        """
        生成可搜尋的標籤集合
        
        Returns:
            {
                "location_tags": ["台中捷運", "咖啡廳"],
                "emotion_tags": ["心動", "期待"],
                "action_tags": ["奔跑", "等待"],
                "theme_tags": ["暗戀", "工作"]
            }
        """
        diary_analysis = self._analyze_diaries(diaries)
        
        # 主題標籤（從 character 的 theme_tags 或日記內容）
        theme_tags = []
        themes_from_diary = ["暗戀", "失戀", "工作", "友情", "家人", "夢想", "未來"]
        all_content = " ".join([d.get("content", "") for d in diaries])
        for theme in themes_from_diary:
            if theme in all_content:
                theme_tags.append(theme)
        
        return {
            "location_tags": diary_analysis.get("locations", []),
            "emotion_tags": diary_analysis.get("emotions", []),
            "action_tags": diary_analysis.get("actions", []),
            "theme_tags": list(set(theme_tags))[:5]
        }

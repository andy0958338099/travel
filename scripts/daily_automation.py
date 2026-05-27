"""
自動化內容生成服務
每日為每個角色生成：1篇日記 + 3首不同曲風歌曲（維持固定聲線）

使用方法：
  python -m scripts.daily_automation --mode diary    # 只生成日記
  python -m scripts.daily_automation --mode song      # 只生成歌曲
  python -m scripts.daily_automation --mode full       # 生成日記+歌曲
  python -m scripts.daily_automation --mode status     # 查看今日狀態
"""

import asyncio
import argparse
import json
import sys
from pathlib import Path
from datetime import datetime, date
from typing import Optional

# 添加 backend 路徑
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from db.database import get_connection
from services.ai_service import AIService
from services.music_service import MiniMaxMusicService


# =============================================================================
# 角色聲線設定（每個角色有固定的音色參數）
# =============================================================================

CHARACTER_VOICE_PROFILES = {
    "沈予曦": {
        "voice_id": "Chinese (Mandarin)_Warm_Girl",
        "speed": 0.95,
        "pitch": 2.0,
        "description": "帶有氣音的溫柔嗓音，說話時帶著輕微的尾音上揚，時而喃喃自語",
        "music_voice_style": "breathy, gentle, slightly breathy at end of sentences, sometimes mumbling to herself",
    },
    "簡怡然": {
        "voice_id": "Chinese (Mandarin)_Crisp_Girl",
        "speed": 1.1,
        "pitch": -1.0,
        "description": "有力且有活力的聲線，咬字清晰，略帶自信的尾音，健康活力",
        "music_voice_style": "energetic, clear articulation, confident endings, lively and bright",
    },
    "姜以甯": {
        "voice_id": "Chinese (Mandarin)_Sweet_Lady",
        "speed": 1.0,
        "pitch": 4.0,
        "description": "清新透亮的嗓音，高音時帶有顫抖的氣音，少女感十足",
        "music_voice_style": "pure, bright, occasional vibrato on high notes, youthful and delicate",
    },
    "陸思珩": {
        "voice_id": "Chinese (Mandarin)_Soft_Girl",
        "speed": 0.9,
        "pitch": -3.0,
        "description": "低沉且有磁性的嗓音，說話節奏穩重，帶有成熟女性的韻味",
        "music_voice_style": "low, magnetic, steady rhythm, mature and elegant",
    },
    "溫芯蕾": {
        "voice_id": "Chinese (Mandarin)_Warm_Bestie",
        "speed": 0.85,
        "pitch": 1.0,
        "description": "柔和慵懶的嗓音，說話像在哼歌，偶爾夾帶氣音，慢節奏",
        "music_voice_style": "lazy, humming quality, breathy, slow tempo,哼唱感",
    },
    "周敘明": {
        "voice_id": "Chinese (Mandarin)_Gentle_Youth",
        "speed": 1.0,
        "pitch": -2.0,
        "description": "低沉有力，說話簡短有力，運動員的陽光氣息",
        "music_voice_style": "deep, powerful, short sentences, athletic and sunny",
    },
    "季允辰": {
        "voice_id": "Chinese (Mandarin)_Southern_Young_Man",
        "speed": 0.92,
        "pitch": -4.0,
        "description": "低沉且帶有空靈感的嗓音，說話節奏緩慢，像在敘事",
        "music_voice_style": "ethereal low voice, slow narrative pace, dreamy and atmospheric",
    },
}


# =============================================================================
# 每日歌曲曲風分配（3首不同曲風）
# =============================================================================

DAILY_SONG_GENRES = {
    1: {"genre": "ballad", "mood": "emotional", "tempo": "slow", "description": "抒情歌曲"},
    2: {"genre": "pop", "mood": "warm", "tempo": "medium", "description": "流行歌曲"},
    3: {"genre": "electronic", "mood": "dreamy", "tempo": "fast", "description": "電子氛圍"},
}


# =============================================================================
# 杭州之旅旅遊事件定義
# =============================================================================

HANGZHOU_TRIP = {
    "name": "江南采風之旅",
    "trip_start_date": "2026-07-17",
    "trip_end_date": "2026-07-24",
    "duration_days": 8,
    "organizer": "沈予曦",  # 雜誌專題《台中女生江南行》
    "participants": ["沈予曦", "季允辰", "姜以甯", "簡怡然", "周敘明", "溫芯蕾", "陸思珩"],
    "short_stay_participants": ["周敘明", "溫芯蕾"],  # 只能去1-2天
    "flight": {
        "to": {"flight": "CI 581", "time": "08:30 TPE→HGH 10:40", "airline": "長榮航空"},
        "return": {"flight": "CI 582", "time": "19:50 HGH→TPE 21:50", "airline": "長榮航空"},
    },
    "hotel": "杭州西子湖四季酒店（杭州國賓館區）",
    "itinerary": {
        1: {"day": "Day 1", "title": "抵達杭州", "location": "西湖區", 
            "attractions": ["西湖（主湖區）", "斷橋殘雪", "湖濱步行街", "外灘夜景"],
            "emotional_tags": ["初見西湖的感動", "與他並肩漫步", "團體集合的期待"]},
        2: {"day": "Day 2", "title": "西湖深度", "location": "西湖風景區",
            "attractions": ["蘇堤", "雷峰塔", "三潭印月", "龍井茶園", "河坊街"],
            "emotional_tags": ["騎車時的互動", "遊湖時的眼神交匯", "品茶時的對話"]},
        3: {"day": "Day 3", "title": "靈隱寺祈福", "location": "靈隱寺區",
            "attractions": ["靈隱寺", "飛來峰", "永福寺", "龍井茶園"],
            "emotional_tags": ["祈求時的心願", "自然中的靠近", "下山時的並肩"]},
        4: {"day": "Day 4", "title": "宋城或運河", "location": "杭州",
            "attractions": ["宋城千古情", "京杭大運河遊船", "武林廣場"],
            "emotional_tags": ["觀看演出時的感動", "夜晚單獨散步", "月下談心"]},
        5: {"day": "Day 5", "title": "前往烏鎮", "location": "烏鎮東柵",
            "attractions": ["烏鎮東柵", "茅盾故居", "藍印花布作坊"],
            "emotional_tags": ["大巴上的靠近", "古鎮裡的牵手", "夜遊水鄉"]},
        6: {"day": "Day 6", "title": "烏鎮西柵全天", "location": "烏鎮西柵",
            "attractions": ["烏鎮西柵", "搖櫓船", "白蓮塔", "木心美術館", "昭明書院"],
            "emotional_tags": ["搖櫓船上的身體接觸", "古鎮迷路時的依靠", "夜景下的告白"]},
        7: {"day": "Day 7", "title": "返回杭州", "location": "杭州",
            "attractions": ["西湖天地", "杭州購物"],
            "emotional_tags": ["最後的相處時光", "離別前的不捨", "機場的再見"]},
        8: {"day": "Day 8", "title": "返程", "location": "机上",
            "attractions": [],
            "emotional_tags": ["旅程回憶", "回國後的思念"]},
    },
    "attractions_pool": [
        "西湖（主湖區）", "斷橋殘雪", "蘇堤", "雷峰塔", "三潭印月",
        "靈隱寺", "飛來峰", "永福寺", "龍井茶園", "河坊街",
        "湖濱步行街", "西湖天地", "宋城千古情", "京杭大運河遊船",
        "烏鎮西柵", "烏鎮東柵", "搖櫓船", "白蓮塔", "木心美術館",
        "昭明書院", "茅盾故居", "藍印花布作坊", "外灘夜景", "武康路",
    ],
}


# =============================================================================
# 故事線延伸規劃
# =============================================================================

STORY_ARCS = {
    "沈予曦": {
        "current_arc": "暗戀的勇氣",
        "arc_phases": [
            {"phase": 1, "name": "遇見", "diary_range": (1, 3), "theme": "初次相遇的心動"},
            {"phase": 2, "name": "接近", "diary_range": (4, 7), "theme": "嘗試靠近暗戀對象"},
            {"phase": 3, "name": "掙扎", "diary_range": (8, 12), "theme": "自我懷疑與勇氣"},
            {"phase": 4, "name": "告白", "diary_range": (13, 15), "theme": "勇敢表達心意"},
            {"phase": 5, "name": "杭州之旅", "diary_range": (16, 23), "theme": "策劃《台中女生江南行》與他同行", "trip_phase": True},
        ],
        "relations": {"暗戀": "季允辰", "摯友": "簡怡然", "關注": "溫芯蕾"},
        "is_trip_organizer": True,
    },
    "簡怡然": {
        "current_arc": "健身房的秘密",
        "arc_phases": [
            {"phase": 1, "name": "注意", "diary_range": (1, 3), "theme": "注意到教練的細節"},
            {"phase": 2, "name": "熟悉", "diary_range": (4, 6), "theme": "逐漸熟絡的互動"},
            {"phase": 3, "name": "心動", "diary_range": (7, 10), "theme": "發現自己在意對方"},
            {"phase": 4, "name": "杭州之旅", "diary_range": (11, 18), "theme": "和周敘明一起去，開始有身體接觸的機會", "trip_phase": True},
        ],
        "relations": {"暗戀": "周敘明", "摯友": "沈予曦"},
    },
    "姜以甯": {
        "current_arc": "前輩的影子",
        "arc_phases": [
            {"phase": 1, "name": "仰望", "diary_range": (1, 3), "theme": "對前輩的崇拜"},
            {"phase": 2, "name": "學習", "diary_range": (4, 7), "theme": "在工作上追隨"},
            {"phase": 3, "name": "蛻變", "diary_range": (8, 10), "theme": "尋找自己的方向"},
            {"phase": 4, "name": "杭州之旅", "diary_range": (11, 18), "theme": "以練習生工作為由參加，其實是因為他", "trip_phase": True},
        ],
        "relations": {"暗戀": "季允辰", "前輩": "陸思珩"},
    },
    "陸思珩": {
        "current_arc": "事業與愛情",
        "arc_phases": [
            {"phase": 1, "name": "穩重", "diary_range": (1, 3), "theme": "職場上的從容"},
            {"phase": 2, "name": "欣賞", "diary_range": (4, 7), "theme": "對季允辰的欣賞"},
            {"phase": 3, "name": "抉擇", "diary_range": (8, 10), "theme": "事業與情感的平衡"},
            {"phase": 4, "name": "杭州之旅", "diary_range": (11, 18), "theme": "以公關活動為名參加，現實是私人旅行", "trip_phase": True},
        ],
        "relations": {"欣賞": "季允辰", "下屬": "姜以甯"},
    },
    "溫芯蕾": {
        "current_arc": "暗戀的觀察者",
        "arc_phases": [
            {"phase": 1, "name": "相遇", "diary_range": (1, 3), "theme": "與沈予曦的偶然相遇"},
            {"phase": 2, "name": "靠近", "diary_range": (4, 6), "theme": "嘗試接近"},
            {"phase": 3, "name": "沉默", "diary_range": (7, 10), "theme": "選擇默默守護"},
            {"phase": 4, "name": "杭州之旅", "diary_range": (11, 13), "theme": "因咖啡廳業務只能去3天，但還是參加了", "trip_phase": True},
        ],
        "relations": {"暗戀": "沈予曦", "顧客": "季允辰"},
        "is_short_stay_participant": True,
    },
    "周敘明": {
        "current_arc": "陽光下的單戀",
        "arc_phases": [
            {"phase": 1, "name": "相遇", "diary_range": (1, 3), "theme": "健身房裡的第一眼"},
            {"phase": 2, "name": "熟悉", "diary_range": (4, 6), "theme": "逐漸記住她的名字"},
            {"phase": 3, "name": "心動", "diary_range": (7, 10), "theme": "發現自己在意每個她出現的瞬間"},
            {"phase": 4, "name": "勇氣", "diary_range": (11, 13), "theme": "決定不再只是暗處看著"},
            {"phase": 5, "name": "接近", "diary_range": (14, 16), "theme": "用行動代替心動"},
            {"phase": 6, "name": "杭州之旅", "diary_range": (17, 18), "theme": "和簡怡然一起去，享受旅行中的靠近", "trip_phase": True},
        ],
        "relations": {"暗戀": "簡怡然", "同事": "其他教練"},
        "song_directions": ["warm_ballad", "upbeat_pop", "energetic_electronic"],
        "is_short_stay_participant": True,
    },
    "季允辰": {
        "current_arc": "定焦之間的抉擇",
        "arc_phases": [
            {"phase": 1, "name": "鏡頭", "diary_range": (1, 3), "theme": "拿著相機記錄城市的孤獨"},
            {"phase": 2, "name": "暗流", "diary_range": (4, 7), "theme": "察覺到多道目光，但選擇專注作品"},
            {"phase": 3, "name": "契機", "diary_range": (8, 12), "theme": "一個值得按下快門的瞬間"},
            {"phase": 4, "name": "抉擇", "diary_range": (13, 16), "theme": "事業與關係的十字路口"},
            {"phase": 5, "name": "杭州之旅", "diary_range": (17, 24), "theme": "攝影師鏡頭下的她", "trip_phase": True},
        ],
        "relations": {"被暗戀": "沈予曦,姜以甯,溫芯蕾", "欣賞": "陸思珩", "顧客": "溫芯蕾"},
        "song_directions": ["melancholic_ballad", "cinematic_pop", "atmospheric_electronic"],
        "is_trip_photographer": True,
    },
}


# =============================================================================
# 自動化服務類別
# =============================================================================

class DailyAutomationService:
    """每日自動化內容生成服務"""

    def __init__(self):
        self.ai_service = AIService()
        self.music_service = MiniMaxMusicService()
        self.today = date.today()
        self.log_path = Path(f"/Volumes/Transcend/manga-studio/data/automation_log_{self.today}.json")
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _load_log(self) -> dict:
        """載入今日日誌"""
        if self.log_path.exists():
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                pass
        return {"date": str(self.today), "diaries": {}, "songs": {}}

    def _save_log(self, log: dict):
        """儲存日誌"""
        with open(self.log_path, "w", encoding="utf-8") as f:
            json.dump(log, f, ensure_ascii=False, indent=2)

    def _get_characters_for_diary(self) -> list:
        """取得需要生成日記的角色（女性）"""
        conn = get_connection()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT * FROM characters WHERE gender = 'female' ORDER BY character_number
        """).fetchall()
        chars = [dict(row) for row in rows]
        conn.close()
        return chars

    def _get_all_characters(self) -> list:
        """取得所有角色"""
        conn = get_connection()
        cursor = conn.cursor()
        rows = cursor.execute("SELECT * FROM characters ORDER BY character_number").fetchall()
        chars = [dict(row) for row in rows]
        conn.close()
        return chars

    def _get_diary_count(self, char_id: int) -> int:
        """取得角色日記數量"""
        conn = get_connection()
        cursor = conn.cursor()
        count = cursor.execute(
            "SELECT COUNT(*) FROM character_diaries WHERE character_id = ?", (char_id,)
        ).fetchone()[0]
        conn.close()
        return count

    def _get_song_count(self, char_id: int) -> int:
        """取得角色歌曲數量"""
        conn = get_connection()
        cursor = conn.cursor()
        count = cursor.execute(
            "SELECT COUNT(*) FROM character_songs WHERE character_id = ?", (char_id,)
        ).fetchone()[0]
        conn.close()
        return count

    def _has_generated_today(self, char_id: int, content_type: str, genre: str = None) -> bool:
        """
        檢查指定角色今天是否已生成指定類型的內容
        content_type: 'diary' 或 'song'
        genre: 可選，用於更精確地檢查特定曲風
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        today_start = f"{self.today} 00:00:00"
        
        if content_type == "diary":
            count = cursor.execute("""
                SELECT COUNT(*) FROM character_diaries 
                WHERE character_id = ? AND created_at >= ?
            """, (char_id, today_start)).fetchone()[0]
        else:  # song
            if genre:
                count = cursor.execute("""
                    SELECT COUNT(*) FROM character_songs 
                    WHERE character_id = ? AND created_at >= ? AND genre = ?
                """, (char_id, today_start, genre)).fetchone()[0]
            else:
                count = cursor.execute("""
                    SELECT COUNT(*) FROM character_songs 
                    WHERE character_id = ? AND created_at >= ?
                """, (char_id, today_start)).fetchone()[0]
        
        conn.close()
        return count > 0

    def _get_recent_diaries(self, limit: int = 20) -> list:
        """取得最近日記"""
        conn = get_connection()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT d.*, c.name as char_name, c.character_number
            FROM character_diaries d
            JOIN characters c ON d.character_id = c.id
            WHERE c.gender = 'female'
            ORDER BY d.created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        result = [dict(row) for row in rows]
        conn.close()
        return result

    def _determine_direction(self, char_name: str, diary_count: int) -> str:
        """根據角色故事線決定日記方向"""
        arc = STORY_ARCS.get(char_name, {})
        phases = arc.get("arc_phases", [])

        for phase in phases:
            if phase["diary_range"][0] <= diary_count + 1 <= phase["diary_range"][1]:
                phase_name = phase["name"]
                # 檢查是否為旅遊階段
                if phase.get("trip_phase"):
                    return "travel"
                if phase_name == "遇見" or phase_name == "注意" or phase_name == "仰望" or phase_name == "相遇":
                    return "love"
                elif phase_name == "接近" or phase_name == "熟悉" or phase_name == "學習" or phase_name == "靠近":
                    return "friendship"
                elif phase_name == "掙扎" or phase_name == "心動" or phase_name == "蛻變" or phase_name == "抉擇":
                    return "love"
                else:
                    return "daily"

        # 默認根據日記數量決定
        if diary_count < 3:
            return "love"
        elif diary_count < 7:
            return "work" if char_name in ["姜以甯", "陸思珩"] else "friendship"
        else:
            return "daily"

    def _analyze_story_state(self, char: dict, recent_diaries: list, direction: str) -> dict:
        """分析故事狀態（來自 routes.py 的 analyze_story_state）"""
        char_id = char.get("id")
        char_name = char.get("name", "")

        char_diaries = [d for d in recent_diaries if d.get("character_id") == char_id]

        relationships = STORY_ARCS.get(char_name, {}).get("relations", {})

        mood_history = []
        for d in char_diaries[:5]:
            tags = json.loads(d.get("tags", "[]")) if d.get("tags") else []
            mood_history.append({
                "mood": d.get("mood", ""),
                "mood_value": d.get("mood_value", ""),
                "tags": tags,
                "date": d.get("created_at", ""),
            })

        related_events = []
        for d in recent_diaries:
            if d.get("character_id") != char_id:
                tags = json.loads(d.get("tags", "[]")) if d.get("tags") else []
                if any(t in ["love", "friendship", "work", "secret"] for t in tags):
                    related_events.append({
                        "who": d.get("char_name", ""),
                        "what": d.get("title", ""),
                        "mood": d.get("mood", ""),
                        "date": d.get("created_at", ""),
                    })

        direction_hints = {
            "love": {"focus": "感情線", "possible_topics": ["觀察暗戀對象", "意外互動", "內心掙扎", "嫉妒", "心動瞬間"]},
            "work": {"focus": "事業線", "possible_topics": ["工作成就", "職業瓶頸", "同事互動", "自我懷疑", "突破"]},
            "friendship": {"focus": "友情線", "possible_topics": ["閨蜜時光", "互相傾訴", "支持與陪伴", "誤會與和解"]},
            "daily": {"focus": "日常線", "possible_topics": ["小確幸", "生活感悟", "獨處時光", "興趣愛好"]},
            "travel": {"focus": "旅遊線", "possible_topics": ["景點遊覽", "團體互動", "浪漫場景", "旅程趣事", "夜色散步", "眼神交匯", "身體接觸"]},
        }
        
        state = direction_hints.get(direction, direction_hints["daily"])
        
        # 如果是旅遊方向，額外附加旅遊資訊
        if direction == "travel":
            state["trip_context"] = {
                "trip_name": HANGZHOU_TRIP["name"],
                "itinerary": HANGZHOU_TRIP["itinerary"],
                "attractions_pool": HANGZHOU_TRIP["attractions_pool"],
                "organizer": HANGZHOU_TRIP["organizer"],
                "participants": HANGZHOU_TRIP["participants"],
            }

        return {
            "character": char,
            "character_name": char_name,
            "character_job": char.get("job", ""),
            "relationships": relationships,
            "mood_history": mood_history,
            "recent_events": related_events[:5],
            "diary_count": len(char_diaries),
            "story_progress": "early" if len(char_diaries) < 3 else "middle" if len(char_diaries) < 8 else "late",
            "direction_hint": state,
        }

    async def generate_diary_for_character(self, char: dict, log: dict) -> dict:
        """為單一角色生成日記"""
        char_id = char["id"]
        char_name = char["name"]

        current_count = self._get_diary_count(char_id)
        direction = self._determine_direction(char_name, current_count)

        recent_diaries = self._get_recent_diaries()
        story_state = self._analyze_story_state(char, recent_diaries, direction)

        print(f"  為 {char_name} 生成日記（#{current_count + 1}，方向：{direction}）...")

        # 生成日記
        diary_content = self.ai_service.generate_diary_with_story_context(
            char, story_state, direction
        )

        if not diary_content:
            print(f"    ✗ AI 生成失敗，使用本地生成")
            return {"status": "skipped", "reason": "AI generation failed"}

        # 儲存日記到資料庫
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO character_diaries 
            (character_id, title, content, mood, weather, location, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            char_id,
            diary_content.get("title", f"{char_name}的日記"),
            diary_content.get("content", ""),
            diary_content.get("mood", "calm"),
            diary_content.get("weather", "sunny"),
            diary_content.get("location", ""),
            json.dumps(diary_content.get("tags", [])),
        ))
        conn.commit()
        diary_id = cursor.lastrowid
        conn.close()

        print(f"    ✓ 日記已儲存（ID: {diary_id}）")

        # ── TTS 自動化：日記生成後自動配音 ──
        try:
            from services.diary_tts_service import DiaryTTSService
            tts_service = DiaryTTSService()
            text_for_tts = diary_content.get("content", "")[:500]  # 取前500字
            if text_for_tts and char.get("voice_id"):
                tts_result = await tts_service.generate_diary_audio(
                    diary_id=diary_id,
                    text=text_for_tts,
                    voice_id=char.get("voice_id", "Chinese (Mandarin)_Warm_Girl"),
                    speed=char.get("voice_speed", 1.0),
                    pitch=char.get("voice_pitch", 0.0),
                )
                if tts_result:
                    print(f"    🎤 TTS 配音完成：{tts_result}")
                else:
                    print(f"    ⚠ TTS 配音失敗（diary_id={diary_id}）")
        except Exception as e:
            print(f"    ⚠ TTS 自動化略過：{str(e)[:100]}")
        # ── TTS 結束 ──

        # 更新日誌
        log["diaries"][char_name] = {
            "diary_id": diary_id,
            "title": diary_content.get("title"),
            "mood": diary_content.get("mood"),
            "direction": direction,
            "generated_at": datetime.now().isoformat(),
        }

        return {"status": "success", "diary_id": diary_id}

    async def generate_songs_for_character(self, char: dict, song_index: int, log: dict) -> dict:
        """為角色生成指定曲風的歌曲"""
        char_id = char["id"]
        char_name = char["name"]
        voice_profile = CHARACTER_VOICE_PROFILES.get(char_name, {})

        genre_info = DAILY_SONG_GENRES[song_index]

        print(f"  為 {char_name} 生成歌曲 #{song_index}（曲風：{genre_info['description']}）...")

        # 取得角色最近的日記
        conn = get_connection()
        cursor = conn.cursor()
        diary_rows = cursor.execute("""
            SELECT * FROM character_diaries
            WHERE character_id = ?
            ORDER BY created_at DESC LIMIT 3
        """, (char_id,)).fetchall()
        diaries = [dict(row) for row in diary_rows]
        conn.close()

        # 建立歌曲記錄
        cursor = conn.cursor()
        title = f"{char_name}的{genre_info['description']}"

        cursor.execute("""
            INSERT INTO character_songs 
            (character_id, title, song_type, genre, mood, tempo, duration, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            char_id, title, "theme",
            genre_info["genre"], genre_info["mood"], genre_info["tempo"],
            60, "generating"
        ))
        conn.commit()
        song_id = cursor.lastrowid
        conn.close()

        # 生成歌曲
        try:
            result = await self.music_service.generate_character_theme_song(
                character={
                    **char,
                    "voice_description": voice_profile.get("description", ""),
                    "music_mood": genre_info["mood"],
                },
                diary_entries=diaries,
                inspiration=voice_profile.get("music_voice_style", ""),
                duration=60,
            )

            if result.get("status") == "success":
                audio_url = result.get("audio_url")

                if audio_url:
                    download_result = await self.music_service.download_audio_to_local(
                        audio_url=audio_url,
                        character_id=char_id,
                        song_id=song_id,
                    )

                    local_path = None
                    if download_result.get("status") == "success":
                        local_path = download_result.get("local_path")
                        filename = Path(local_path).name
                        full_url = f"http://localhost:8000/songs/{filename}"
                    else:
                        full_url = audio_url

                    # 更新歌曲狀態
                    conn = get_connection()
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE character_songs
                        SET status = 'completed', song_url = ?, local_path = ?
                        WHERE id = ?
                    """, (full_url, local_path, song_id))
                    conn.commit()
                    conn.close()

                    print(f"    ✓ 歌曲已生成（ID: {song_id}）")

                    log["songs"][f"{char_name}_song_{song_index}"] = {
                        "song_id": song_id,
                        "genre": genre_info["genre"],
                        "title": title,
                        "status": "completed",
                        "generated_at": datetime.now().isoformat(),
                    }

                    return {"status": "success", "song_id": song_id}
            else:
                print(f"    ✗ 歌曲生成失敗: {result.get('error', 'Unknown error')}")
                return {"status": "failed", "error": result.get("error")}

        except Exception as e:
            print(f"    ✗ 生成過程出錯: {e}")
            return {"status": "error", "error": str(e)}

    async def run_diary_generation(self) -> dict:
        """執行日記生成 - 為所有7個女性角色生成日記"""
        print(f"\n=== 日記生成任務（{self.today}）===\n")

        chars = self._get_characters_for_diary()
        log = self._load_log()

        results = []
        diary_count = 0
        
        for char in chars:
            char_id = char["id"]
            char_name = char["name"]
            
            # 檢查今天是否已生成
            if self._has_generated_today(char_id, "diary"):
                print(f"  ⏭ {char_name} 今日已生成日記，跳過")
                results.append({"status": "skipped", "reason": "already_generated_today"})
                continue
            
            result = await self.generate_diary_for_character(char, log)
            results.append(result)
            
            if result.get("status") == "success":
                diary_count += 1
            
            await asyncio.sleep(1)  # 避免API頻繁調用

        self._save_log(log)

        success = sum(1 for r in results if r.get("status") == "success")
        skipped = sum(1 for r in results if r.get("status") == "skipped")
        print(f"\n✓ 日記生成完成：{success} 篇新生成，{skipped} 篇跳過（已存在）")

        return {"status": "completed", "generated": success, "skipped": skipped, "results": results}

    async def run_song_generation(self) -> dict:
        """執行歌曲生成 - 每天為所有7個角色各生成3首歌（21首）"""
        print(f"\n=== 歌曲生成任務（{self.today}）===\n")

        chars = self._get_all_characters()
        log = self._load_log()

        results = []
        song_count = 0
        
        print(f"共 {len(chars)} 個角色，每個角色生成 3 首歌（ballad/pop/electronic）\n")

        for char in chars:
            char_id = char["id"]
            char_name = char["name"]
            
            # 為每個角色生成 3 首歌（3種曲風）
            for song_index in range(1, 4):
                genre_info = DAILY_SONG_GENRES[song_index]
                
                # 檢查今天是否已生成該曲風的歌曲
                if self._has_generated_today(char_id, "song", genre=genre_info['genre']):
                    print(f"  ⏭ {char_name} 的 {genre_info['description']} 今日已生成，跳過")
                    results.append({"status": "skipped", "reason": "already_generated_today", "char": char_name, "genre": genre_info['genre']})
                    continue
                
                print(f"  為 {char_name} 生成歌曲 #{song_index}（{genre_info['description']}）...")
                
                result = await self.generate_songs_for_character(char, song_index, log)
                results.append(result)
                
                if result.get("status") == "success":
                    song_count += 1
                
                await asyncio.sleep(2)  # 避免API頻繁調用

        self._save_log(log)

        success = sum(1 for r in results if r.get("status") == "success")
        skipped = sum(1 for r in results if r.get("status") == "skipped")
        failed = sum(1 for r in results if r.get("status") == "failed")
        print(f"\n✓ 歌曲生成完成：{success} 首成功，{skipped} 首跳過，{failed} 首失敗")

        return {"status": "completed", "generated": success, "skipped": skipped, "failed": failed, "results": results}

    async def run_full_generation(self) -> dict:
        """執行完整生成（日記 + 歌曲）"""
        print(f"\n{'='*50}")
        print(f"  自動化內容生成任務")
        print(f"  日期：{self.today}")
        print(f"{'='*50}")

        # 日記生成
        await self.run_diary_generation()
        await asyncio.sleep(2)

        # 歌曲生成
        await self.run_song_generation()

        print(f"\n{'='*50}")
        print(f"  任務完成")
        print(f"{'='*50}\n")

        log = self._load_log()
        return {"status": "completed", "log": log}

    def show_status(self):
        """顯示今日狀態"""
        log = self._load_log()

        print(f"\n=== 自動化狀態（{self.today}）===\n")

        if not log.get("diaries") and not log.get("songs"):
            print("今日尚未執行任何生成任務")
            return

        if log.get("diaries"):
            print("【日記】")
            for name, info in log["diaries"].items():
                print(f"  {name}: {info.get('title', 'N/A')} ({info.get('mood', 'N/A')})")

        if log.get("songs"):
            print("\n【歌曲】")
            for key, info in log["songs"].items():
                print(f"  {key}: {info.get('title', 'N/A')} [{info.get('genre', 'N/A')}]")

        # 顯示所有角色的日記/歌曲數
        print("\n【角色統計】")
        chars = self._get_all_characters()
        for char in chars:
            if char["gender"] == "female":
                diary_count = self._get_diary_count(char["id"])
                song_count = self._get_song_count(char["id"])
                print(f"  {char['name']}: {diary_count}篇日記, {song_count}首歌曲")


# =============================================================================
# 杭州之旅旅遊自動化服務
# =============================================================================

class TripAutomationService:
    """杭州之旅旅遊事件自動化服務"""

    def __init__(self):
        self.ai_service = AIService()
        self.today = date.today()
        self.log_path = Path(f"/Volumes/Transcend/manga-studio/data/trip_automation_log_{self.today}.json")
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _load_log(self) -> dict:
        """載入今日日誌"""
        if self.log_path.exists():
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                pass
        return {"date": str(self.today), "trip_diaries": {}, "status": "pending"}

    def _save_log(self, log: dict):
        """儲存日誌"""
        with open(self.log_path, "w", encoding="utf-8") as f:
            json.dump(log, f, ensure_ascii=False, indent=2)

    def _is_trip_period(self) -> bool:
        """檢查今日是否在旅遊期間"""
        trip_start = datetime.strptime(HANGZHOU_TRIP["trip_start_date"], "%Y-%m-%d").date()
        trip_end = datetime.strptime(HANGZHOU_TRIP["trip_end_date"], "%Y-%m-%d").date()
        return trip_start <= self.today <= trip_end

    def _get_trip_day(self) -> int:
        """取得今天是旅遊的第幾天"""
        trip_start = datetime.strptime(HANGZHOU_TRIP["trip_start_date"], "%Y-%m-%d").date()
        return (self.today - trip_start).days + 1

    def _get_characters_for_trip(self) -> list:
        """取得參與旅遊的角色"""
        conn = get_connection()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT * FROM characters WHERE name IN (?, ?, ?, ?, ?, ?, ?)
            ORDER BY character_number
        """, tuple(HANGZHOU_TRIP["participants"])).fetchall()
        chars = [dict(row) for row in rows]
        conn.close()
        return chars

    def _get_participant_count(self) -> int:
        """取得參與旅遊的角色數量"""
        return len(HANGZHOU_TRIP["participants"])

    async def generate_trip_diary_for_character(self, char: dict, trip_day: int, log: dict) -> dict:
        """為旅遊中的角色生成日記"""
        char_id = char["id"]
        char_name = char["name"]
        trip_info = HANGZHOU_TRIP["itinerary"].get(trip_day, {})
        
        # 檢查是否為短期停留角色
        arc = STORY_ARCS.get(char_name, {})
        is_short_stay = arc.get("is_short_stay_participant", False)
        
        # 如果是短期停留角色且不在其停留期間，跳過
        if is_short_stay and trip_day > 3:  # 假設短期停留為前3天
            return {"status": "skipped", "reason": "short_stay_ended"}

        print(f"  為 {char_name} 生成旅遊日記（Day {trip_day}）...")

        # 取得故事狀態
        recent_diaries = self._get_recent_diaries()
        direction = "travel"
        story_state = self._analyze_story_state(char, recent_diaries, direction)

        # 附加旅遊資訊到 story_state
        story_state["trip_context"] = {
            "trip_name": HANGZHOU_TRIP["name"],
            "trip_day": trip_day,
            "itinerary": trip_info,
            "attractions_pool": HANGZHOU_TRIP["attractions_pool"],
            "organizer": HANGZHOU_TRIP["organizer"],
            "participants": HANGZHOU_TRIP["participants"],
            "location": trip_info.get("location", ""),
            "emotional_tags": trip_info.get("emotional_tags", []),
        }

        # 生成日記
        diary_content = self.ai_service.generate_diary_with_story_context(
            char, story_state, direction
        )

        if not diary_content:
            print(f"    ✗ AI 生成失敗")
            return {"status": "failed", "reason": "AI generation failed"}

        # 儲存日記到資料庫
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO character_diaries 
            (character_id, title, content, mood, weather, location, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            char_id,
            diary_content.get("title", f"{char_name}的杭州日記 Day{trip_day}"),
            diary_content.get("content", ""),
            diary_content.get("mood", "excited"),
            diary_content.get("weather", "sunny"),
            trip_info.get("location", "杭州"),
            json.dumps(diary_content.get("tags", []) + ["travel", "hangzhou_trip"]),
        ))
        conn.commit()
        diary_id = cursor.lastrowid
        conn.close()

        print(f"    ✓ 旅遊日記已儲存（ID: {diary_id}）")

        # 更新日誌
        log["trip_diaries"][char_name] = {
            "diary_id": diary_id,
            "day": trip_day,
            "title": diary_content.get("title"),
            "mood": diary_content.get("mood"),
            "generated_at": datetime.now().isoformat(),
        }

        return {"status": "success", "diary_id": diary_id}

    def _get_recent_diaries(self, limit: int = 20) -> list:
        """取得最近日記"""
        conn = get_connection()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT d.*, c.name as char_name, c.character_number
            FROM character_diaries d
            JOIN characters c ON d.character_id = c.id
            ORDER BY d.created_at DESC LIMIT ?
        """, (limit,)).fetchall()
        result = [dict(row) for row in rows]
        conn.close()
        return result

    def _analyze_story_state(self, char: dict, recent_diaries: list, direction: str) -> dict:
        """分析故事狀態"""
        char_id = char.get("id")
        char_name = char.get("name", "")

        char_diaries = [d for d in recent_diaries if d.get("character_id") == char_id]
        relationships = STORY_ARCS.get(char_name, {}).get("relations", {})

        direction_hints = {
            "travel": {"focus": "旅遊線", "possible_topics": ["景點遊覽", "團體互動", "浪漫場景", "旅程趣事", "夜色散步", "眼神交匯", "身體接觸"]},
        }
        state = direction_hints.get(direction, {"focus": "日常線", "possible_topics": []})
        
        return {
            "character": char,
            "character_name": char_name,
            "character_job": char.get("job", ""),
            "relationships": relationships,
            "mood_history": [],
            "recent_events": [],
            "diary_count": len(char_diaries),
            "story_progress": "travel",
            "direction_hint": state,
        }

    async def run_trip_diary_generation(self) -> dict:
        """執行旅遊日記生成"""
        if not self._is_trip_period():
            print(f"\n⚠ 今日（{self.today}）不在旅遊期間（{HANGZHOU_TRIP['trip_start_date']} ~ {HANGZHOU_TRIP['trip_end_date']}）")
            return {"status": "not_in_trip_period", "date": str(self.today)}

        trip_day = self._get_trip_day()
        print(f"\n=== 杭州之旅日記生成（Day {trip_day} / {HANGZHOU_TRIP['duration_days']}）===\n")
        print(f"旅遊名稱：{HANGZHOU_TRIP['name']}")
        print(f"今日行程：{HANGZHOU_TRIP['itinerary'].get(trip_day, {}).get('title', '自由活動')}")
        print(f"景點：{', '.join(HANGZHOU_TRIP['itinerary'].get(trip_day, {}).get('attractions', []))}\n")

        chars = self._get_characters_for_trip()
        log = self._load_log()

        results = []
        diary_count = 0

        for char in chars:
            result = await self.generate_trip_diary_for_character(char, trip_day, log)
            results.append(result)

            if result.get("status") == "success":
                diary_count += 1

            await asyncio.sleep(1)

        self._save_log(log)

        success = sum(1 for r in results if r.get("status") == "success")
        skipped = sum(1 for r in results if r.get("status") == "skipped")
        print(f"\n✓ 旅遊日記生成完成：{success} 篇新生成，{skipped} 篇跳過")

        return {"status": "completed", "trip_day": trip_day, "generated": success, "skipped": skipped, "results": results}

    def show_trip_status(self):
        """顯示旅遊狀態"""
        if self._is_trip_period():
            trip_day = self._get_trip_day()
            trip_info = HANGZHOU_TRIP["itinerary"].get(trip_day, {})
            print(f"\n=== 杭州之旅進行中（Day {trip_day}）===")
            print(f"旅遊名稱：{HANGZHOU_TRIP['name']}")
            print(f"今日行程：{trip_info.get('title', '自由活動')}")
            print(f"地點：{trip_info.get('location', '')}")
            print(f"景點：{', '.join(trip_info.get('attractions', []))}")
            print(f"參與者：{', '.join(HANGZHOU_TRIP['participants'])}")
        else:
            trip_start = HANGZHOU_TRIP["trip_start_date"]
            trip_end = HANGZHOU_TRIP["trip_end_date"]
            print(f"\n=== 杭州之旅不在進行期間 ===")
            print(f"旅遊期間：{trip_start} ~ {trip_end}")
            print(f"今日日期：{self.today}")


# =============================================================================
# 主程式
# =============================================================================

async def main():
    parser = argparse.ArgumentParser(description="Manga Studio 自動化內容生成")
    parser.add_argument("--mode", choices=["diary", "song", "full", "status", "trip", "trip-status"],
                        default="status", help="執行模式")
    parser.add_argument("--trip-date", help="指定旅遊日期（格式：YYYY-MM-DD，預設為今天）")
    args = parser.parse_args()

    # 旅遊專用模式
    if args.mode == "trip-status":
        trip_service = TripAutomationService()
        trip_service.show_trip_status()
        return

    if args.mode == "trip":
        trip_service = TripAutomationService()
        if args.trip_date:
            # 允許指定日期進行旅遊日記生成（用於測試或補生成）
            original_today = trip_service.today
            trip_service.today = datetime.strptime(args.trip_date, "%Y-%m-%d").date()
            result = await trip_service.run_trip_diary_generation()
            trip_service.today = original_today
        else:
            result = await trip_service.run_trip_diary_generation()
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # 一般自動化模式
    service = DailyAutomationService()

    if args.mode == "diary":
        result = await service.run_diary_generation()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.mode == "song":
        result = await service.run_song_generation()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif args.mode == "full":
        result = await service.run_full_generation()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        service.show_status()


if __name__ == "__main__":
    asyncio.run(main())
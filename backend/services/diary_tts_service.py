"""
角色日記有聲配音服務
使用 MiniMax mmx-cli 將日記內容轉為語音
"""

import os
import re
import subprocess
import json
import asyncio
from pathlib import Path
from typing import Optional, List

# 日記音訊儲存目錄
AUDIO_DIR = Path("/Volumes/Transcend/manga-studio/data/diary_audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# mmx-cli 路徑
MMX_CMD = "mmx"


class DiaryTTSService:
    """MiniMax TTS 服務 — 使用 mmx-cli 為日記生成有聲配音"""

    def __init__(self):
        self.api_key = os.getenv("MINIMAX_API_KEY", "")

    def _clean_diary_text(self, content: str) -> str:
        """過濾日記內容，移除格式標記"""
        if not content:
            return ""
        # 移除內心OS標記
        cleaned = re.sub(r'\[內心OS:[^\]]*\]', '', content)
        # 移除過多換行
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()

    def _get_audio_path(self, diary_id: int) -> Path:
        return AUDIO_DIR / f"diary_{diary_id}.mp3"

    async def generate_test_audio(
        self,
        text: str,
        voice_id: str = "Chinese (Mandarin)_Warm_Girl",
        speed: float = 1.0,
        pitch: float = 0.0
    ) -> Optional[str]:
        """產生測試音頻（總是重新生成，不使用快取）"""
        audio_path = Path("/Volumes/Transcend/manga-studio/data/voice_test/test.mp3")
        audio_path.parent.mkdir(parents=True, exist_ok=True)

        # 先刪除舊檔案
        if audio_path.exists():
            audio_path.unlink()

        cmd = [
            MMX_CMD, "speech", "synthesize",
            "--text", text,
            "--voice", voice_id,
            "--out", str(audio_path)
        ]

        # 加入 speed 參數（0.5 ~ 2.0）
        if speed != 1.0:
            cmd.extend(["--speed", str(speed)])

        # 加入 pitch 參數（-12 ~ 12）
        if pitch != 0.0:
            cmd.extend(["--pitch", str(pitch)])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                print(f"mmx speech error: {result.stderr}")
                return None

            if not audio_path.exists():
                print(f"Audio file not created: {audio_path}")
                return None

            return f"/voice_test/test.mp3"

        except subprocess.TimeoutExpired:
            print("mmx speech synthesis timeout")
            return None
        except Exception as e:
            print(f"mmx speech error: {e}")
            return None

    async def generate_diary_audio(
        self,
        diary_id: int,
        text: str,
        voice_id: str = "Chinese (Mandarin)_Warm_Girl",
        speed: float = 1.0,
        pitch: float = 0.0
    ) -> Optional[str]:
        """
        將日記內容轉為語音（使用 mmx-cli）
        voice_id / speed / pitch 都必須套用，刪除舊快取重新生成
        """
        cleaned = self._clean_diary_text(text)
        if not cleaned:
            return None

        audio_path = self._get_audio_path(diary_id)

        # 刪除舊檔案，確保用新參數重新生成
        if audio_path.exists():
            audio_path.unlink()

        cmd = [
            MMX_CMD, "speech", "synthesize",
            "--text", cleaned,
            "--voice", voice_id,
            "--out", str(audio_path)
        ]

        # 加入 speed 參數（0.5 ~ 2.0）
        if speed != 1.0:
            cmd.extend(["--speed", str(speed)])

        # 加入 pitch 參數（-12 ~ 12）
        if pitch != 0.0:
            cmd.extend(["--pitch", str(pitch)])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                print(f"mmx speech error: {result.stderr}")
                return None

            # 驗證檔案是否生成
            if not audio_path.exists():
                print(f"Audio file not created: {audio_path}")
                return None

            return f"/diary_audio/diary_{diary_id}.mp3"

        except subprocess.TimeoutExpired:
            print("mmx speech synthesis timeout")
            return None
        except Exception as e:
            print(f"mmx speech error: {e}")
            return None

    async def list_voices(self) -> List[dict]:
        """列出可用音色（從 mmx-cli 取得）"""
        try:
            result = subprocess.run(
                [MMX_CMD, "speech", "voices"],
                capture_output=True,
                text=True,
                timeout=15
            )
            if result.returncode != 0:
                print(f"mmx voices error: {result.stderr}")
                return self._default_voices()

            voices = json.loads(result.stdout)
            return self._format_voices(voices)

        except Exception as e:
            print(f"list_voices error: {e}")
            return self._default_voices()

    def _format_voices(self, voices: List[str]) -> List[dict]:
        """將 mmx-cli 的音色清單格式化為统一結構"""
        result = []
        for v in voices:
            is_chinese = "Chinese" in v or "Mandarin" in v
            is_male = any(kw in v for kw in ["Man", "Male", "Boy", "Youth", "Gentleman", "Uncle", "Father", "Mr"])
            is_female = any(kw in v for kw in ["Girl", "Woman", "Lady", "Miss", "Aunt", "Mrs"])

            lang = "中文" if is_chinese else "English"
            gender = "male" if is_male else ("female" if is_female else "neutral")

            # 取得顯示名稱
            if "_" in v:
                parts = v.split("_", 1)
                name = parts[1].replace("_", " ") if len(parts) > 1 else v
            else:
                name = v

            result.append({
                "id": v,
                "name": name,
                "gender": gender,
                "lang": lang
            })

        return result

    def _default_voices(self) -> List[dict]:
        """預設音色清單（當 mmx-cli 不可用時）"""
        return [
            {"id": "Chinese (Mandarin)_Warm_Girl", "name": "溫柔女孩", "gender": "female", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Sweet_Lady", "name": "甜美少女", "gender": "female", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Crisp_Girl", "name": "清脆女孩", "gender": "female", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Soft_Girl", "name": "柔和女孩", "gender": "female", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Warm_Bestie", "name": "暖心閨蜜", "gender": "female", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Gentle_Youth", "name": "溫柔青年", "gender": "male", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Straightforward_Boy", "name": "直爽男孩", "gender": "male", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Pure-hearted_Boy", "name": "純真男孩", "gender": "male", "lang": "中文"},
            {"id": "Chinese (Mandarin)_Southern_Young_Man", "name": "南方少年", "gender": "male", "lang": "中文"},
            {"id": "English_radiant_girl", "name": "Radiant Girl", "gender": "female", "lang": "English"},
            {"id": "English_magnetic_voiced_man", "name": "Magnetic-voiced Man", "gender": "male", "lang": "English"},
        ]

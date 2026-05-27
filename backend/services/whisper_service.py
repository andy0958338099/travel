"""
Whisper Service — 本地語音轉字幕
使用 whisper CLI 將日記有聲配音自動轉為 SRT 字幕檔
"""
import subprocess
import json
import uuid
import textwrap
from pathlib import Path
from typing import Optional

# ── constants ─────────────────────────────────────────────────────────────────
WHISPER_CMD = "/usr/local/bin/whisper"
FFMPEG      = "/usr/local/bin/ffmpeg"
FFPROBE     = "/usr/local/bin/ffprobe"

PROJECT_ROOT = Path(__file__).parent.parent.parent
SUBTITLE_DIR = PROJECT_ROOT / "data" / "assets" / "subtitles"
SUBTITLE_DIR.mkdir(parents=True, exist_ok=True)


# ── helpers ───────────────────────────────────────────────────────────────────
def get_audio_duration(path: str) -> float:
    """取得音頻時長（秒）"""
    cmd = [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return float(json.loads(result.stdout)["format"]["duration"])
    except Exception:
        return 0.0


def seconds_to_srt_time(sec: float) -> str:
    h  = int(sec // 3600)
    m  = int((sec % 3600) // 60)
    s  = int(sec % 60)
    ms = int((sec % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def make_srt(segments: list[dict], max_chars: int = 40) -> str:
    """將 whisper 输出segments转成SRT字幕块"""
    srt_lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        start = seconds_to_srt_time(seg["start"])
        end   = seconds_to_srt_time(seg["end"])
        text  = seg["text"].strip()
        # 換行包裝
        wrapped = textwrap.wrap(text, width=max_chars) or [text]
        content = "\n".join(wrapped)
        srt_lines.append(f"{i}\n{start} --> {end}\n{content}\n")
    return "\n".join(srt_lines)


# ── core transcription ─────────────────────────────────────────────────────────
def transcribe_audio(
    audio_path: str,
    language: str = "zh",
    model: str = "base",
) -> tuple[bool, str, str]:
    """
    使用 whisper CLI 將音頻轉為 SRT 字幕。
    Returns: (success, srt_content, error_message)
    """
    audio_path = str(audio_path)
    output_name = f"sub_{uuid.uuid4().hex[:8]}"

    # whisper 輸出到 tmp 目錄
    tmp_dir = SUBTITLE_DIR / f"tmp_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        WHISPER_CMD,
        audio_path,
        "--model",           model,
        "--language",        language,
        "--task",            "transcribe",
        "--output_format",   "srt",
        "--output_dir",      str(tmp_dir),
        "--fp16",            "False",   # Mac/Intel CPU 用
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

    if result.returncode != 0:
        err = result.stderr[:300]
        return False, "", err

    # 找到輸出的 .srt 檔
    srt_files = list(tmp_dir.glob("*.srt"))
    if not srt_files:
        return False, "", "Whisper 沒有產生 SRT 檔"

    srt_content = srt_files[0].read_text(encoding="utf-8")

    # cleanup
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return True, srt_content, ""


def transcribe_and_save(
    audio_path: str,
    language: str = "zh",
    model: str = "base",
) -> tuple[bool, str, str]:
    """
    轉寫音頻並儲存 SRT 檔。
    Returns: (success, srt_file_path, error_message)
    """
    ok, srt_content, err = transcribe_audio(audio_path, language, model)
    if not ok:
        return False, "", err

    output_name = f"sub_{uuid.uuid4().hex[:8]}.srt"
    srt_path = SUBTITLE_DIR / output_name
    srt_path.write_text(srt_content, encoding="utf-8")
    return True, str(srt_path), ""
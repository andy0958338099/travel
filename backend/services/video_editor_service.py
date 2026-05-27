"""
Video Editor Service — FFmpeg-based video composition pipeline
Combines: diary TTS audio + portfolio images + optional subtitles
→ Final video clip with intro/outro
"""
import subprocess
import json
import uuid
import textwrap
from pathlib import Path
from typing import Optional, List

# ── constants ─────────────────────────────────────────────────────────────────
FFMPEG   = "/usr/local/bin/ffmpeg"
FFPROBE  = "/usr/local/bin/ffprobe"
FONT_FILE = "/System/Library/Fonts/PingFang.ttc"

PROJECT_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR   = PROJECT_ROOT / "data" / "assets" / "video_clips"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── helpers ───────────────────────────────────────────────────────────────────
def run_ffmpeg(cmd: List[str]) -> tuple[bool, str]:
    """Run ffmpeg, return (success, stderr)."""
    result = subprocess.run(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    return result.returncode == 0, result.stderr


def get_duration_seconds(path: str) -> float:
    """Return duration of a media file via ffprobe."""
    cmd = [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except Exception:
        return 0.0


def make_srt(text: str, start_sec: float, duration: float) -> str:
    """Build a minimal SRT block."""
    start_hms = _sec_to_srt_time(start_sec)
    end_hms   = _sec_to_srt_time(start_sec + duration)
    lines = textwrap.wrap(text, width=38) or [text]
    content = "\n".join(lines)
    return f"1\n{start_hms} --> {end_hms}\n{content}\n\n"


def _sec_to_srt_time(sec: float) -> str:
    h  = int(sec // 3600)
    m  = int((sec % 3600) // 60)
    s  = int(sec % 60)
    ms = int((sec % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ── core composition ───────────────────────────────────────────────────────────
def compose_clip_with_audio(
    image_path: str,
    audio_path: str,
    output_path: str,
    subtitle_text: Optional[str] = None,
) -> tuple[bool, str, float]:
    """
    Create a video clip from one image + one audio file.
    Returns (success, error_message, duration_seconds).
    """
    duration = get_duration_seconds(str(audio_path))
    if duration <= 0:
        return False, f"Could not get audio duration for {audio_path}", 0.0

    tmp_dir   = OUTPUT_DIR / f"tmp_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(exist_ok=True)
    srt_path  = tmp_dir / "subs.srt"
    out_path  = Path(output_path)

    if subtitle_text:
        srt_path.write_text(make_srt(subtitle_text, 0.0, duration), encoding="utf-8")
        sub_param = [
            "-vf", (
                f"subtitles='{srt_path}':force_style='FontName={FONT_FILE},"
                f"FontSize=36,PrimaryColour=&H00FFFFFF&'"
            )
        ]
    else:
        sub_param = []

    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", str(image_path),
        "-i", str(audio_path),
        "-t", str(duration),
        "-vf", "scale='max(sar,1)*iw':-1,format=yuv420p",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-pix_fmt", "yuv420p",
        *sub_param,
        str(out_path),
    ]
    success, err = run_ffmpeg(cmd)

    # cleanup
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return success, err, duration


def compose_from_images_and_audios(
    image_audio_pairs: List[dict],
    output_path: str,
) -> tuple[bool, str]:
    """
    Compose a video from multiple (image_path, audio_path) segments.
    Each pair: {image_path, audio_path, subtitle_text (opt)}
    Returns (success, error_message).
    """
    tmp_dir = OUTPUT_DIR / f"concat_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    segment_paths: List[str] = []

    for i, pair in enumerate(image_audio_pairs):
        seg_out = str(tmp_dir / f"seg_{i:03d}.mp4")
        ok, err, _ = compose_clip_with_audio(
            image_path=str(pair["image_path"]),
            audio_path=str(pair["audio_path"]),
            output_path=seg_out,
            subtitle_text=pair.get("subtitle_text"),
        )
        if not ok:
            import shutil; shutil.rmtree(tmp_dir, ignore_errors=True)
            return False, f"Segment {i} failed: {err}"
        segment_paths.append(seg_out)

    concat_list = str(tmp_dir / "list.txt")
    concat_list_content = "\n".join(f"file '{p}'" for p in segment_paths)
    Path(concat_list).write_text(concat_list_content)

    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(output_path),
    ]
    success, err = run_ffmpeg(cmd)

    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)
    return success, err


def add_intro_outro(
    input_video: str,
    output_video: str,
    intro_path: Optional[str] = None,
    outro_path: Optional[str] = None,
) -> tuple[bool, str]:
    """Prepend intro and/or append outro to an existing video."""
    parts = [p for p in [intro_path, input_video, outro_path] if p]

    if len(parts) == 1:
        import shutil
        shutil.copy(input_video, output_video)
        return True, ""

    tmp_dir     = OUTPUT_DIR / f"intro_outro_{uuid.uuid4().hex[:8]}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    concat_list = str(tmp_dir / "list.txt")
    Path(concat_list).write_text("\n".join(f"file '{p}'" for p in parts))

    cmd = [
        FFMPEG, "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_list),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(output_video),
    ]
    success, err = run_ffmpeg(cmd)

    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)
    return success, err


def burn_subtitles(
    video_path: str,
    output_path: str,
    srt_path: str,
) -> tuple[bool, str]:
    """Burn an SRT file as subtitles into a video."""
    cmd = [
        FFMPEG, "-y",
        "-i", str(video_path),
        "-vf", (
            f"subtitles='{srt_path}':force_style='FontName={FONT_FILE},"
            f"FontSize=36,PrimaryColour=&H00FFFFFF&'"
        ),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(output_path),
    ]
    success, err = run_ffmpeg(cmd)
    return success, err


def merge_video_audio(
    video_path: str,
    audio_path: str,
    output_path: str,
) -> tuple[bool, str]:
    """Replace or add audio track to video."""
    cmd = [
        FFMPEG, "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(output_path),
    ]
    success, err = run_ffmpeg(cmd)
    return success, err


def generate_thumbnail(
    video_path: str,
    output_path: str,
    timestamp: str = "00:00:02",
) -> tuple[bool, str]:
    """Extract a thumbnail at a given timestamp."""
    cmd = [
        FFMPEG, "-y",
        "-ss", timestamp,
        "-i", str(video_path),
        "-vframes", "1",
        "-q:v", "2",
        str(output_path),
    ]
    success, err = run_ffmpeg(cmd)
    return success, err
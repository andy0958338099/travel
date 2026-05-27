from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import router
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Manga Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Watchdog 活躍追蹤 Middleware — 每個 API 請求都更新最後活躍時間
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
try:
    from scripts.watchdog import touch_activity as _wd_touch
except Exception:
    _wd_touch = None

@app.middleware("http")
async def track_watchdog_activity(request, call_next):
    response = await call_next(request)
    if response.status_code < 400 and _wd_touch is not None:
        try:
            _wd_touch()
        except Exception:
            pass
    return response

app.include_router(router, prefix="/api")

# 靜態檔案服務
outputs_dir = os.path.join(os.path.dirname(__file__), "..", "outputs")
if os.path.exists(outputs_dir):
    app.mount("/outputs", StaticFiles(directory=outputs_dir), name="outputs")

# 歌曲靜態檔案服務
songs_dir = "/Volumes/Transcend/manga-studio/backend/static/songs"
if os.path.exists(songs_dir):
    app.mount("/songs", StaticFiles(directory=songs_dir), name="songs")

# 角色資產靜態檔案服務（包含影片）
assets_dir = "/Volumes/Transcend/manga-studio/assets"
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# 日記有聲配音靜態檔案服務
diary_audio_dir = "/Volumes/Transcend/manga-studio/data/diary_audio"
if os.path.exists(diary_audio_dir):
    app.mount("/diary_audio", StaticFiles(directory=diary_audio_dir), name="diary_audio")

# 音色測試音頻靜態檔案服務
voice_test_dir = "/Volumes/Transcend/manga-studio/data/voice_test"
if os.path.exists(voice_test_dir):
    app.mount("/voice_test", StaticFiles(directory=voice_test_dir), name="voice_test")

# 影片剪輯靜態檔案服務
video_clips_dir = "/Volumes/Transcend/manga-studio/data/assets/video_clips"
if os.path.exists(video_clips_dir):
    app.mount("/video_clips", StaticFiles(directory=video_clips_dir), name="video_clips")

# 字幕靜態檔案服務
subtitles_dir = "/Volumes/Transcend/manga-studio/data/assets/subtitles"
if os.path.exists(subtitles_dir):
    app.mount("/subtitles", StaticFiles(directory=subtitles_dir), name="subtitles")

# 旅遊插圖靜態檔案服務
travel_images_dir = "/Volumes/Transcend/manga-studio/data/assets/travel-images"
if os.path.exists(travel_images_dir):
    app.mount("/travel-images", StaticFiles(directory=travel_images_dir), name="travel_images")

@app.get("/health")
def health():
    return {"status": "ok"}

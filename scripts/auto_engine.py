"""
江南水鄉八日之旅 自動化改進引擎
當 Watchdog 檢測到 AI 閒置 10 分鐘時，自動執行待辦改進項目
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from db.database import get_connection

# =============================================================================
# 自動化改進項目定義
# =============================================================================

IMPROVEMENT_PROJECTS = {
    "auto-tts-diary": {
        "title": "自動化 TTS",
        "description": "日記生成後自動轉語音",
        "priority": 1,
        "files_to_create": [
            "/Volumes/Transcend/manga-studio/backend/api/auto_tts_routes.py"
        ],
        "code_snippet": '''
# 在 daily_automation.py 的 generate_diary_for_character 最後加入：
# 自動生成 TTS 音頻
try:
    from services.diary_tts_service import DiaryTTSService
    tts_service = DiaryTTSService()
    voice_profile = CHARACTER_VOICE_PROFILES.get(char_name, {})
    await tts_service.generate_diary_audio(
        diary_id=diary_id,
        text=diary_content.get("content", ""),
        voice_id=voice_profile.get("voice_id", "Chinese (Mandarin)_Warm_Girl"),
        speed=voice_profile.get("speed", 1.0),
        pitch=voice_profile.get("pitch", 0.0)
    )
except Exception as e:
    print(f"  TTS 生成失敗（可選）: {e}")
''',
    },
    "song-playlist": {
        "title": "歌曲播放列表",
        "description": "建立依曲風分類的歌曲播放器",
        "priority": 2,
        "page_to_create": "/Volumes/Transcend/manga-studio/frontend/src/app/automation/songs/page.tsx",
    },
    "relationship-network": {
        "title": "角色關係網絡圖",
        "description": "ASCII 視覺化角色之間的暗戀/友情關係",
        "priority": 3,
        "page_to_create": "/Volumes/Transcend/manga-studio/frontend/src/app/automation/network/page.tsx",
    },
    "story-arc": {
        "title": "故事弧線時間軸",
        "description": "為每個角色建立故事進度時間軸",
        "priority": 2,
        "page_to_create": "/Volumes/Transcend/manga-studio/frontend/src/app/automation/story-arc/page.tsx",
    },
    "diary-timeline": {
        "title": "日記時間軸",
        "description": "視覺化所有日記，帶心情圖標",
        "priority": 2,
        "page_to_create": "/Volumes/Transcend/manga-studio/frontend/src/app/automation/timeline/page.tsx",
    },
    "automation-dashboard": {
        "title": "自動化儀表板",
        "description": "總覽所有生成記錄與系統狀態",
        "priority": 1,
        "page_to_create": "/Volumes/Transcend/manga-studio/frontend/src/app/automation/page.tsx",
    },
}


# =============================================================================
# 系統狀態
# =============================================================================

def get_system_status() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    
    char_count = cursor.execute("SELECT COUNT(*) FROM characters").fetchone()[0]
    diary_count = cursor.execute("SELECT COUNT(*) FROM character_diaries").fetchone()[0]
    song_count = cursor.execute("SELECT COUNT(*) FROM character_songs").fetchone()[0]
    
    # 最後生成記錄
    last_diary = cursor.execute("""
        SELECT created_at FROM character_diaries ORDER BY created_at DESC LIMIT 1
    """).fetchone()
    last_song = cursor.execute("""
        SELECT created_at FROM character_songs ORDER BY created_at DESC LIMIT 1
    """).fetchone()
    
    conn.close()
    
    return {
        "characters": char_count,
        "diaries": diary_count,
        "songs": song_count,
        "last_diary_at": last_diary[0] if last_diary else None,
        "last_song_at": last_song[0] if last_song else None,
        "timestamp": datetime.now().isoformat(),
    }


# =============================================================================
# 自動化引擎
# =============================================================================

PROGRESS_FILE = Path("/Volumes/Transcend/manga-studio/data/improvement_progress.json")


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {"completed": [], "in_progress": None, "last_updated": None}


def save_progress(progress: dict):
    progress["last_updated"] = datetime.now().isoformat()
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def run_next_improvement() -> Optional[dict]:
    """執行下一個待辦項目"""
    progress = load_progress()
    completed = progress.get("completed", [])
    
    # 找第一個未完成的項目
    for project_id, info in IMPROVEMENT_PROJECTS.items():
        if project_id not in completed:
            progress["in_progress"] = project_id
            save_progress(progress)
            
            return {
                "project_id": project_id,
                "title": info["title"],
                "description": info["description"],
                "priority": info["priority"],
                "action": "需要創建" if "page_to_create" in info or "files_to_create" in info else "執行中",
            }
    
    return None


def mark_completed(project_id: str):
    """標記項目完成"""
    progress = load_progress()
    if project_id not in progress.get("completed", []):
        progress.setdefault("completed", []).append(project_id)
    progress["in_progress"] = None
    save_progress(progress)


# =============================================================================
# 主程式
# =============================================================================

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Manga Studio 自動化改進引擎")
    parser.add_argument("--status", action="store_true", help="顯示系統狀態")
    parser.add_argument("--next", action="store_true", help="取得下一個任務")
    parser.add_argument("--complete", type=str, help="標記任務完成")
    parser.add_argument("--list", action="store_true", help="列出所有項目")
    args = parser.parse_args()
    
    if args.status:
        status = get_system_status()
        print(json.dumps(status, ensure_ascii=False, indent=2))
        return
    
    if args.complete:
        mark_completed(args.complete)
        print(f"✓ 已標記完成: {args.complete}")
        return
    
    if args.next:
        task = run_next_improvement()
        if task:
            print(json.dumps(task, ensure_ascii=False, indent=2))
        else:
            print("✓ 所有項目已完成")
        return
    
    if args.list:
        print("\n📋 自動化改進項目列表")
        print("=" * 60)
        progress = load_progress()
        completed = progress.get("completed", [])
        for i, (pid, info) in enumerate(IMPROVEMENT_PROJECTS.items(), 1):
            status_icon = "✅" if pid in completed else "⏳" if progress.get("in_progress") == pid else "📌"
            print(f"{status_icon} {i}. {info['title']}")
            print(f"   {info['description']}")
            print(f"   優先級: {info['priority']}")
            print()
        return
    
    # 預設：顯示狀態
    print("🎯 Manga Studio 自動化改進引擎")
    print(f"   系統狀態: {get_system_status()}")
    
    task = run_next_improvement()
    if task:
        print(f"\n📌 下一個任務: {task['title']}")
        print(f"   {task['description']}")
    else:
        print("\n✅ 所有改進項目已完成！")


if __name__ == "__main__":
    main()
"""
Manga Studio Watchdog — 確保 AI Agent 不會閒置
當 10 分鐘沒有新任務時，自動執行待辦改進項目
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from db.database import get_connection

# =============================================================================
# 活躍追蹤器
# =============================================================================

WATCHDOG_DIR = Path("/Volumes/Transcend/manga-studio/data/watchdog")
WATCHDOG_DIR.mkdir(parents=True, exist_ok=True)

ACTIVITY_FILE = WATCHDOG_DIR / "activity.json"
TASK_QUEUE_FILE = WATCHDOG_DIR / "task_queue.json"
LAST_RUN_FILE = WATCHDOG_DIR / "last_run.json"


def read_json(path: Path) -> dict:
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return {}


def write_json(path: Path, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def touch_activity():
    """更新最後活躍時間"""
    write_json(ACTIVITY_FILE, {
        "last_activity": datetime.now().isoformat(),
        "last_activity_readable": datetime.now().strftime("%H:%M:%S")
    })


def get_last_activity() -> Optional[datetime]:
    """取得最後活躍時間"""
    data = read_json(ACTIVITY_FILE)
    if "last_activity" in data:
        return datetime.fromisoformat(data["last_activity"])
    return None


def minutes_since_activity() -> int:
    """距離最後活躍過了多少分鐘"""
    last = get_last_activity()
    if last is None:
        return 999
    return int((datetime.now() - last).total_seconds() / 60)


# =============================================================================
# 任務隊列
# =============================================================================

# 預設改進任務（當沒有新任務時執行）
DEFAULT_IMPROVEMENTS = [
    {
        "id": "auto-diary",
        "title": "自動生成日記",
        "description": "每天為所有女性角色生成1篇日記（90天週期）",
        "priority": 1,
        "estimated_minutes": 30,
        "skills_needed": ["backend", "ai"],
    },
    {
        "id": "auto-songs",
        "title": "自動生成歌曲",
        "description": "每天為所有角色生成3首歌曲（ballad/pop/electronic各1首）",
        "priority": 1,
        "estimated_minutes": 60,
        "skills_needed": ["backend", "music-ai"],
    },
    {
        "id": "improve-dashboard",
        "title": "優化儀表板",
        "description": "為 dashboard 增加更多視覺化元素和快捷操作",
        "priority": 1,
        "estimated_minutes": 15,
        "skills_needed": ["frontend"],
    },
    {
        "id": "add-story-arc",
        "title": "故事弧線視覺化",
        "description": "為每個角色建立故事進度時間軸",
        "priority": 2,
        "estimated_minutes": 20,
        "skills_needed": ["frontend", "data-viz"],
    },
    {
        "id": "song-playlist",
        "title": "歌曲播放列表",
        "description": "建立依曲風分類的歌曲播放器",
        "priority": 2,
        "estimated_minutes": 15,
        "skills_needed": ["frontend", "audio"],
    },
    {
        "id": "auto-tts-diary",
        "title": "自動化 TTS",
        "description": "日記生成後自動轉語音",
        "priority": 1,
        "estimated_minutes": 10,
        "skills_needed": ["backend", "tts"],
    },
    {
        "id": "relationship-network",
        "title": "角色關係網絡圖",
        "description": "ASCII 視覺化角色之間的暗戀/友情關係",
        "priority": 3,
        "estimated_minutes": 10,
        "skills_needed": ["design"],
    },
    {
        "id": "improve-diary-page",
        "title": "日記頁面增強",
        "description": "加入心情圖標、關係標籤、搜尋過濾",
        "priority": 2,
        "estimated_minutes": 15,
        "skills_needed": ["frontend"],
    },
    {
        "id": "clean-unused-assets",
        "title": "清理閒置資源",
        "description": "檢查並清理未使用的圖片/音頻檔案",
        "priority": 3,
        "estimated_minutes": 10,
        "skills_needed": ["system"],
    },
    {
        "id": "backup-db",
        "title": "資料庫備份",
        "description": "定時備份 SQLite 資料庫",
        "priority": 1,
        "estimated_minutes": 5,
        "skills_needed": ["system"],
    },
]


def get_task_queue() -> list:
    """取得任務隊列"""
    data = read_json(TASK_QUEUE_FILE)
    tasks = data.get("tasks", [])
    
    # 如果隊列是空的，填充預設任務
    if not tasks:
        tasks = DEFAULT_IMPROVEMENTS.copy()
        write_json(TASK_QUEUE_FILE, {"tasks": tasks, "updated": datetime.now().isoformat()})
    
    return tasks


def mark_task_done(task_id: str) -> bool:
    """標記任務完成"""
    tasks = get_task_queue()
    for task in tasks:
        if task["id"] == task_id:
            task["status"] = "done"
            task["completed_at"] = datetime.now().isoformat()
            write_json(TASK_QUEUE_FILE, {"tasks": tasks, "updated": datetime.now().isoformat()})
            return True
    return False


def get_pending_tasks() -> list:
    """取得待處理任務"""
    return [t for t in get_task_queue() if t.get("status") != "done"]


# =============================================================================
# Watchdog 主邏輯
# =============================================================================

IDLE_THRESHOLD_MINUTES = 10  # 閒置 10 分鐘後自動執行


def should_run_automatically() -> bool:
    """檢查是否應該自動執行"""
    # 1. 檢查距離最後活躍時間
    mins = minutes_since_activity()
    if mins < IDLE_THRESHOLD_MINUTES:
        print(f"[Watchdog] 最後活躍: {mins} 分鐘前，低於閾值 {IDLE_THRESHOLD_MINUTES} 分鐘，跳過自動執行")
        return False
    
    # 2. 檢查是否有正在進行的 cron job
    # （可以擴展檢查更多條件）
    
    return True


def get_system_status() -> dict:
    """取得系統狀態"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # 統計資料
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
        "last_activity": get_last_activity(),
        "minutes_since_activity": minutes_since_activity(),
    }


def generate_status_report() -> str:
    """產生狀態報告（用於顯示）"""
    status = get_system_status()
    mins = status["minutes_since_activity"]
    last = status["last_activity"]
    
    report = f"""
╔══════════════════════════════════════════════════════════════╗
║           Manga Studio Watchdog 系統狀態                    ║
╠══════════════════════════════════════════════════════════════╣
║  時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                            
║  AI 最後活躍: {mins} 分鐘前 ({last.strftime('%H:%M:%S') if last else '未知'})      
╠══════════════════════════════════════════════════════════════╣
║  📊 系統統計                                                  ║
║    角色: {status['characters']} 人                                            
║    日記: {status['diaries']} 篇                                          
║    歌曲: {status['songs']} 首                                            
║                                                              ║
║  ⏰ 最後生成                                                 ║
║    日記: {status['last_diary_at'] or '尚無'}                              
║    歌曲: {status['last_song_at'] or '尚無'}                              
╚══════════════════════════════════════════════════════════════╝
"""
    return report


def read_tasks_report() -> str:
    """產生任務報告"""
    tasks = get_task_queue()
    pending = get_pending_tasks()
    
    lines = ["\n📋 任務隊列"]
    lines.append("=" * 50)
    lines.append(f"總任務: {len(tasks)} | 待完成: {len(pending)}")
    lines.append("")
    
    for i, task in enumerate(pending[:5], 1):
        lines.append(f"  {i}. {task['title']}")
        lines.append(f"     {task['description']}")
        lines.append(f"     預估: {task['estimated_minutes']} 分鐘 | 優先級: {task['priority']}")
        lines.append("")
    
    return "\n".join(lines)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Manga Studio Watchdog")
    parser.add_argument("--status", action="store_true", help="顯示系統狀態")
    parser.add_argument("--tasks", action="store_true", help="顯示任務隊列")
    parser.add_argument("--touch", action="store_true", help="更新活躍時間")
    parser.add_argument("--check", action="store_true", help="檢查是否應該自動執行")
    parser.add_argument("--report", action="store_true", help="完整報告")
    parser.add_argument("--run", action="store_true", help="執行 watchdog 邏輯（如果應該自動執行，執行待辦任務）")
    args = parser.parse_args()
    
    if args.touch:
        touch_activity()
        print(f"✓ 已更新活躍時間: {datetime.now().isoformat()}")
        return
    
    if args.status:
        status = get_system_status()
        print(json.dumps(status, ensure_ascii=False, indent=2))
        return
    
    if args.tasks:
        tasks = get_task_queue()
        print(json.dumps(tasks, ensure_ascii=False, indent=2))
        return
    
    if args.check:
        should = should_run_automatically()
        print(f"自動執行: {'是' if should else '否'}")
        print(f"閒置分鐘: {minutes_since_activity()}")
        return
    
    if args.run:
        if not should_run_automatically():
            print(f"[Watchdog] 目前不閒置（{minutes_since_activity()} 分鐘前有活動），不執行自動任務")
            return
        pending = get_pending_tasks()
        if not pending:
            print("[Watchdog] 沒有待辦任務")
            return
        task = pending[0]
        print(f"[Watchdog] 執行自動任務: {task['title']}")
        print(f"[Watchdog] {task['description']}")
        print(f"[Watchdog] 預估時間: {task['estimated_minutes']} 分鐘")
        # 在此標記任務為進行中
        tasks = get_task_queue()
        for t in tasks:
            if t["id"] == task["id"]:
                t["status"] = "in_progress"
                t["started_at"] = datetime.now().isoformat()
                break
        write_json(TASK_QUEUE_FILE, {"tasks": tasks, "updated": datetime.now().isoformat()})
        print(f"[Watchdog] 任務已標記為進行中")
        return
    
    if args.report:
        print(generate_status_report())
        print(read_tasks_report())
        return
    
    # 預設：顯示完整報告
    print(generate_status_report())
    print(read_tasks_report())


if __name__ == "__main__":
    main()
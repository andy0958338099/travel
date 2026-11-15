#!/usr/bin/env python3
"""
把 SQLite DB 內的舊機器絕對路徑 (/Volumes/Transcend/manga-studio/..., /Volumes/T7/...)
改成專案相對路徑 (/outputs/..., /assets/...)。

2026-11-13: 資料庫有 190 筆 path 欄位指向舊的外接碟路徑，
前端拿來當 <img src> 會變成 http://localhost:3000/Volumes/... → 404 破圖。

用法：
    python3 scripts/migrate_absolute_paths.py --dry    # 只預覽
    python3 scripts/migrate_absolute_paths.py           # 正式執行（會自動備份 DB）

安全：正式執行前先複製一份 .bak 備份，並在 transaction 內完成。
"""
import argparse
import os
import re
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(os.environ.get("MANGA_STUDIO_ROOT", BACKEND_DIR.parent)).resolve()
DB_PATH = PROJECT_ROOT / "data" / "manga_studio.db"

# /Volumes/<任意>/manga-studio 或 /Volumes/<任意>/江南部落格/manga-studio 的前綴
VOLUME_PREFIX_RE = re.compile(r"^/Volumes/[^/]+/(?:[^/]+/)?manga-studio")

# 要檢查的表與欄位
TARGETS = [
    ("characters", ["image_path"]),
    ("character_images", ["image_path"]),
    ("character_songs", ["local_path"]),
    ("character_portfolio", ["image_path", "seeddance_video_url"]),
]


def to_relative(path_value: str) -> str:
    """把絕對路徑轉成相對於專案根目錄的路徑。"""
    if not path_value:
        return path_value
    if not path_value.startswith("/"):
        return path_value  # 已經是相對路徑或 http URL
    stripped = VOLUME_PREFIX_RE.sub("", path_value)
    if stripped == path_value:
        # 不在專案根目錄下，但仍是絕對路徑 → 嘗試以 PROJECT_ROOT 相對化
        try:
            stripped = "/" + str(Path(path_value).resolve().relative_to(PROJECT_ROOT))
        except (ValueError, OSError):
            return path_value  # 無法相對化，維持原樣
    return stripped


def collect_updates(conn: sqlite3.Connection):
    """找出所有需要更新的 (table, column, id, old, new)。"""
    updates = []
    for table, columns in TARGETS:
        exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()
        if not exists:
            continue
        table_cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
        pk = "id" if "id" in table_cols else None
        if pk is None:
            continue
        for col in columns:
            if col not in table_cols:
                continue
            rows = conn.execute(
                f"SELECT {pk}, {col} FROM {table} WHERE {col} LIKE '/Volumes/%'"
            ).fetchall()
            for row_id, old_value in rows:
                new_value = to_relative(old_value)
                if new_value != old_value:
                    updates.append((table, col, row_id, old_value, new_value))
    return updates


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry", action="store_true", help="只預覽不寫入")
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"找不到資料庫: {DB_PATH}")
        sys.exit(1)

    print(f"專案根目錄: {PROJECT_ROOT}")
    print(f"資料庫:     {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    updates = collect_updates(conn)

    if not updates:
        print("\n沒有需要更新的資料。")
        conn.close()
        return

    # 依 (table, column) 分組統計
    stats = {}
    for table, col, _, _, _ in updates:
        stats[(table, col)] = stats.get((table, col), 0) + 1

    print(f"\n共 {len(updates)} 筆需要更新：")
    for (table, col), n in sorted(stats.items()):
        print(f"  {table}.{col}: {n} 筆")

    print("\n範例（前 8 筆）：")
    for table, col, row_id, old, new in updates[:8]:
        print(f"  {table}.{col}[{row_id}]:")
        print(f"    - {old}")
        print(f"    + {new}")

    if args.dry:
        print("\n[DRY RUN] 未寫入資料庫。")
        conn.close()
        return

    # 備份
    backup = DB_PATH.with_suffix(f".bak-{datetime.now():%Y%m%d-%H%M%S}")
    shutil.copy2(DB_PATH, backup)
    print(f"\n已備份: {backup}")

    try:
        conn.execute("BEGIN")
        for table, col, row_id, _, new in updates:
            conn.execute(f"UPDATE {table} SET {col} = ? WHERE id = ?", (new, row_id))
        conn.commit()
        print(f"已更新 {len(updates)} 筆。")
    except Exception as e:
        conn.rollback()
        print(f"更新失敗，已 rollback: {e}")
        conn.close()
        sys.exit(1)

    # 驗證
    remaining = collect_updates(conn)
    conn.close()
    if remaining:
        print(f"仍有 {len(remaining)} 筆未更新（可能無法相對化，維持原樣）。")
        for table, col, row_id, old, _ in remaining[:5]:
            print(f"  {table}.{col}[{row_id}]: {old}")
    else:
        print("驗證通過：無剩餘的 /Volumes 絕對路徑。")


if __name__ == "__main__":
    main()

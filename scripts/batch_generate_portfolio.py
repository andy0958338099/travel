#!/usr/bin/env python3
"""
江南水鄉八日之旅 · 批次生成角色 Portfolio 參考圖
用途：為每個角色生成 5 張參考圖（墊圖），作為後續 MV 生成的基礎參照

用法：
  python scripts/batch_generate_portfolio.py              # 生成所有角色
  python scripts/batch_generate_portfolio.py --char-id 3  # 只生成特定角色
  python scripts/batch_generate_portfolio.py --dry-run    # 預演（只顯示 prompt）

場景類型分配（每個角色 5 張）：
  1. solo        - 日常穿著，標準站姿，柔和表情
  2. outfit      - 展現完整套裝/穿搭
  3. expression  - 突出情緒表情（微笑/凝視）
  4. action      - 動態姿勢（走路/倚靠）
  5. angle       - 特殊構圖視角（側臉/背影/特寫）

API：MiniMax image-01
"""

import sys
import os
import json
import time
import sqlite3
import argparse
from pathlib import Path
from datetime import datetime

# ── 路徑設定 ──────────────────────────────────────────────
EXTERNAL_DRIVE = Path("/Volumes/Transcend/manga-studio")
DB_PATH = EXTERNAL_DRIVE / "data" / "manga_studio.db"
ASSETS_DIR = EXTERNAL_DRIVE / "assets"
OUTPUT_DIR = EXTERNAL_DRIVE / "outputs"
PORTFOLIO_DIR = EXTERNAL_DRIVE / "data" / "portfolio"

ASSETS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PORTFOLIO_DIR.mkdir(parents=True, exist_ok=True)

# ── MiniMax API ───────────────────────────────────────────
# 優先讀取專案 backend/.env（如果存在的話）
_backend_env = EXTERNAL_DRIVE / "backend" / ".env"
if _backend_env.exists():
    with open(_backend_env) as f:
        for line in f:
            line = line.strip()
            if line.startswith("MINIMAX_API_KEY=") and "=" in line:
                val = line.split("=", 1)[1].strip()
                if val and not val.startswith("#"):
                    os.environ["MINIMAX_API_KEY"] = val
            elif line.startswith("MINIMAX_API_URL=") and "=" in line:
                val = line.split("=", 1)[1].strip()
                if val and not val.startswith("#"):
                    os.environ["MINIMAX_API_URL"] = val

API_URL  = os.getenv("MINIMAX_API_URL",  "https://api.minimax.io")
API_KEY  = os.getenv("MINIMAX_API_KEY",  "")
GROUP_ID = os.getenv("MINIMAX_GROUP_ID", "")

# ── 場景配置 ──────────────────────────────────────────────
SCENE_CONFIGS = {
    "solo": {
        "description": "日常穿著，標準站姿，柔和表情",
        "outfit_variant": None,        # 使用 default_outfit
        "expression": "soft gentle smile, natural relaxed posture",
        "angle": "front-facing, eye-level camera",
        "aspect_ratio": "3:4",
    },
    "outfit": {
        "description": "完整套裝穿搭，時尚感",
        "outfit_variant": "stylish {default_outfit}, fashion editorial style",
        "expression": "confident mild smile, standing full body",
        "angle": "full body shot, slight low angle",
        "aspect_ratio": "3:4",
    },
    "expression": {
        "description": "突出情緒表情特寫",
        "outfit_variant": None,
        "expression": "emotional close-up portrait, eyes with depth, subtle emotion",
        "angle": "tight portrait, face fills frame, soft bokeh background",
        "aspect_ratio": "1:1",
    },
    "action": {
        "description": "動態姿勢，生活感",
        "outfit_variant": None,
        "expression": "natural candid expression, mid-action moment",
        "angle": "dynamic angle, slight motion feel, street style",
        "aspect_ratio": "3:4",
    },
    "angle": {
        "description": "特殊構圖：側臉/背影/框架構圖",
        "outfit_variant": None,
        "expression": "looking away or partially turned, contemplative mood",
        "angle": "profile shot OR back view OR through-window frame composition",
        "aspect_ratio": "3:4",
    },
}

# ── Prompt 建構函式 ───────────────────────────────────────
def build_prompt(char: dict, scene_type: str) -> str:
    """建構完整的圖像生成 Prompt"""
    style = char.get("style", "photorealistic")

    style_prefix = {
        "photorealistic": "photorealistic, shot on 35mm lens, f/1.8 aperture, natural soft lighting, 8k resolution, cinematic, non-anime",
        "anime":          "anime illustration style, high quality, cel-shaded, vibrant colors",
        "semi-realistic": "semi-realistic illustration, soft painterly quality, natural lighting",
    }.get(style, "photorealistic, high quality")

    core_features   = char.get("core_features", "") or ""
    anchor_features = char.get("anchor_features", "") or ""
    hairstyle       = char.get("hairstyle", "") or ""
    skin_tone       = char.get("skin_tone", "") or ""
    default_outfit  = char.get("default_outfit", "") or ""

    cfg = SCENE_CONFIGS[scene_type]

    # 穿著
    if cfg["outfit_variant"]:
        outfit_text = cfg["outfit_variant"].format(default_outfit=default_outfit)
    else:
        outfit_text = default_outfit

    # 組合主體描述
    subject_parts = []
    if core_features:
        subject_parts.append(core_features)
    if anchor_features:
        subject_parts.append(anchor_features)
    if hairstyle:
        subject_parts.append(hairstyle)
    if outfit_text:
        subject_parts.append(f"wearing {outfit_text}")
    if cfg["expression"]:
        subject_parts.append(cfg["expression"])
    if skin_tone:
        subject_parts.append(skin_tone)

    subject_str = ", ".join(filter(None, subject_parts))

    # 組合完整 prompt（SeedDance-inspired format）
    prompt_parts = [
        style_prefix,
        subject_str,
        f"Camera: {cfg['angle']}",
        "Atmosphere: natural ambient light, authentic, unscripted feeling",
        "Technical: high detail, clean background, no text, no watermark",
    ]

    return " | ".join(p for p in prompt_parts if p)


def build_negative_prompt() -> str:
    return "anime, cartoon, illustration, painting, drawing, text, watermark, logo, blurry, low quality, distorted face, extra fingers, malformed hands, ugly, deformed, disfigured"


# ── MiniMax API 呼叫 ──────────────────────────────────────
import urllib.request
import urllib.error
import ssl

# macOS 常見問題：系統 SSL 憑證鏈不完整，採用不受驗證的上下文
_ssl_context = ssl.create_default_context()
try:
    _ssl_context.check_hostname = False
    _ssl_context.verify_mode = ssl.CERT_NONE
except Exception:
    _ssl_context = None

def call_minimax_image(prompt: str, aspect_ratio: str = "3:4") -> dict:
    """呼叫 MiniMax image-01 API，回傳 base64 圖片列表"""

    if not API_KEY:
        print("  [SKIP] MINIMAX_API_KEY not set — 模擬模式")
        return None

    payload = json.dumps({
        "model": "image-01",
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "response_format": "base64",
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{API_URL}/v1/image_generation",
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120, context=_ssl_context) as resp:
            result = json.loads(resp.read())
            images = result.get("data", {}).get("image_base64", [])
            if images:
                return {"status": "success", "images": images}
            return {"status": "error", "error": "No images in response"}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return {"status": "error", "error": f"HTTP {e.code}: {body[:300]}"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ── 資料庫操作 ────────────────────────────────────────────
def get_characters(char_id: int = None) -> list:
    """取得角色列表"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    if char_id:
        rows = cur.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchall()
    else:
        rows = cur.execute("SELECT * FROM characters ORDER BY id").fetchall()

    characters = []
    for row in rows:
        char = dict(row)
        for field in ["outfit_options", "expression_options"]:
            if char.get(field):
                try:
                    char[field] = json.loads(char[field])
                except:
                    char[field] = []
        characters.append(char)

    conn.close()
    return characters


def get_portfolio_count(char_id: int) -> int:
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    count = cur.execute(
        "SELECT COUNT(*) FROM character_portfolio WHERE character_id = ? AND is_reference = 1",
        (char_id,)
    ).fetchone()[0]
    conn.close()
    return count


def insert_portfolio(char_id: int, data: dict) -> int:
    """寫入 character_portfolio 紀錄"""
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO character_portfolio
        (character_id, image_path, scene_type, scene_description, prompt_used,
         is_reference, sort_order, tags, subject_segment, setting_segment,
         atmosphere_segment, camera_segment, technical_segment, full_seeddance_prompt,
         location_tags, emotion_tags, action_tags, diary_context)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        char_id,
        data.get("image_path", ""),
        data.get("scene_type", ""),
        data.get("scene_description", ""),
        data.get("prompt_used", ""),
        data.get("sort_order", 0),
        json.dumps(data.get("tags", [])),
        data.get("subject_segment", ""),
        data.get("setting_segment", ""),
        data.get("atmosphere_segment", ""),
        data.get("camera_segment", ""),
        data.get("technical_segment", ""),
        data.get("full_seeddance_prompt", ""),
        json.dumps(data.get("location_tags", [])),
        json.dumps(data.get("emotion_tags", [])),
        json.dumps(data.get("action_tags", [])),
        data.get("diary_context", ""),
    ))

    portfolio_id = cur.lastrowid
    conn.commit()
    conn.close()
    return portfolio_id


# ── 主生成邏輯 ────────────────────────────────────────────
def generate_for_character(char: dict, scene_types: list, dry_run: bool = False) -> dict:
    """為單一角色生成多張參考圖"""
    char_id   = char["id"]
    char_name = char["name"]
    results   = {"success": [], "failed": [], "skipped": 0}

    print(f"\n{'='*60}")
    print(f"  角色：{char_name} (ID={char_id})")
    print(f"  風格：{char.get('style','photorealistic')}")
    print(f"{'='*60}")

    current_count = get_portfolio_count(char_id)
    print(f"  現有參考圖：{current_count} 張")

    # 建立角色目錄
    char_portfolio_dir = ASSETS_DIR / "characters" / str(char_id) / "portfolio"
    char_portfolio_dir.mkdir(parents=True, exist_ok=True)

    for i, scene_type in enumerate(scene_types):
        cfg = SCENE_CONFIGS[scene_type]
        print(f"\n  [{i+1}/{len(scene_types)}] 場景：{scene_type} — {cfg['description']}")

        # 建構 Prompt
        prompt = build_prompt(char, scene_type)
        print(f"  Prompt：{prompt[:120]}...")

        if dry_run:
            print(f"  [DRY RUN] 略過實際生成")
            results["skipped"] += 1
            continue

        # 呼叫 API
        api_result = call_minimax_image(prompt, aspect_ratio=cfg["aspect_ratio"])

        if not api_result:
            print(f"  [SKIP] API 未設定或 mock 模式")
            results["skipped"] += 1
            continue

        if api_result.get("status") != "success":
            print(f"  [FAIL] {api_result.get('error', 'unknown error')}")
            results["failed"].append({
                "scene_type": scene_type,
                "error": api_result.get("error"),
            })
            continue

        # 儲存圖片
        images = api_result["images"]
        for j, img_b64 in enumerate(images):
            import base64
            try:
                img_data = base64.b64decode(img_b64)
                filename = f"ref_{scene_type}_{int(time.time())}_{j}.png"
                filepath = char_portfolio_dir / filename
                with open(filepath, "wb") as f:
                    f.write(img_data)

                # 寫入資料庫
                portfolio_id = insert_portfolio(char_id, {
                    "image_path":         str(filepath),
                    "scene_type":         scene_type,
                    "scene_description":  cfg["description"],
                    "prompt_used":        prompt,
                    "sort_order":         i * 10 + j,
                    "tags":               [scene_type, "reference"],
                    "full_seeddance_prompt": prompt,
                })

                print(f"  [OK] {filename} → portfolio_id={portfolio_id}")
                results["success"].append({
                    "scene_type":    scene_type,
                    "portfolio_id":  portfolio_id,
                    "filename":      filename,
                })

                # API 限速保護：每張圖片間隔 2 秒
                if j < len(images) - 1:
                    time.sleep(2)

            except Exception as e:
                print(f"  [ERROR] 儲存失敗：{e}")
                results["failed"].append({
                    "scene_type": scene_type,
                    "error": str(e),
                })

        # 每個場景間隔 3 秒
        time.sleep(3)

    return results


# ── 指令列解析 ────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="批次生成角色 Portfolio 參考圖")
    parser.add_argument("--char-id",   type=int,                help="只生成指定角色 ID")
    parser.add_argument("--dry-run",   action="store_true",      help="僅顯示 prompt，不實際生成")
    parser.add_argument("--scene",      choices=list(SCENE_CONFIGS.keys()), default=None,
                        help="只生成指定場景類型")
    args = parser.parse_args()

    scene_types = [args.scene] if args.scene else list(SCENE_CONFIGS.keys())

    print(f"""
╔══════════════════════════════════════════════════════╗
║   Manga Studio — Portfolio 參考圖批次生成             ║
╠══════════════════════════════════════════════════════╣
║   模式：{'DRY RUN (僅預覽)' if args.dry_run else '實際生成'}                                 ║
║   場景：{', '.join(scene_types)}                 ║
║   API：  {API_URL}/v1/image_generation         ║
╚══════════════════════════════════════════════════════╝
    """)

    characters = get_characters(char_id=args.char_id)
    if not characters:
        print("找不到角色，請確認資料庫或角色 ID")
        sys.exit(1)

    total_success = 0
    total_failed  = 0

    for char in characters:
        result = generate_for_character(char, scene_types, dry_run=args.dry_run)
        total_success += len(result["success"])
        total_failed  += len(result["failed"])

        # 角色之間間隔 5 秒
        if not args.dry_run:
            time.sleep(5)

    print(f"""
╔══════════════════════════════════════════════════════╗
║   批次生成完成                                       ║
╠══════════════════════════════════════════════════════╣
║   成功：{total_success} 張                                    ║
║   失敗：{total_failed} 張                                     ║
║   耗時：{datetime.now().strftime('%H:%M:%S')}                                   ║
╚══════════════════════════════════════════════════════╝
    """)


if __name__ == "__main__":
    main()
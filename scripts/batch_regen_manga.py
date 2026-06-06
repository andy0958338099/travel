#!/usr/bin/env python3
"""
監視大臣 — 自動重跑所有 attractions 的 4 格 v2 寫實風生成。

和珅辦事規矩：
- 不煩聖上（中間不通知，全部跑完一次回報）
- 自動 retry（waitUntil cancel / MiniMax rate limit 都自己處理）
- 每完成 1 個景點寫一行 log
- 完成時印完整 summary
"""

import subprocess
import json
import re
import time
import sys
import os
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

ENV_PATH = "/Volumes/Transcend/manga-studio/frontend/.env.local"
LOG_PATH = "/tmp/manga-batch.log"
WORKER = "https://jiangnan-trip.andy0958338099.workers.dev"
MAX_RETRY = 3
COOLDOWN_AFTER_FAIL = 8  # 秒
DEFAULT_COOLDOWN = 35  # MiniMax 預期 25s + 上傳 5s + buffer


def log(msg, also_print=True):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    with open(LOG_PATH, "a") as f:
        f.write(line + "\n")
    if also_print:
        print(line, flush=True)


def load_env():
    with open(ENV_PATH) as f:
        return f.read()


def get_env(name):
    content = load_env()
    m = re.search(rf"^{re.escape(name)}=(.+)$", content, re.MULTILINE)
    return m.group(1).strip() if m else None


def curl_json(url, method="GET", body=None, timeout=10, extra_headers=None):
    cmd = ["curl", "-sS", "-X", method, url]
    # Supabase REST 必填的 apikey + Authorization header
    supabase_key = get_env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if supabase_key:
        cmd += [
            "-H", f"apikey: {supabase_key}",
            "-H", f"Authorization: Bearer {supabase_key}",
        ]
    if extra_headers:
        for k, v in extra_headers.items():
            cmd += ["-H", f"{k}: {v}"]
    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
    cmd += ["--max-time", str(timeout)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
    if r.returncode != 0:
        return None
    try:
        return json.loads(r.stdout) if r.stdout.strip() else None
    except json.JSONDecodeError:
        return None


def fetch_all_manga():
    url = f"{get_env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/travel_mangas?select=id,source_name,status,panel_1_url,panel_2_url,panel_3_url,panel_4_url&order=source_name.asc&limit=200"
    data = curl_json(url, timeout=15)
    if not isinstance(data, list):
        return []
    return data


def fetch_row(manga_id):
    url = f"{get_env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/travel_mangas?id=eq.{manga_id}&select=updated_at,status,panel_1_url,panel_2_url,panel_3_url,panel_4_url"
    data = curl_json(url, timeout=10)
    return data[0] if data else None


def build_prompt(scene, panel):
    character = "a graceful ancient Song dynasty noble lady, elegant Song-style hanfu with delicate embroidered silk fabric, elaborate traditional hair ornaments and hairpin, soft natural ancient facial features, subtle skin texture"
    style = ", ".join([
        "Realistic DSLR portrait photography", "soft diffused natural daylight",
        "shallow depth of field", "vintage realistic color grading",
        "cinematic atmosphere", "8K ultra high detail", "photorealistic",
        "hyper-detailed fabric folds and hair details", "misty atmosphere",
        "distant hazy mountains in the background",
    ])
    no_text = ", ".join([
        "no text", "no words", "no letters", "no typography", "no captions",
        "no logos", "no signage", "no writing", "no speech bubbles",
        "no banners", "no posters", "no subtitles",
        "blank empty space at the bottom of the picture reserved for later text overlay",
        "vertical portrait, aspect ratio 3:4",
    ])
    prompts = {
        1: f"{style}, {character}, arriving at the entrance of {scene}, relaxed standing pose with one hand gently raised in a friendly wave, soft natural ancient facial features with a warm welcoming smile, clean composition, {no_text}",
        2: f"{style}, {character}, exploring the historic atmosphere of {scene}, walking slowly through the cultural setting, contemplative pose with eyes gently observing the surroundings, dramatic natural lighting, {no_text}",
        3: f"{style}, {character}, savoring the famous local delicacy near {scene}, seated elegantly with hands gently holding traditional tableware, warm golden light, mouth-watering food photography of the signature dish in foreground, {no_text}",
        4: f"{style}, {character}, standing beside {scene}, relaxed standing pose like taking a travel souvenir photo, misty lake surface with slight water ripples, faint mist winding around the base, detailed masonry texture, {no_text}",
    }
    return prompts[panel]


def trigger_panel(manga_id, panel, scene):
    body = {
        "endpoint": "manga/panel",
        "payload": {
            "mangaId": manga_id,
            "panel": panel,
            "prompt": build_prompt(scene, panel),
            "refImageUrl": None,  # /characters/qstyle.png 是 local path
            "aspectRatio": "3:4",
        },
    }
    return curl_json(WORKER, method="POST", body=body, timeout=10)


def is_updated(row, manga_id, panel, baseline):
    """判斷 panel_url 是否比 baseline 新（baseline = 開始跑這個景點前的時間）"""
    if not row:
        return False
    # status=failed 代表 Worker pipeline 跑失敗 → 算 fail, 不算 OK
    if row.get("status") == "failed":
        return False
    key = f"panel_{panel}_url"
    url = row.get(key) or ""
    if not url:
        return False
    return row.get("updated_at", "") > baseline


def process_manga(manga, idx, total):
    """處理 1 個景點的 4 個 panel（sequential, 每個 retry MAX_RETRY 次）"""
    manga_id = manga["id"]
    source = manga["source_name"]
    scene = f"{source} in China"  # English 給 MiniMax

    # baseline = 跑這個景點前的當下時間
    baseline = datetime.now(timezone.utc).isoformat()

    log(f"[{idx}/{total}] {source} ({manga_id[:8]})")

    results = {}
    for panel in [1, 2, 3, 4]:
        ok = False
        for attempt in range(1, MAX_RETRY + 1):
            resp = trigger_panel(manga_id, panel, scene)
            if not resp or not resp.get("accepted"):
                log(f"  panel {panel} attempt {attempt}: trigger failed ({resp})")
                time.sleep(COOLDOWN_AFTER_FAIL)
                continue

            # 等 35s 讓 Worker 跑完
            time.sleep(DEFAULT_COOLDOWN)

            # 確認
            row = fetch_row(manga_id)
            if is_updated(row, manga_id, panel, baseline):
                log(f"  panel {panel} ✅ (try {attempt}, url={row.get(f'panel_{panel}_url', '')[:60]})")
                ok = True
                break
            else:
                log(f"  panel {panel} attempt {attempt}: 未更新 (updated_at={row.get('updated_at', '-') if row else 'NULL'})")
                time.sleep(COOLDOWN_AFTER_FAIL)

        if not ok:
            log(f"  panel {panel} ❌ FAILED after {MAX_RETRY} retries")
        results[panel] = "OK" if ok else "FAILED"

    ok_count = sum(1 for v in results.values() if v == "OK")
    log(f"[{source}] 結果: {ok_count}/4 OK ({results})")
    return source, results


def main():
    log("=" * 60)
    log("監視大臣啟動（v2 寫實風 4-panel batch regen）")
    log("=" * 60)

    manga_list = fetch_all_manga()
    log(f"找到 {len(manga_list)} 個景點")
    if not manga_list:
        log("❌ 找不到 manga，請檢查 Supabase 連線")
        return

    # 先 sleep 5 分鐘讓 MiniMax cooldown（早上撞到 rate limit）
    log("先等 5 分鐘讓 MiniMax cooldown...")
    time.sleep(300)

    all_results = []
    start_time = time.time()

    for idx, manga in enumerate(manga_list, 1):
        try:
            source, results = process_manga(manga, idx, len(manga_list))
            all_results.append((source, results))
        except Exception as e:
            log(f"[{manga.get('source_name', '?')}] EXCEPTION: {e}")
            all_results.append((manga.get('source_name', '?'), {}))

    elapsed = (time.time() - start_time) / 60
    log("")
    log("=" * 60)
    log(f"監視大臣完成 — 總耗時 {elapsed:.1f} 分鐘")
    log("=" * 60)
    log("")

    # Summary
    ok_all = sum(1 for _, r in all_results if all(v == "OK" for v in r.values()))
    partial = sum(1 for _, r in all_results if any(v == "OK" for v in r.values()) and not all(v == "OK" for v in r.values()))
    failed = sum(1 for _, r in all_results if r and not any(v == "OK" for v in r.values()))
    empty = sum(1 for _, r in all_results if not r)

    log(f"📊 摘要：")
    log(f"  全部 4/4 OK: {ok_all}/{len(all_results)}")
    log(f"  部分完成: {partial}")
    log(f"  全部失敗: {failed}")
    log(f"  例外: {empty}")
    log("")

    if ok_all < len(all_results):
        log("⚠️  失敗清單：")
        for source, r in all_results:
            if not r or not all(v == "OK" for v in r.values()):
                log(f"  {source}: {r}")
    else:
        log("🎉 全部 48 個景點 4/4 完美完成！")


if __name__ == "__main__":
    main()

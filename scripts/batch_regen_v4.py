#!/usr/bin/env python3
"""
v3 監視大臣 — 只補缺失 panel + 新衝突感 prompt（宋代仕女闖入現代市集 + 場景佔 70% 版面）
"""

import subprocess
import json
import re
import time
import sys
from datetime import datetime, timezone

ENV_PATH = "/Volumes/Transcend/manga-studio/frontend/.env.local"
LOG_PATH = "/tmp/manga-batch-v4.log"
WORKER = "https://jiangnan-trip.andy0958338099.workers.dev"
MAX_RETRY = 1  # fail fast
COOLDOWN_AFTER_FAIL = 15
DEFAULT_COOLDOWN = 50  # 加長 cooldown (32→50s) 給 MiniMax 更長恢復時間


def log(msg, also_print=True):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    with open(LOG_PATH, "a") as f:
        f.write(line + "\n")
    if also_print:
        print(line, flush=True)


def get_env(name):
    with open(ENV_PATH) as f:
        content = f.read()
    m = re.search(rf"^{re.escape(name)}=(.+)$", content, re.MULTILINE)
    return m.group(1).strip() if m else None


def curl_json(url, method="GET", body=None, timeout=10):
    supabase_key = get_env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    cmd = ["curl", "-sS", "-X", method, url]
    if supabase_key:
        cmd += ["-H", f"apikey: {supabase_key}", "-H", f"Authorization: Bearer {supabase_key}"]
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
    return data if isinstance(data, list) else []


def fetch_row(manga_id):
    url = f"{get_env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/travel_mangas?id=eq.{manga_id}&select=updated_at,status,panel_1_url,panel_2_url,panel_3_url,panel_4_url"
    data = curl_json(url, timeout=10)
    return data[0] if data else None


# ── v3 prompt (衝突感 + 場景為主) ──
STYLE = ", ".join([
    "Realistic DSLR travel photography",
    "candid street photography with strong environmental storytelling",
    "shallow depth of field on the scene",
    "the scenic location and architectural details fill 70% of the frame",
    "the Song dynasty noble lady in hanfu appears as 30% of the frame as a striking time-travel visitor",
    "the lady shows a visibly surprised and astonished expression, wide eyes, slightly open mouth, taken aback by the modern surroundings, looking around with curious wonder, hands slightly raised in astonishment",
    "juxtaposition of ancient Song dynasty and modern Chinese setting",
    "vintage realistic color grading",
    "cinematic atmosphere",
    "8K ultra high detail",
    "photorealistic",
    "hyper-detailed environment and fabric folds",
])

CHARACTER = "a graceful ancient Song dynasty noble lady, elegant Song-style hanfu with delicate embroidered silk fabric, elaborate traditional hair ornaments and hairpin, soft natural ancient facial features, subtle skin texture"

NO_TEXT = ", ".join([
    "no text", "no words", "no letters", "no typography", "no captions",
    "no logos", "no signage", "no writing", "no speech bubbles",
    "no banners", "no posters", "no subtitles",
    "blank empty space at the bottom of the picture reserved for later text overlay",
    "vertical portrait, aspect ratio 3:4",
])

PROMPTS = {
    1: f"{STYLE}, {CHARACTER}, candidly arriving at the entrance of {{scene}}, the entrance architecture and surrounding modern visitors dominate the frame, the Song dynasty lady in hanfu stands as a striking small figure creating a time-travel moment, {NO_TEXT}",
    2: f"{STYLE}, {CHARACTER}, exploring the cultural setting of {{scene}}, the scene's signature architecture and atmosphere fill most of the frame, the lady appears in mid-ground in her hanfu as a visitor, modern Chinese environment surrounds her, {NO_TEXT}",
    3: f"{STYLE}, {CHARACTER}, savoring the local delicacy near {{scene}}, the food atmosphere and signature dish fill the foreground, the Song dynasty lady in hanfu is shown among the bustling market or restaurant scene as a striking ancient visitor, time-travel contrast is the focal point, {NO_TEXT}",
    4: f"{STYLE}, {CHARACTER}, taking a souvenir photo at {{scene}}, the iconic landmark or scenery fills 70% of the frame as backdrop, the lady stands to the side as a striking contrast figure, candid travel photography with strong environmental storytelling, {NO_TEXT}",
}


def trigger_panel(manga_id, panel, scene):
    body = {
        "endpoint": "manga/panel",
        "payload": {
            "mangaId": manga_id,
            "panel": panel,
            "prompt": PROMPTS[panel].format(scene=scene),
            "refImageUrl": None,
            "aspectRatio": "3:4",
        },
    }
    return curl_json(WORKER, method="POST", body=body, timeout=10)


def is_updated(row, panel, baseline):
    if not row:
        return False
    if row.get("status") == "failed":
        return False
    key = f"panel_{panel}_url"
    url = row.get(key) or ""
    if not url:
        return False
    return row.get("updated_at", "") > baseline


def process_manga(manga, idx, total):
    manga_id = manga["id"]
    source = manga["source_name"]
    scene = f"{source} in China"

    # 找出缺的 panel
    missing = [p for p in [1, 2, 3, 4] if not manga.get(f"panel_{p}_url")]
    # status=failed → 即使 4 個 panel URL 都有也要全部重做 (v4 bug fix)
    if manga.get("status") == "failed":
        missing = [1, 2, 3, 4]
    if not missing:
        return source, {}, "skip"

    baseline = datetime.now(timezone.utc).isoformat()
    log(f"[{idx}/{total}] {source} ({manga_id[:8]}) 缺 panel: {missing}")

    results = {}
    for panel in missing:
        ok = False
        for attempt in range(1, MAX_RETRY + 2):  # MAX_RETRY + 1 initial
            resp = trigger_panel(manga_id, panel, scene)
            if not resp or not resp.get("accepted"):
                log(f"  panel {panel} attempt {attempt}: trigger failed")
                time.sleep(COOLDOWN_AFTER_FAIL)
                continue

            time.sleep(DEFAULT_COOLDOWN)

            row = fetch_row(manga_id)
            if is_updated(row, panel, baseline):
                log(f"  panel {panel} ✅ (try {attempt})")
                ok = True
                break
            else:
                log(f"  panel {panel} attempt {attempt}: 未更新")
                time.sleep(COOLDOWN_AFTER_FAIL)

        if not ok:
            log(f"  panel {panel} ❌")
        results[panel] = "OK" if ok else "FAILED"

    return source, results, "done"


def main():
    log("=" * 60)
    log("v4 監視大臣啟動（衝突感+驚訝感 prompt + cooldown 50s + 只補缺）")
    log("=" * 60)

    manga_list = fetch_all_manga()
    log(f"全部 {len(manga_list)} 個景點")

    # 篩出需要重做的
    to_fix = [m for m in manga_list
              if m.get("status") == "failed"
              or any(not m.get(f"panel_{p}_url") for p in [1, 2, 3, 4])]
    log(f"需要重做: {len(to_fix)} 個景點")

    if not to_fix:
        log("🎉 沒有需要重做的景點")
        return

    all_results = []
    start_time = time.time()

    for idx, manga in enumerate(to_fix, 1):
        try:
            source, results, status = process_manga(manga, idx, len(to_fix))
            if status == "done":
                all_results.append((source, results))
        except Exception as e:
            log(f"[{manga.get('source_name', '?')}] EXCEPTION: {e}")
            all_results.append((manga.get('source_name', '?'), {}))

    elapsed = (time.time() - start_time) / 60
    log("")
    log("=" * 60)
    log(f"v4 完成 — 耗時 {elapsed:.1f} 分鐘")
    log("=" * 60)

    # 統計
    total_panels = sum(len(r) for _, r in all_results)
    ok_panels = sum(1 for _, r in all_results for v in r.values() if v == "OK")
    log(f"📊 結果: {ok_panels}/{total_panels} panel OK")

    # 失敗清單
    failed = [(s, r) for s, r in all_results if any(v == "FAILED" for v in r.values())]
    if failed:
        log(f"⚠️  仍失敗 ({len(failed)} 個景點):")
        for source, r in failed:
            fails = [k for k, v in r.items() if v == "FAILED"]
            log(f"  {source}: panel {fails}")


if __name__ == "__main__":
    main()

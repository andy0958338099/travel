#!/usr/bin/env python3
"""
Batch generate missing attraction photos (updated 2026-05-24).
Audit vs current data.ts:
  - wz07-best1.jpg: 白蓮塔 only has wz07-1.jpg
  - wl17 (馬驚興餐廳): currently shares wl17 files with 椒鹽醄醄火鍋 — needs its own
  - wl18-5, wl18-6: 宮宴 currently uses only wl18-1~4
Total: 4 images to generate.
"""

import urllib.request
import urllib.parse
import json
import time
import random
import os
import ssl
import sys
import certifi

API_KEY = os.environ["MINIMAX_API_KEY"]
API_URL = "https://api.minimax.io/v1/image_generation"
OUTPUT_DIR = "/Volumes/Transcend/manga-studio/frontend/public/attractions"

ssl_context = ssl.create_default_context(cafile=certifi.where())

existing = set(os.listdir(OUTPUT_DIR))

def exists(code):
    base = code.split('-')[0]
    suffix = code.split('-')[1] if '-' in code else '1'
    return f"{base}-{suffix}.jpg" in existing or f"{base}-{suffix}.png" in existing

REMAINING = [
    # (code, name, prompt)
    # 宮宴：wl18-5, wl18-6（最後2個號碼圖）
    ("wl18-5", "宮宴", "Gongyan Palace restaurant luxurious Chinese imperial style dining hall with ornate golden decorations, elegant table settings, actors in traditional Hanfu costumes serving elaborate imperial cuisine banquet"),
    ("wl18-6", "宮宴", "Gongyan Palace immersive Chinese palace theme restaurant with elaborate ancient Chinese palace architecture, diners in traditional Hanfu costumes enjoying elaborate banquet, dramatic lighting golden and red colors"),
    # 江南戲曲服飾：best1
    ("sh09-best1", "江南戲曲服飾", "Beautiful Chinese traditional opera costume rental shop interior with elegant Hanfu and Qing dynasty clothing on wooden racks, ornate embroidery details, soft warm lighting, traditional Chinese culture atmosphere, Xitang ancient town water town setting"),
    # 水宴餐廳：best1
    ("sh10-best1", "水宴餐廳", "Wuzhen water town traditional restaurant interior with fresh river fish dishes on wooden tables, warm lantern lighting, rustic Jiangnan water town cuisine atmosphere, authentic local food dining experience"),
    # 海底撈火鍋：best1
    ("sh06-best1", "海底撈火鍋", "Haidilao hotpot restaurant luxurious interior with steaming Sichuan spicy and mild broth pots, professional staff performinghand-pulled noodle show, lively and elegant dining atmosphere, Shanghai"),
    # 小楊生煎：best1
    ("sh07-best1", "小楊生煎", "Xiaoyang Shengjian famous Shanghai street food restaurant with freshly fried Shengjianbao pan-fried pork buns in large flat pan, golden crispy bottoms, steam rising, authentic Shanghai breakfast atmosphere"),
]

def generate_image(prompt):
    payload = json.dumps({
        "model": "image-01",
        "prompt": prompt,
        "num_images": 1
    }).encode('utf-8')
    req = urllib.request.Request(
        API_URL, data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ssl_context) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        image_urls = data.get("data", {}).get("image_urls", [])
        if image_urls:
            return urllib.parse.unquote(image_urls[0])
    except Exception as e:
        print(f"  [API ERROR] {e}", file=sys.stderr)
    return None

def download_image(url, path):
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=30, context=ssl_context) as resp:
            data = resp.read()
        with open(path, 'wb') as f:
            f.write(data)
        return len(data)
    except Exception as e:
        print(f"  [DL ERROR] {e}", file=sys.stderr)
        return 0

to_generate = [(code, name, prompt) for code, name, prompt in REMAINING if not exists(code)]
print(f"Need to generate: {len(to_generate)} images")
print(f"Already exist: {[code for code, _, _ in REMAINING if exists(code)]}")

for i, (code, name, prompt) in enumerate(to_generate):
    print(f"[{i+1}/{len(to_generate)}] Generating {code} ({name})...")

    url = None
    for attempt in range(5):
        url = generate_image(prompt)
        if url:
            break
        wait = (2 ** attempt) * random.uniform(1, 3)
        print(f"  Retry {attempt+1}/5 after {wait:.1f}s...")
        time.sleep(wait)

    if not url:
        print(f"  FAILED after 5 attempts: {code}")
        continue

    base = code.split('-')[0]
    suffix = code.split('-')[1] if '-' in code else '1'
    out_name = f"{base}-{suffix}.jpg"
    out_path = os.path.join(OUTPUT_DIR, out_name)

    size = download_image(url, out_path)
    if size > 0:
        print(f"  Saved: {out_name} ({size} bytes)")
        existing.add(out_name)
    else:
        print(f"  Download failed: {code}")

    # Rate limit: 10-15 seconds between calls
    if i < len(to_generate) - 1:
        wait = random.uniform(10, 15)
        print(f"  Waiting {wait:.1f}s...")
        time.sleep(wait)

print("\n=== DONE ===")
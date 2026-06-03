#!/usr/bin/env python3
"""
Retry generating remaining attraction photos.
Fix: generate + download in ONE call per attempt to avoid 403 on stored URLs.
"""

import urllib.request
import urllib.parse
import json
import time
import random
import os
import ssl
import certifi
import sys

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
    ("wz07", "白蓮塔", "White Lotus Pagoda tall ancient Chinese tower overlooking traditional water town canals and buildings, dusk lighting, Wuzhen tallest building"),
    ("wz08", "搖櫓船", "Traditional wooden rowboat gliding through narrow stone-paved water canals of water town, serene Jiangnan scenery, Wuzhen water channels"),
    ("wz09", "茅盾故居", "Mao Dun former residence traditional Chinese scholar home with antique furniture, scholarly library, peaceful courtyard, Wuzhen Dongzheng"),
    ("sh01", "豫園", "Yu Garden classical Chinese imperial garden with elaborate rock formations, ornate pavilions, koi ponds, Shanghai Ming Dynasty garden"),
    ("sh02", "城隍廟", "Shanghai City God Temple traditional Chinese architecture with red pillars, bustling market stalls, incense smoke, Shanghai old city"),
    ("sh03", "武康路", "Wukang Road tree-lined Shanghai colonial era street with elegant historic buildings at golden hour sunset, Shanghai French Concession"),
    ("sh04", "武康大樓", "Wukang Building iconic early 20th century Art Deco apartment building on Shanghai street corner, architectural landmark, 淮海路武康路"),
    ("sh05", "外攤夜景", "The Bund Shanghai spectacular night view with illuminated colonial era buildings on western bank of Huangpu River, Pudong skyline behind"),
    ("qd01", "千島湖", "Qiandao Lake emerald green water with thousands of forested islands scattered across lake surface, boat cruising, Zhejiang province"),
    ("xx01", "西溪濕地", "Xixi Wetland reed marshland with winding water channels, green reeds, morning mist, traditional boats, Hangzhou national wetland park"),
    ("wl02-3", "雷峰塔", "Leifeng Pagoda night scene illuminated with warm lights, West Lake night view, Chinese lantern atmosphere, Hangzhou"),
    ("wl05-3", "河坊街", "Hefang Street night scene with glowing red lanterns and traditional shop signs reflected on wet cobblestones, Hangzhou ancient street"),
    ("wl10-2", "南高峰", "South Longmen Peak hiking trail viewpoint overlooking entire West Lake and Hangzhou cityscape, panoramic view, lush mountain vegetation"),
    ("wz01-2", "烏鎮西柵", "Wuzhen Xizha water town scenic view with traditional white-walled buildings along canal, wooden bridge, atmosphere at dusk"),
]

def gen_and_save(code, name, prompt):
    """Generate image and save to disk in ONE attempt."""
    base = code.split('-')[0]
    suffix = code.split('-')[1] if '-' in code else '1'
    out_name = f"{base}-{suffix}.jpg"
    out_path = os.path.join(OUTPUT_DIR, out_name)

    payload = json.dumps({
        "model": "image-01",
        "prompt": prompt,
        "aspect_ratio": "3:2",
        "n": 1,
        "prompt_optimizer": True
    }).encode('utf-8')
    req = urllib.request.Request(
        API_URL, data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "MM-API-Source": "hangzhou-attractions"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=ssl_context) as resp:
            data = json.loads(resp.read())
        image_urls = data.get("data", {}).get("image_urls", [])
        if not image_urls:
            return False
        url = urllib.parse.unquote(image_urls[0])

        # Download immediately
        req2 = urllib.request.Request(url)
        with urllib.request.urlopen(req2, timeout=30, context=ssl_context) as resp2:
            img_data = resp2.read()
        with open(out_path, 'wb') as f:
            f.write(img_data)
        print(f"  Saved: {out_name} ({len(img_data)} bytes)")
        existing.add(out_name)
        return True
    except Exception as e:
        print(f"  [ERROR] {e}", file=sys.stderr)
        return False

to_generate = [(code, name, prompt) for code, name, prompt in REMAINING if not exists(code)]
print(f"Need to generate: {len(to_generate)} images")

for i, (code, name, prompt) in enumerate(to_generate):
    print(f"[{i+1}/{len(to_generate)}] {code} ({name})...")
    
    success = False
    for attempt in range(5):
        if gen_and_save(code, name, prompt):
            success = True
            break
        wait = (2 ** attempt) * random.uniform(1, 3)
        print(f"  Retry {attempt+1}/5 after {wait:.1f}s...")
        time.sleep(wait)
    
    if not success:
        print(f"  FAILED: {code}")
    
    # Rate limit
    if i < len(to_generate) - 1:
        wait = random.uniform(10, 15)
        print(f"  Waiting {wait:.1f}s...")
        time.sleep(wait)

print("\n=== DONE ===")
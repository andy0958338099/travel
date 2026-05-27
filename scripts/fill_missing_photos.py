#!/usr/bin/env python3
"""
Fill missing attraction photos — 17 images
Each tuple: (code, name_en, num_needed, [prompts])
num_needed = how many NEW images to generate (existing ones are skipped)
"""
import os
import json
import urllib.request
import urllib.parse
import time
import random
from pathlib import Path
from datetime import datetime

OUT_DIR = "/Volumes/Transcend/manga-studio/frontend/public/attractions"
LOG_FILE = Path("/Volumes/Transcend/manga-studio/data/photo_gen.log")
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

os.makedirs(OUT_DIR, exist_ok=True)

API_KEY = "sk-cp-yJacPqIIDoMTnasMWsTIohn5W_9rVXQoJ9jgr4nD3lVs3o6jLHCDa0gGZOPeAybSH3S_bk0YXYjJSamL-INbz7XlYI2WVUBW7IIeZsgj9gf1DEC_v8N5tEU"
API_URL = "https://api.minimax.io/v1/image_generation"

# (code, name_en, num_needed, [prompts])
# num_needed must equal len(prompts)
MISSING = [
    ("wl02", "雷峰塔", 1, [
        "Professional real photograph of Leifeng Pagoda West Lake Hangzhou, five-story octagonal tower with golden spire at sunset, traditional Chinese architecture silhouetted against orange sky, photorealistic",
    ]),
    ("wl05", "河坊街", 2, [
        "Professional real photograph of Hefang Street Hangzhou, bustling ancient Chinese shopping street with traditional lanterns and historic storefronts, people in traditional costumes browsing market stalls, photorealistic",
        "Professional real photograph of Hefang Street Hangzhou, close-up of traditional Chinese snack stalls selling famous Hangzhou street food like Cong Zhi gui and Shengbao, delicious food photography",
    ]),
    ("wl10", "南高峰", 1, [
        "Professional real photograph of South Longmen Peak Nanshan Hangzhou, misty mountain peak at sunrise with traditional Chinese pavilion and valley below, dramatic clouds rolling over hills, photorealistic",
    ]),
    ("wz01", "烏鎮西柵", 1, [
        "Professional real photograph of Wuzhen Xizha water town China, traditional boat crossing calm canal with white-walled buildings reflected in water, evening golden light, atmospheric",
    ]),
    ("ot01", "宋城千古情", 2, [
        "Professional real photograph of Song Dynasty City Hangzhou, spectacular grand theater with thousands of performers in colorful costume show with dramatic lighting effects, cinematic",
        "Professional real photograph of Song Dynasty City Hangzhou, reconstruction of ancient Song dynasty capital city gate and massive walls, impressive architecture",
    ]),
    ("ot02", "京杭大運河", 3, [
        "Professional real photograph of Hangzhou Grand Canal night cruise China, traditional wooden boat passing under illuminated ancient stone bridge with red lanterns reflecting in water, magical atmosphere",
        "Professional real photograph of Hangzhou Grand Canal, historic canal port with traditional warehouses converted to museums and cafes along the waterway, evening atmosphere",
        "Professional real photograph of Hangzhou Grand Canal, aerial view of the ancient waterway weaving through modern city with traditional boats and city skyline backdrop",
    ]),
    ("ot03", "千島湖", 3, [
        "Professional real photograph of Qiandao Lake Thousand Islands Zhejiang, emerald green water with unique bird-shaped island at sunrise, dramatic mountain backdrop, photorealistic scenic",
        "Professional real photograph of Qiandao Lake resort Zhejiang, overwater bungalows and wooden pier extending into crystal clear turquoise lake water, tropical paradise",
        "Professional real photograph of Qiandao Lake, scenic boat on pristine water with forested islands surrounding, peaceful morning with mist, wide panoramic",
    ]),
    ("ot04", "西溪濕地", 3, [
        "Professional real photograph of Xixi National Wetland Park Hangzhou, traditional Chinese painted boat cruising through serene lotus pond with mountains in background, soft morning light",
        "Professional real photograph of Xixi National Wetland Park Hangzhou, traditional Chinese pavilion on wooden deck surrounded by dense bamboo forest and lotus pond, peaceful atmosphere",
        "Professional real photograph of Xixi National Wetland Park, elevated boardwalk through wetland with observation tower among water lilies and reeds, autumn foliage colors",
    ]),
]

def generate_image(prompt):
    payload = json.dumps({
        "model": "image-01",
        "prompt": prompt,
        "aspect_ratio": "3:2",
        "n": 1,
        "prompt_optimizer": True
    }).encode('utf-8')
    
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "MM-API-Source": "fill-missing-photos"
        },
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    image_urls = data.get("data", {}).get("image_urls", [])
    if image_urls:
        return image_urls[0]
    return None

def download_image(url, path):
    req = urllib.request.Request(urllib.parse.unquote(url))
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    with open(path, 'wb') as f:
        f.write(data)
    return len(data)

total = sum(count for _, _, count, _ in MISSING)
done = 0
errors = 0

log(f"Starting photo generation: {total} images")
log(f"OUT_DIR: {OUT_DIR}")

for code, name_en, count, prompts in MISSING:
    for img_num_idx in range(count):
        img_num = img_num_idx + 1
        out_path = f"{OUT_DIR}/{code}-{img_num}.jpg"
        
        if os.path.exists(out_path):
            log(f"[SKIP] {code}-{img_num} already exists")
            done += 1
            continue
        
        prompt = prompts[img_num_idx]
        log(f"[{done+1}/{total}] Generating {code}-{img_num} ({name_en})...")
        
        for attempt in range(5):
            try:
                url = generate_image(prompt)
                if url:
                    size = download_image(url, out_path)
                    log(f"  -> Saved {size} bytes -> {code}-{img_num}.jpg")
                    break
                else:
                    log(f"  Attempt {attempt+1}: no URL returned")
            except Exception as e:
                wait = (2 ** attempt) * random.uniform(4, 8)
                log(f"  Attempt {attempt+1} failed: {e}, retry in {wait:.0f}s")
                time.sleep(wait)
                if attempt == 4:
                    log(f"  [FAIL] {code}-{img_num} could not be generated")
                    errors += 1
        done += 1
        wait = random.uniform(8, 12)
        log(f"  Waiting {wait:.1f}s before next request...")
        time.sleep(wait)

log(f"\nDone! {done - errors}/{total} images generated, {errors} errors.")
log("Run: ls -la /Volumes/Transcend/manga-studio/frontend/public/attractions/ to verify")
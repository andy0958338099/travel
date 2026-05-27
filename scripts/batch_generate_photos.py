#!/usr/bin/env python3
"""Batch generate attraction photos using MiniMax API."""
import os
import json
import urllib.request
import urllib.parse
import time
import random

OUT_DIR = "/Volumes/Transcend/manga-studio/frontend/public/attractions"
os.makedirs(OUT_DIR, exist_ok=True)

API_KEY = "sk-cp-yJacPqIIDoMTnasMWsTIohn5W_9rVXQoJ9jgr4nD3lVs3o6jLHCDa0gGZOPeAybSH3S_bk0YXYjJSamL-INbz7XlYI2WVUBW7IIeZsgj9gf1DEC_v8N5tEU"
API_URL = "https://api.minimax.io/v1/image_generation"

# 13 missing attractions × 3 images each = 39 images
# wl06 to ot04
ATTRACTIONS = [
    ("wl06", "蘇堤", "Su Causeway", [
        "Professional real photograph of Su Causeway West Lake Hangzhou, tree-lined causeway across water at golden sunset, traditional Chinese landscape, photorealistic, cinematic composition, wide panoramic shot",
        "Professional real photograph of Su Causeway West Lake Hangzhou, stone paved path with willow trees on both sides, people walking along the historic Song dynasty embankment, soft morning light",
        "Professional real photograph of Su Causeway West Lake Hangzhou, aerial drone view showing the entire six Li causeway covered with blooming桃花 peach blossoms and plum flowers in spring"
    ]),
    ("wl07", "斷橋殘雪", "Broken Bridge", [
        "Professional real photograph of Broken Bridge West Lake Hangzhou, iconic arched stone bridge in autumn with red maple foliage reflected in calm water, photorealistic, soft golden hour lighting",
        "Professional real photograph of Broken Bridge West Lake Hangzhou, close-up of the famous bridge with snow capped scene, traditional Chinese winter landscape with ice and snow on stone railings",
        "Professional real photograph of Broken Bridge West Lake Hangzhou, elevated view from nearby hilltop showing the bridge connecting shore to孤山 island, evening city lights in background"
    ]),
    ("wl08", "三潭印月", "Three Pools Mirroring Moon", [
        "Professional real photograph of Three Pools Mirroring the Moon West Lake Hangzhou, three ancient stone pagodas emerging from water surrounded by pink lotus flowers, photorealistic, morning mist",
        "Professional real photograph of Three Pools Mirroring the Moon West Lake Hangzhou, aerial view of the small island with classic Chinese pavilions gardens and the three signature stone towers reflected in the lake",
        "Professional real photograph of Three Pools Mirroring the Moon West Lake Hangzhou, close-up of one of the three stone pagodas with intricate Buddhist imagery carved into the towers, lotus flowers foreground"
    ]),
    ("wl09", "西湖天地", "West Lake Tiandi", [
        "Professional real photograph of West Lake Tiandi Hangzhou, modern lakeside complex with traditional Chinese roofed architecture reflected in lake water at dusk, warm restaurant lights glowing",
        "Professional real photograph of West Lake Tiandi Hangzhou, traditional Chinese style buildings along the waterfront with people strolling on stone paths, sunset colors in the sky",
        "Professional real photograph of West Lake Tiandi Hangzhou, beautiful exterior view of upscale dining pavilions with Chinese traditional design at night, lanterns lit up reflecting in lake"
    ]),
    ("wl10", "南高峰", "South Longmen Peak", [
        "Professional real photograph of South Longmen Peak Nanshan Hangzhou, elevated hiking trail viewpoint overlooking entire West Lake panorama with city skyline, morning mist and clouds below peak",
        "Professional real photograph of South Longmen Peak Hangzhou, traditional Chinese mountain pavilion on peak with sweeping view of West Lake and surrounding hills, photorealistic, lush green vegetation",
        "Professional real photograph of South Longmen Peak Hangzhou, hiking trail through dense bamboo forest leading to summit, stone steps winding up mountain, dappled sunlight"
    ]),
    ("wz01", "烏鎮西柵", "Wuzhen Xizha", [
        "Professional real photograph of Wuzhen Xizha water town Zhejiang China, traditional Jiangnan architecture with whitewashed walls and dark tiled roofs along ancient canals at twilight, photorealistic",
        "Professional real photograph of Wuzhen Xizha night tour China, spectacular illuminated traditional buildings reflected in calm canal water, warm golden lantern lights, atmospheric night scene",
        "Professional real photograph of Wuzhen Xizha China, traditional wooden boats called乌篷船 on the water, stone bridges arching over canal, local craftspeople demonstrating silk weaving along the riverbank"
    ]),
    ("wz02", "烏鎮東柵", "Wuzhen Dongzheng", [
        "Professional real photograph of Wuzhen Dongzheng ancient water town China, traditional residential houses along both sides of narrow canal, local residents daily life scenes, photorealistic",
        "Professional real photograph of Wuzhen Dongzheng China, famous stone bridge with small shop stalls underneath, morning market atmosphere with fresh vegetables and local specialties displayed",
        "Professional real photograph of Wuzhen Dongzheng China, aerial view of the water town showing intricate network of canals bridges and traditional rooftops, photorealistic"
    ]),
    ("wz03", "烏鎮", "Wuzhen Overview", [
        "Professional real photograph of Wuzhen ancient water town Zhejiang China, aerial drone shot showing entire historic town with canals radiating through traditional Chinese architecture, photorealistic",
        "Professional real photograph of Wuzhen China overview, traditional Chinese water town from elevated perspective showing the harmony of water streets and buildings, beautiful golden sunset lighting",
        "Professional real photograph of Wuzhen water town, panoramic view at night showing illuminated traditional buildings along both banks, boats with red lanterns creating magical atmosphere"
    ]),
    ("wz04", "木心美術館", "Muxin Art Museum", [
        "Professional real photograph of Muxin Art Museum Wuzhen China, stunning minimalist architecture by Ma Yansong with flowing curved concrete walls reflected in water garden, photorealistic, modern art museum exterior",
        "Professional real photograph of Muxin Art Museum Wuzhen, interior gallery space with natural light streaming through geometric windows, contemporary art exhibition inside the famous museum",
        "Professional real photograph of Muxin Art Museum Wuzhen, exterior view showing the landmark building with abstract sculptural forms emerging from water, surrounded by lotus ponds, artistic masterpiece architecture"
    ]),
    ("ot01", "宋城千古情", "Songcheng Theme Park", [
        "Professional real photograph of Song Dynasty City Hangzhou Songcheng China, spectacular outdoor theater with massive stage showing traditional Song dynasty cultural performance with hundreds of performers in period costumes",
        "Professional real photograph of Song Dynasty City Hangzhou, reconstructed ancient Song dynasty street with traditional architecture shops and restaurants, period-dressed vendors, bustling market atmosphere",
        "Professional real photograph of Song Dynasty City Hangzhou,鸟巢-like grand theater venue with spectacular light show and pyrotechnics during the famous Song of Song performance, cinematic"
    ]),
    ("ot02", "京杭大運河", "Grand Canal", [
        "Professional real photograph of Hangzhou Grand Canal UNESCO site China, traditional wooden cruise boat passing under ancient stone bridge at night with illuminated historic buildings on both banks",
        "Professional real photograph of Hangzhou Grand Canal, bustling cargo boats and tourist vessels on historic waterway with traditional Chinese architecture and modern city skyline backdrop, photorealistic",
        "Professional real photograph of Hangzhou Grand Canal, close-up of historic canal port with ancient stone navigational markers, traditional warehouses converted to museums, evening atmospheric lighting"
    ]),
    ("ot03", "千島湖", "Qiandao Lake", [
        "Professional real photograph of Qiandao Lake Thousand Islands Lake Zhejiang China, aerial drone view showing emerald green water with hundreds of forested islands scattered across the reservoir, photorealistic",
        "Professional real photograph of Qiandao Lake, beautiful waterfront resort with overwater bungalows and clear turquoise water, tropical paradise atmosphere, vacation scenery",
        "Professional real photograph of Qiandao Lake, close-up of unique fish-shaped island emerging from crystal clear water, traditional Chinese pavilion on island, dramatic mountain backdrop, scenic"
    ]),
    ("ot04", "西溪濕地", "Xixi National Wetland Park", [
        "Professional real photograph of Xixi National Wetland Park Hangzhou, serene wetland scenery with dense reeds bamboo forest and traditional Chinese pavilions reflected in calm water, morning mist",
        "Professional real photograph of Xixi National Wetland Park Hangzhou, scenic boat cruise through narrow waterways surrounded by lush water plants and ancient trees, photorealistic, peaceful atmosphere",
        "Professional real photograph of Xixi National Wetland Park, elevated boardwalk winding through wetland with observations towers and traditional pavilions among lotus ponds and water lilies, autumn colors"
    ]),
]

def generate_image(prompt, idx):
    """Call MiniMax API to generate one image and return the URL."""
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
            "MM-API-Source": "hangzhou-attractions"
        },
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    
    image_urls = data.get("data", {}).get("image_urls", [])
    if image_urls:
        return image_urls[0]
    return None

def download_image(url, path):
    """Download image from URL to local path."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    with open(path, 'wb') as f:
        f.write(data)
    return len(data)

def main():
    total = len(ATTRACTIONS) * 3
    count = 0
    errors = []
    
    for code, name_cn, name_en, prompts in ATTRACTIONS:
        for img_num in range(1, 4):
            count += 1
            out_path = f"{OUT_DIR}/{code}-{img_num}.jpg"
            
            # Skip if already exists
            if os.path.exists(out_path):
                print(f"[{count}/{total}] SKIP {code}-{img_num} (exists)")
                continue
            
            print(f"[{count}/{total}] Generating {name_en} view {img_num}/3...")
            
            for attempt in range(3):
                try:
                    url = generate_image(prompts[img_num - 1], img_num)
                    if url:
                        # Decode URL-encoded URL
                        url = urllib.parse.unquote(url)
                        size = download_image(url, out_path)
                        print(f"  -> Saved {size} bytes to {code}-{img_num}.jpg")
                        break
                except Exception as e:
                    print(f"  Attempt {attempt+1} failed: {e}")
                    time.sleep(2)
                    if attempt == 2:
                        errors.append(f"{code}-{img_num}: {e}")
            
            # Rate limit: wait 1-2 seconds between requests
            time.sleep(1.5)
    
    print(f"\nDone. {total - len(errors)}/{total} images generated.")
    if errors:
        print(f"Errors: {errors}")

if __name__ == "__main__":
    main()
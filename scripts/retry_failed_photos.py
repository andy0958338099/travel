#!/usr/bin/env python3
"""Retry failed attraction photos with longer delays and better error handling."""
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

# Remaining images to generate (14 total)
REMAINING = [
    ("wl09", "西湖天地", "West Lake Tiandi", [
        "Professional real photograph of West Lake Tiandi Hangzhou, modern lakeside complex with traditional Chinese roofed architecture reflected in lake water at dusk, warm restaurant lights glowing, photorealistic",
        "Professional real photograph of West Lake Tiandi Hangzhou, traditional Chinese style buildings along the waterfront with people strolling on stone paths, sunset colors in the sky, photorealistic",
        "Professional real photograph of West Lake Tiandi Hangzhou, beautiful exterior view of upscale dining pavilions with Chinese traditional design at night, lanterns lit up reflecting in lake, photorealistic"
    ]),
    ("wl10", "南高峰", "South Longmen Peak", [
        "Professional real photograph of South Longmen Peak Nanshan Hangzhou, elevated hiking trail viewpoint overlooking entire West Lake panorama with city skyline, morning mist and clouds below peak, photorealistic",
        "Professional real photograph of South Longmen Peak Hangzhou, traditional Chinese mountain pavilion on peak with sweeping view of West Lake and surrounding hills, photorealistic, lush green vegetation",
        "Professional real photograph of South Longmen Peak Hangzhou, hiking trail through dense bamboo forest leading to summit, stone steps winding up mountain, photorealistic, dappled sunlight"
    ]),
    ("wz01", "烏鎮西柵", "Wuzhen Xizha", [
        "Professional real photograph of Wuzhen Xizha water town Zhejiang China, traditional Jiangnan architecture with whitewashed walls and dark tiled roofs along ancient canals at twilight, photorealistic",
        "Professional real photograph of Wuzhen Xizha night tour China, spectacular illuminated traditional buildings reflected in calm canal water, warm golden lantern lights, atmospheric night scene",
        "Professional real photograph of Wuzhen Xizha China, traditional wooden boats on the water, stone bridges arching over canal, local craftspeople demonstrating silk weaving along the riverbank, photorealistic"
    ]),
    ("ot01", "宋城千古情", "Songcheng Theme Park", [
        "Professional real photograph of Song Dynasty City Hangzhou Songcheng China, spectacular outdoor theater with massive stage showing traditional Song dynasty cultural performance with hundreds of performers in period costumes, photorealistic",
        "Professional real photograph of Song Dynasty City Hangzhou, reconstructed ancient Song dynasty street with traditional architecture shops and restaurants, period-dressed vendors, bustling market atmosphere, photorealistic",
        "Professional real photograph of Song Dynasty City Hangzhou, grand theater venue with spectacular light show and pyrotechnics during the famous Song of Song performance, cinematic, photorealistic"
    ]),
    ("ot02", "京杭大運河", "Grand Canal", [
        "Professional real photograph of Hangzhou Grand Canal UNESCO site China, traditional wooden cruise boat passing under ancient stone bridge at night with illuminated historic buildings on both banks, photorealistic",
        "Professional real photograph of Hangzhou Grand Canal, bustling cargo boats and tourist vessels on historic waterway with traditional Chinese architecture and modern city skyline backdrop, photorealistic",
        "Professional real photograph of Hangzhou Grand Canal, close-up of historic canal port with ancient stone navigational markers, traditional warehouses converted to museums, evening atmospheric lighting, photorealistic"
    ]),
    ("ot03", "千島湖", "Qiandao Lake", [
        "Professional real photograph of Qiandao Lake Thousand Islands Lake Zhejiang China, aerial drone view showing emerald green water with hundreds of forested islands scattered across the reservoir, photorealistic",
        "Professional real photograph of Qiandao Lake, beautiful waterfront resort with overwater bungalows and clear turquoise water, tropical paradise atmosphere, vacation scenery, photorealistic",
        "Professional real photograph of Qiandao Lake, unique fish-shaped island emerging from crystal clear water, traditional Chinese pavilion on island, dramatic mountain backdrop, scenic, photorealistic"
    ]),
    ("ot04", "西溪濕地", "Xixi National Wetland Park", [
        "Professional real photograph of Xixi National Wetland Park Hangzhou, serene wetland scenery with dense reeds bamboo forest and traditional Chinese pavilions reflected in calm water, morning mist, photorealistic",
        "Professional real photograph of Xixi National Wetland Park Hangzhou, scenic boat cruise through narrow waterways surrounded by lush water plants and ancient trees, peaceful atmosphere, photorealistic",
        "Professional real photograph of Xixi National Wetland Park, elevated boardwalk winding through wetland with observations towers and traditional pavilions among lotus ponds and water lilies, autumn colors, photorealistic"
    ]),
]

def generate_image(prompt, code, img_num, attempt):
    """Call MiniMax API to generate one image and return the URL."""
    try:
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
                "MM-API-Source": "hangzhou-attractions-retry"
            },
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        
        # Debug: print response structure
        if data.get("base_resp", {}).get("status_code") != 0:
            print(f"  API error: {data.get('base_resp', {}).get('status_msg')}")
            return None
            
        image_urls = data.get("data", {}).get("image_urls", [])
        if image_urls:
            return image_urls[0]
        return None
    except urllib.error.HTTPError as e:
        print(f"  HTTP Error {e.code}: {e.reason}")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def download_image(url, path):
    """Download image from URL to local path."""
    url = urllib.parse.unquote(url)
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    with open(path, 'wb') as f:
        f.write(data)
    return len(data)

def main():
    total = sum(len(a[3]) for a in REMAINING)
    count = 0
    done = 0
    errors = []
    
    for code, name_cn, name_en, prompts in REMAINING:
        for img_num in range(1, 4):
            count += 1
            out_path = f"{OUT_DIR}/{code}-{img_num}.jpg"
            
            # Skip if already exists
            if os.path.exists(out_path):
                size = os.path.getsize(out_path)
                if size > 10000:  # Valid file (> 10KB)
                    print(f"[{count}/{total}] SKIP {code}-{img_num} ({size} bytes, exists)")
                    done += 1
                    continue
            
            print(f"[{count}/{total}] Generating {name_en} view {img_num}/3...")
            
            for attempt in range(5):
                try:
                    url = generate_image(prompts[img_num - 1], code, img_num, attempt)
                    if url:
                        size = download_image(url, out_path)
                        print(f"  -> Saved {size} bytes to {code}-{img_num}.jpg")
                        done += 1
                        break
                    else:
                        wait_time = (attempt + 1) * 5 + random.uniform(1, 3)
                        print(f"  Attempt {attempt+1}/5 failed, waiting {wait_time:.1f}s...")
                        time.sleep(wait_time)
                except Exception as e:
                    wait_time = (attempt + 1) * 5
                    print(f"  Attempt {attempt+1}/5 error: {e}, waiting {wait_time}s...")
                    time.sleep(wait_time)
            else:
                errors.append(f"{code}-{img_num}")
            
            # Longer delay between API calls (8-12 seconds)
            delay = 8 + random.uniform(0, 4)
            print(f"  Waiting {delay:.1f}s before next...")
            time.sleep(delay)
    
    print(f"\nDone. {done}/{total} images generated.")
    if errors:
        print(f"Failed ({len(errors)}): {errors}")
    
    # Final summary
    print("\n=== FINAL FILE COUNT ===")
    jpg_count = len([f for f in os.listdir(OUT_DIR) if f.endswith('.jpg')])
    png_count = len([f for f in os.listdir(OUT_DIR) if f.endswith('.png')])
    print(f"JPG: {jpg_count}, PNG: {png_count}, Total: {jpg_count + png_count}")

if __name__ == "__main__":
    main()
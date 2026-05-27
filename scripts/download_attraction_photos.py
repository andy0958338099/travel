#!/usr/bin/env python3
"""Download real attraction photos from Wikipedia/Wikimedia Commons - with retry and delay."""
import os
import json
import urllib.request
import urllib.parse
import time
import random

OUT_DIR = "/Volumes/Transcend/manga-studio/frontend/public/attractions"
os.makedirs(OUT_DIR, exist_ok=True)

ATTRACTIONS = [
    ("wl01", ["West Lake (Hangzhou)", "West Lake Hangzhou", "West Lake at dusk"], "西湖"),
    ("wl02", ["Leifeng Pagoda", "Leifeng Pagoda Hangzhou"], "雷峰塔"),
    ("wl03", ["Lingyin Temple Hangzhou", "Lingyin Temple"], "靈隱寺"),
    ("wl04", ["Longjing Tea Hangzhou", "Longjing tea plantation"], "龍井茶園"),
    ("wl05", ["Hefang Street Hangzhou", "Hefang Street"], "河坊街"),
    ("wl06", ["Su Causeway Hangzhou", "Su Di Causeway West Lake"], "蘇堤"),
    ("wl07", ["Broken Bridge Hangzhou", "West Lake Broken Bridge"], "斷橋"),
    ("wl08", ["Three Pools Mirroring Moon", "West Lake Three Pools"], "三潭印月"),
    ("wl09", ["West Lake Tiandi", "Westlake Tiandi Hangzhou"], "西湖天地"),
    ("wl10", ["Nan Shan Peak Hangzhou", "South Mountain Hangzhou", "Nanshan peak Hangzhou"], "南高峰"),
    ("wz01", ["Wuzhen Xizha", "Wuzhen water town", "乌镇西栅"], "烏鎮西柵"),
    ("wz02", ["Wuzhen Dongzheng", "东栅", "Wuzhen east gate"], "烏鎮東柵"),
    ("wz03", ["Wuzhen", "Wuzhen ancient town", "乌镇"], "烏鎮"),
    ("wz04", ["Muxin Art Museum", "Muxin Museum Wuzhen", "木心美术馆"], "木心美術館"),
    ("ot01", ["Song Dynasty City Hangzhou", "Songcheng Hangzhou", "宋城千古情"], "宋城千古情"),
    ("ot02", ["Grand Canal Hangzhou", "Hangzhou Grand Canal cruise"], "京杭大運河"),
    ("ot03", ["Qiandao Lake", "Thousand Islands Lake", "千岛湖"], "千島湖"),
    ("ot04", ["Xixi Wetland", "Xixi National Wetland Park", "西溪湿地"], "西溪濕地"),
]

def api_request(url, retries=3, delay=3):
    """Make an API request with retries."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; HangzhouTripBot/1.0; +https://example.com/bot)"
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                time.sleep(1 + random.uniform(0, 1))  # Delay between requests
                return json.loads(resp.read())
        except Exception as e:
            wait = delay * (attempt + 1)
            print(f"  Attempt {attempt+1} failed: {e}, waiting {wait}s...")
            time.sleep(wait)
    return None

def get_wiki_image_urls(search_terms, limit=3):
    """Get image URLs from Wikipedia for given search terms."""
    base_url = "https://en.wikipedia.org/w/api.php"
    
    for term in search_terms:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": term,
            "srlimit": 3,
            "format": "json"
        }
        url = f"{base_url}?{urllib.parse.urlencode(params)}"
        data = api_request(url)
        if not data:
            continue
        
        results = data.get("query", {}).get("search", [])
        if not results:
            continue
        
        titles = [r["title"] for r in results[:3]]
        
        # Get page images (not just thumbnails)
        img_params = {
            "action": "query",
            "titles": "|".join(titles),
            "prop": "pageimages",
            "pithumbsize": 900,
            "format": "json"
        }
        img_url = f"{base_url}?{urllib.parse.urlencode(img_params)}"
        img_data = api_request(img_url)
        if not img_data:
            continue
        
        pages = img_data.get("query", {}).get("pages", {})
        urls = []
        for page_id, page in pages.items():
            if "thumbnail" in page:
                urls.append(page["thumbnail"]["source"])
        
        if urls:
            return urls
        
        time.sleep(1)
    
    # Fallback to Chinese Wikipedia
    zh_url = "https://zh.wikipedia.org/w/api.php"
    for term in search_terms[:2]:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": term,
            "srlimit": 3,
            "format": "json"
        }
        url = f"{zh_url}?{urllib.parse.urlencode(params)}"
        data = api_request(url)
        if not data:
            continue
        
        results = data.get("query", {}).get("search", [])
        if not results:
            continue
        
        titles = [r["title"] for r in results[:3]]
        
        img_params = {
            "action": "query",
            "titles": "|".join(titles),
            "prop": "pageimages",
            "pithumbsize": 900,
            "format": "json"
        }
        img_url = f"{zh_url}?{urllib.parse.urlencode(img_params)}"
        img_data = api_request(img_url)
        if not img_data:
            continue
        
        pages = img_data.get("query", {}).get("pages", {})
        urls = []
        for page_id, page in pages.items():
            if "thumbnail" in page:
                urls.append(page["thumbnail"]["source"])
        
        if urls:
            return urls
        
        time.sleep(1)
    
    return []

def download_image(url, filepath, retries=3):
    """Download an image with retries."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; HangzhouTripBot/1.0; +https://example.com/bot)"
            })
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            with open(filepath, "wb") as f:
                f.write(data)
            return len(data)
        except Exception as e:
            wait = 2 * (attempt + 1)
            print(f"  Download attempt {attempt+1} failed: {e}, retry in {wait}s...")
            time.sleep(wait)
    return 0

def main():
    print("Starting attraction photo download (with delays)...")
    results = {}
    
    for code, search_terms, cn_name in ATTRACTIONS:
        print(f"\n[{code}] {cn_name}")
        time.sleep(2 + random.uniform(0, 1))  # Initial delay
        
        urls = get_wiki_image_urls(search_terms)
        
        if not urls:
            print(f"  No images found")
            results[code] = {"name": cn_name, "images": [], "status": "not_found"}
            continue
        
        print(f"  Found {len(urls)} image URLs")
        
        downloaded = []
        for i, url in enumerate(urls[:3]):
            # Get extension from URL
            parsed = urllib.parse.urlparse(url)
            path = parsed.path
            ext = os.path.splitext(path)[1].lower() if os.path.splitext(path)[1] else ".jpg"
            if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
                ext = ".jpg"
            
            filepath = os.path.join(OUT_DIR, f"{code}-{i+1}{ext}")
            size = download_image(url, filepath)
            
            if size > 5000:
                downloaded.append(filepath)
                print(f"  ✓ {i+1}: {size//1024}KB -> {os.path.basename(filepath)}")
            else:
                print(f"  ✗ {i+1}: Too small ({size} bytes)")
            
            time.sleep(1 + random.uniform(0, 0.5))
        
        results[code] = {
            "name": cn_name,
            "search_terms": search_terms,
            "images": [os.path.basename(p) for p in downloaded],
            "status": "ok" if downloaded else "failed"
        }
    
    # Save metadata
    meta_path = os.path.join(OUT_DIR, "metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n\nSaved: {meta_path}")
    for code, r in results.items():
        status = "✓" if r["status"] == "ok" else "✗"
        imgs = ", ".join(r.get("images", []))
        print(f"  {status} [{code}] {r['name']}: {imgs}")

if __name__ == "__main__":
    main()

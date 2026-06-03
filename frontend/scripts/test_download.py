#!/usr/bin/env python3
"""Test: generate image and immediately download in same session."""
import urllib.request, urllib.parse, json, ssl, certifi, sys, os

API_KEY = os.environ["MINIMAX_API_KEY"]
ssl_ctx = ssl.create_default_context(cafile=certifi.where())

prompt = "White Lotus Pagoda tall ancient Chinese tower overlooking traditional water town canals, dusk lighting, Wuzhen"

print("Generating...")
payload = json.dumps({"model": "image-01", "prompt": prompt, "aspect_ratio": "3:2", "n": 1, "prompt_optimizer": True}).encode()
req = urllib.request.Request(
    "https://api.minimax.io/v1/image_generation",
    data=payload,
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=60, context=ssl_ctx) as resp:
    data = json.loads(resp.read())
raw_url = data["data"]["image_urls"][0]
url = urllib.parse.unquote(raw_url)
print(f"URL (decoded): {url[:100]}")

print("Downloading...")
req2 = urllib.request.Request(url)
try:
    with urllib.request.urlopen(req2, timeout=30, context=ssl_ctx) as resp:
        print(f"Status: {resp.status}")
        img_data = resp.read()
        print(f"Size: {len(img_data)}")
        with open("/tmp/test_download.jpg", "wb") as f:
            f.write(img_data)
        print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
#!/usr/bin/env python3
"""Download hotel photos from chinaholiday.com CDN for Kingtown Plaza Shanghai."""

import urllib.request
import os

DEST = '/Volumes/Transcend/manga-studio/frontend/public/hotels/kingtown-plaza/shanghai'
os.makedirs(DEST, exist_ok=True)

# All discovered photo IDs organized by category
# Format: (id, category_prefix)
PHOTOS = [
    # Appearance (exterior/facade)
    (6397929, 'appearance_'),
    (6397930, 'appearance_'),
    (6397944, 'appearance_'),
    (6397945, 'appearance_'),
    (6397946, 'appearance_'),
    (6397947, 'appearance_'),
    (6397948, 'appearance_'),
    (6397949, 'appearance_'),
    (6397950, 'appearance_'),
    # Public area (lobby, corridors, etc.)
    (6397939, 'public_'),
    (6397940, 'public_'),
    (6397991, 'public_'),
    (6397992, 'public_'),
    (6397993, 'public_'),
    (6397994, 'public_'),
    (6397995, 'public_'),
    (6397996, 'public_'),
    (6397997, 'public_'),
    (6398030, 'public_'),
    (6398031, 'public_'),
    (6398032, 'public_'),
    (6398033, 'public_'),
    (6398034, 'public_'),
    (6398035, 'public_'),
    (6398036, 'public_'),
    (6398037, 'public_'),
    (6398038, 'public_'),
    (6398039, 'public_'),
    (6398040, 'public_'),
    (6398041, 'public_'),
    (6398042, 'public_'),
    (6398043, 'public_'),
    (6398044, 'public_'),
    (6398045, 'public_'),
    (6398046, 'public_'),
    # Meeting room
    (6398070, 'meeting_'),
    (6398071, 'meeting_'),
    (6398072, 'meeting_'),
    (6398073, 'meeting_'),
    (6398074, 'meeting_'),
    (6398075, 'meeting_'),
    (6398076, 'meeting_'),
    (6398077, 'meeting_'),
    (6398078, 'meeting_'),
    (6398079, 'meeting_'),
    (6398080, 'meeting_'),
    (6398081, 'meeting_'),
    (6398082, 'meeting_'),
    # Restaurant
    (6398025, 'restaurant_'),
    (6398026, 'restaurant_'),
    # Gym
    (6398028, 'gym_'),
    (6398029, 'gym_'),
    (6398056, 'gym_'),
    (6398057, 'gym_'),
    (6398058, 'gym_'),
    (6398059, 'gym_'),
    (6398060, 'gym_'),
    (6398061, 'gym_'),
    # Room (various)
    (6397934, 'room_'),
    (6397935, 'room_'),
    (6397936, 'room_'),
    (6397937, 'room_'),
    (6397938, 'room_'),
    (6397941, 'room_'),
    (6397942, 'room_'),
    (6397943, 'room_'),
    (6397951, 'room_'),
    (6397952, 'room_'),
    (6397953, 'room_'),
    (6397954, 'room_'),
    (6397985, 'room_'),
    (6397986, 'room_'),
    (6397987, 'room_'),
    (6397988, 'room_'),
    (6397989, 'room_'),
    (6397990, 'room_'),
    (6398025, 'room_'),  # duplicate
    # Others / amenities
    (6398050, 'amenity_'),
    (6398051, 'amenity_'),
    (6398052, 'amenity_'),
    (6398053, 'amenity_'),
    (6398054, 'amenity_'),
]

# Try both small and full-size URLs
URL_PATTERNS = [
    'http://www.chinaholiday.com/Photos/66887/{id}s.jpg',   # small/thumbnail
    'http://www.chinaholiday.com/Photos/66887/{id}.jpg',     # full size
]

# Track what category index we're at per category
counters = {}
ok_count = 0

for photo_id, prefix in PHOTOS:
    # Find the next number for this prefix
    if prefix not in counters:
        counters[prefix] = 1
    num = counters[prefix]
    counters[prefix] += 1

    fname = f'{prefix}{num:02d}.jpg'
    fpath = f'{DEST}/{fname}'

    # Skip if already downloaded and valid
    if os.path.exists(fpath) and os.path.getsize(fpath) > 10000:
        print(f'SKIP (exists): {fname}')
        continue

    saved = False
    for pattern in URL_PATTERNS:
        url = pattern.format(id=photo_id)
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            with urllib.request.urlopen(req, timeout=15) as r:
                data = r.read()
                if len(data) > 10000:  # Must be > 10KB to be real image
                    with open(fpath, 'wb') as f:
                        f.write(data)
                    print(f'OK   {len(data)//1024:4d}KB  {fname}  ({url[-30:]})')
                    ok_count += 1
                    saved = True
                    break
                else:
                    print(f'SMALL {len(data)//1024:4d}KB  {fname}  ({url[-30:]})')
        except Exception as e:
            print(f'FAIL  --     {fname}  err={str(e)[:50]}')

print(f'\n=== Done: {ok_count} photos saved to {DEST} ===')
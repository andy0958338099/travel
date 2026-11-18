"""檢查各 font-family fallback 鏈對全站字元的覆蓋率。"""
import json
import os

from fontTools.ttLib import TTFont

F = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS = os.path.join(F, "public/fonts")


def cm(name):
    return set(TTFont(os.path.join(FONTS, name)).getBestCmap().keys())


serif = cm("NotoSerifTC-Print-Regular.woff2")
serifB = cm("NotoSerifTC-Print-Bold.woff2")
sans = cm("NotoSansTC-Print-Regular.woff2")
sansB = cm("NotoSansTC-Print-Bold.woff2")
emoji = cm("NotoEmoji-Print-Regular.woff2")
sc = cm("NotoSansSC-Print-Regular.woff2")
math = cm("NotoSansMath-Print-Regular.woff2")
sym2 = cm("NotoSansSymbols2-Print-Regular.woff2")

d = json.load(open(os.path.join(F, "src/data/site-content.public.json"), encoding="utf-8"))
chars = set()


def walk(o):
    if isinstance(o, str):
        chars.update(o)
    elif isinstance(o, dict):
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)


for k in ("posts", "books", "trips"):
    walk(d.get(k) or [])
snap = {ord(c) for c in chars if ord(c) > 127}

print("snapshot non-ascii chars:", len(snap))
for n, s in [
    ("serif", serif),
    ("serifB", serifB),
    ("sans", sans),
    ("sansB", sansB),
    ("emoji", emoji),
    ("sc", sc),
    ("math", math),
    ("sym2", sym2),
]:
    print(f"  {n:8s} {len(s)}")

sup = emoji | sc | math | sym2
body_chain = serif | sup
body_b_chain = serifB | sup
head_chain = sans | sup
head_b_chain = sansB | sup

for label, chain in [
    ("正文 Regular 鏈", body_chain),
    ("正文 Bold 鏈", body_b_chain),
    ("標題 Regular 鏈", head_chain),
    ("標題 Bold 鏈", head_b_chain),
]:
    miss = sorted(snap - chain)
    txt = "".join(chr(c) for c in miss)
    print(f"\n{label}: 缺 {len(miss)}  {txt[:120]}")

print("\nsans 有 serif 沒有的:", len(sans - serif), sorted(sans - serif)[:20])
print("serif 有 sans 沒有的:", len(serif - sans), sorted(serif - sans)[:20])

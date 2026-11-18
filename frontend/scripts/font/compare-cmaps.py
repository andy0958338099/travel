"""比較新舊字型子集的 cmap，確認重建沒有遺失任何既有字元。"""
import os
import sys

from fontTools.ttLib import TTFont

FONTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "public/fonts",
)


def cm(path):
    return set(TTFont(path).getBestCmap().keys())


pairs = [
    ("/tmp/old-serif.woff2", "NotoSerifTC-Print-Regular.woff2"),
    ("/tmp/old-serif-bold.woff2", "NotoSerifTC-Print-Bold.woff2"),
]

for oldp, newn in pairs:
    newp = os.path.join(FONTS, newn)
    if not os.path.exists(oldp):
        print(f"（跳過 {newn}：沒有舊檔）")
        continue
    if not os.path.exists(newp):
        print(f"（跳過 {newn}：沒有新檔）")
        continue
    o, n = cm(oldp), cm(newp)
    lost = sorted(o - n)
    added = sorted(n - o)
    print(f"\n{newn}")
    print(f"  舊 {len(o)} 字 → 新 {len(n)} 字")
    print(f"  遺失 {len(lost)}: {''.join(chr(c) for c in lost)[:120]}")
    print(f"  新增 {len(added)}: {''.join(chr(c) for c in added)[:120]}")
    if lost:
        sys.exit(1)
print("\n✓ 沒有遺失任何既有字元")

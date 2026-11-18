"""列出各字型子集的 cmap 與關鍵字元覆蓋。"""
import os
import sys

from fontTools.ttLib import TTFont

F = sys.argv[1] if len(sys.argv) > 1 else "public/fonts"
KEY = [0x1F14D, 0x1F150, 0x1F151, 0x200D, 0xFE0F, 0x1F64B, 0x2642]

for f in sorted(os.listdir(F)):
    if not f.endswith(".woff2"):
        continue
    cm = TTFont(os.path.join(F, f)).getBestCmap()
    marks = " ".join(f"U+{c:04X}:{'Y' if c in cm else 'N'}" for c in KEY)
    print(f"{f:36s} {len(cm):5d} 字  {marks}")

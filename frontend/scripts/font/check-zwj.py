"""檢查字型裡 ZWJ (U+200D) 的 glyph 與零寬序列支援。"""
import os
import sys

from fontTools.ttLib import TTFont

FONTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "public/fonts",
)


def report(path, label):
    f = TTFont(path)
    cmap = f.getBestCmap()
    print(f"\n=== {label} ({os.path.basename(path)}) ===")
    for code in (0x200D, 0xFE0F, 0x1F64B, 0x2642, 0xFE0E):
        gname = cmap.get(code)
        if gname is None:
            print(f"  U+{code:04X}: 不在 cmap")
            continue
        gid = f.getGlyphID(gname)
        adv = f["hmtx"][gname][0]
        glyf = f["glyf"][gname] if "glyf" in f else None
        ncont = glyf.numberOfContours if glyf is not None else None
        print(
            f"  U+{code:04X}: glyph={gname} gid={gid} advance={adv} "
            f"contours={ncont}"
        )
    # GSUB 是否含 ZWJ ligature / 序列
    if "GSUB" in f:
        feats = set()
        for sr in f["GSUB"].table.ScriptList.ScriptRecord:
            for lr in sr.Script.DefaultLangSys.FeatureIndex:
                pass
        try:
            for fr in f["GSUB"].table.FeatureList.FeatureRecord:
                feats.add(fr.FeatureTag)
        except Exception:
            pass
        print("  GSUB features:", sorted(feats))
    else:
        print("  無 GSUB")


for name, label in [
    ("NotoEmoji-Print-Regular.woff2", "Emoji 子集"),
    ("/tmp/noto-emoji.ttf", "Noto Emoji 原始"),
]:
    p = name if name.startswith("/") else os.path.join(FONTS, name)
    if os.path.exists(p):
        report(p, label)
    else:
        print(f"跳過 {p}")

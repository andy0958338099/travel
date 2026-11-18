#!/usr/bin/env python3
"""
產生列印版面用的字型子集。

為什麼需要自帶字型：
  線上 PDF 是 Netlify background function 在 Amazon Linux 上用 Chromium 拍的。
  那台機器沒有 PingFang TC / Heiti TC（macOS 才有），也沒有任何 emoji 字型。
  凡是用系統字型的中文 → 豆腐字（方框）。
  2026-11-18 使用者回報「輸出 PDF 的時候變成亂碼的字」就是這個原因。

產出（全部放 public/fonts/）:
  NotoSansTC-Print-{Regular,Bold}.woff2   思源黑體 TC 子集（標題）
  NotoSerifTC-Print-{Regular,Bold}.woff2  思源宋體 TC 子集（內文，既有）
  NotoEmoji-Print-Regular.woff2           Noto Emoji 子集（emoji）
  NotoSansSC-Print-Regular.woff2          簡體中文補丁
  NotoSansMath-Print-Regular.woff2        數學花體補丁（𝓓𝓪𝔂）
  NotoSansSymbols2-Print-Regular.woff2    特殊符號補丁（➔）

CSS fallback 鏈（print-mode.css）:
  font-family: "PrintSerifTC", "PrintEmoji", "PrintSansSC",
               "PrintSansMath", "PrintSansSymbols2", ... , serif;
  瀏覽器會**逐字元**往下一個 family 找有該 glyph 的字型，
  所以多掛幾個 family 就能補上各自的缺口，不必合併字型檔。
  這比「把 3 個字型的 glyph 合併成一份」安全得多（合併需要動 glyf/loca/maxp）。

字元集來源（聯集，寧可多不可少）:
  1. 宋體子集已有的 6,863 字（Big5 常用字 + 全站用字）
  2. 公開快照 site-content.public.json 的所有字元
  3. ASCII / 常用中西文標點

用法：
  python3 scripts/font/build-sans-subset.py \
      --src400 /tmp/ns400.ttf --src700 /tmp/ns700.ttf \
      --emoji /tmp/noto-emoji.ttf \
      --sc /tmp/nsc400.ttf --math /tmp/notosansmath.ttf \
      --symbols /tmp/notosanssymbols2.ttf
"""
import argparse
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

FRONTEND = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SERIF = os.path.join(FRONTEND, "public/fonts/NotoSerifTC-Print-Regular.woff2")
SNAPSHOT = os.path.join(FRONTEND, "src/data/site-content.public.json")

PUNCT = (
    "　、。〈〉《》「」『』【】〔〕・ー—–…‧※§¶©®™°′″×÷±≈≠≤≥←→↑↓"
    "■□▲△▼▽○●◎◇◆〜～￥＄＆＋－＝｜＼／＂＇（）［］｛｝，；：！？％＠＃＊－＿"
)
NUM_CN = "零一二三四五六七八九十百千萬億壹貳參肆伍陸柒捌玖拾"


def snapshot_chars():
    """公開快照裡出現的所有字元。"""
    chars = set()
    if not os.path.exists(SNAPSHOT):
        return chars
    d = json.load(open(SNAPSHOT, encoding="utf-8"))

    def walk(o):
        if isinstance(o, str):
            chars.update(o)
        elif isinstance(o, dict):
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    for key in ("posts", "books", "trips"):
        walk(d.get(key) or [])
    return chars


def collect_main_codes():
    """主字型（黑體/宋體）的字元集：宋體子集 ∪ 快照 ∪ ASCII/標點。"""
    chars = set()
    if os.path.exists(SERIF):
        chars |= set(TTFont(SERIF).getBestCmap().keys())

    chars |= snapshot_chars()

    for c in range(0x20, 0x7F):
        chars.add(c)
    chars.update(PUNCT)
    chars.update(NUM_CN)
    return {ord(c) if isinstance(c, str) else c for c in chars}


def collect_gap_codes(covered):
    """找出主字型都沒有的字元 → 交給補丁字型。"""
    out = set()
    for c in snapshot_chars():
        code = ord(c)
        if code in covered or code in (0x0A, 0x20):
            continue
        out.add(code)
    # 變體選擇符與 ZWJ 是 emoji 序列的一部分
    out.update({0xFE0E, 0xFE0F, 0x200D})
    return out


def build(src, out, codes, label=""):
    """把 src 子集化成 out（woff2）。回傳實際涵蓋的字元集。"""
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables = []

    font = subset.load_font(src, opts)
    sub = subset.Subsetter(options=opts)
    sub.populate(text="".join(sorted(chr(c) for c in codes)))
    sub.subset(font)
    subset.save_font(font, out, opts)

    got = set(TTFont(out).getBestCmap().keys())
    size = os.path.getsize(out)
    print(
        f"  → {os.path.basename(out):34s} {len(got):5d} 字  "
        f"{size/1048576:.3f} MB{('  ' + label) if label else ''}"
    )
    return got


def build_supplement(src, out, wanted, label):
    """補丁字型：只抽出 wanted 裡這個來源有的字。"""
    if not src or not os.path.exists(src):
        print(f"  ⚠️ 找不到來源字型 {src}")
        return set()
    cm = set(TTFont(src).getBestCmap().keys())
    need = wanted & cm
    if not need:
        print(f"  · {label}: 沒有可補的字")
        return set()
    got = build(src, out, need, label)
    missing = need - got
    if missing:
        print(f"    ⚠️ 缺 {len(missing)}: {' '.join(chr(c) for c in sorted(missing))}")
    return got


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src400", required=True, help="Noto Sans TC Regular ttf")
    ap.add_argument("--src700", required=True, help="Noto Sans TC Bold ttf")
    ap.add_argument(
        "--serif400", help="Noto Serif TC Regular ttf/otf（重建宋體子集用）"
    )
    ap.add_argument("--serif700", help="Noto Serif TC Bold ttf/otf（重建宋體子集用）")
    ap.add_argument("--emoji", help="Noto Emoji Regular ttf")
    ap.add_argument("--sc", help="Noto Sans SC ttf（簡體補丁）")
    ap.add_argument("--math", help="Noto Sans Math ttf（數學花體補丁）")
    ap.add_argument("--symbols", help="Noto Sans Symbols 2 ttf（符號補丁）")
    ap.add_argument("--outdir", default=os.path.join(FRONTEND, "public/fonts"))
    args = ap.parse_args()

    print("收集字元集…")
    main_codes = collect_main_codes()
    print(f"  主字型: {len(main_codes)} 字")

    os.makedirs(args.outdir, exist_ok=True)

    def out(n):
        return os.path.join(args.outdir, n)

    print("\n產生主字型子集…")
    sans_codes = build(
        args.src400, out("NotoSansTC-Print-Regular.woff2"), main_codes, "黑體 Regular"
    )
    build(args.src700, out("NotoSansTC-Print-Bold.woff2"), main_codes, "黑體 Bold")

    # 🆕 重建宋體子集：舊的宋體子集是早期用 Big5 常用字 + 舊快照做的，
    #   涵蓋不全（正文鏈缺「測」「匿」等 12 個字）→ 線上正文會出現方框。
    #   用同一套字元集（快照全字 + Big5）重新產生，兩條鏈就一致了。
    if args.serif400:
        print("\n重建宋體子集…")
        build(
            args.serif400,
            out("NotoSerifTC-Print-Regular.woff2"),
            main_codes,
            "宋體 Regular",
        )
        if args.serif700:
            build(
                args.serif700,
                out("NotoSerifTC-Print-Bold.woff2"),
                main_codes,
                "宋體 Bold",
            )

    # 補丁字型要補的是「主字型都沒有」的字
    covered = set(sans_codes)
    if os.path.exists(SERIF):
        covered |= set(TTFont(SERIF).getBestCmap().keys())
    gap = collect_gap_codes(covered)
    print(f"\n主字型缺口: {len(gap)} 字")
    if gap:
        printable = "".join(chr(c) for c in sorted(gap) if c > 0x20)
        print(f"  {' '.join(sorted(printable))}")

    print("\n產生補丁字型…")
    got = set()
    got |= build_supplement(
        args.emoji, out("NotoEmoji-Print-Regular.woff2"), gap, "emoji"
    )
    got |= build_supplement(
        args.sc, out("NotoSansSC-Print-Regular.woff2"), gap, "簡體中文"
    )
    got |= build_supplement(
        args.math, out("NotoSansMath-Print-Regular.woff2"), gap, "數學花體"
    )
    got |= build_supplement(
        args.symbols, out("NotoSansSymbols2-Print-Regular.woff2"), gap, "特殊符號"
    )

    final = covered | got
    still = sorted(gap - final)
    if still:
        print(
            f"\n⚠️ 仍無字型的字（會是豆腐字）: "
            f"{' '.join(chr(c) for c in still)}"
        )
    else:
        print("\n✓ 快照內所有字元都有字型覆蓋")

    print("\n完成 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())

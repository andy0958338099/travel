#!/usr/bin/env python3
"""
產生思源黑體 TC（Noto Sans TC）子集，供 PDF 列印標題使用。

為什麼需要：
  標題的 font-family 是 `var(--font-geist-sans), "PingFang TC", "Heiti TC"`，
  這是**系統字體**。線上 Netlify function 跑在 Amazon Linux，
  沒有 PingFang TC / Heiti TC → 中文標題掉成方框豆腐字。
  內文因為用自帶的 PrintSerifTC（Noto Serif TC 子集 woff2）所以正常。

解法：
  產生 Noto Sans TC 的 woff2 子集，掛成專屬 family "PrintSansTC"，
  在 print-mode.css 裡把標題的 font-family 改成
  `"PrintSansTC", var(--font-geist-sans), "PingFang TC", "Heiti TC"`,
  讓自帶字型有最高優先權（線上、本機都一致）。

字元集來源（聯集，寧可多不可少）：
  1. 宋體子集已有的 6,863 字（Big5 常用字 + 全站用字）
  2. 公開快照 site-content.public.json 的所有字元
  3. 拉丁 / 標點 / 數字 / 常用符號

用法：
  python3 scripts/dev/build-sans-subset.py \
      --src400 /tmp/ns400.ttf --src700 /tmp/ns700.ttf \
      --outdir public/fonts
"""
import argparse
import json
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

# scripts/font/build-sans-subset.py → frontend/
FRONTEND = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SERIF = os.path.join(FRONTEND, "public/fonts/NotoSerifTC-Print-Regular.woff2")
SNAPSHOT = os.path.join(FRONTEND, "src/data/site-content.public.json")


def collect_chars():
    chars = set()

    # 1. 宋體子集的字元（已經驗證涵蓋全站用字 + Big5 常用字）
    if os.path.exists(SERIF):
        cm = set(TTFont(SERIF).getBestCmap().keys())
        chars |= cm
        print(f"  宋體子集: {len(cm)} 字")

    # 2. 公開快照的所有字元
    if os.path.exists(SNAPSHOT):
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

        walk(d.get("posts") or [])
        walk(d.get("books") or [])
        walk(d.get("trips") or [])
        print(f"  快照字元累計: {len(chars)} 字")

    # 3. ASCII + 常見中西文標點符號（避免數字/英文掉字）
    for c in range(0x20, 0x7F):
        chars.add(c)
    chars.update("　、。〈〉《》「」『』【】〔〕・ー—–…‧※§¶©®™°′″×÷±≈≠≤≥←→↑↓■□▲△▼▽○●◎◇◆□※〜～￥＄＆＋－＝｜＼／＂＇（）［］｛｝，；：！？％＠＃＆＊－＿＋＝")
    chars.update("零一二三四五六七八九十百千萬億壹貳參肆伍陸柒捌玖拾")
    return chars


def build(src, out, chars, name_suffix):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables = []

    font = subset.load_font(src, opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text="".join(sorted(chr(c) for c in chars)))
    subsetter.subset(font)
    subset.save_font(font, out, opts)

    f = TTFont(out)
    cm = len(f.getBestCmap())
    size = os.path.getsize(out)
    print(f"  → {os.path.basename(out)}  {cm} 字  {size/1048576:.2f} MB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src400", required=True)
    ap.add_argument("--src700", required=True)
    ap.add_argument("--outdir", default=os.path.join(FRONTEND, "public/fonts"))
    args = ap.parse_args()

    print("收集字元集…")
    chars = collect_chars()
    # collect_chars() 混用 str 與 int（cmap 是碼位、快照是字元）→ 統一成碼位
    codes = {ord(c) if isinstance(c, str) else c for c in chars}
    print(f"  合計: {len(codes)} 字\n")

    os.makedirs(args.outdir, exist_ok=True)
    print("產生子集…")
    build(args.src400, os.path.join(args.outdir, "NotoSansTC-Print-Regular.woff2"), codes, "Regular")
    build(args.src700, os.path.join(args.outdir, "NotoSansTC-Print-Bold.woff2"), codes, "Bold")
    print("\n完成 ✓")


if __name__ == "__main__":
    sys.exit(main())

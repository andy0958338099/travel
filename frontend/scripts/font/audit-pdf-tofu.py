"""
PDF 豆腐字自動稽核：把 PDF 內每個非 ASCII 字元對照「自帶字型 cmap 聯集」。

判斷原理：
  字元不在聯集 → 沒有任何自帶字型能渲染 → 一定是 .notdef（方框）→ 缺陷。
  字元在聯集   → Chromium 必然找得到字型 → 不可能是 .notdef。

⚠️ 這招查不出「ZWJ 序列」那類問題（U+200D 本身在 emoji 子集裡，
   但整個 grapheme cluster 會失敗）。那種要靠
   scripts/font/test-zwj-render.mjs 與高解析度視覺確認。

用法：python3 scripts/font/audit-pdf-tofu.py <pdf> [fonts_dir]
"""

import os
import sys

import fitz
from fontTools.ttLib import TTFont

pdf_path = sys.argv[1]
fonts_dir = sys.argv[2] if len(sys.argv) > 2 else "public/fonts"

# 1. 載入所有自帶字型的 cmap，取聯集
union = set()
per_file = {}
for name in sorted(os.listdir(fonts_dir)):
    if not name.endswith(".woff2"):
        continue
    try:
        tt = TTFont(os.path.join(fonts_dir, name))
        cm = tt.getBestCmap()
    except Exception as e:
        print(f"  (略過 {name}: {e})")
        continue
    per_file[name] = set(cm.keys())
    union |= set(cm.keys())
    print(f"  {name}: {len(cm)} 個字元")

print(f"\n自帶字型聯集: {len(union)} 個 unicode")

# 2. 掃描 PDF 所有字元
doc = fitz.open(pdf_path)
missing = {}
total = 0
by_span_type = {}
for pno in range(doc.page_count):
    page = doc[pno]
    raw = page.get_text("rawdict")
    for block in raw.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                fname = span.get("font", "?")
                for ch in span.get("chars", []):
                    cp = ord(ch["c"])
                    if cp < 0x80:
                        continue
                    total += 1
                    by_span_type[fname] = by_span_type.get(fname, 0) + 1
                    if cp not in union:
                        missing.setdefault((ch["c"], cp), []).append(pno + 1)

print(f"PDF: {pdf_path}  ({doc.page_count} 頁)")
print(f"PDF 內非 ASCII 字元總數: {total}")
print("各字型使用量:", by_span_type)

if missing:
    print(f"\n❌ 有 {len(missing)} 個字元不在自帶字型聯集 → 可能渲染成豆腐字:")
    for (c, cp), pages in sorted(missing.items(), key=lambda x: x[0][1]):
        print(f"   {c!r} (U+{cp:04X})  pages={sorted(set(pages))[:8]}")
else:
    print("\n✅ PDF 內所有非 ASCII 字元都在自帶字型聯集內 → 不可能有 .notdef 豆腐字")

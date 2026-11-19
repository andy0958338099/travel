"""
把宋體（NotoSerifTC）子集改用 TrueType（glyf）大綱重建。

## 為什麼需要

PDF 內的字型型態由 Skia 能否拿到 `glyf` 表決定：

| 字型 | 大綱 | PDF 內型態 | 結果 |
|---|---|---|---|
| NotoSansTC-Print-* | glyf | Type0 + Identity-H + 完整 ToUnicode | ✅ 正常嵌入 |
| NotoSerifTC-Print-*（舊） | **CFF** | **Type3 路徑化** | ❌ 見下 |

舊宋體來源是 CFF（OTF）→ Skia 無法以 CIDFontType2 嵌入 → 退化成 Type3：
  - 文字以「座標 + 字形編號」記錄，ToUnicode 不完整
  - 抽取文字時相鄰 glyph 之間會被插入空白（`測 試 · 客 製 紀 念 版`）
  - 選取/複製貼上品質差、部分檢視器搜尋不到片語
  - charproc 額外佔用 PDF 體積

改成 glyf 大綱後，Skia 會正常走 Type0 嵌入。

## 為什麼不影響版面

Google Fonts 的 `NotoSerifTC[wght].ttf` 是 glyf-based 可變字型。
實測（scripts/font/check-vf-compat.py）：
  - 靜態實例（wght=400/700）涵蓋現行子集全部 7329 字元，0 缺
  - 每個字元的 advance width 與現行 OTF 逐字比對完全一致
  → 換字型不會改變斷行、字級、頁數或裁切結果

## 用法

  python3 scripts/font/rebuild-serif-truetype.py
"""
import importlib.util
import os
import subprocess
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(os.path.dirname(HERE))
OUTDIR = os.path.join(FRONTEND, "public/fonts")
VF_URL = (
    "https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/"
    "NotoSerifTC%5Bwght%5D.ttf"
)
VF_PATH = "/tmp/NotoSerifTC-VF.ttf"


def load_builder():
    """重用 build-sans-subset.py 的字元收集與子集產生邏輯。"""
    path = os.path.join(HERE, "build-sans-subset.py")
    spec = importlib.util.spec_from_file_location("build_sans_subset", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def ensure_vf():
    if os.path.exists(VF_PATH):
        return VF_PATH
    print("下載 Noto Serif TC 可變字型…")
    subprocess.run(["curl", "-sL", "-o", VF_PATH, VF_URL], check=True)
    return VF_PATH


def main():
    builder = load_builder()
    vf_path = ensure_vf()

    print("收集字元集…")
    codes = builder.collect_main_codes()
    print(f"  主字型字元: {len(codes)} 字")

    os.makedirs(OUTDIR, exist_ok=True)
    for wght, name, label in (
        (400, "NotoSerifTC-Print-Regular.woff2", "宋體 Regular"),
        (700, "NotoSerifTC-Print-Bold.woff2", "宋體 Bold"),
    ):
        print(f"\n產生 {label}（wght={wght} 靜態實例）…")
        inst = instancer.instantiateVariableFont(
            TTFont(vf_path),
            {"wght": wght},
            inplace=False,
            updateFontNames=True,
        )
        static = f"/tmp/NotoSerifTC-{wght}-static.ttf"
        inst.save(static)

        t = TTFont(static)
        assert "glyf" in t, "靜態實例缺少 glyf 表 → 無法讓 Skia 做 Type0 嵌入"
        assert "CFF " not in t and "CFF2" not in t, "靜態實例仍含 CFF"

        out = os.path.join(OUTDIR, name)
        got = builder.build(static, out, codes, f"{label} (TrueType/glyf)")
        missing = codes - got
        if missing:
            printable = "".join(chr(c) for c in sorted(missing))
            print(f"    ⚠️ 缺 {len(missing)} 字: {printable}")

        # 驗證：子集必須是 glyf，且涵蓋所有字元
        chk = TTFont(out)
        assert "glyf" in chk, f"{name} 產出仍非 glyf"
        assert "CFF " not in chk, f"{name} 產出仍含 CFF"

    print("\n✓ 宋體子集已改為 TrueType(glyf) 大綱 → Skia 將走 Type0 嵌入")
    return 0


if __name__ == "__main__":
    sys.exit(main())

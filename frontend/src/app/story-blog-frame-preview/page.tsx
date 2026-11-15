"use client";

/**
 * 🅒 Preview · 不寫進 git
 *
 * 聖上 8-16 第二輪: 再新增 4 種候選
 * - 既有 4 種: 朱紅金邊 / 純白拍立得 / 墨黑復古 / 水墨淡邊
 * - 候選 4 種: 青花瓷 / 竹紋 / 老相片 / 水彩暈染
 * - 共 8 種並排, 給聖上看 4 種新風格定位
 *
 * 聖上拍板保留哪些, 才寫進 PhotoFrame.tsx + DB CHECK constraint
 */

import { useState } from "react";

type FrameStyle =
  | "vermilion" | "polaroid" | "ink" | "wash"  // 既有
  | "porcelain" | "bamboo" | "aged" | "watercolor";  // 候選 4 種

const FRAMES: Record<FrameStyle, { label: string; emoji: string; desc: string; tier: "現有" | "候選" }> = {
  vermilion: {
    label: "朱紅金邊", emoji: "🏮",
    desc: "現狀 · 厚重朱紅陰影 + 金色內框 + 拍立得微傾斜 + 印章 chip",
    tier: "現有",
  },
  polaroid: {
    label: "純白拍立得", emoji: "⬜",
    desc: "白邊無金 · 淡陰影 · 乾淨現代感 · 拍立得下緣加寬手寫區",
    tier: "現有",
  },
  ink: {
    label: "墨黑復古", emoji: "🎞",
    desc: "黑框 + 厚重黑色陰影 · dramatic · 適合戲劇/夜景/情緒照",
    tier: "現有",
  },
  wash: {
    label: "水墨淡邊", emoji: "📜",
    desc: "灰淡細邊框 · 書卷氣 · 淡陰影 · 適合人像/風景/古鎮",
    tier: "現有",
  },
  // ===== 候選 4 種 (8-16 第二輪) =====
  porcelain: {
    label: "青花瓷", emoji: "🏺",
    desc: "藍白瓷釉質感 · 雙層青邊框 · 適合江南水鄉/瓷器主題照",
    tier: "候選",
  },
  bamboo: {
    label: "竹紋", emoji: "🎋",
    desc: "綠竹紋邊框 · 自然氣息 · 適合古鎮人像/戶外照",
    tier: "候選",
  },
  aged: {
    label: "老相片", emoji: "📷",
    desc: "泛黃邊角 + 顆粒感 + 仿老照片 · sepia 色調 · 適合懷舊照",
    tier: "候選",
  },
  watercolor: {
    label: "水彩暈染", emoji: "🎨",
    desc: "柔軟模糊邊框 · 淡彩暈染感 · 適合風景/情緒照",
    tier: "候選",
  },
};

const SAMPLE = {
  xitang:  "https://picsum.photos/seed/xitang-jn/600/450",
  wuzhen:  "https://picsum.photos/seed/wuzhen-jn/600/450",
  hangzhou:"https://picsum.photos/seed/hangzhou-jn/600/450",
  longjing:"https://picsum.photos/seed/longjing-jn/600/450",
};

const CAPTIONS = {
  xitang: "西塘 · 煙雨長廊",
  wuzhen: "烏鎮西柵 · 搖船",
  hangzhou: "杭州西湖 · 斷橋",
  longjing: "龍井村 · 茶園晨霧",
};

function PhotoFrameMock({
  src,
  caption,
  style,
}: {
  src: string;
  caption: string;
  style: FrameStyle;
}) {
  const [hover, setHover] = useState(false);
  const baseRotate = -2 + Math.floor(Math.random() * 5);

  // 4 種現有 + 4 種候選
  if (style === "polaroid") {
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative bg-white p-5 pb-20"
          style={{ boxShadow: "0 15px 35px -8px rgba(0,0,0,0.25), 0 5px 15px -3px rgba(0,0,0,0.15)" }}>
          <div className="border border-stone-200/80 bg-white">
            <img src={src} alt={caption} className="block max-w-full h-auto" loading="lazy" />
          </div>
          <div className="absolute bottom-4 left-5 right-5 text-center">
            <p className="text-base font-semibold text-stone-800 font-serif tracking-wide">{caption}</p>
          </div>
        </div>
      </figure>
    );
  }

  if (style === "ink") {
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative bg-black p-2 pb-12"
          style={{ boxShadow: "0 30px 70px -12px rgba(0,0,0,0.65), 0 15px 30px -8px rgba(0,0,0,0.50)" }}>
          <div className="border-4 border-black bg-stone-950">
            <img src={src} alt={caption} style={{ filter: "contrast(1.15) saturate(0.85) brightness(0.95)" }}
              className="block max-w-full h-auto" loading="lazy" />
          </div>
          <div className="absolute -top-3 -left-3">
            <span className="inline-block bg-red-600 text-white text-[10px] font-extrabold px-2 py-1.5 rounded-sm border-2 border-amber-200"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.15em" }}>古印</span>
          </div>
          <div className="absolute bottom-2 left-3 right-3 text-center">
            <p className="text-base font-extrabold text-amber-100 font-serif tracking-widest">{caption}</p>
          </div>
        </div>
      </figure>
    );
  }

  if (style === "wash") {
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative p-3 pb-12" style={{ backgroundColor: "#f5ead0",
          boxShadow: "0 10px 25px -8px rgba(120,53,15,0.20), 0 4px 10px -3px rgba(120,53,15,0.12)" }}>
          <div className="border-2 border-amber-700/30 p-1.5 bg-amber-50/50">
            <div className="border border-amber-600/40 p-0.5 bg-white">
              <img src={src} alt={caption} className="block max-w-full h-auto" loading="lazy" />
            </div>
          </div>
          <div className="absolute bottom-2 left-3 right-3 text-center">
            <p className="text-base font-serif font-bold text-amber-900 tracking-widest">{caption}</p>
          </div>
          <div className="absolute -bottom-2 -left-2">
            <span className="inline-block bg-red-700 text-white text-[10px] font-extrabold px-2 py-1.5 rounded-sm border border-amber-200"
              style={{ writingMode: "vertical-rl", letterSpacing: "0.15em" }}>印</span>
          </div>
        </div>
      </figure>
    );
  }

  if (style === "porcelain") {
    // 🆕 候選 1: 青花瓷 — 藍白瓷釉 (加強: 飽和深藍底 + 厚藍陰影 + 6px 粗藍邊框)
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative p-3 pb-16"
          style={{
            backgroundColor: "#dbeafe",
            boxShadow: "0 18px 40px -10px rgba(30,58,138,0.45), 0 8px 20px -5px rgba(30,58,138,0.30), 0 2px 6px rgba(30,58,138,0.20)",
            border: "4px solid #1e3a8a",
          }}>
          <div className="border-[5px] border-blue-900 p-2 bg-white">
            <div className="border-2 border-blue-600 p-1 bg-blue-50/40">
              <img src={src} alt={caption} className="block max-w-full h-auto" loading="lazy" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-center">
            <p className="text-base font-serif font-extrabold text-blue-900 tracking-widest">{caption}</p>
          </div>
          <div className="absolute -top-4 -right-4">
            <span className="inline-block bg-blue-900 text-white text-xs font-extrabold px-3 py-1.5 rounded-sm border-[3px] border-blue-200 shadow-lg">
              青花
            </span>
          </div>
        </div>
      </figure>
    );
  }

  if (style === "bamboo") {
    // 🆕 候選 2: 竹紋 — 綠竹邊 (加強: 飽和深綠底 + 厚綠陰影 + 6px 粗綠邊框)
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative p-3 pb-16"
          style={{
            backgroundColor: "#a7f3d0",
            boxShadow: "0 18px 40px -10px rgba(6,78,59,0.45), 0 8px 20px -5px rgba(6,78,59,0.30), 0 2px 6px rgba(6,78,59,0.20)",
            border: "4px solid #064e3b",
          }}>
          <div className="border-[5px] border-emerald-900 p-2 bg-white"
            style={{
              backgroundImage: "repeating-linear-gradient(90deg, transparent 0, transparent 22px, rgba(6,78,59,0.25) 22px, rgba(6,78,59,0.25) 24px)",
            }}>
            <div className="border-2 border-emerald-700 p-1 bg-emerald-50/50">
              <img src={src} alt={caption} className="block max-w-full h-auto" loading="lazy" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-center">
            <p className="text-base font-serif font-extrabold text-emerald-950 tracking-widest">{caption}</p>
          </div>
          <div className="absolute -top-4 -right-4">
            <span className="inline-block bg-emerald-900 text-white text-xs font-extrabold px-3 py-1.5 rounded-sm border-[3px] border-emerald-200 shadow-lg">
              竹
            </span>
          </div>
        </div>
      </figure>
    );
  }

  if (style === "aged") {
    // 🆕 候選 3: 老相片 — 泛黃 + 顆粒感 (加強: 深褐底 + 厚褐陰影 + 雙層褐邊框)
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative p-3 pb-16"
          style={{
            backgroundColor: "#fef3c7",
            boxShadow: "0 15px 35px -8px rgba(120,53,15,0.50), 0 6px 18px -4px rgba(120,53,15,0.35), 0 2px 6px rgba(120,53,15,0.20)",
            border: "4px solid #92400e",
          }}>
          <div className="border-[5px] border-amber-800 p-2 bg-amber-100/70">
            <div className="border-2 border-amber-700 p-1 bg-amber-50/80">
              <img src={src} alt={caption}
                style={{ filter: "sepia(0.75) contrast(0.85) brightness(0.98) saturate(0.55)" }}
                className="block max-w-full h-auto" loading="lazy" />
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-center relative z-10">
            <p className="text-base font-serif italic font-extrabold text-amber-950 tracking-widest">{caption}</p>
          </div>
          <div className="absolute -top-4 -right-4">
            <span className="inline-block bg-amber-900 text-amber-50 text-xs font-extrabold px-3 py-1.5 rounded-sm border-[3px] border-amber-200 shadow-lg font-mono">
              OLD
            </span>
          </div>
        </div>
      </figure>
    );
  }

  if (style === "watercolor") {
    // 🆕 候選 4: 水彩暈染 — 柔邊 (加強: 飽和紫粉底 + 厚陰影 + 真正柔邊暈染)
    return (
      <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        className="inline-block transition-transform duration-500"
        style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
        <div className="relative p-3 pb-16"
          style={{
            background: "linear-gradient(135deg, #fbcfe8 0%, #e9d5ff 35%, #c7d2fe 70%, #bfdbfe 100%)",
            boxShadow: "0 15px 35px -8px rgba(168,85,247,0.45), 0 6px 18px -4px rgba(244,114,182,0.30), 0 2px 6px rgba(168,85,247,0.20)",
            borderRadius: "12px",
            border: "3px solid rgba(168,85,247,0.3)",
          }}>
          <div className="p-2"
            style={{
              background: "linear-gradient(135deg, rgba(244,114,182,0.20), rgba(168,85,247,0.20), rgba(59,130,246,0.20))",
              borderRadius: "10px",
              boxShadow: "inset 0 0 15px rgba(244,114,182,0.25), inset 0 0 30px rgba(168,85,247,0.15)",
            }}>
            <div className="border-2 border-purple-300/70 p-1 bg-white/90"
              style={{
                filter: "blur(0.3px)",
                borderRadius: "6px",
                boxShadow: "inset 0 0 8px rgba(168,85,247,0.15)",
              }}>
              <img src={src} alt={caption}
                style={{ filter: "saturate(1.15) contrast(0.92) brightness(1.05)" }}
                className="block max-w-full h-auto" loading="lazy" />
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "inset 0 0 30px rgba(168,85,247,0.25), inset 0 0 60px rgba(244,114,182,0.18), inset 0 0 90px rgba(59,130,246,0.10)",
              borderRadius: "12px",
            }}
          />
          <div className="absolute bottom-3 left-3 right-3 text-center">
            <p className="text-base font-serif font-extrabold text-purple-950 tracking-widest">{caption}</p>
          </div>
          <div className="absolute -top-4 -right-4">
            <span className="inline-block bg-purple-300 text-purple-950 text-xs font-extrabold px-3 py-1.5 rounded-sm border-[3px] border-purple-500 shadow-lg">
              水彩
            </span>
          </div>
        </div>
      </figure>
    );
  }

  // vermilion 預設
  return (
    <figure onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="inline-block transition-transform duration-500"
      style={{ transform: `rotate(${baseRotate}deg) ${hover ? "scale(1.02)" : ""}` }}>
      <div className="relative bg-white p-3 pb-12 shadow-2xl"
        style={{ boxShadow: "0 20px 50px -10px rgba(220, 38, 38, 0.25), 0 8px 20px -5px rgba(0, 0, 0, 0.15)" }}>
        <div className="relative border-2 border-amber-300/60 p-0.5 bg-orange-50">
          <img src={src} alt={caption} className="block max-w-full h-auto" loading="lazy" />
        </div>
        <div className="absolute bottom-2 left-3 right-3 text-center">
          <p className="text-base font-extrabold text-stone-900 tracking-wide">{caption}</p>
        </div>
        <div className="absolute -top-2 -right-2">
          <span className="inline-block bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm"
            style={{ writingMode: "vertical-rl", letterSpacing: "0.1em" }}>印</span>
        </div>
      </div>
    </figure>
  );
}

export default function FramePreviewPage() {
  const photos: { src: string; cap: string; key: string }[] = [
    { src: SAMPLE.xitang, cap: CAPTIONS.xitang, key: "xitang" },
    { src: SAMPLE.wuzhen, cap: CAPTIONS.wuzhen, key: "wuzhen" },
    { src: SAMPLE.hangzhou, cap: CAPTIONS.hangzhou, key: "hangzhou" },
    { src: SAMPLE.longjing, cap: CAPTIONS.longjing, key: "longjing" },
  ];

  // 既有 4 + 候選 4 = 8 種
  const allStyles: FrameStyle[] = [
    "vermilion", "polaroid", "ink", "wash",
    "porcelain", "bamboo", "aged", "watercolor",
  ];

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="fixed top-3 left-3 z-50 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg">
        🅒 Preview · 不寫進 git
      </div>

      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2">
            8 種相框風格對照 (4 既有 + 4 候選)
          </h1>
          <p className="text-sm md:text-base text-stone-600">
            聖上拍板保留哪些, 才寫進 PhotoFrame.tsx
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {photos.map((p) => (
            <div key={p.key} className="space-y-3">
              <div className="text-center">
                <span className="text-xs font-bold text-stone-500 tracking-widest">樣本照片</span>
              </div>
              {allStyles.map((style) => {
                const f = FRAMES[style];
                return (
                  <div key={style}
                    className={`rounded-lg p-5 shadow-sm border ${
                      f.tier === "候選" ? "bg-amber-50 border-amber-300" : "bg-white border-stone-200"
                    }`}>
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="text-base font-bold text-stone-900">
                        {f.emoji} {f.label}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        f.tier === "候選" ? "bg-amber-200 text-amber-900" : "bg-stone-200 text-stone-700"
                      }`}>
                        {f.tier}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mb-4 leading-relaxed">{f.desc}</p>
                    <div className="flex justify-center min-h-[240px] items-center">
                      <PhotoFrameMock src={p.src} caption={p.cap} style={style} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center text-xs text-stone-400">
          8 種風格 · 4 張照片 · 聖上拍板保留哪些進 PhotoFrame.tsx
        </div>
      </div>
    </main>
  );
}

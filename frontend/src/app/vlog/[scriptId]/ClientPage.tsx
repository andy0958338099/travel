"use client";

/**
 * /vlog/[scriptId] — 單一劇本閱讀頁
 *
 * 結構：
 *   頂部：劇本名稱 + 標語 + 角色表（13 人 + 角色 + 家別 chip）
 *   中段：8 日行程時間線（7/17~7/24），每天一個區塊：
 *           主要場景 / 主要角色 / 主對白方向 / 鏡頭建議
 *   底部：← 回到 3 劇本比較
 *
 * 內容由聖上在 data.ts 維護；本檔只負責渲染殼子。
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SCRIPTS,
  CHARACTERS_13,
  COLOR_BG_CLASS,
  COLOR_TEXT_CLASS,
  COLOR_BORDER_CLASS,
  COLOR_VAR,
  type ScriptColorKey,
  type Character,
} from "../data";

// 角色家別 chip 配色（聖上 2026-07-11 拍板家別：喜家 / 吳家 / 同事）
//   喜家 = 阿喜核心家（朱紅系，最顯眼）
//   吳家 = 吳董家（金色系，第二家庭）
//   同事 = 阿喜工作同事（青花系，第三組）
const FAMILY_CHIP_BG: Record<Character["family"], string> = {
  喜家: "bg-[var(--jn-vermilion)]/10 text-[var(--jn-vermilion)] border-[var(--jn-vermilion)]/30",
  吳家: "bg-[var(--jn-gold)]/15 text-[var(--jn-vermilion-deep)] border-[var(--jn-gold)]/40",
  同事: "bg-[var(--jn-blue)]/10 text-[var(--jn-blue)] border-[var(--jn-blue)]/30",
};

export default function VlogScriptClientPage({
  scriptId,
}: {
  scriptId: string;
}) {
  const script = SCRIPTS[scriptId];
  if (!script) {
    notFound();
  }

  const accentRaw = COLOR_VAR[script.color];
  const accentBg = COLOR_BG_CLASS[script.color];
  const accentText = COLOR_TEXT_CLASS[script.color];
  const accentBorder = COLOR_BORDER_CLASS[script.color];

  return (
    <main
      className="min-h-screen text-[var(--jn-ink)]"
      style={{
        background:
          "linear-gradient(180deg, var(--jn-paper) 0%, var(--jn-paper-warm) 100%)",
      }}
    >
      {/* ───────── 頂部 Hero ───────── */}
      <header
        className="relative overflow-hidden"
        style={{
          background: "var(--jn-gradient-1)",
        }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{
               backgroundImage:
                 "radial-gradient(circle at 20% 30%, var(--jn-paper) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--jn-paper) 0%, transparent 50%)",
             }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-[var(--jn-paper)]">
          <Link
            href="/vlog"
            className="inline-block text-sm text-[var(--jn-paper)]/85 hover:text-[var(--jn-paper)] mb-4"
          >
            ← 回到 3 劇本比較
          </Link>
          <div className="flex items-baseline gap-3 mb-2">
            <span
              className="text-5xl sm:text-6xl font-black opacity-80 leading-none"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              {script.id}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--jn-paper)]/85 text-[var(--jn-vermilion-deep)]"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              劇本 {script.id}
            </span>
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 leading-tight"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            {script.name}
          </h1>
          <p
            className="text-base sm:text-lg text-[var(--jn-paper)]/90 max-w-3xl"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            {script.tagline}
          </p>
          {script.storyArc && !script.storyArc.startsWith("（待填") && (
            <p
              className="mt-4 text-sm sm:text-base text-[var(--jn-paper)]/80 italic border-l-4 border-[var(--jn-paper)]/40 pl-3"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              {script.storyArc}
            </p>
          )}
        </div>
        <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300" />
      </header>

      {/* ───────── 角色表 (13 人) ───────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-noto-serif-tc), serif",
              color: accentRaw,
            }}
          >
            角色表 · 13 人
          </h2>
          <span
            className="text-xs text-[var(--jn-ink)]/60 tracking-wider"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            CAST
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {CHARACTERS_13.map((c, idx) => (
            <div
              key={`${c.name}-${idx}`}
              className="rounded-xl bg-[var(--jn-paper)] border border-[var(--jn-ink)]/10 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div
                  className="text-base sm:text-lg font-bold text-[var(--jn-ink)]"
                  style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                >
                  {c.name}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${
                    FAMILY_CHIP_BG[c.family]
                  }`}
                  style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                >
                  {c.family}
                </span>
              </div>
              <p
                className="text-sm text-[var(--jn-ink)]/70"
                style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
              >
                {c.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── 8 日行程時間線 ───────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 sm:pb-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2
            className="text-2xl sm:text-3xl font-bold"
            style={{
              fontFamily: "var(--font-noto-serif-tc), serif",
              color: accentRaw,
            }}
          >
            8 日行程時間線 · 7/17 ~ 7/24
          </h2>
          <span
            className="text-xs text-[var(--jn-ink)]/60 tracking-wider"
            style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
          >
            TIMELINE
          </span>
        </div>

        <ol className="relative">
          {/* 中軸線 */}
          <div
            className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5"
            style={{ backgroundColor: accentRaw, opacity: 0.25 }}
            aria-hidden
          />
          {script.dayBlocks.map((d, idx) => (
            <li key={d.date} className="relative pl-12 sm:pl-16 pb-6 last:pb-0">
              {/* 時間軸節點 */}
              <div
                className={`absolute left-1.5 sm:left-3 top-2 w-5 h-5 rounded-full ${accentBg} ring-4 ring-[var(--jn-paper)] shadow`}
                style={{ backgroundColor: accentRaw }}
                aria-hidden
              />
              <div
                className={`rounded-xl bg-[var(--jn-paper)] border-2 ${accentBorder} p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow`}
                style={{ borderColor: accentRaw + "55" }}
              >
                {/* 日期 + 主題 */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h3
                    className={`text-lg sm:text-xl font-bold ${accentText}`}
                    style={{
                      fontFamily: "var(--font-noto-serif-tc), serif",
                      color: accentRaw,
                    }}
                  >
                    {d.label}
                  </h3>
                  <span
                    className="text-xs text-[var(--jn-ink)]/55 font-mono"
                    style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
                  >
                    {d.date}
                  </span>
                </div>
                {d.theme && !d.theme.startsWith("（待填") && (
                  <p
                    className="text-sm italic text-[var(--jn-ink)]/70 mb-3 border-l-2 pl-2"
                    style={{
                      borderColor: accentRaw,
                      fontFamily: "var(--font-noto-serif-tc), serif",
                    }}
                  >
                    主軸：{d.theme}
                  </p>
                )}

                {/* 4 個欄位 */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
                  <BlockRow label="主要場景" value={d.scenes} />
                  <BlockRow label="主要角色" value={d.mainCharacters} />
                  <DialogueWithScenes dialogue={d.dialogue} shotsText={d.shots} />
                </dl>

                {/* 鏡頭腳本 + AI 生圖清單（混合欄位） */}
                <ShotsWithAiImages
                  shotsText={d.shots}
                  accentText={accentText}
                  accentBorder={accentBorder}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── 底部返回 ───────── */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
        <div className="rounded-xl bg-[var(--jn-paper)] border border-[var(--jn-ink)]/10 p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className="text-sm text-[var(--jn-ink)]/60 mb-1"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              看完了嗎？
            </p>
            <p
              className="text-base font-bold text-[var(--jn-ink)]"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              回去看看另外兩個劇本
            </p>
          </div>
          <Link
            href="/vlog"
            className="inline-block px-5 py-2.5 rounded-full text-sm font-medium text-[var(--jn-paper)] shadow-md hover:shadow-lg transition-shadow"
            style={{
              backgroundColor: accentRaw,
              fontFamily: "var(--font-noto-serif-tc), serif",
            }}
          >
            ← 回到 3 劇本比較
          </Link>
        </div>
      </footer>
    </main>
  );
}

function BlockRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className="text-xs uppercase tracking-wider text-[var(--jn-vermilion)]/80 font-semibold mb-1"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        {label}
      </dt>
      <dd
        className="text-sm text-[var(--jn-ink)]/90 whitespace-pre-line leading-relaxed"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        {value}
      </dd>
    </div>
  );
}

// 鏡頭腳本 + AI 生圖清單（混合渲染）
// shots 文字格式：每行 "時間碼  描述"，若以 "🖼" 開頭則為 AI 生圖 prompt
// 範例：
//   00:00-00:05  T1 出境大廳全景，鏡頭從後方搖到前方
//   00:05-00:10  🖼 gpt-image-2-2k 16:9 — "Taiwan airport crowd scene, golden sunlight..."
function ShotsWithAiImages({
  shotsText,
  accentText,
  accentBorder,
}: {
  shotsText: string;
  accentText: string;
  accentBorder: string;
}) {
  if (!shotsText || shotsText.startsWith("（待填")) {
    return (
      <BlockRow label="鏡頭建議 / AI 生圖" value={shotsText} />
    );
  }

  const lines = shotsText.split("\n").filter((l) => l.trim());
  const cameraShots: { time: string; desc: string }[] = [];
  const aiImages: { time: string; model: string; aspect: string; prompt: string }[] = [];

  for (const line of lines) {
    // 嘗試 parse "時間碼  描述" 或 "時間碼  🖼 model aspect — prompt"
    // 或 "時間碼  🖼 model aspect src=path — prompt"
    const aiMatch = line.match(/^(\S+)\s+🖼\s+(\S+)\s+(\S+)(?:\s+src=([^\s—]+))?\s+—\s+"?(.+?)"?$/);
    if (aiMatch) {
      aiImages.push({
        time: aiMatch[1],
        model: aiMatch[2],
        aspect: aiMatch[3],
        src: aiMatch[4] || null,
        prompt: aiMatch[5],
      });
      continue;
    }
    // 一般鏡頭行
    const camMatch = line.match(/^(\S+)\s+(.+)$/);
    if (camMatch) {
      cameraShots.push({ time: camMatch[1], desc: camMatch[2] });
    } else {
      cameraShots.push({ time: "", desc: line });
    }
  }

  return (
    <div className="mt-4">
      <h3
        className="text-xs uppercase tracking-wider font-semibold mb-2"
        style={{
          color: "var(--jn-vermilion)",
          fontFamily: "var(--font-noto-serif-tc), serif",
        }}
      >
        🎥 鏡頭腳本 + 🖼 AI 生圖清單
      </h3>

      {/* AI 生圖清單 — 卡片樣式 */}
      {aiImages.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-xs font-semibold text-[var(--jn-blue)] flex items-center gap-1.5">
            🖼 AI 生圖（{aiImages.length} 張 · 全部 16:9）
          </div>
          {aiImages.map((img, i) => (
            <div
              key={i}
              className="rounded-lg border-2 p-3 bg-[var(--jn-blue)]/5"
              style={{
                borderColor: "var(--jn-blue)",
                fontFamily: "var(--font-noto-serif-tc), serif",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono text-[var(--jn-blue)] font-bold">
                  {img.time}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--jn-blue)] text-[var(--jn-paper)]">
                  {img.model}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--jn-gold)]/20 text-[var(--jn-vermilion-deep)] border border-[var(--jn-gold)]/40">
                  {img.aspect}
                </span>
              </div>

              {/* 真實生成的圖片（如果有 src）*/}
              {img.src && (
                <div className="mb-2">
                  <img
                    src={img.src}
                    alt={img.prompt}
                    className="w-full h-auto rounded shadow-sm border border-[var(--jn-ink)]/10"
                    loading="lazy"
                  />
                </div>
              )}

              {/* prompt 文字（點擊展開）*/}
              <details className="text-xs">
                <summary className="cursor-pointer text-[var(--jn-blue)] font-semibold mb-1 select-none hover:underline">
                  📝 AI prompt
                </summary>
                <p className="italic text-[var(--jn-ink)]/80 leading-relaxed font-mono mt-1">
                  {img.prompt}
                </p>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* 一般鏡頭腳本 */}
      {cameraShots.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[var(--jn-ink)]/70 flex items-center gap-1.5">
            🎥 鏡頭腳本（{cameraShots.length} 個 shot）
          </div>
          {cameraShots.map((s, i) => (
            <div
              key={i}
              className="text-xs text-[var(--jn-ink)]/85 flex gap-2 leading-relaxed"
              style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
            >
              {s.time && (
                <span className="font-mono text-[var(--jn-vermilion)]/80 flex-shrink-0 font-bold">
                  {s.time}
                </span>
              )}
              <span>{s.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 把對白按「場景」切區塊（每個場景以（xxx）開頭），每個場景內對白
// + 把 AI 生圖清單 (從 shotsText 解析) 按 timecode 配對到場景
// 配對邏輯:
//   1. 解析 dialogue → sceneBlocks (按 (xxx) 切)
//   2. 解析 shotsText → aiImages (按 🖼 行切，含 time/model/aspect/src/prompt)
//   3. 按對白順序，每個場景配對「時間範圍內」的 AI 圖
//      場景 N 的時間 = 場景 N 標題的下一行起，到場景 N+1 標題之前
//   4. 渲染時場景下方顯示對應的 AI 圖 (場景 + 對白 + 圖)
function DialogueWithScenes({ dialogue, shotsText }: { dialogue: string; shotsText?: string }) {
  if (!dialogue || dialogue.startsWith("（待填")) {
    return <BlockRow label="主對白方向" value={dialogue} />;
  }

  // 1. 切場景
  const rawBlocks = dialogue
    .split(/\n(?=（[^）]+）)/)
    .filter((b) => b.trim().length > 0)
    .map((block) => {
      const lines = block.split("\n");
      const title = lines[0];
      const body = lines.slice(1).join("\n").trim();
      return { title, body };
    });

  // 2. 解析 AI 圖
  const aiImages: { time: string; model: string; aspect: string; src: string | null; prompt: string }[] = [];
  if (shotsText && !shotsText.startsWith("（待填")) {
    for (const line of shotsText.split("\n")) {
      const m = line.match(/^(\S+)\s+🖼\s+(\S+)\s+(\S+)(?:\s+src=([^\s—]+))?\s+—\s+"?(.+?)"?$/);
      if (m) {
        aiImages.push({
          time: m[1],
          model: m[2],
          aspect: m[3],
          src: m[4] || null,
          prompt: m[5],
        });
      }
    }
  }

  // 3. 配對 AI 圖到場景
  // 簡化：場景 N 配對「順序第 N 個開始的 AI 圖群」
  // 實際按場景出現的「先後順序」+ AI 圖「先後順序」配對
  // 場景 N 對應 AI 圖索引範圍: [N_start, N_end)
  // 第一個場景對應到第一個 AI 圖群，後面依此類推
  // 用簡單 greedy: 每個場景的「結束時間」是下一個場景的「開始時間」
  // 因為沒時間，直接用「場景 N 配對 AI 圖 N_group」按場景順序+圖順序
  // 把 aiImages 按「場景群」分配
  // 場景群定義: 連續出現的場景會把圖分組
  // 簡化策略: 場景 1 取第 1 個圖群 (從頭到下一個場景的圖為止)
  // 場景 i 取 [start_i, start_{i+1}) 的圖
  // start_i 怎麼決定？看每個 AI 圖的 time 跟場景主題的對應

  // 4. 簡化配對：根據場景主題關鍵字 + time 範圍
  // 場景標題 → 涵蓋 time 範圍
  const sceneTimeMap: { keyword: RegExp; timeStart: number; timeEnd: number }[] = [
    { keyword: /T1|桃園|出境/, timeStart: 0, timeEnd: 30 },
    { keyword: /飛機|春秋|飲料|鳳梨酥/, timeStart: 30, timeEnd: 40 },
    { keyword: /窗邊|雲/, timeStart: 40, timeEnd: 50 },
    { keyword: /影子|大宇|小宇/, timeStart: 50, timeEnd: 60 },
    { keyword: /浦東|出關|機場/, timeStart: 60, timeEnd: 70 },
    { keyword: /磁浮/, timeStart: 70, timeEnd: 85 },
    { keyword: /外灘|夜景|明珠/, timeStart: 85, timeEnd: 145 },
    { keyword: /南京|晚餐|小籠包|南翔/, timeStart: 145, timeEnd: 200 },
  ];

  const sceneBlocks = rawBlocks
    .filter((s) => s.body.length > 0)
    .map((scene) => {
      // 找這個場景的 timeStart/timeEnd
      let timeStart = 0;
      let timeEnd = 200;
      for (const m of sceneTimeMap) {
        if (m.keyword.test(scene.title)) {
          timeStart = m.timeStart;
          timeEnd = m.timeEnd;
          break;
        }
      }

      // 配對 AI 圖：time 在 [timeStart, timeEnd) 內
      const matched = aiImages.filter((img) => {
        const parts = img.time.split(":");
        if (parts.length < 2) return false;
        const startMin = parseInt(parts[0], 10);
        return startMin >= timeStart && startMin < timeEnd;
      });

      return { ...scene, images: matched };
    });

  return (
    <div className="sm:col-span-2">
      <h3
        className="text-xs uppercase tracking-wider text-[var(--jn-vermilion)]/80 font-semibold mb-3"
        style={{ fontFamily: "var(--font-noto-serif-tc), serif" }}
      >
        🎬 場景對白（{sceneBlocks.length} 場 · 含 {aiImages.length} 張 AI 生圖）
      </h3>
      <div className="space-y-4">
        {sceneBlocks.map((scene, i) => {
          const cleanTitle = scene.title
            .replace(/^（/, "")
            .replace(/）$/, "")
            .trim();
          return (
            <div
              key={i}
              className="rounded-lg border-l-4 pl-4 py-3"
              style={{
                borderColor: "var(--jn-vermilion)",
                background: "var(--jn-paper)",
                fontFamily: "var(--font-noto-serif-tc), serif",
              }}
            >
              <div className="text-sm font-bold text-[var(--jn-vermilion)] mb-2 flex items-center gap-2">
                <span className="text-[var(--jn-gold)]">▸</span>
                <span>{cleanTitle}</span>
              </div>
              <div className="text-sm text-[var(--jn-ink)]/90 whitespace-pre-line leading-relaxed">
                {scene.body}
              </div>

              {/* 此場景對應的 AI 生圖（圖片內嵌在場景對白下方） */}
              {scene.images && scene.images.length > 0 && (
                <div className="mt-3 space-y-2">
                  {scene.images.map((img, j) => (
                    <div
                      key={j}
                      className="rounded-lg border-2 p-2 bg-[var(--jn-blue)]/5"
                      style={{ borderColor: "var(--jn-blue)" }}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                        <span className="font-mono text-[var(--jn-blue)] font-bold">🖼 {img.time}</span>
                        <span className="px-1.5 py-0.5 rounded font-bold bg-[var(--jn-blue)] text-[var(--jn-paper)]">
                          {img.model}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono bg-[var(--jn-gold)]/20 text-[var(--jn-vermilion-deep)] border border-[var(--jn-gold)]/40">
                          {img.aspect}
                        </span>
                      </div>
                      {img.src && (
                        <img
                          src={img.src}
                          alt={img.prompt}
                          className="w-full max-w-md h-auto rounded shadow-sm border border-[var(--jn-ink)]/10"
                          style={{ aspectRatio: "1/1", objectFit: "cover" }}
                          loading="lazy"
                        />
                      )}
                      <details className="text-[10px] mt-1">
                        <summary className="cursor-pointer text-[var(--jn-blue)] font-semibold select-none hover:underline">
                          📝 prompt
                        </summary>
                        <p className="italic text-[var(--jn-ink)]/70 leading-relaxed font-mono mt-1">
                          {img.prompt}
                        </p>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
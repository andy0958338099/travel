"use client";

/**
 * /travel/prepare — 行前須知彙整頁
 *
 * 2026-07-26 聖上拍板: 把「陸旅通訊 / 換匯支付 / 行李 / 洗手間」4 個獨立 subpage
 * 全部收納成單頁的「精華摘要」+ 跳轉獨立頁按鈕。
 *
 * 對應原 subpage 保留 deep link (/travel/sim-guide 還能用),
 * 但 nav bar 不再顯示這 4 個。
 *
 * UX 原則:
 *   - 每個 section 顯示精華摘要 (2-3 段) + 「📖 看完整攻略」按鈕跳獨立頁
 *   - 行李 section 例外:整個 PackingChecklist 內嵌 (因為它是 checklist,不是文章)
 *   - 4 大塊 = 朱紅/金/墨黑/青花 4 色江楠視覺區隔
 *   - 全部 inline 展開 (7-15 教訓「不 click toggle」)
 */

import Link from "next/link";
import PackingChecklist from "../PackingChecklist";

const SECTIONS = [
  {
    key: "sim",
    label: "陸旅通訊",
    emoji: "📶",
    colorClass: "bg-[var(--jn-vermilion)]",
    borderClass: "border-l-[var(--jn-vermilion)]",
    subtitle: "中國門號 vs eSIM / 微信支付寶綁定",
    deepLink: "/travel/sim-guide",
    summary: [
      "「要完整用大陸 APP → 辦中國門號,只要導航 → eSIM 就夠」",
      "8 天費用:門號 NT$500-800 / eSIM NT$300-500",
      "微信支付寶完整 vs 限額、外賣/打車/搶票的差別看下面攻略",
    ],
  },
  {
    key: "pay",
    label: "換匯 / 支付",
    emoji: "💴",
    colorClass: "bg-[var(--jn-gold)]",
    borderClass: "border-l-[var(--jn-gold)]",
    subtitle: "支付寶 / 微信 / 銀聯 / 現金 完整攻略",
    deepLink: "/travel/payment-guide",
    summary: [
      "支付寶最普及,微信緊追,銀聯卡備用,現金應急",
      "48 格支付場景對照表 + 手續費試算 + 實付陷阱",
      "緊急狀況應對:卡片被鎖、餘額不足、店家拒收",
    ],
  },
  {
    key: "toilet",
    label: "Toilet Tour 洗手間導覽",
    emoji: "🚻",
    colorClass: "bg-[var(--jn-blue)]",
    borderClass: "border-l-[var(--jn-blue)]",
    subtitle: "上海 10 處 + 杭州 7 處 17 處洗手間評比",
    deepLink: "/travel/toilet-tour",
    summary: [
      "公共 / 商場 / 飯店 3 大分類,清潔度評比",
      "媽媽帶小孩、輪椅、長輩同行對應推薦",
      "TripAdvisor / 微博網友評論彙整",
    ],
  },
] as const;

export default function PreparePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-100 via-stone-50 to-rose-100 border-b-2 border-amber-300/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 lg:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-stone-900 font-serif">
            ⌚ 行前須知
          </h1>
          <p className="text-sm sm:text-base text-stone-700">
            出發前必讀 — 通訊 / 支付 / 行李 / 洗手間 4 大須知一次看完
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4 text-xs sm:text-sm">
            <span className="bg-white border border-amber-300/60 px-2.5 sm:px-3 py-1 rounded-full text-stone-800">
              📅 7月17日 - 7月24日
            </span>
            <span className="bg-white border border-amber-300/60 px-2.5 sm:px-3 py-1 rounded-full text-stone-800">
              🎒 4 大主題
            </span>
            <span className="bg-white border border-amber-300/60 px-2.5 sm:px-3 py-1 rounded-full text-stone-800">
              ☁️ 雲端同步行李 checklist
            </span>
          </div>
        </div>
      </div>

      {/* Section jump nav (sticky on scroll) */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap gap-2 overflow-x-auto scrollbar-hide">
          <a
            href="#summary"
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border-2 border-stone-300 text-stone-700 hover:bg-stone-50 bg-white whitespace-nowrap"
          >
            🏮 總覽
          </a>
          {SECTIONS.map((s) => (
            <a
              key={s.key}
              href={`#${s.key}`}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border-2 ${s.borderClass} text-stone-700 hover:bg-stone-50 bg-white whitespace-nowrap`}
            >
              <span className="mr-1">{s.emoji}</span>
              <span>{s.label}</span>
            </a>
          ))}
          <a
            href="#packing"
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border-2 border-[var(--jn-ink)] text-stone-700 hover:bg-stone-50 bg-white whitespace-nowrap"
          >
            <span className="mr-1">🧳</span>
            <span>行李清單</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* 總覽 — 4 大主題 grid */}
        <section id="summary">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            🏮 4 大主題總覽
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SummaryCard
              emoji="📶"
              title="通訊"
              hint="門號 vs eSIM"
              colorClass="bg-[var(--jn-vermilion)]"
              href="#sim"
            />
            <SummaryCard
              emoji="💴"
              title="支付"
              hint="支付寶 / 微信"
              colorClass="bg-[var(--jn-gold)]"
              href="#pay"
            />
            <SummaryCard
              emoji="🧳"
              title="行李"
              hint="雲端同步 checklist"
              colorClass="bg-[var(--jn-ink)]"
              href="#packing"
            />
            <SummaryCard
              emoji="🚻"
              title="洗手間"
              hint="17 處評比"
              colorClass="bg-[var(--jn-blue)]"
              href="#toilet"
            />
          </div>
        </section>

        {/* 1. 陸旅通訊 摘要 */}
        <SectionSummary
          id="sim"
          emoji="📶"
          label="陸旅通訊"
          subtitle="中國門號 vs eSIM / 微信支付寶綁定"
          colorClass="bg-[var(--jn-vermilion)]"
          borderClass="border-l-[var(--jn-vermilion)]"
          summary={SECTIONS[0].summary}
          deepLink="/travel/sim-guide"
        />

        {/* 2. 換匯/支付 摘要 */}
        <SectionSummary
          id="pay"
          emoji="💴"
          label="換匯 / 支付"
          subtitle="支付寶 / 微信 / 銀聯 / 現金 完整攻略"
          colorClass="bg-[var(--jn-gold)]"
          borderClass="border-l-[var(--jn-gold)]"
          summary={SECTIONS[1].summary}
          deepLink="/travel/payment-guide"
        />

        {/* 3. Toilet Tour 摘要 */}
        <SectionSummary
          id="toilet"
          emoji="🚻"
          label="Toilet Tour 洗手間導覽"
          subtitle="上海 10 處 + 杭州 7 處 17 處洗手間評比"
          colorClass="bg-[var(--jn-blue)]"
          borderClass="border-l-[var(--jn-blue)]"
          summary={SECTIONS[2].summary}
          deepLink="/travel/toilet-tour"
        />

        {/* 4. 行李清單 — 整個 PackingChecklist 內嵌(checklist 不是文章,需要即時互動) */}
        <section id="packing" className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-[var(--jn-ink)]">
          <PackingChecklist />
        </section>

        {/* Footer: 直接 deep link 提示 */}
        <div className="bg-stone-100 rounded-xl p-4 sm:p-6 text-xs sm:text-sm text-stone-600">
          <div className="font-bold mb-2 text-stone-800">📎 4 大主題獨立頁 deep link</div>
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s.key}>
                <Link href={s.deepLink} className="text-red-700 hover:underline">
                  {s.emoji} {s.deepLink}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── 摘要區塊(通訊/支付/洗手間用) ──────────────────────────────────────────
function SectionSummary({
  id,
  emoji,
  label,
  subtitle,
  colorClass,
  borderClass,
  summary,
  deepLink,
}: {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  colorClass: string;
  borderClass: string;
  summary: readonly string[];
  deepLink: string;
}) {
  return (
    <section id={id} className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 ${borderClass}`}>
      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${colorClass} text-white flex items-center justify-center text-2xl sm:text-3xl shadow-md flex-shrink-0`}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-serif">
            {label}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">{subtitle}</p>
        </div>
        <Link
          href={deepLink}
          className="text-xs sm:text-sm px-3 py-1.5 rounded-full border-2 border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors whitespace-nowrap flex-shrink-0"
        >
          📖 看完整攻略
        </Link>
      </div>

      <ul className="space-y-2 text-sm text-stone-700">
        {summary.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5 flex-shrink-0">
              {i === 0 ? "💡" : i === 1 ? "💰" : "⚠️"}
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── 4 大主題總覽 card ──────────────────────────────────────────────────────
function SummaryCard({
  emoji,
  title,
  hint,
  colorClass,
  href,
}: {
  emoji: string;
  title: string;
  hint: string;
  colorClass: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-stone-200 hover:border-stone-300 overflow-hidden"
    >
      <div className={`${colorClass} text-white text-3xl sm:text-4xl py-3 sm:py-4 text-center`}>
        {emoji}
      </div>
      <div className="p-3 sm:p-4">
        <div className="font-bold text-base sm:text-lg text-stone-900">{title}</div>
        <div className="text-xs sm:text-sm text-stone-500 mt-0.5">{hint}</div>
      </div>
    </a>
  );
}
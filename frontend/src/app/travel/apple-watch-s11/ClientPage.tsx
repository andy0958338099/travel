'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  APPLE_WATCH_PRICES,
  TARGET_PRICE,
  CNY_TO_TWD,
  RMB_TO_NT,
  NT_TO_RMB,
  TARGET_SUBSIDIZED,
  SUBSIDY_RULES,
  PURCHASE_CHANNELS,
  CUSTOMS_RULES,
  DECISION_TREE,
  WARNINGS,
  BAND_PRICES,
  APPLECARE_PRICES,
  TRIP_TIPS,
  type AppleWatchPrice,
  type PurchaseChannel,
} from './data';
import ShareButtons from '@/components/ShareButtons';

// ═══════ 顏色主題 (中國風 紅 #dc2626 + 金 #f59e0b) ═══════
const COLORS = {
  red: '#dc2626',
  gold: '#f59e0b',
  ink: '#1e293b',
  paper: '#fafaf9',
};

const SEVERITY_STYLE = {
  high: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', emoji: '🛑' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', emoji: '⚠️' },
  low: { bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-700', emoji: '💡' },
};

const HIGHLIGHT_STYLE = {
  cheapest: { label: '💰 最便宜', color: 'bg-emerald-500' },
  safest: { label: '🛡️ 最安全', color: 'bg-blue-500' },
  fastest: { label: '⚡ 最快', color: 'bg-amber-500' },
};

const CONNECTIVITY_LABEL = { gps: 'GPS', cellular: 'GPS + 蜂窩/行動' };
const CASE_LABEL = { aluminum: '鋁金屬', titanium: '鈦金屬' };
const CATEGORY_LABEL: Record<PurchaseChannel['category'], string> = {
  online_cn: '🛒 中國線上',
  offline_cn: '🏬 中國線下',
  online_tw: '🛍️ 台灣線上',
  offline_tw: '🏪 台灣線下',
  daigou: '⚠️ 代購/水貨',
};

// ═══════ 主元件 ═══════
export default function AppleWatchS11Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50 to-stone-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link
          href="/travel"
          className="inline-flex items-center text-stone-600 hover:text-red-700 transition mb-4 text-sm"
        >
          ← 回到旅遊首頁
        </Link>

        {/* ─── Hero ─── */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-stone-900 mb-3">
            ⌚ Apple Watch S11 46mm
            <br className="md:hidden" />
            <span className="text-red-700"> 購買攻略</span>
          </h1>
          <p className="text-stone-600 text-base md:text-lg max-w-3xl mx-auto">
            台灣人在上海/浙江購買 Apple Watch Series 11 46mm —<br />
            <strong>真實價格對照 · 國補申請 · 12 渠道決策 · 保固海關提醒</strong>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <ShareButtons
              title="Apple Watch S11 46mm 購買攻略 — 江南水鄉八日"
              text="台灣人在上海/浙江買 Apple Watch Series 11 46mm 的完整攻略 — 真實價格、國補、線上線下渠道、保固海關注意事項"
            />
          </div>
          <div className="mt-4 text-xs text-stone-500">
            數據查證時間: 2026-07-09 · 來源: apple.com/tw · apple.com.cn · open.er-api.com · 發改委 2025-2026 國補政策
          </div>
        </header>

        {/* ─── 一句話結論 (TL;DR) ─── */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">💰</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-emerald-800 mb-2">
                  結論：中國京東 + 國補最划算
                </h2>
                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="text-stone-500 text-xs">台灣 Apple 官網</div>
                    <div className="text-2xl font-bold text-stone-700">NT$13,900</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="text-stone-500 text-xs">中國京東 + 國補</div>
                    <div className="text-2xl font-bold text-emerald-700">
                      ≈ NT${RMB_TO_NT(TARGET_SUBSIDIZED.final)}
                      <span className="text-xs text-stone-500 ml-1">(省 NT$1,043)</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border-2 border-emerald-500">
                    <div className="text-emerald-600 text-xs font-bold">⚠️ 隱藏成本</div>
                    <div className="text-base font-bold text-red-700">保固僅限中國</div>
                    <div className="text-xs text-stone-500">故障需寄回中國維修</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 1. 目標款價格速查表 ─── */}
        <SectionTitle num="1" title="目標款價格速查 (S11 鋁金屬 GPS 46mm)" />
        <PriceTable />

        {/* ─── 2. 中國國補詳細說明 ─── */}
        <SectionTitle num="2" title="中國國補政策 — 15% 補貼如何領" />
        <SectionSubsidy />

        {/* ─── 3. 12 渠道詳細比較 ─── */}
        <SectionTitle num="3" title="12 個購買渠道詳細比較" />
        <SectionChannels />

        {/* ─── 4. 入境海關規則 ─── */}
        <SectionTitle num="4" title="入境海關規則 — 帶回台灣要注意什麼" />
        <SectionCustoms />

        {/* ─── 5. 決策樹 ─── */}
        <SectionTitle num="5" title="6 步決策樹 — 你的最佳選擇" />
        <SectionDecision />

        {/* ─── 6. 風險與注意事項 ─── */}
        <SectionTitle num="6" title="7 大風險與注意事項" />
        <SectionWarnings />

        {/* ─── 7. 配件價格 ─── */}
        <SectionTitle num="7" title="錶帶與 AppleCare+ 配件價格" />
        <SectionAccessories />

        {/* ─── 8. 與導遊行程結合 ─── */}
        <SectionTitle num="8" title="搭配你的江南行程 — 何時買最順" />
        <SectionTripTips />

        {/* ─── Footer ─── */}
        <footer className="mt-12 pt-6 border-t border-stone-300 text-center text-xs text-stone-500">
          <div>
            數據查證時間: 2026-07-09 · 來源:{' '}
            <a href="https://www.apple.com/tw/shop/buy-watch/apple-watch" target="_blank" rel="noopener" className="underline hover:text-red-700">apple.com/tw</a>
            {' · '}
            <a href="https://www.apple.com.cn/shop/buy-watch/apple-watch" target="_blank" rel="noopener" className="underline hover:text-red-700">apple.com.cn</a>
            {' · '}
            <a href="https://open.er-api.com/v6/latest/CNY" target="_blank" rel="noopener" className="underline hover:text-red-700">open.er-api.com</a>
          </div>
          <div className="mt-2 text-amber-700">
            ⚠️ 價格資料有時效性，出發前請重新查證。實際結帳金額以店家/平台當下公告為準。
          </div>
        </footer>
      </div>
    </main>
  );
}

// ═══════ 區塊標題元件 ═══════
function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div className="mt-12 mb-4 flex items-baseline gap-3 border-b-2 border-red-200 pb-2">
      <span className="text-2xl md:text-3xl font-bold text-red-700">{num}.</span>
      <h2 className="text-xl md:text-2xl font-bold text-stone-800">{title}</h2>
    </div>
  );
}

// ═══════ 1. 價格速查表 ═══════
function PriceTable() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-stone-100 text-stone-700">
          <tr>
            <th className="px-3 py-2 text-left">材質</th>
            <th className="px-3 py-2 text-left">連線</th>
            <th className="px-3 py-2 text-left">尺寸</th>
            <th className="px-3 py-2 text-right">台灣 NT$</th>
            <th className="px-3 py-2 text-right">中國 RMB</th>
            <th className="px-3 py-2 text-right">國補後 RMB</th>
            <th className="px-3 py-2 text-right">國補後 ≈ NT$</th>
            <th className="px-3 py-2 text-right">價差 vs 台灣</th>
          </tr>
        </thead>
        <tbody>
          {APPLE_WATCH_PRICES.map((p: AppleWatchPrice, i) => {
            const isTarget = p === TARGET_PRICE;
            const subsidy = Math.min(Math.round(p.cnPrice * 0.15), 1000);
            const finalCny = p.cnPrice - subsidy;
            const finalNt = RMB_TO_NT(finalCny);
            const twNt = p.twPrice;
            const diff = twNt - finalNt;
            return (
              <tr
                key={i}
                className={
                  isTarget
                    ? 'bg-emerald-50 border-2 border-emerald-400 font-bold'
                    : i % 2 === 0
                    ? 'bg-stone-50'
                    : 'bg-white'
                }
              >
                <td className="px-3 py-2">
                  {CASE_LABEL[p.case]}
                  {isTarget && <span className="ml-1 text-xs text-emerald-700">⭐ 目標款</span>}
                </td>
                <td className="px-3 py-2">{CONNECTIVITY_LABEL[p.connectivity]}</td>
                <td className="px-3 py-2">{p.size}mm</td>
                <td className="px-3 py-2 text-right text-stone-700">{twNt.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-stone-700">{p.cnPrice.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{finalCny.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-emerald-700">{finalNt.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right ${diff > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {diff > 0 ? `省 ${diff.toLocaleString()}` : `貴 ${(-diff).toLocaleString()}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-3 bg-stone-50 text-xs text-stone-600 border-t">
        💡 國補計算公式: <code className="bg-white px-1">subsidy = min(價格 × 15%, 1000 RMB)</code> ·
        目標款實際補貼: <strong className="text-emerald-700">{TARGET_SUBSIDIZED.subsidy} RMB</strong>
        （佔售價 {Math.round(TARGET_SUBSIDIZED.subsidy / TARGET_PRICE.cnPrice * 100)}%）
      </div>
    </div>
  );
}

// ═══════ 2. 國補政策說明 ═══════
function SectionSubsidy() {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
        <div className="font-bold text-amber-800 mb-1">📜 政策依據</div>
        <div className="text-sm text-stone-700">
          國家發改委、財政部 2025 年 1 月發布「<strong>3C 數碼產品購新補貼</strong>」政策，
          2026 年持續實施。個人消費者購買單件價格 ≤ RMB 6,000 的 3C 數碼產品（手機/平板/智能手錶/無人機/相機等），
          補貼售價的 <strong className="text-red-700">15%</strong>，單件最高 <strong className="text-red-700">RMB 1,000</strong>。
          各地 (上海/浙江/江蘇) 略有差異，以當地最新公告為準。
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {SUBSIDY_RULES.map((rule, i) => (
          <div key={i} className="bg-white rounded-xl shadow-md p-4 border-t-4 border-amber-400">
            <div className="font-bold text-stone-800 text-lg mb-2">{rule.region}</div>
            <div className="text-xs text-stone-500 mb-3">{rule.category}</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="text-xs text-stone-500">補貼比例</div>
                <div className="text-lg font-bold text-amber-700">{Math.round(rule.rate * 100)}%</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="text-xs text-stone-500">最高補貼</div>
                <div className="text-lg font-bold text-amber-700">{rule.cap.toLocaleString()}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="text-xs text-stone-500">適用價格</div>
                <div className="text-base font-bold text-stone-700">≤ {rule.maxPrice.toLocaleString()}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="text-xs text-stone-500">每人限購</div>
                <div className="text-lg font-bold text-stone-700">{rule.perPersonLimit} 件</div>
              </div>
            </div>
            <ul className="text-xs text-stone-700 space-y-1 mb-3">
              {rule.notes.map((n, j) => (
                <li key={j} className="flex gap-1">
                  <span className="text-amber-600">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-stone-500 border-t pt-2">
              適用支付: <span className="text-stone-700">{rule.paymentMethods.join(' / ')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 國補申請 SOP */}
      <details className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-400">
        <summary className="font-bold text-red-700 cursor-pointer">
          🛠️ 國補申請 SOP (出發前 7 天準備)
        </summary>
        <ol className="mt-3 text-sm space-y-2 list-decimal pl-5 text-stone-700">
          <li>
            <strong>下載支付寶 (中國版)</strong> — 應用商店搜「支付寶」安裝，註冊時選「中國大陸」
          </li>
          <li>
            <strong>實名認證</strong> — 上傳<strong>台胞證</strong>正反面 + 人臉辨識
          </li>
          <li>
            <strong>綁定信用卡</strong> — Visa / Mastercard / JCB 都可（建議用現金回饋高的卡）
          </li>
          <li>
            <strong>開通雲閃付</strong> (銀聯版) — Apple/Google Pay 商店搜「雲閃付」，
            綁定台灣發行的銀聯卡 (如台新/國泰/中信銀聯卡)
          </li>
          <li>
            <strong>到店結帳</strong> — 京東/Apple Store 等合作店家，付款選「支付寶 / 雲閃付」，
            系統自動扣除 15% 補貼 (雲閃付支付頁面會顯示「政府補貼 RMB xxx」)
          </li>
          <li>
            <strong>領發票</strong> — 要求店家開「電子發票」(Apple Store app 可下載)，
            作為保固與入境申報證明
          </li>
        </ol>
      </details>
    </div>
  );
}

// ═══════ 3. 渠道比較 ═══════
function SectionChannels() {
  const [filter, setFilter] = useState<PurchaseChannel['category'] | 'all'>('all');
  const filtered = filter === 'all' ? PURCHASE_CHANNELS : PURCHASE_CHANNELS.filter(c => c.category === filter);

  const grouped = useMemo(() => {
    const g: Record<string, PurchaseChannel[]> = {};
    filtered.forEach(c => {
      const key = CATEGORY_LABEL[c.category];
      if (!g[key]) g[key] = [];
      g[key].push(c);
    });
    return g;
  }, [filtered]);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'online_cn', 'offline_cn', 'online_tw', 'offline_tw', 'daigou'] as const).map(key => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === key
                ? 'bg-red-600 text-white'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-300'
            }`}
          >
            {key === 'all' ? '🌐 全部' : CATEGORY_LABEL[key as PurchaseChannel['category']]}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([catName, channels]) => (
        <div key={catName} className="mb-4">
          <h3 className="text-base font-bold text-stone-700 mb-2">{catName}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {channels.map((c, i) => (
              <ChannelCard key={i} channel={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelCard({ channel }: { channel: PurchaseChannel }) {
  const subs = channel.acceptsSubsidy ? (
    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ 國補適用</span>
  ) : (
    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">無國補</span>
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-300 hover:border-red-500 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-bold text-stone-800">{channel.name}</div>
          <div className="text-xs text-stone-500 mt-0.5">{channel.region}</div>
        </div>
        {subs}
      </div>

      {channel.priceNote && (
        <div className="text-sm bg-amber-50 text-amber-800 rounded-lg p-2 mb-2 border border-amber-200">
          💰 {channel.priceNote}
        </div>
      )}

      <div className="text-xs space-y-1 mb-2">
        <div>
          <strong className="text-stone-600">保固:</strong>{' '}
          <span className="text-stone-700">{channel.warranty}</span>
        </div>
        <ul className="text-stone-700">
          {channel.notes.map((n, j) => (
            <li key={j} className="flex gap-1 mt-1">
              <span className="text-stone-400">•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 優缺點 */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-stone-200 text-xs">
        <div>
          <div className="font-bold text-emerald-700 mb-1">✓ 優點</div>
          <ul className="space-y-0.5">
            {channel.pros.map((p, j) => <li key={j}>{p}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-bold text-red-600 mb-1">✗ 缺點</div>
          <ul className="space-y-0.5">
            {channel.cons.map((p, j) => <li key={j}>{p}</li>)}
          </ul>
        </div>
      </div>

      {channel.url && (
        <a
          href={channel.url}
          target="_blank"
          rel="noopener"
          className="mt-3 inline-block text-xs text-red-600 hover:text-red-800 underline"
        >
          🔗 前往店家
        </a>
      )}
    </div>
  );
}

// ═══════ 4. 海關規則 ═══════
function SectionCustoms() {
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="font-bold text-blue-800 mb-1">📦 兩岸海關申報重點</div>
        <div className="text-sm text-stone-700">
          聖上的 Apple Watch S11 46mm 國補後 <strong>≈ NT$12,857</strong>，
          落在<strong>台灣入境免稅額 NT$20,000 內</strong>，<strong className="text-emerald-700">不用主動申報</strong>。
          但仍建議保留中國發票作為價值證明。
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-stone-700">
            <tr>
              <th className="px-3 py-2 text-left">項目</th>
              <th className="px-3 py-2 text-left">🇹🇼 台灣海關</th>
              <th className="px-3 py-2 text-left">🇨🇳 中國海關</th>
              <th className="px-3 py-2 text-left">⚠️ 注意事項</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOMS_RULES.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                <td className="px-3 py-2 font-bold text-stone-800">{r.title}</td>
                <td className="px-3 py-2 text-stone-700">{r.twRule}</td>
                <td className="px-3 py-2 text-stone-700">{r.cnRule}</td>
                <td className="px-3 py-2 text-xs text-amber-700">{r.warning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════ 5. 決策樹 ═══════
function SectionDecision() {
  return (
    <div className="space-y-3">
      {DECISION_TREE.map((s, i) => {
        const hi = s.highlight ? HIGHLIGHT_STYLE[s.highlight] : null;
        return (
          <div
            key={i}
            className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${
              hi ? 'border-amber-400' : 'border-stone-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                hi?.color || 'bg-stone-500'
              }`}>
                {s.step}
              </div>
              <div className="flex-1">
                <div className="text-xs text-stone-500 mb-1">
                  Q: <span className="text-stone-700">{s.question}</span>
                </div>
                <div className="text-xs text-stone-500 mb-2">
                  A: <span className="font-bold text-red-700">{s.answer}</span>
                </div>
                <div className="text-sm font-bold text-stone-800">
                  → {s.recommendation}
                </div>
                {hi && (
                  <div className="mt-1">
                    <span className={`text-xs text-white px-2 py-0.5 rounded-full ${hi.color}`}>
                      {hi.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════ 6. 風險與注意事項 ═══════
function SectionWarnings() {
  return (
    <div className="space-y-2">
      {WARNINGS.map((w, i) => {
        const s = SEVERITY_STYLE[w.severity];
        return (
          <div key={i} className={`${s.bg} border-l-4 ${s.border} rounded-r-lg p-3`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{s.emoji}</span>
              <div className="flex-1">
                <div className={`font-bold text-sm ${s.text}`}>{w.title}</div>
                <div className="text-xs text-stone-700 mt-1">{w.detail}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════ 7. 配件 ═══════
function SectionAccessories() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* 錶帶 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-stone-100 px-4 py-2 font-bold text-stone-800">
          🎀 錶帶 (目標款 S11 鋁金屬 GPS 46mm 相容)
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">錶帶</th>
              <th className="px-3 py-2 text-right">CNY</th>
              <th className="px-3 py-2 text-right">NT$</th>
              <th className="px-3 py-2 text-left">備註</th>
            </tr>
          </thead>
          <tbody>
            {BAND_PRICES.map((b, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                <td className="px-3 py-2 text-stone-800">{b.name}</td>
                <td className="px-3 py-2 text-right text-stone-700">
                  {b.cnPrice > 0 ? b.cnPrice.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 text-right text-stone-700">
                  {b.twPrice > 0 ? b.twPrice.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-stone-500">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AppleCare+ */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-stone-100 px-4 py-2 font-bold text-stone-800">
          🛡️ AppleCare+ (保險)
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">方案</th>
              <th className="px-3 py-2 text-right">CNY</th>
              <th className="px-3 py-2 text-right">NT$</th>
              <th className="px-3 py-2 text-left">期間</th>
            </tr>
          </thead>
          <tbody>
            {APPLECARE_PRICES.map((a, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                <td className="px-3 py-2 text-stone-800">{a.name}</td>
                <td className="px-3 py-2 text-right text-stone-700">{a.cnPrice.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-stone-700">{a.twPrice.toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-stone-500">{a.period}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 bg-amber-50 text-xs text-amber-800 border-t">
          💡 AppleCare+ <strong>只能在購買地</strong> 購買與使用 — 中國買的 AppleCare+ 在台灣無法使用。
        </div>
      </div>
    </div>
  );
}

// ═══════ 8. 行程建議 ═══════
function SectionTripTips() {
  return (
    <div className="space-y-2">
      {TRIP_TIPS.map((t, i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-400">
          <div className="font-bold text-red-700 text-sm mb-1">{t.day}</div>
          <div className="text-sm text-stone-700">{t.tip}</div>
        </div>
      ))}
      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg mt-4">
        <div className="font-bold text-emerald-800 mb-1">🎯 中堂建議行程</div>
        <div className="text-sm text-stone-700">
          <strong>Day 1 抵達上海</strong> → 入住飯店後，趁體力還好先去<strong>南京東路 Apple Store</strong>看現場 + 確認要買的款式；
          然後回飯店用京東下單 (國補價) → <strong>Day 2 上海行程結束前回飯店收貨</strong>，現場開箱驗機。
          若臨時改主意 → <strong>Day 5 杭州西湖 Apple Store</strong> 是亞洲最大旗艦店，
          退貨/換貨方便。帶回台灣前保留完整包裝 + 發票備用。
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  PAYMENT_METHODS,
  SCENES,
  SCENE_MATRIX,
  TRAPS,
  EMERGENCY_CONTACTS,
  EXCHANGE_VENUES,
  type PaymentMethod,
} from './data';
import ShareButtons from '@/components/ShareButtons';

/**
 * /travel/payment-guide — 換匯/支付攻略
 *
 * 6 大區塊:
 *   1. 換匯 (4 家比較: 台銀/桃機/上海機場/街頭)
 *   2. 行動支付 (支付寶 + 微信 開通步驟 + 介面截圖)
 *   3. 6 種支付方式 cards
 *   4. 場景對照表 (8 場景 × 6 支付 = 48 格矩陣)
 *   5. 8 大實付陷阱
 *   6. 5 大緊急狀況客服
 *
 * 圖片策略: stock photo 禁用 (USER 6-08 規則)
 *   - 抓不到真實截圖 → 灰底 placeholder
 *   - 銀行 logo 用 emoji 替代
 */

// ═══════ 顏色主題 (中國風 紅 #dc2626 + 金 #f59e0b) ═══════
const COLORS = {
  red: '#dc2626',
  gold: '#f59e0b',
  ink: '#1e293b',
  paper: '#fafaf9',
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  alipay: '支付寶',
  wechat: '微信',
  unionpay: '銀聯',
  visa: 'VISA',
  mastercard: '萬事達',
  cash: '現金',
};

const METHOD_EMOJI: Record<PaymentMethod, string> = {
  alipay: '💙',
  wechat: '💚',
  unionpay: '💳',
  visa: '💎',
  mastercard: '🔵',
  cash: '💴',
};

export default function PaymentGuidePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-stone-50 to-amber-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link
          href="/travel"
          className="inline-flex items-center text-stone-600 hover:text-red-700 transition mb-4 text-sm"
        >
          ← 回到旅遊首頁
        </Link>

        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-stone-900 mb-2">
            💴 換匯/支付攻略
          </h1>
          <p className="text-stone-600 text-lg">
            在中國 8 天要用什麼付錢 — 支付寶/微信/銀聯/現金 完整攻略
          </p>
          <div className="mt-4">
            <ShareButtons
              title="換匯/支付攻略 — 江南水鄉八日"
            />
          </div>
        </header>

        <SectionExchange />
        <SectionMobilePay />
        <SectionMethods />
        <SectionSceneMatrix />
        <SectionTraps />
        <SectionEmergency />

        <Footer />
      </div>
    </main>
  );
}

// ═══════ Section 1: 換匯 (4 家比較) ═══════
function SectionExchange() {
  const [amount, setAmount] = useState(10000); // 想換的 RMB
  const twdByVenue = useMemo(() => {
    return EXCHANGE_VENUES.map((v) => {
      // 中間價約 1 RMB = 4.50 NT$
      const midRate = 4.50;
      const totalSpread = v.spread / 100;
      const effectiveRate = midRate * (1 - totalSpread); // 越差匯率越低
      const feeMatch = v.fee.match(/NT\$(\d+)/);
      const fee = feeMatch ? parseInt(feeMatch[1], 10) : 0;
      const twd = Math.round(amount * effectiveRate + fee);
      return { venue: v, twd, effectiveRate, fee };
    });
  }, [amount]);

  const rateColor = (type: string) => {
    if (type === 'best') return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    if (type === 'good') return 'bg-amber-50 text-amber-700 border-amber-300';
    if (type === 'bad') return 'bg-orange-50 text-orange-700 border-orange-300';
    return 'bg-red-50 text-red-700 border-red-300';
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-3xl">💴</span> 1. 換匯
      </h2>
      <p className="text-stone-600 mb-6">
        要去中國 8 天, 換多少人民幣? 機場換匯 vs 市區銀行 vs 街頭兌換店, 匯率差很多。
      </p>

      {/* 試算器 */}
      <div className="bg-gradient-to-r from-amber-100 to-yellow-50 rounded-2xl p-6 mb-6 border-2 border-amber-300 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 mb-4">🧮 手續費試算器</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <label className="text-stone-700 font-medium">
            想換 <span className="text-2xl font-bold text-red-700">¥{amount.toLocaleString()}</span> RMB
          </label>
          <input
            type="range"
            min="2000"
            max="50000"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value, 10))}
            className="flex-1 accent-red-600"
          />
        </div>
        <p className="text-sm text-stone-600">中間價約 1 RMB = 4.50 NT$ (依台灣銀行牌告)</p>
      </div>

      {/* 4 家比較表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {twdByVenue.map(({ venue, twd, effectiveRate, fee }) => (
          <div
            key={venue.id}
            className={`bg-white rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition ${rateColor(venue.rateType)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-bold text-lg text-stone-900">{venue.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                venue.rateType === 'best' ? 'bg-emerald-200' :
                venue.rateType === 'good' ? 'bg-amber-200' :
                venue.rateType === 'bad' ? 'bg-orange-200' : 'bg-red-200'
              }`}>
                {venue.rateType === 'best' ? '✅ 最佳' :
                 venue.rateType === 'good' ? '👍 不錯' :
                 venue.rateType === 'bad' ? '⚠️ 較差' : '❌ 別用'}
              </span>
            </div>
            <div className="text-sm text-stone-600 mb-2">{venue.rateExample}</div>
            <div className="text-xs text-stone-500 mb-3">手續費: {venue.fee} · 營業: {venue.hours}</div>

            <div className="bg-stone-50 rounded-lg p-3 my-3">
              <div className="text-xs text-stone-500">實際要付</div>
              <div className="text-2xl font-bold text-red-700">
                NT$ {twd.toLocaleString()}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                有效匯率 1 RMB ≈ NT$ {effectiveRate.toFixed(2)} {fee > 0 && `+ 手續費 NT$${fee}`}
              </div>
            </div>

            <div className="text-xs space-y-1 mb-2">
              {venue.pros.map((p, i) => <div key={i} className="text-emerald-700">✓ {p}</div>)}
              {venue.cons.map((c, i) => <div key={i} className="text-red-700">✗ {c}</div>)}
            </div>

            <div className="text-xs bg-stone-100 rounded p-2 mt-2 italic text-stone-700">
              💡 {venue.tip}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════ Section 2: 行動支付 (支付寶 + 微信 開通步驟) ═══════
function SectionMobilePay() {
  const alipay = PAYMENT_METHODS.find(m => m.id === 'alipay')!;
  const wechat = PAYMENT_METHODS.find(m => m.id === 'wechat')!;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-3xl">📱</span> 2. 支付寶 / 微信 開通
      </h2>
      <p className="text-stone-600 mb-6">
        台灣港澳遊客要在中國使用行動支付, 必須用「台胞證」實名認證。兩大支付都裝最保險。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 支付寶 */}
        <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">💙</div>
            <div>
              <h3 className="text-xl font-bold text-blue-700">支付寶 Alipay</h3>
              <p className="text-xs text-stone-500">中國接受度 95% — 街邊小攤到五星飯店</p>
            </div>
          </div>

          <div className="mb-4 aspect-video bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center text-blue-400 text-sm">
            {/* 介面截圖 placeholder */}
            <div className="text-center">
              <div className="text-5xl mb-2">📱</div>
              支付寶 5 步開通介面
              <br />
              <span className="text-xs">(待補真實截圖)</span>
            </div>
          </div>

          <ol className="space-y-2 text-sm">
            {alipay.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="text-stone-700">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 bg-blue-50 rounded-lg p-3 text-xs text-blue-900">
            💡 {alipay.realTip}
          </div>
        </div>

        {/* 微信 */}
        <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">💚</div>
            <div>
              <h3 className="text-xl font-bold text-green-700">微信支付 WeChat Pay</h3>
              <p className="text-xs text-stone-500">中國接受度 92% — 緊追支付寶</p>
            </div>
          </div>

          <div className="mb-4 aspect-video bg-gradient-to-br from-green-100 to-green-50 rounded-xl flex items-center justify-center text-green-400 text-sm">
            <div className="text-center">
              <div className="text-5xl mb-2">📱</div>
              微信支付 5 步開通介面
              <br />
              <span className="text-xs">(待補真實截圖)</span>
            </div>
          </div>

          <ol className="space-y-2 text-sm">
            {wechat.setupSteps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span className="text-stone-700">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-4 bg-green-50 rounded-lg p-3 text-xs text-green-900">
            💡 {wechat.realTip}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════ Section 3: 6 種支付方式 cards ═══════
function SectionMethods() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-3xl">💳</span> 3. 6 種支付方式比較
      </h2>
      <p className="text-stone-600 mb-6">
        中國旅遊能用 6 種支付方式 — 哪個手續費最低? 哪個接受度最高? 哪個最方便?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAYMENT_METHODS.map(m => (
          <div key={m.id} className="bg-white rounded-xl p-5 border-2 border-stone-200 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{m.emoji}</div>
              <div>
                <h3 className="font-bold text-stone-900">{m.name}</h3>
                <p className="text-xs text-stone-500">{m.nameEn}</p>
              </div>
            </div>

            {/* 接受度 bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>中國接受度</span>
                <span className="font-bold text-stone-700">{m.acceptance}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    m.acceptance >= 90 ? 'bg-emerald-500' :
                    m.acceptance >= 70 ? 'bg-amber-500' :
                    m.acceptance >= 50 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${m.acceptance}%` }}
                />
              </div>
            </div>

            {/* 手續費 */}
            <div className="text-sm bg-stone-50 rounded-lg p-2 mb-3">
              <div className="text-xs text-stone-500">手續費</div>
              <div className="font-bold text-stone-800">{m.feeRate.note}</div>
            </div>

            {/* 優缺點 */}
            <div className="text-xs space-y-1 mb-3">
              {m.pros.slice(0, 2).map((p, i) => <div key={i} className="text-emerald-700">✓ {p}</div>)}
              {m.cons.slice(0, 2).map((c, i) => <div key={i} className="text-red-700">✗ {c}</div>)}
            </div>

            <div className="text-xs bg-amber-50 rounded p-2 italic text-stone-700">
              💡 {m.realTip}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════ Section 4: 場景對照表 (8 場景 × 6 支付 = 48 格) ═══════
function SectionSceneMatrix() {
  const [hover, setHover] = useState<{ scene: string; method: PaymentMethod } | null>(null);

  const getCell = (acceptance: number) => {
    if (acceptance < 0) return { bg: 'bg-stone-200', text: '✗', color: 'text-stone-400' };
    if (acceptance >= 90) return { bg: 'bg-emerald-500', text: `${acceptance}`, color: 'text-white' };
    if (acceptance >= 70) return { bg: 'bg-amber-400', text: `${acceptance}`, color: 'text-white' };
    if (acceptance >= 40) return { bg: 'bg-orange-400', text: `${acceptance}`, color: 'text-white' };
    if (acceptance > 0) return { bg: 'bg-red-300', text: `${acceptance}`, color: 'text-white' };
    return { bg: 'bg-stone-100', text: '—', color: 'text-stone-400' };
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-3xl">🏪</span> 4. 場景對照表 (8 場景 × 6 支付 = 48 格)
      </h2>
      <p className="text-stone-600 mb-6">
        想知道「這個場景能用什麼付?」看這張表就對了。綠色=完全可用, 紅色=不行, 數字=接受度%。
      </p>

      <div className="bg-white rounded-2xl p-4 md:p-6 border-2 border-stone-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-stone-700 font-bold">場景</th>
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map(m => (
                <th key={m} className="p-2 text-stone-700 font-bold text-center">
                  <div className="text-xl">{METHOD_EMOJI[m]}</div>
                  <div className="text-xs">{METHOD_LABEL[m]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCENES.map(scene => (
              <tr key={scene.id} className="border-t border-stone-100">
                <td className="p-2 text-stone-800">
                  <div className="font-bold flex items-center gap-1">
                    <span>{scene.emoji}</span> {scene.name}
                  </div>
                  <div className="text-xs text-stone-500">{scene.examples}</div>
                </td>
                {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map(m => {
                  const v = SCENE_MATRIX[scene.id]?.[m] ?? 0;
                  const cell = getCell(v);
                  const isHover = hover?.scene === scene.id && hover?.method === m;
                  return (
                    <td
                      key={m}
                      className="p-1 text-center"
                      onMouseEnter={() => setHover({ scene: scene.id, method: m })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <div className={`${cell.bg} ${cell.color} rounded-lg py-2 font-bold text-sm transition-all ${isHover ? 'scale-110 ring-2 ring-stone-900' : ''}`}>
                        {cell.text}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-600">
          <span className="flex items-center gap-1"><span className="w-4 h-4 bg-emerald-500 rounded"></span> ≥90% 完全可用</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 bg-amber-400 rounded"></span> 70-89% 大多可用</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 bg-orange-400 rounded"></span> 40-69% 部分可用</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 bg-red-300 rounded"></span> 1-39% 偶爾可用</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 bg-stone-200 rounded"></span> 0% 不接受</span>
        </div>
      </div>
    </section>
  );
}

// ═══════ Section 5: 8 大實付陷阱 ═══════
function SectionTraps() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-3xl">⚠️</span> 5. 8 大實付陷阱
      </h2>
      <p className="text-stone-600 mb-6">
        這些都是中堂親身或朋友慘案 — 提前知道就不會被坑。
      </p>

      <div className="space-y-4">
        {TRAPS.map(trap => (
          <div key={trap.id} className="bg-white rounded-xl p-5 border-l-4 border-red-500 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-3xl flex-shrink-0">{trap.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                    {trap.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-2">{trap.title}</h3>
                <div className="bg-orange-50 border-l-2 border-orange-400 pl-3 py-2 text-sm text-stone-700 mb-3 italic">
                  📖 {trap.story}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-emerald-700 mb-1">✅ 預防方式</div>
                    <div className="text-stone-700">{trap.prevention}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xs font-bold text-red-700 mb-1">💸 損失金額</div>
                    <div className="text-stone-700">{trap.costExample}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════ Section 6: 5 大緊急狀況 ═══════
function SectionEmergency() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <span className="text-3xl">🆘</span> 6. 緊急狀況客服
      </h2>
      <p className="text-stone-600 mb-6">
        出問題了怎麼辦? 5 大類緊急客服專線 + 步驟說明, 收藏起來以備不時之需。
      </p>

      <div className="space-y-3">
        {EMERGENCY_CONTACTS.map(ec => {
          const isOpen = openId === ec.id;
          return (
            <div key={ec.id} className="bg-white rounded-xl border-2 border-stone-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : ec.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-stone-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{ec.emoji}</div>
                  <div className="text-left">
                    <div className="text-xs text-stone-500">{ec.category}</div>
                    <div className="font-bold text-stone-900">{ec.title}</div>
                  </div>
                </div>
                <div className={`text-stone-400 text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-stone-100 pt-4">
                  {/* 客服專線 */}
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-stone-700 mb-2">📞 客服專線</h4>
                    {ec.contacts.map((c, i) => (
                      <div key={i} className="bg-stone-50 rounded-lg p-2 mb-1 text-sm flex items-center justify-between">
                        <div>
                          <div className="font-bold text-stone-800">{c.name}</div>
                          <div className="text-xs text-stone-500">{c.hours} · {c.lang}</div>
                        </div>
                        <a
                          href={`tel:${c.phone}`}
                          className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold hover:bg-red-700 transition"
                        >
                          {c.phone}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* 處理步驟 */}
                  <div>
                    <h4 className="text-sm font-bold text-stone-700 mb-2">📋 處理步驟</h4>
                    <ol className="space-y-1 text-sm">
                      {ec.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-stone-700">
                          <span className="text-red-600 font-bold">{step.split('.')[0]}.</span>
                          <span>{step.split('.').slice(1).join('.').trim()}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════ Footer 透明化 ═══════
function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t border-stone-200 text-xs text-stone-500 text-center space-y-2">
      <p>
        📅 資料更新時間: 2026-06-10 (中堂親訪 + 網友評比)
      </p>
      <p>
        💴 匯率依台灣銀行牌告中間價 1 RMB ≈ NT$ 4.50, 實際交易依銀行/支付寶/微信 公告為準
      </p>
      <p>
        🆘 緊急客服專線 24 小時, 跨國電話可能要 +86 國碼
      </p>
      <p>
        🖼️ 圖片策略: 支付寶/微信 介面截圖 暫缺, 已標示「待補真實截圖」+ 灰底 placeholder
      </p>
    </footer>
  );
}

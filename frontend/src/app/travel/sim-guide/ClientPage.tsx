'use client';

import { useState } from 'react';
import Link from 'next/link';

// ─── 資料：6 個常見大陸 APP（icon 從 iTunes Search API 抓的 256x256） ────────
type AppInfo = { id: string; name: string; nameEn: string; icon: string; category: string };
const APPS: AppInfo[] = [
  { id: 'wechat',  name: '微信',     nameEn: 'WeChat',  icon: '/sim-guide/icons/wechat.jpg',  category: '通訊+支付' },
  { id: 'alipay',  name: '支付寶',   nameEn: 'Alipay',  icon: '/sim-guide/icons/alipay.jpg',  category: '支付' },
  { id: 'meituan', name: '美團',     nameEn: 'Meituan', icon: '/sim-guide/icons/meituan.jpg', category: '外賣+訂票' },
  { id: 'amap',    name: '高德地圖', nameEn: 'Amap',    icon: '/sim-guide/icons/amap.jpg',    category: '導航+打車' },
  { id: 'didi',    name: '滴滴出行', nameEn: 'DiDi',    icon: '/sim-guide/icons/didi.jpg',    category: '打車' },
  { id: '12306',   name: '12306',    nameEn: '12306',   icon: '/sim-guide/icons/12306.jpg',   category: '高鐵火車票' },
];

// 各 APP 對兩種方案的支援度（門號 vs eSIM）
type AppSupport = { id: string; sim: 'full' | 'partial' | 'none'; esim: 'full' | 'partial' | 'none'; note: string };
const APP_SUPPORT: AppSupport[] = [
  { id: 'wechat',  sim: 'full',    esim: 'partial', note: 'eSIM 收不到簡訊驗證 → 換機/登入困難' },
  { id: 'alipay',  sim: 'full',    esim: 'partial', note: 'eSIM 限額低、實名認證受限' },
  { id: 'meituan', sim: 'full',    esim: 'partial', note: 'eSIM 店家接單率低、外賣地址常失敗' },
  { id: 'amap',    sim: 'full',    esim: 'full',    note: '導航不需門號, eSIM 流量就夠' },
  { id: 'didi',    sim: 'full',    esim: 'partial', note: 'eSIM 司機聯繫不到、付款跳第三方' },
  { id: '12306',   sim: 'full',    esim: 'partial', note: 'eSIM 搶票慢半拍、學生票需實名' },
];

// ─── 速覽表資料 ────────────────────────────────────────────────────────────
const QUICK_COMPARE = [
  { label: '8 天費用',       sim: '約 NT$500-800',  esim: '約 NT$300-500' },
  { label: '設定難度',       sim: '中（app 啟用）', esim: '簡（掃 QR）' },
  { label: '中國門號',       sim: '✅ 有',          esim: '❌ 無' },
  { label: '微信支付完整',   sim: '✅ 完整',        esim: '⚠️ 限額' },
  { label: '外賣/打車/訂票', sim: '✅ 完整',        esim: '⚠️ 部分' },
  { label: 'VPN 需求',       sim: '🟢 不需',        esim: '🟡 需搭配' },
  { label: '適合誰',         sim: '深度玩家',       esim: '純觀光打卡' },
];

// ─── 三大電信 SIM 方案（價格為約略值, 最後更新 2026-06-06） ───────────────
const SIM_PLANS = [
  { operator: '中國移動', brand: '动感地带',   days: 8,  data: '20GB',  voice: '100分鐘', priceTWD: 480, note: '港澳台用戶專屬, 機場服務台辦理' },
  { operator: '中國聯通', brand: '沃派',       days: 8,  data: '30GB',  voice: '200分鐘', priceTWD: 550, note: '訊號涵蓋廣, 高鐵沿線穩定' },
  { operator: '中國電信', brand: '天翼旅遊卡', days: 8,  data: '25GB',  voice: '150分鐘', priceTWD: 520, note: 'CDMA 機型不適用, 注意雙卡支援' },
  { operator: '中國移動', brand: '动感地带',   days: 15, data: '50GB',  voice: '300分鐘', priceTWD: 780, note: '深度旅遊 15 天加長版' },
  { operator: '中國聯通', brand: '沃派',       days: 30, data: '100GB', voice: '500分鐘', priceTWD: 1100, note: '長期居留/出差適用' },
];

// ─── eSIM 平台（價格為約略值, 最後更新 2026-06-06） ──────────────────────
const ESIM_PLANS = [
  { provider: 'Airalo',    region: '中國大陸', data: '5GB',  days: 7,  priceTWD: 320, note: '全球最大 eSIM 平台, 支援 eSIM 機型最廣' },
  { provider: 'Holafly',   region: '中國大陸', data: '無限',  days: 5,  priceTWD: 480, note: '歐洲品牌, 免翻牆 (中國 IP 直連)' },
  { provider: 'eSIM123',   region: '中國+港澳', data: '10GB', days: 8,  priceTWD: 380, note: '台灣本土公司, 中英客服, 港澳漫遊' },
  { provider: '中國聯通 eSIM', region: '中國大陸', data: '20GB', days: 8,  priceTWD: 420, note: '需中國身份認證, 觀光客不易辦' },
  { provider: 'Airalo',    region: '亞洲 12 國', data: '10GB', days: 15, priceTWD: 600, note: '多國旅遊適用 (港澳+東南亞)' },
];

// ─── 真實情境案例 ─────────────────────────────────────────────────────────
const CASES = [
  {
    who: '小明',
    scenario: '5 天純打卡觀光',
    plan: 'eSIM',
    saving: '省 NT$300',
    desc: '每天 1GB 流量查地圖、刷小紅書、傳照片給家人就夠。不訂外賣、不叫滴滴、不搶高鐵票。',
    color: 'emerald',
  },
  {
    who: '小美',
    scenario: '8 天深度吃貨+訂秀',
    plan: '門號 SIM',
    saving: '省時 5+ 小時',
    desc: '要訂 5 間人氣餐廳、搶宋城千古情門票、2 次滴滴跨城。門號才有簡訊收得到驗證碼。',
    color: 'orange',
  },
  {
    who: 'Brian & Mana',
    scenario: '8 天雙人旅遊',
    plan: '1 門號 + 1 eSIM',
    saving: '省 NT$400',
    desc: '一人辦中國門號收簡訊/支付, 另一人純 eSIM 看地圖。最划算的組合配置。',
    color: 'indigo',
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'eSIM 機型限制？', a: '需手機支援 eSIM（iPhone XS 以後、Google Pixel 3 以後、三星 S20 以後）。iPad 平板也可以。' },
  { q: '門號可以台灣雙槍嗎？', a: '可以。iPhone 雙 SIM 卡（一張實體 + 一張 eSIM）最方便。門號收簡訊、台灣門號保持漫遊。' },
  { q: 'VPN 該不該裝？', a: '門號在中國境內不需要 VPN。eSIM 雖然 IP 在中國，但部分境外服務（Google/IG/Line）仍需翻牆。' },
  { q: '微信支付沒門號能開嗎？', a: '可以開通但有額度限制（單筆 NT$300 以下、每月 NT$3000）。要完整功能（綁銀行卡、轉帳）需中國門號實名。' },
  { q: '流量用完怎麼加？', a: '門號：發簡訊「CXLL」到 10086（移動）/ 10010（聯通）查詢加包。eSIM：到該平台 app 內加購流量包。' },
  { q: '電話門號可以選號嗎？', a: '機場服務台通常是隨機配發。淘寶/微信預購可選靚號（多付 NT$100-500）。' },
  { q: '回台後門號要退嗎？', a: '旅遊卡都是預付制，沒月租，回台後 30 天自動失效。不用特意退。' },
  { q: '台灣漫遊 vs eSIM 哪個划算？', a: '8 天中華電信漫遊 NT$1500+。eSIM 5GB 才 NT$320，省 70% 以上。除非公司出帳否則不划算。' },
];

// ─── Components ───────────────────────────────────────────────────────────

function AppBadge({ app, status }: { app: AppInfo; status: 'full' | 'partial' | 'none' }) {
  const colors = {
    full:    { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✅' },
    partial: { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: '⚠️' },
    none:    { bg: 'bg-rose-100',    text: 'text-rose-700',    icon: '❌' },
  }[status];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
      <img src={app.icon} alt={app.name} className="w-12 h-12 rounded-xl shadow-sm" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900">{app.name}</div>
        <div className="text-xs text-slate-500">{app.category}</div>
      </div>
      <span className={`${colors.bg} ${colors.text} text-xs px-2 py-1 rounded-full font-bold`}>
        {colors.icon}
      </span>
    </div>
  );
}

function ColorDot({ className = '' }: { className?: string }) {
  return <span className={`inline-block w-3 h-3 rounded-full ${className}`} />;
}

export default function SimGuidePage() {
  const [activeTab, setActiveTab] = useState<'sim' | 'esim' | 'local'>('sim');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* ══════ HEADER ══════ */}
      <header className="bg-gradient-to-br from-orange-500 via-rose-500 to-pink-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-sm uppercase tracking-widest opacity-90 mb-2">📱 來大陸前必讀</div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-3">
            門號 vs eSIM<br />
            <span className="text-2xl sm:text-3xl font-normal opacity-90">完整攻略 + APP 差異對比</span>
          </h1>
          <p className="text-base sm:text-lg opacity-90 max-w-2xl">
            給台灣、香港、澳門朋友的<strong>陸旅通訊指南</strong>。一分鐘決定要辦門號還是 eSIM,
            再決定怎麼買最便宜、APP 怎麼用才不踩雷。
          </p>
          <div className="mt-4 text-xs opacity-75">最後更新：2026-06-06 ｜ 價格以官方公告為準</div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8">

        {/* ══════ Section 1: 開門見山決策樹 ══════ */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">🎯 一句話總結</h2>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-6">
            <p className="text-lg text-slate-800">
              <strong>要能完整用大陸 APP</strong>（微信支付、外賣、打車、搶票）→ <span className="text-orange-600 font-bold">辦中國門號</span>。<br />
              <strong>只要地圖、查資料、傳訊息</strong>（純觀光打卡）→ <span className="text-emerald-600 font-bold">eSIM 行動網路就夠</span>。
            </p>
          </div>

          <h3 className="text-lg font-semibold text-slate-900 mb-4">📋 4 題決策樹</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border-2 border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <div className="text-2xl mb-2">❶</div>
              <div className="font-semibold text-slate-900 mb-1">要用微信支付轉帳給大陸朋友？</div>
              <div className="text-sm text-slate-600">→ 是 = 門號 ｜ 否 = 看下題</div>
            </div>
            <div className="border-2 border-orange-200 bg-orange-50/50 rounded-xl p-4">
              <div className="text-2xl mb-2">❷</div>
              <div className="font-semibold text-slate-900 mb-1">要訂外賣、打車、搶高鐵票？</div>
              <div className="text-sm text-slate-600">→ 是 = 門號 ｜ 否 = 看下題</div>
            </div>
            <div className="border-2 border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
              <div className="text-2xl mb-2">❸</div>
              <div className="font-semibold text-slate-900 mb-1">只需要地圖導航、查小紅書？</div>
              <div className="text-sm text-slate-600">→ 是 = eSIM 就夠</div>
            </div>
            <div className="border-2 border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
              <div className="text-2xl mb-2">❹</div>
              <div className="font-semibold text-slate-900 mb-1">旅遊天數 &lt; 5 天？</div>
              <div className="text-sm text-slate-600">→ 是 = eSIM 省錢</div>
            </div>
          </div>
        </section>

        {/* ══════ Section 2: 1 分鐘速覽表 ══════ */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">⚡ 1 分鐘速覽表</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm sm:text-base">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 pr-4 text-slate-600 font-medium">比較項目</th>
                  <th className="text-left py-3 px-4">
                    <div className="flex items-center gap-2">
                      <ColorDot className="bg-orange-500" />
                      <span className="text-orange-700 font-bold">中國門號 SIM</span>
                    </div>
                  </th>
                  <th className="text-left py-3 pl-4">
                    <div className="flex items-center gap-2">
                      <ColorDot className="bg-emerald-500" />
                      <span className="text-emerald-700 font-bold">eSIM 行動網路</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {QUICK_COMPARE.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-700">{row.label}</td>
                    <td className="py-3 px-4 text-orange-700">{row.sim}</td>
                    <td className="py-3 pl-4 text-emerald-700">{row.esim}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════ Section 3: APP 差異強烈對比 (重點) ══════ */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-block text-xs uppercase tracking-widest text-slate-500 mb-2">最重要的一節</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">📱 APP 使用差異</h2>
            <p className="text-slate-600">同樣的 APP, 兩種方案用起來差多少？</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 左邊：門號 */}
            <div className="border-2 border-orange-300 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">📞</span>
                  <span className="text-lg font-bold">門號 SIM</span>
                </div>
                <div className="text-sm opacity-90">完整大陸人身分模式</div>
              </div>
              <div className="p-4 bg-orange-50/30 space-y-2">
                {APPS.map(app => {
                  const support = APP_SUPPORT.find(s => s.id === app.id)!;
                  return <AppBadge key={app.id} app={app} status={support.sim} />;
                })}
                <div className="mt-3 p-3 bg-emerald-100 rounded-lg text-sm text-emerald-800">
                  ✅ <strong>所有功能正常</strong>：付款、轉帳、收簡訊、外賣地址、搶票
                </div>
              </div>
            </div>

            {/* 右邊：eSIM */}
            <div className="border-2 border-emerald-300 rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🌐</span>
                  <span className="text-lg font-bold">eSIM 行動網路</span>
                </div>
                <div className="text-sm opacity-90">觀光客流量模式</div>
              </div>
              <div className="p-4 bg-emerald-50/30 space-y-2">
                {APPS.map(app => {
                  const support = APP_SUPPORT.find(s => s.id === app.id)!;
                  return <AppBadge key={app.id} app={app} status={support.esim} />;
                })}
                <div className="mt-3 p-3 bg-amber-100 rounded-lg text-sm text-amber-800">
                  ⚠️ <strong>部分功能受限</strong>：簡訊收不到、支付限額、店家接單率低
                </div>
              </div>
            </div>
          </div>

          {/* 細節說明 */}
          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
            {APP_SUPPORT.filter(s => s.sim !== s.esim).map(s => {
              const app = APPS.find(a => a.id === s.id)!;
              return (
                <div key={s.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <img src={app.icon} alt={app.name} className="w-10 h-10 rounded-lg shadow-sm flex-shrink-0" />
                  <div>
                    <div className="font-bold text-slate-900">{app.name} 差異</div>
                    <div className="text-slate-600 text-xs">{s.note}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════ Section 4: 完整購買攻略 (3 個分頁) ══════ */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">🛒 完整購買攻略</h2>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
            {[
              { id: 'sim',   label: '📞 中國門號 SIM', desc: '3 大電信方案' },
              { id: 'esim',  label: '🌐 eSIM 平台',    desc: '4 家評比' },
              { id: 'local', label: '🏪 當地購買',     desc: '機場/便利商店' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'sim' | 'esim' | 'local')}
                className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div>{tab.label}</div>
                <div className="text-xs opacity-70">{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'sim' && (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                三大電信都有「港澳台專屬」旅遊卡。建議<strong>出發前在台灣先買好</strong>（淘寶/蝦皮/門市），
                或到上海浦東機場入境後服務台現場辦。
              </p>
              <div className="space-y-3">
                {SIM_PLANS.map((p, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-orange-300 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-bold text-slate-900">{p.operator} · {p.brand}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.note}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-orange-600">NT${p.priceTWD}</div>
                        <div className="text-xs text-slate-500">{p.days} 天</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">📶 {p.data}</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">📞 {p.voice}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'esim' && (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                eSIM 不用換實體卡, 掃 QR Code 即開通。建議<strong>出發前 1 天在 app 購買</strong>。
                注意：只有<strong>支援 eSIM 的手機</strong>才能用（iPhone XS 以後）。
              </p>
              <div className="space-y-3">
                {ESIM_PLANS.map((p, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-bold text-slate-900">{p.provider}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.region} · {p.note}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-emerald-600">NT${p.priceTWD}</div>
                        <div className="text-xs text-slate-500">{p.days} 天</div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">📶 {p.data}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'local' && (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                沒事先買？落地後還有 3 個地方可以補辦。
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: '✈️ 上海浦東機場',
                    time: '24h 全年無休',
                    where: '入境大廳 B 出口, 多家電信商服務台',
                    price: 'NT$500-700',
                    pros: '最方便, 落地即辦, 支援中英日韓',
                    cons: '需排隊 15-30 分鐘',
                  },
                  {
                    title: '🏪 7-11 / 全家便利商店',
                    time: '06:00-23:00',
                    where: '浦東/虹橋機場、市區主要門市',
                    price: 'NT$550-750',
                    pros: '離飯店近, 還可買 SIM 卡座',
                    cons: '店員不一定會辦觀光客門號',
                  },
                  {
                    title: '📦 淘寶預購寄到飯店',
                    time: '出發前 3-5 天下單',
                    where: '搜「中國移動 港澳台 旅遊」',
                    price: 'NT$400-600',
                    pros: '最便宜, 還可選靚號',
                    cons: '需綁飯店地址, 語言門檻',
                  },
                ].map((c, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="font-bold text-slate-900">{c.title}</div>
                      <div className="text-orange-600 font-bold">{c.price}</div>
                    </div>
                    <div className="text-sm space-y-1 text-slate-600">
                      <div>🕐 {c.time}</div>
                      <div>📍 {c.where}</div>
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-emerald-600">+ {c.pros}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-rose-600">- {c.cons}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ══════ Section 5: 真實情境案例 ══════ */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">💼 3 個真實情境</h2>
          <p className="text-slate-600 mb-6">看完上面的還是不確定？參考 3 種典型情境</p>

          <div className="grid md:grid-cols-3 gap-4">
            {CASES.map((c, i) => {
              const colorMap = ({
                emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
                orange:  { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-700' },
                indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-300',  text: 'text-indigo-700' },
              } as const)[c.color as 'emerald' | 'orange' | 'indigo'];
              return (
                <div key={i} className={`border-2 ${colorMap.border} ${colorMap.bg} rounded-2xl p-5`}>
                  <div className="text-3xl mb-2">{
                    c.color === 'emerald' ? '🧳' : c.color === 'orange' ? '🍜' : '👫'
                  }</div>
                  <div className="font-bold text-lg text-slate-900">{c.who}</div>
                  <div className="text-sm text-slate-600 mb-3">{c.scenario}</div>
                  <div className={`inline-block ${colorMap.text} font-bold text-sm mb-2`}>
                    → 推薦：{c.plan}
                  </div>
                  <div className="text-xs text-slate-700 mb-2">{c.desc}</div>
                  <div className="text-xs font-bold text-slate-900 pt-2 border-t border-slate-200">
                    💰 {c.saving}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════ Section 6: FAQ ══════ */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">❓ 常見 Q&A</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900">{faq.q}</span>
                  <span className="text-slate-400 text-xl flex-shrink-0">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-slate-700 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ══════ Footer CTA ══════ */}
        <section className="bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-2xl p-6 sm:p-8 text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-2">還有其他旅遊問題？</h3>
          <p className="opacity-90 mb-4 text-sm sm:text-base">回主頁看完整 8 天行程、預算、餐廳口袋名單</p>
          <Link
            href="/travel"
            className="inline-block bg-white text-orange-600 font-bold px-6 py-3 rounded-full hover:bg-orange-50 transition-colors"
          >
            🏠 回到行程主頁
          </Link>
        </section>
      </div>
    </main>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ShareButtons from '@/components/ShareButtons';
import {
  FOODIE_STOPS,
  CITIES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  getDaysForStop,
  type FoodieStop,
  type City,
  type Category,
} from './data';

// ═══════ 子元件：店家卡片 ═══════
function StopCard({ stop, onClick }: { stop: FoodieStop; onClick: () => void }) {
  const cat = CATEGORY_COLORS[stop.category];
  const days = getDaysForStop(stop.city);
  const dayLabel = days.length > 0 ? `Day ${days.join(', ')} 經過` : '未排入行程';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden border-2 border-stone-200 hover:border-amber-400"
    >
      {/* 圖片區 */}
      <div className="relative aspect-[16/9] bg-stone-100 overflow-hidden">
        <img
          src={stop.image}
          alt={stop.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/foodie-stops/placeholder-fallback.jpg';
            }
          }}
        />
        {/* 分類徽章 */}
        <div className={`absolute top-3 left-3 ${cat.bg} ${cat.text} ${cat.border} border px-2 py-1 rounded-full text-xs font-bold`}>
          {CATEGORY_LABELS[stop.category]}
        </div>
        {/* Day 徽章 */}
        <div className="absolute top-3 right-3 bg-amber-400 text-stone-900 px-2 py-1 rounded-full text-xs font-bold shadow">
          🗓️ {dayLabel}
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-4 space-y-2">
        {/* 標題列 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg text-stone-900 line-clamp-1">{stop.name}</h3>
        </div>

        {/* 評分 + 評論數 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-yellow-500">{'★'.repeat(Math.floor(stop.rating))}</span>
          <span className="font-bold text-stone-700">{stop.rating}</span>
          <span className="text-stone-500">({stop.reviewCount.toLocaleString()} 評論)</span>
        </div>

        {/* 標籤 */}
        <div className="flex flex-wrap gap-1">
          {stop.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>

        {/* 位置資訊 */}
        <div className="text-xs text-stone-600 space-y-0.5 pt-1">
          <div>📍 {stop.address}</div>
          {stop.nearAttraction && (
            <div className="text-emerald-700">
              距「{stop.nearAttraction.name}」{stop.nearAttraction.distance}
            </div>
          )}
        </div>

        {/* 價格 + 營業時間 */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
          <span className="text-stone-600">💰 {stop.priceRange}</span>
          <span className="text-stone-600">🕐 {stop.hours}</span>
        </div>
      </div>
    </button>
  );
}

// ═══════ 子元件：店家詳情 modal ═══════
function StopDetail({ stop, onClose }: { stop: FoodieStop; onClose: () => void }) {
  const cat = CATEGORY_COLORS[stop.category];
  const days = getDaysForStop(stop.city);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 頂部圖片 */}
        <div className="relative aspect-[16/9] bg-stone-100">
          <img
            src={stop.image}
            alt={stop.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallback) {
                img.dataset.fallback = '1';
                img.src = '/foodie-stops/placeholder-fallback.jpg';
              }
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center text-stone-700 font-bold shadow-lg"
          >
            ✕
          </button>
          <div className={`absolute bottom-3 left-3 ${cat.bg} ${cat.text} ${cat.border} border px-3 py-1 rounded-full text-sm font-bold`}>
            {CATEGORY_LABELS[stop.category]}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 標題 + 評分 */}
          <div>
            <h2 className="text-2xl font-bold text-stone-900">{stop.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-500 text-lg">{'★'.repeat(Math.floor(stop.rating))}</span>
              <span className="font-bold text-stone-800">{stop.rating}</span>
              <span className="text-stone-500 text-sm">({stop.reviewCount.toLocaleString()} 評論)</span>
            </div>
          </div>

          {/* 標籤 */}
          <div className="flex flex-wrap gap-2">
            {stop.tags.map(t => (
              <span key={t} className="text-sm text-rose-700 bg-rose-50 px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
          </div>

          {/* 基本資訊 */}
          <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="font-bold text-stone-700 min-w-[5rem]">📍 地址</span>
              <span className="text-stone-800">{stop.address}</span>
            </div>
            {stop.nearAttraction && (
              <div className="flex gap-2">
                <span className="font-bold text-stone-700 min-w-[5rem]">🏞️ 鄰近</span>
                <span className="text-emerald-700">
                  「{stop.nearAttraction.name}」{stop.nearAttraction.distance}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-bold text-stone-700 min-w-[5rem]">🕐 營業</span>
              <span className="text-stone-800">{stop.hours}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-stone-700 min-w-[5rem]">💰 價格</span>
              <span className="text-stone-800">{stop.priceRange}</span>
            </div>
            {stop.waitTime && (
              <div className="flex gap-2">
                <span className="font-bold text-stone-700 min-w-[5rem]">⏱️ 排隊</span>
                <span className="text-amber-700">{stop.waitTime}</span>
              </div>
            )}
            {days.length > 0 && (
              <div className="flex gap-2">
                <span className="font-bold text-stone-700 min-w-[5rem]">🗓️ 行程</span>
                <span className="text-amber-700">Day {days.join(', ')} 經過此城市</span>
              </div>
            )}
          </div>

          {/* 招牌必點 */}
          <div>
            <h3 className="font-bold text-stone-900 mb-3 text-lg">【招牌必點】</h3>
            <div className="space-y-2">
              {stop.signature.map(s => (
                <div key={s.item} className="flex items-start justify-between gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex-1">
                    <div className="font-bold text-stone-800">{s.item}</div>
                    <div className="text-xs text-stone-600 mt-0.5">{s.note}</div>
                  </div>
                  <div className="text-amber-700 font-bold whitespace-nowrap">{s.price}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 網友短評 */}
          <div>
            <h3 className="font-bold text-stone-900 mb-3 text-lg">【網友短評】</h3>
            <div className="space-y-3">
              {stop.reviews.map((r, i) => (
                <div key={i} className="border-l-4 border-rose-300 bg-rose-50/50 pl-3 pr-3 py-2 rounded-r-lg">
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="font-bold text-stone-800">{r.author}</span>
                    <span className="text-stone-400">·</span>
                    <span>{r.source}</span>
                    {r.rating && <span className="text-yellow-500 ml-auto">{'★'.repeat(r.rating)}</span>}
                  </div>
                  <div className="text-sm text-stone-700 mt-1">{r.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 小提醒 */}
          {stop.tips && (
            <div className="bg-amber-100 border border-amber-300 rounded-xl p-3 text-sm">
              <span className="font-bold text-amber-900">⚠️ 小提醒</span>
              <span className="text-amber-900 ml-1">{stop.tips}</span>
            </div>
          )}

          {/* 瑞幸 MCP 整合區塊 */}
          {stop.mcpConfig && <LuckinMCPBlock stop={stop} />}

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-3 rounded-xl"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════ 子元件：瑞幸 MCP 整合 (JSON-RPC over HTTP) ═══════
function LuckinMCPBlock({ stop }: { stop: FoodieStop }) {
  const mcp = stop.mcpConfig!;
  const [serverUrl, setServerUrl] = useState(mcp.serverUrl || '');
  const [authToken, setAuthToken] = useState(mcp.authToken || '');
  const [menu, setMenu] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 從 localStorage 讀設定
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mcp-${stop.id}`);
      if (saved) {
        const cfg = JSON.parse(saved);
        setServerUrl(cfg.serverUrl || '');
        setAuthToken(cfg.authToken || '');
      }
    } catch { /* ignore */ }
  }, [stop.id]);

  const saveConfig = () => {
    try {
      localStorage.setItem(`mcp-${stop.id}`, JSON.stringify({ serverUrl, authToken }));
    } catch { /* ignore */ }
  };

  const callMcp = async (method: string, params: Record<string, unknown> = {}) => {
    if (!serverUrl) {
      setError('請先填入 MCP Server URL');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setMenu(data.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">☕</span>
        <h3 className="font-bold text-indigo-900 text-lg">瑞幸下單 · MCP 整合</h3>
        <span className="ml-auto text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
          {mcp.enabled ? '已啟用' : '尚未接入'}
        </span>
      </div>

      <p className="text-xs text-indigo-700">{mcp.note}</p>

      <div className="space-y-2">
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          onBlur={saveConfig}
          placeholder="https://your-mcp-server.com/rpc"
          className="w-full text-sm px-3 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 focus:outline-none bg-white"
        />
        <input
          type="password"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          onBlur={saveConfig}
          placeholder="Bearer Token (選填)"
          className="w-full text-sm px-3 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 focus:outline-none bg-white"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => callMcp('tools/call', { name: 'get_menu', arguments: { store: stop.name } })}
          disabled={loading || !serverUrl}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {loading ? '查詢中…' : '🔍 查菜單'}
        </button>
        <button
          onClick={() => callMcp('tools/call', { name: 'get_nearby_stores', arguments: { lat: 30.2464, lng: 120.1489, limit: 5 } })}
          disabled={loading || !serverUrl}
          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-stone-300 text-white font-bold py-2 rounded-lg text-sm"
        >
          {loading ? '查詢中…' : '📍 附近門市'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          ❌ {error}
        </div>
      )}

      {menu !== null && (
        <div className="bg-white border border-indigo-200 rounded-lg p-3">
          <div className="text-xs font-bold text-stone-700 mb-2">MCP 回傳結果:</div>
          <pre className="text-xs text-stone-800 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(menu, null, 2)}
          </pre>
        </div>
      )}

      <div className="text-xs text-indigo-600 bg-white/50 rounded p-2">
        <strong>預期 MCP 介面</strong>:
        <code className="block mt-1 text-[10px]">
          {`POST {serverUrl}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": { "name": "get_menu" }
}`}
        </code>
      </div>
    </div>
  );
}

// ═══════ 主頁面 ═══════
export default function FoodieStopsPage() {
  const [city, setCity] = useState<City | 'all'>('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<FoodieStop | null>(null);

  const filtered = useMemo(() => {
    return FOODIE_STOPS.filter(s => {
      if (city !== 'all' && s.city !== city) return false;
      if (category !== 'all' && s.category !== category) return false;
      return true;
    });
  }, [city, category]);

  // 統計
  const stats = useMemo(() => ({
    total: FOODIE_STOPS.length,
    cities: new Set(FOODIE_STOPS.map(s => s.city)).size,
    drinks: FOODIE_STOPS.filter(s => s.category === 'drink').length,
    gifts: FOODIE_STOPS.filter(s => s.category === 'gift').length,
    snacks: FOODIE_STOPS.filter(s => s.category === 'snack').length,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50 to-amber-50">
      {/* Sticky Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/travel" className="text-stone-500 hover:text-stone-700 text-sm">← 旅遊</Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧋</span>
            <h1 className="text-xl font-bold text-stone-800">網紅名店</h1>
          </div>
          <div className="ml-auto">
            <ShareButtons
              title="網紅名店"
              text="2026 江南水鄉八日 🧋 網紅名店 · 飲料/伴手禮/小吃一覽"
              variant="icon"
            />
          </div>
        </div>

        {/* 城市 filter */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
          <FilterChip active={city === 'all'} onClick={() => setCity('all')}>
            全部 ({stats.total})
          </FilterChip>
          {CITIES.map(c => {
            const count = FOODIE_STOPS.filter(s => s.city === c).length;
            return (
              <FilterChip
                key={c}
                active={city === c}
                onClick={() => setCity(c)}
                disabled={count === 0}
              >
                {c} ({count})
              </FilterChip>
            );
          })}
        </div>

        {/* 分類 filter */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto border-t border-stone-100 pt-2">
          <FilterChip active={category === 'all'} onClick={() => setCategory('all')} size="sm">
            全部分類
          </FilterChip>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(c => (
            <FilterChip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
              size="sm"
            >
              {CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 頂部說明卡 */}
        <div className="bg-gradient-to-r from-rose-100 to-amber-100 border-2 border-rose-200 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-rose-900 mb-2">
            🧋 江南 8 日必逛網紅名店
          </h2>
          <p className="text-sm text-stone-700 leading-relaxed">
            隨手買、外帶、打卡專用 ——
            飲料 (瑞幸/霸王茶姬/蜜雪冰城/喜茶)、伴手禮 (龍井茶/絲綢/粽子/老字號)、街邊名小吃 (游埠豆漿/大馬弄/貓耳朵/蔥油拌麵)。
            每家店都標註 <strong className="text-rose-700">離哪個景點多近</strong> + <strong className="text-amber-700">你 Day X 會不會經過</strong>,
            規劃路線時可以直接看到。
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="bg-white/70 px-2 py-1 rounded-full">📊 {stats.total} 家店</span>
            <span className="bg-white/70 px-2 py-1 rounded-full">🏙️ 涵蓋 {stats.cities} 個城市</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-bold">🧋 飲料 {stats.drinks}</span>
            <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded-full font-bold">🎁 伴手禮 {stats.gifts}</span>
            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">🥟 小吃 {stats.snacks}</span>
          </div>
        </div>

        {/* 卡片牆 */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            沒有符合條件的店家
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
              <StopCard key={s.id} stop={s} onClick={() => setSelected(s)} />
            ))}
          </div>
        )}

        {/* 底部說明 */}
        <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 text-xs text-stone-600 space-y-2">
          <div>
            <strong>📷 圖片策略</strong>: 12 個店家目前全部使用本地 placeholder。
            之後可派 subagent 抓取 Bing Image Search / Wikimedia Commons 真實店家照,
            直接覆蓋 <code>/public/foodie-stops/{'{id}'}.jpg</code> 即可替換。
          </div>
          <div>
            <strong>☕ 瑞幸 MCP</strong>: 目前無公開 MCP server (Glama/MCP.so/GitHub 搜尋 0 結果)。
            卡片已預留「server URL + Token」輸入框,
            部署 MCP server 後填入即可啟用「即時查菜單」「門市庫存」功能。
            介面為標準 JSON-RPC 2.0 over HTTP。
          </div>
        </div>
      </div>

      {/* 詳情 modal */}
      {selected && <StopDetail stop={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  disabled,
  children,
  size = 'md',
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  const sz = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sz} rounded-full font-bold whitespace-nowrap transition-all ${
        active
          ? 'bg-rose-600 text-white shadow-md'
          : disabled
            ? 'bg-stone-100 text-stone-300 cursor-not-allowed'
            : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
      }`}
    >
      {children}
    </button>
  );
}

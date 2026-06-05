'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RESTAURANTS } from './data';
import ShareButtons from '@/components/ShareButtons';

// 美食博主視角 · 資料來源說明：
// ★ 已驗證：Wikipedia / OpenStreetMap 確認名稱、地址、創始時間
// ☆ 部分驗證：地址/名稱存在但電話營業時間待查
// ○ 未驗證：僅依行程規劃推斷，需自行確認
// 照片：Unsplash 示意圖（僅供視覺展示，非實際餐廳照片）

const DAY_TOURS: Record<number, string> = {
  1: 'Day 1｜上海：浦東的夜，屬於火鍋',
  2: 'Day 2｜上海-西塘：清晨的生煎，水鄉的饅頭',
  3: 'Day 3｜西塘-烏鎮：水鄉深遊，船上人家',
  4: 'Day 4｜烏鎮西柵：戲曲與水閣書場',
  5: 'Day 5｜杭州西湖：夜市掃街行動',
  6: 'Day 6｜杭州宋城：早餐與私房菜',
  7: 'Day 7｜杭州運河：清晨人間，最後的盛宴',
};

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const sm = size === 'sm';
  const starSize = sm ? 'text-sm' : 'text-xl';
  return (
    <span className={`${starSize} text-yellow-400`}>
      {'★'.repeat(full)}{half ? '½' : ''}
    </span>
  );
}

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-2">
      {/* Main large image */}
      <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-gray-100 flex items-center justify-center">
        {images.length > 0 ? (
          <img
            src={images[active]}
            alt={`${name} - ${active + 1}`}
            className="w-full h-full object-cover transition-all duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl">🍽️</span>
            <span className="text-sm mt-1">等待照片</span>
          </div>
        )}
        {/* Image counter */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {active + 1} / {images.length}
        </div>
        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive(prev => (prev === 0 ? images.length - 1 : prev - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-700 shadow text-sm font-bold"
            >
              ‹
            </button>
            <button
              onClick={() => setActive(prev => (prev === images.length - 1 ? 0 : prev + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-700 shadow text-sm font-bold"
            >
              ›
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === active ? 'border-orange-500 opacity-100' : 'border-transparent opacity-60'}`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      )}
    </div>
  );
}

function DishCarousel({ dishes }: { dishes: typeof RESTAURANTS[0]['dishes'] }) {
  const [idx, setIdx] = useState(0);
  const visible = dishes.slice(idx, idx + 2);
  const canPrev = idx > 0;
  const canNext = idx + 2 < dishes.length;

  return (
    <div className="relative">
      <div className="flex gap-2">
        {visible.map(dish => (
          <div key={dish.name} className="flex-1 bg-gray-50 rounded-xl overflow-hidden">
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
                            <span className="text-2xl">🍽️</span>
                          </div>
            <div className="p-2">
              <div className="text-xs font-bold text-gray-800 truncate">{dish.name}</div>
              <div className="text-xs text-orange-500 font-medium">{dish.price}</div>
            </div>
          </div>
        ))}
      </div>
      {canPrev && (
        <button onClick={() => setIdx(i => i - 1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-600 text-sm shadow">‹</button>
      )}
      {canNext && (
        <button onClick={() => setIdx(i => i + 1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-600 text-sm shadow">›</button>
      )}
    </div>
  );
}

export default function DiningPage() {
  const [selected, setSelected] = useState<typeof RESTAURANTS[0] | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  const filtered = filterDay ? RESTAURANTS.filter(d => d.day === filterDay) : RESTAURANTS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Sticky Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/travel" className="text-gray-400 hover:text-gray-600 text-sm">← 旅遊</Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍜</span>
            <h1 className="text-xl font-bold text-gray-800">美食日誌</h1>
          </div>
          <div className="ml-auto flex gap-2">
            <ShareButtons
              title="美食日誌"
              text="2026 江南水鄉八日 🍜 美食日誌 · 跟著美食博主吃七天"
              variant="icon"
            />
            <Link
              href="/travel/guidebook?tab=food"
              className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full font-bold border border-rose-200"
            >
              🖼️ 漫畫圖鑑
            </Link>
            <Link
              href="/travel/guidebook/upload"
              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold border border-amber-200"
            >
              📤 上傳生漫畫
            </Link>
          </div>
        </div>
        {/* Day filter */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterDay === null ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-100'}`}
          >
            全部（{RESTAURANTS.length}間）
          </button>
          {Object.entries(DAY_TOURS).map(([day, _label]) => {
            const count = RESTAURANTS.filter(d => d.day === Number(day)).length;
            return (
              <button
                key={day}
                onClick={() => setFilterDay(Number(day))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterDay === Number(day) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-100'}`}
              >
                Day {day}（{count}間）
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero intro */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-lg font-bold mb-1">跟著美食博主吃七天</h2>
          <p className="text-orange-100 text-sm leading-relaxed">
            從上海的火鍋傳奇到杭州的宮廷盛宴，我在每一間餐廳留下了真實的品嚐記錄。<br />
            這些故事，是用嘴巴和鏡頭写出來的。
          </p>
        </div>

        {/* Restaurant list */}
        <div className="space-y-8">
          {filtered.map(item => (
            <div key={item.id}>
              {/* Day section header */}
              {DAY_TOURS[item.day] && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-orange-300" />
                  <span className="text-sm font-bold text-orange-600 whitespace-nowrap">{DAY_TOURS[item.day]}</span>
                  <div className="h-px flex-1 bg-orange-300" />
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-orange-100">
                {/* Image Gallery */}
                <div className="p-4 pb-0">
                  <ImageGallery images={item.images ?? []} name={item.name} />
                </div>

                {/* Card header */}
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">Day {item.day}</span>
                        <span className="text-xs text-gray-400">{item.time}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.nameEn}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <StarRating rating={item.rating} />
                        <span className="text-gray-800 font-bold text-sm">{item.rating}</span>
                      </div>
                      <span className="text-xs text-gray-400">{item.reviewCount}則</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="px-4 pb-2 flex flex-wrap gap-1">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>

                {/* Story (food blogger style) */}
                <div className="px-4 pb-3">
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-l-4 border-orange-400">
                    {/* Audio narration button */}
                    {typeof window !== 'undefined' && (
                      <button
                        onClick={() => {
                          const audio = new Audio(`/audio/${item.id}.mp3`);
                          audio.play().catch(() => {});
                        }}
                        className="mb-2 flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
                      >
                        <span className="text-lg">🔊</span> 聆聽語音故事
                      </button>
                    )}
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{item.story}</p>
                  </div>
                </div>

                {/* Dish carousel */}
                <div className="px-4 pb-3">
                  <DishCarousel dishes={item.dishes} />
                </div>

                {/* Rating breakdown */}
                <div className="px-4 pb-3">
                  <div className="text-xs text-gray-500 font-medium">{item.ratingDetail}</div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => setSelected(item)}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    完整評論 + 菜單
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl my-4 overflow-hidden">
            {/* Header gallery */}
            <div className="p-4 pb-0">
              <ImageGallery images={selected.images ?? []} name={selected.name} />
            </div>

            {/* Title */}
            <div className="px-5 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">Day {selected.day} · {selected.time}</span>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{selected.type}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{selected.name}</h2>
              <p className="text-sm text-gray-400">{selected.nameEn}</p>
            </div>

            {/* Rating + Price */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <StarRating rating={selected.rating} />
                <span className="text-gray-800 font-bold">{selected.rating}</span>
                <span className="text-gray-400 text-sm">({selected.reviewCount}則)</span>
              </div>
              <span className="bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-full font-medium">{selected.priceRange}</span>
            </div>

            {/* Story */}
            <div className="px-5 py-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">✍️ 我的食記</h3>
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-l-4 border-orange-400">
                {/* Audio narration button */}
                {typeof window !== 'undefined' && (
                  <button
                    onClick={() => {
                      const audio = new Audio(`/audio/${selected.id}.mp3`);
                      audio.play().catch(() => {});
                    }}
                    className="mb-3 flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <span className="text-lg">🔊</span> 聆聽語音故事
                  </button>
                )}
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selected.story}</p>
              </div>
            </div>

            {/* Info grid */}
            <div className="px-5 pb-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">📍 基本資訊</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">地址</div>
                  <div className="text-sm text-gray-700 leading-snug">{selected.location}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">營業時間</div>
                  <div className="text-sm text-gray-700">{selected.hours}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">電話</div>
                  <div className="text-sm text-gray-700">{selected.phone}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">風格</div>
                  <div className="text-sm text-orange-600 font-medium">{selected.vibe}</div>
                </div>
              </div>
            </div>

            {/* Full menu */}
            <div className="px-5 pb-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">📋 完整菜單</h3>
              {Object.entries(selected.menu ?? {}).map(([section, items]) => (
                <div key={section} className="mb-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">{section}</h4>
                  <div className="bg-gray-50 rounded-xl overflow-hidden">
                    {items.map((dish: { item: string; price: string }, i: number) => (
                      <div key={dish.item} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                        <span className="text-gray-700 text-sm">{dish.item}</span>
                        <span className="text-orange-500 font-medium text-sm">{dish.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="px-5 pb-4">
              <div className="bg-yellow-50 rounded-xl p-4">
                <h3 className="text-sm font-bold text-yellow-700 mb-1">💡 在地建議</h3>
                <p className="text-yellow-800 text-sm leading-relaxed">{selected.tips}</p>
              </div>
            </div>

            {/* Close button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium text-sm transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
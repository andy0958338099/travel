'use client';
import { useState } from 'react';
import Link from 'next/link';

type Toilet = {
  id: string;
  name: string;
  address: string;
  type: 'public' | 'mall' | 'metro' | 'park' | 'hotel';
  cleanliness: 4 | 5;
  fee: '免費' | '¥1-2' | '¥5';
  hours: string;
  entranceNote: string;
  tips: string;
  distanceFromRoute: string;
  imagePath: string;
};

const TOILETS: Toilet[] = [
  {
    id: 'sh-01',
    name: '四行倉庫抗戰紀念館洗手間',
    address: '光復路21號四行倉庫廣場東側',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '08:30-16:30',
    entranceNote: '洗手間位於紀念館一樓入口左側，需進入紀念館範圍後循指標前進。節日期間排隊約5-10分鐘。紀念館本身免費入場。',
    tips: '推薦參觀完紀念館後直接使用，避開10:00-11:00參觀高峰時段。館內提供飲水機，可先補水再出發。',
    distanceFromRoute: '四行倉庫西側出口約30公尺',
    imagePath: '/toilet-tour/sh01-四行倉庫.jpg',
  },
  {
    id: 'sh-03',
    name: '南京路步行街東段公共洗手間',
    address: '南京東路近河南中路（步行街東側下沉廣場）',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '08:00-22:00',
    entranceNote: '洗手間入口在步行街中央，認準「公共洗手間」藍色指示牌。下沉廣場內有電梯和扶手電梯可達。節假日排隊時間可達20分鐘。',
    tips: '南京東路步行街沿線有多處洗手間，約每200公尺一個。推薦使用下沉廣場的這間，空間較大且有空調。',
    distanceFromRoute: '南京東路步行街中央，步行約5分鐘',
    imagePath: '/toilet-tour/sh03-南京路步行街.jpg',
  },
  {
    id: 'sh-04',
    name: '上海第一百貨公共洗手間',
    address: '南京東路830號第一百貨商店1樓西側',
    type: 'mall',
    cleanliness: 4,
    fee: '免費',
    hours: '10:00-21:30',
    entranceNote: '從南京東路正門進入，循1樓指示牌往西側走約2分鐘可達。洗手間位於電梯和防火通道之間，B1也有分店。',
    tips: '商場洗手間裝修新，有擦手紙和洗手液。節假日人多但分流快。地下美食廣場（來福士）也有洗手間可作備選。',
    distanceFromRoute: '南京東路830號，第一百貨1樓',
    imagePath: '/toilet-tour/sh04-上海第一百货.jpg',
  },
  {
    id: 'sh-06',
    name: '外灘源公共洗手間',
    address: '中山東一路29號外灘源商場B1層',
    type: 'mall',
    cleanliness: 5,
    fee: '免費',
    hours: '10:00-22:00',
    entranceNote: '洗手間位於外灘源商場B1層，從蘇州河方向進入商場後循指標下樓。商場裝修精緻，配備母婴室和外國旅客友善指示。是外灘沿線最乾淨的洗手間之一。',
    tips: '外灘源的洗手間在外灘區域質量最高，人流相對較少。推薦在此徹底解決問題再往豫園方向前進。商場內有咖啡店和餐廳，可順路休息。',
    distanceFromRoute: '外灘最北端，往南走往外灘方向約5分鐘',
    imagePath: '/toilet-tour/sh06-外灘源.jpg',
  },
  {
    id: 'sh-07',
    name: '豫園商城洗手間（地下）',
    address: '方浜中路269號豫園商城地下1樓（近九曲橋入口）',
    type: 'mall',
    cleanliness: 4,
    fee: '免費',
    hours: '09:00-21:00',
    entranceNote: '豫園商城有多處洗手間，B1層最大最齊全。從1號門（方浜中路）進入後左轉往九曲橋方向，在美食街中段右手邊下樓可達。',
    tips: '豫園商城節假日人潮可達數萬，地下洗手間排隊時間高達30分鐘。建議在進入商城前先在方浜中路路邊的公共洗手間解決。商城內有飲水點。',
    distanceFromRoute: '豫園商城核心區域內，步行約2分鐘',
    imagePath: '/toilet-tour/sh07-豫园商城.jpg',
  },
];

function StarRating({ value }: { value: number }) {
  return (
    <span className="text-amber-400 text-lg">
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function ToiletCard({ toilet }: { toilet: Toilet }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      {/* Image */}
      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
        <img
          src={toilet.imagePath}
          alt={toilet.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${
            toilet.type === 'public' ? 'bg-blue-600 text-white' :
            toilet.type === 'mall' ? 'bg-purple-600 text-white' :
            'bg-green-600 text-white'
          }`}>
            {toilet.type === 'public' ? '🏛️ 公共' : toilet.type === 'mall' ? '🏬 商場' : '🚇 地鐵'}
          </span>
        </div>
        {/* Cleanliness badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur rounded-full px-3 py-1">
          <StarRating value={toilet.cleanliness} />
          <span className="text-sm font-bold text-gray-800 ml-1">{toilet.cleanliness}/5</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-800 text-lg leading-snug mb-2">{toilet.name}</h3>

        {/* Address - LARGE AND PROMINENT */}
        <div className="bg-amber-50 rounded-xl p-3 mb-3 border-l-4 border-amber-400">
          <p className="text-sm font-bold text-amber-800 leading-relaxed">
            📍 {toilet.address}
          </p>
        </div>

        {/* Fee & Hours */}
        <div className="flex gap-3 mb-3">
          <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            💰 {toilet.fee}
          </span>
          <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
            🕐 {toilet.hours}
          </span>
        </div>

        {/* Distance hint */}
        <p className="text-sm text-gray-500 mb-3 leading-relaxed">
          ↗️ 距離觀光路線：{toilet.distanceFromRoute}
        </p>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-semibold border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? '▲ 收起詳細資訊' : '▼ 查看進入方式與注意事項'}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="bg-amber-50 rounded-xl p-3">
              <h4 className="text-xs font-bold text-amber-700 mb-1">🚪 進入方式</h4>
              <p className="text-sm text-amber-900 leading-relaxed">{toilet.entranceNote}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <h4 className="text-xs font-bold text-blue-700 mb-1">💡 使用建議</h4>
              <p className="text-sm text-blue-900 leading-relaxed">{toilet.tips}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToiletTourPage() {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredToilets = filterType === 'all'
    ? TOILETS
    : TOILETS.filter(t => t.type === filterType);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/travel" className="text-gray-400 hover:text-gray-600 text-sm">
            ← 旅遊
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚻</span>
            <h1 className="text-xl font-bold text-gray-800">洗手間導覽</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">🏙️</span>
            <h2 className="text-lg font-bold">上海 · 歷史建築沿線</h2>
          </div>
          <p className="text-white/80 text-sm leading-relaxed mb-1">
            從四行倉庫沿西藏北路往南，途經南京東路步行街，延伸到外灘萬國建築博覽群，再到豫園商城。精選清潔度4星以上洗手間，只推薦真正值得使用的地點。
          </p>
          <p className="text-white/60 text-xs">
            共收錄 {TOILETS.length} 處高評價洗手間 · 清潔度4-5星
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {[
            { id: 'all', label: '全部', count: TOILETS.length },
            { id: 'public', label: '🏛️ 公共', count: TOILETS.filter(t => t.type === 'public').length },
            { id: 'mall', label: '🏬 商場', count: TOILETS.filter(t => t.type === 'mall').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filterType === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-blue-50'
              }`}
            >
              {f.label}（{f.count}）
            </button>
          ))}
        </div>

        {/* Cleanliness legend */}
        <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 mb-2">清潔度參考標準</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="text-green-600 text-lg">★★★★★</span>
              <span className="text-gray-700 font-medium">非常乾淨（5星）</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-500 text-lg">★★★★☆</span>
              <span className="text-gray-700 font-medium">乾淨（4星）</span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            ⚠️ 清潔度為主觀體驗評估，可能因時間、天候、節假日人流量而有所變化。已移除清潔度4星以下地點。
          </p>
        </div>

        {/* Toilet list */}
        <div className="space-y-0">
          {filteredToilets.map(toilet => (
            <ToiletCard key={toilet.id} toilet={toilet} />
          ))}
        </div>

        {/* Route summary */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <h3 className="text-base font-bold text-blue-700 mb-3 flex items-center gap-2">
            <span className="text-xl">📋</span> 上海段路線使用建議
          </h3>
          <div className="space-y-3 text-sm text-blue-800 leading-relaxed">
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
              <span className="text-xl">1️⃣</span>
              <div>
                <p className="font-bold text-gray-800">四行倉庫 → 南京東路</p>
                <p className="text-gray-600 text-xs mt-1">約2.5公里，步行約35分鐘。建議在四行倉庫紀念館或南京東路東段公共洗手間處理。</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
              <span className="text-xl">2️⃣</span>
              <div>
                <p className="font-bold text-gray-800">南京東路 → 外灘</p>
                <p className="text-gray-600 text-xs mt-1">約1公里，步行約15分鐘。外灘情人牆沿線洗手間極少，<strong>外灘源商場B1</strong>是最靠譜的選項（清洗度5星）。</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
              <span className="text-xl">3️⃣</span>
              <div>
                <p className="font-bold text-gray-800">外灘 → 豫園商城</p>
                <p className="text-gray-600 text-xs mt-1">約2公里，步行約25分鐘。進入豫園商城前建議先在商城B1地下洗手間處理，節假日排隊時間可達30分鐘。</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 rounded-2xl p-5 border border-yellow-100">
          <h3 className="text-sm font-bold text-yellow-700 mb-2 flex items-center gap-2">
            <span className="text-xl">💡</span> 實用提示
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800 leading-relaxed">
            <li>· <strong>隨身帶紙巾/濕紙巾</strong>，地鐵站和商場洗手間有時紙巾缺貨。</li>
            <li>· <strong>長時間徒步建議隨身攜帶一瓶水</strong>，既可補水亦可簡單清潔。</li>
            <li>· <strong>節假日</strong>（五一、國慶、春節）排隊時間可能增加3-5倍，建議提前一站在人少的點解決。</li>
          </ul>
        </div>

        {/* Next zones teaser */}
        <div className="mt-6 bg-gray-100 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500">
            🚧 更多城市洗手間數據即將上線
          </p>
          <p className="text-xs text-gray-400 mt-1">
            杭州 · 烏鎮 · 西塘 · 嘉興 · 後續新增
          </p>
        </div>
      </div>
    </div>
  );
}
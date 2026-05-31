'use client';
import { useState } from 'react';
import Link from 'next/link';

// ── Data ────────────────────────────────────────────────────────────────────────

type ToiletZone = {
  id: string;
  city: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  toilets: Toilet[];
};

type Toilet = {
  id: string;
  name: string;
  location: string;
  type: 'public' | 'mall' | 'metro' | 'park' | 'hotel';
  cleanliness: 1 | 2 | 3 | 4 | 5;
  fee: '免費' | '¥1-2' | '¥5';
  hours: string;
  entranceNote: string;
  tips: string;
  distanceFromRoute: string;
  coordinates?: { lat: number; lng: number };
};

const SHANGHAI_ZONE: ToiletZone = {
  id: 'shanghai',
  city: '上海',
  name: '上海 · 歷史建築沿線',
  emoji: '🏙️',
  color: 'from-blue-800 to-blue-600',
  description: '從四行倉庫沿西藏北路往南，途經南京東路步行街，延伸到外灘萬國建築博覽群，再到豫園商城。這條路線穿越上海最繁華的商業區，公共廁所分布密集，但節假日排隊時間可能高達30分鐘。',
  toilets: [
    {
      id: 'sh-01',
      name: '四行倉庫抗戰紀念館洗手間',
      location: '光復路21號四行倉庫廣場東側',
      type: 'public',
      cleanliness: 4,
      fee: '免費',
      hours: '08:30-16:30（展館開放時間）',
      entranceNote: '洗手間位於紀念館一樓入口左側，需進入紀念館範圍後循指標前進。節日期間排隊約5-10分鐘。紀念館本身免費入場，洗手間免費使用。',
      tips: '推薦參觀完紀念館後直接使用，避開10:00-11:00參觀高峰時段。館內提供飲水機，可先補水再出發。',
      distanceFromRoute: '四行倉庫西側出口約30公尺',
    },
    {
      id: 'sh-02',
      name: '曲阜路地鐵站洗手間',
      location: '曲阜路站2號線/12號線換乘大廳（近南京西路）',
      type: 'metro',
      cleanliness: 3,
      fee: '免費',
      hours: '05:30-23:00（地鐵運營時間）',
      entranceNote: '洗手間位於地鐵站付費區外，在2號線站台層往下扶梯右手邊，明顯標識「洗手間 →」。非付費區，進站前可自由使用。',
      tips: '曲阜路站是換乘大站，高峰期排隊約5分鐘。12號線開通後分流了部分人流。廁所乾淨程度一般，建議隨身帶紙巾。',
      distanceFromRoute: '四行倉庫往南步行約8分鐘',
    },
    {
      id: 'sh-03',
      name: '南京路步行街東段公共洗手間',
      location: '南京東路近河南中路（步行街東側下沉廣場）',
      type: 'public',
      cleanliness: 4,
      fee: '免費',
      hours: '08:00-22:00',
      entranceNote: '洗手間入口在步行街中央，認準「公共洗手間」藍色指示牌。下沉廣場內有電梯和扶手電梯可達。節假日排隊時間可達20分鐘，建議往西走到浙江中路分流。',
      tips: '南京東路步行街沿線有多處洗手間，約每200公尺一個。推薦使用下沉廣場的這間，空間較大且有空調。',
      distanceFromRoute: '南京東路步行街中央，步行約5分鐘',
    },
    {
      id: 'sh-04',
      name: '上海第一百貨公共洗手間',
      location: '南京東路830號第一百貨商店1樓西側',
      type: 'mall',
      cleanliness: 4,
      fee: '免費',
      hours: '10:00-21:30（商場營業時間）',
      entranceNote: '從南京東路正門進入，循1樓指示牌往西側走約2分鐘可達。洗手間位於電梯和防火通道之間，B1也有分店。逛商場時順路使用最方便。',
      tips: '商場洗手間裝修新，有擦手紙和洗手液。節假日人多但分流快。地下美食廣場（來福士）也有洗手間可作備選。',
      distanceFromRoute: '南京東路步行街內，第一百貨1樓',
    },
    {
      id: 'sh-05',
      name: '外灘情人牆沿線公共洗手間',
      location: '中山路中山東一路外灘風景區（近延安東路）',
      type: 'public',
      cleanliness: 3,
      fee: '免費',
      hours: '06:00-23:00',
      entranceNote: '外灘沿線洗手間數量有限，最近的在外灘天文台附近（中山東一路1號）。情侶牆區域（外灘信號塔至蘇州河之間）沒有公共廁所，需往上走100公尺到外灘源。',
      tips: '外灘洗手間數量不足，節日前往建議先在南京東路商圈解決。夏天高溫時排隊時間明顯延長。冬季外灘風大，洗手後注意保暖。',
      distanceFromRoute: '外灘風景區中央位置，步行約3分鐘',
    },
    {
      id: 'sh-06',
      name: '外灘源公共洗手間',
      location: '中山東一路29號（外灘源地塊，福特·外灘源商場B1）',
      type: 'mall',
      cleanliness: 5,
      fee: '免費',
      hours: '10:00-22:00',
      entranceNote: '洗手間位於外灘源商場B1層，從蘇州河方向進入商場後循指標下樓。商場裝修精緻，洗手間空間開闊，配備母婴室和外國旅客友善指示。是外灘沿線最乾淨的洗手間之一。',
      tips: '外灘源的洗手間在外灘區域質量最高，人流相對較少。推薦在此徹底解決問題再往豫園方向前進。商場內有咖啡店和餐廳，可順路休息。',
      distanceFromRoute: '外灘最北端，往南走往外灘方向約5分鐘',
    },
    {
      id: 'sh-07',
      name: '豫園商城洗手間（地下）',
      location: '方浜中路269號豫園商城地下1樓（近九曲橋入口）',
      type: 'mall',
      cleanliness: 4,
      fee: '免費',
      hours: '09:00-21:00（商城營業時間）',
      entranceNote: '豫園商城有多處洗手間，B1層最大最齊全。從1號門（方浜中路）進入後左轉往九曲橋方向，在美食街中段右手邊下樓可達。地面層洗手間在城隍廟左側建築內。',
      tips: '豫園商城節假日人潮可達數萬，地下洗手間排隊時間高達30分鐘。建議在進入商城前先在方浜中路路邊的公共洗手間解決。商城內有飲水點，可自備水瓶。',
      distanceFromRoute: '豫園商城核心區域內，步行約2分鐘',
    },
    {
      id: 'sh-08',
      name: '豫園老街公共洗手間',
      location: '方浜中路近人民路（豫園老街街口）',
      type: 'public',
      cleanliness: 3,
      fee: '免費',
      hours: '06:00-22:00',
      entranceNote: '這是進入豫園商城前最後的公共洗手間機會。位置在方浜中路路邊，一個不起眼的藍色小亭。高峰期排隊約10分鐘，設施相對老舊但位置關鍵。',
      tips: '這是外灘到豫園沿線最後的公共洗手間，進入商城前強烈建議在此解決。城隍廟周邊洗手間數量嚴重不足，此處千萬別錯過。',
      distanceFromRoute: '豫園商城1號門外約50公尺',
    },
  ],
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function ToiletCard({ toilet }: { toilet: Toilet }) {
  const [expanded, setExpanded] = useState(false);
  const typeIcon: Record<string, string> = {
    public: '🏛️', mall: '🏬', metro: '🚇', park: '🌳', hotel: '🏨',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeIcon[toilet.type]}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-base leading-snug">{toilet.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{toilet.location}</p>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            toilet.cleanliness >= 4 ? 'bg-green-100 text-green-700' :
            toilet.cleanliness >= 3 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            清潔度 {toilet.cleanliness}/5
            <StarRating value={toilet.cleanliness} />
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
            {toilet.fee}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
            {toilet.type === 'public' ? '🏛️ 公共' : toilet.type === 'mall' ? '🏬 商場' : toilet.type === 'metro' ? '🚇 地鐵' : toilet.type === 'park' ? '🌳 公園' : '🏨 酒店'}
          </span>
        </div>

        {/* Short description */}
        <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">
          {toilet.distanceFromRoute}
        </p>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
        >
          {expanded ? '▲ 收起進入提示' : '▼ 查看進入方式與注意事項'}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
            <div className="bg-amber-50 rounded-xl p-3">
              <h4 className="text-xs font-bold text-amber-700 mb-1">🚪 進入方式</h4>
              <p className="text-sm text-amber-900 leading-relaxed">{toilet.entranceNote}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <h4 className="text-xs font-bold text-blue-700 mb-1">💡 使用建議</h4>
              <p className="text-sm text-blue-900 leading-relaxed">{toilet.tips}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>🕐</span>
              <span>{toilet.hours}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CleanlinessLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-2 mb-4">
      <span className="flex items-center gap-1">
        <span className="text-green-600">★★★★★</span> 非常乾淨
      </span>
      <span className="flex items-center gap-1">
        <span className="text-green-500">★★★★☆</span> 乾淨
      </span>
      <span className="flex items-center gap-1">
        <span className="text-yellow-500">★★★☆☆</span> 一般
      </span>
      <span className="flex items-center gap-1">
        <span className="text-orange-500">★★☆☆☆</span> 較骯髒
      </span>
      <span className="flex items-center gap-1">
        <span className="text-red-500">★☆☆☆☆</span> 骯髒
      </span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ToiletTourPage() {
  const [filterType, setFilterType] = useState<string>('all');

  const zone = SHANGHAI_ZONE;
  const filteredToilets = filterType === 'all'
    ? zone.toilets
    : zone.toilets.filter(t => t.type === filterType);

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
            <h1 className="text-xl font-bold text-gray-800">Toilet Tour</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className={`bg-gradient-to-r ${zone.color} rounded-2xl p-6 mb-6 text-white`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{zone.emoji}</span>
            <h2 className="text-lg font-bold">{zone.name}</h2>
          </div>
          <p className="text-white/80 text-sm leading-relaxed mb-1">
            {zone.description}
          </p>
          <p className="text-white/60 text-xs">
            共收錄 {zone.toilets.length} 處洗手間資訊
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {[
            { id: 'all', label: '全部', count: zone.toilets.length },
            { id: 'public', label: '🏛️ 公共', count: zone.toilets.filter(t => t.type === 'public').length },
            { id: 'mall', label: '🏬 商場', count: zone.toilets.filter(t => t.type === 'mall').length },
            { id: 'metro', label: '🚇 地鐵', count: zone.toilets.filter(t => t.type === 'metro').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
        <div className="bg-white rounded-xl p-3 mb-4 border border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 mb-1">清潔度參考標準</h3>
          <CleanlinessLegend />
          <p className="text-xs text-gray-400 leading-relaxed">
            ⚠️ 清潔度為主觀體驗評估，可能因時間、天候、節假日人流量而有所變化。推薦做好時間規劃，隨身攜帶紙巾。
          </p>
        </div>

        {/* Toilet list */}
        <div className="space-y-3">
          {filteredToilets.map(toilet => (
            <ToiletCard key={toilet.id} toilet={toilet} />
          ))}
        </div>

        {/* Bottom tips */}
        <div className="mt-8 bg-yellow-50 rounded-2xl p-5 border border-yellow-100">
          <h3 className="text-sm font-bold text-yellow-700 mb-2 flex items-center gap-2">
            <span className="text-xl">💡</span> 上海段路線使用建議
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800 leading-relaxed">
            <li>· <strong>四行倉庫→南京東路：</strong>約2.5公里，步行約35分鐘。建議在曲阜路地鐵站或第一百貨先解決。</li>
            <li>· <strong>南京東路→外灘：</strong>約1公里，步行約15分鐘。外灘情人牆沿線洗手間極少，建議在南京東路最後一次機會。往外灘方向後，<strong>外灘源商場</strong>是最靠譜的選項。</li>
            <li>· <strong>外灘→豫園商城：</strong>約2公里，步行約25分鐘。進入豫園商城前<strong>必須在方浜中路公共洗手間處理</strong>，商城內排隊時間不可控。</li>
            <li>· <strong>攜帶物：</strong>建議隨身帶紙巾/濕紙巾，地鐵站和商場洗手間有時紙巾缺貨。長時間徒步建議隨身攜帶一瓶水，既可補水亦可簡單清潔。</li>
            <li>· <strong>節假日：</strong>五一、國慶、春節等假期排隊時間可能增加3-5倍，建議提前一站在人少的點解決。</li>
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
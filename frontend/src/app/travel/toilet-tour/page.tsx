'use client';
import { useState } from 'react';
import Link from 'next/link';

type Toilet = {
  id: string;
  name: string;
  address: string;
  type: 'public' | 'mall' | 'metro' | 'park' | 'hotel';
  cleanliness: 4 | 5;
  fee: '免費' | '¥1-2' | '¥5' | '免費（需消費）';
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
  {
    id: 'sh-08',
    name: '和平飯店洗手間',
    address: '南京東路20號和平飯店大堂1樓（近外灘側）',
    type: 'hotel',
    cleanliness: 5,
    fee: '免費（需消費）',
    hours: '全天開放',
    entranceNote: '和平飯店貴賓可直接使用一樓大堂洗手間，需由禮賓部引導。非住客可在咖啡廳消費後使用，或請禮賓部協助。飯店裝修為1930年代Art Deco風格，洗手間保持五星級標準。',
    tips: '和平飯店毗鄰外灘，與南京東路步行街相連。推薦在外灘看完夜景後順路使用，是上海最高規格的洗手間之一。的非住客請在咖啡廳消費後使用，洗手間乾淨程度五星級。',
    distanceFromRoute: '外灘南京東路路口，步行約3分鐘',
    imagePath: '/toilet-tour/hangzhou-peace-1.jpg',
  },
  {
    id: 'sh-09',
    name: '人民廣場地鐵站洗手間',
    address: '上海市黃浦區人民廣場地鐵站1號線/2號線/8號線換乘大廳（近14號出口）',
    type: 'metro',
    cleanliness: 4,
    fee: '免費',
    hours: '05:30-23:00（地鐵營運時間）',
    entranceNote: '人民廣場站是上海地鐵最大的換乘站之一，洗手間位於地下一層換乘通道北側近14號出口位置。指示牌清晰，但節假日換乘人流極大，建議錯峰使用。高峰期排隊時間可達20分鐘。',
    tips: '人民廣場站連接1/2/8號線，是上海地鐵網絡的心臟。站內有多家便利店和餐飲店，可順路購買零食和飲水。從這裡步行至南京東路步行街約8分鐘，至外灘約15分鐘。',
    distanceFromRoute: '人民廣場地鐵站換乘大廳，步行約5分鐘',
    imagePath: '/toilet-tour/sh-peoplesquare.jpg',
  },
  {
    id: 'sh-10',
    name: '豫園老街公共洗手間',
    address: '上海市黃浦區豫園老街（近福佑路/方浜中路路口）',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '08:00-21:00',
    entranceNote: '豫園老街是連接豫園商城和城隍廟的重要步行街，洗手間在老街中段近方浜中路路口位置。路面為石板路，節假日人流密集，建議在進入老街前先在商城B1處理。老街洗手間空間有限，高峰期排隊可達15分鐘。',
    tips: '豫園老街是上海老城廂文化的代表，街兩側有大量小吃和手工藝品店。建議與豫園商城一同遊覽，先遊商城再逛老街，最後在老街上洗手間處理後離開。從老街可步行至上海古城公園。',
    distanceFromRoute: '豫園老街中段，步行約3分鐘',
    imagePath: '/toilet-tour/sh-yuyuan-oldstreet.jpg',
  },
];

// ── 杭州區塊（武林夜市 ↔ 吳山廣場 ↔ 河坊街 ↔ 南宋御街）────────────────────
const HANGZHOU_TOILETS: Toilet[] = [
  {
    id: 'hz-01',
    name: '武林夜市公共洗手間',
    address: '杭州市拱墅區武林路87號（武林夜市入口廣場東側）',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '16:00-23:00',
    entranceNote: '洗手間位於武林夜市入口左側，認準藍色公廁指示牌。夜間人潮洶湧，建議趁夜市剛開始（16:00-18:00）錯峰使用，否則平均排隊15分鐘。',
    tips: '武林夜市是杭州最熱鬧的夜市之一，美食攤位多達200家。洗手間數量有限，建議在進入夜市前先解決。附近沒有商場，公共洗手間是唯一選擇。',
    distanceFromRoute: '武林夜市入口左側約20公尺',
    imagePath: '/toilet-tour/hangzhou-hefang-1.jpg',
  },
  {
    id: 'hz-02',
    name: '河坊街/清河坊歷史街區公共洗手間',
    address: '杭州市上城區河坊街117號（胡慶余堂斜對面）',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '08:00-22:00',
    entranceNote: '洗手間在河坊街中段，藍色指示牌顯示「公共廁所」。街區為石板路面，略窄，春節期間人流密集時排隊可達20分鐘以上。胡慶余堂是中醫藥博物館，可順路參觀。',
    tips: '河坊街是杭州歷史文化的縮影，保存了大量明清建築。洗手間在胡雪巖故居（胡慶余堂）對面，建議參觀完博物館後直接使用。街道兩側有多處小型餐飲店，可順路購買小龍包或定勝糕。',
    distanceFromRoute: '河坊街中段，胡慶余堂對面，步行約2分鐘',
    imagePath: '/toilet-tour/hangzhou-huqingyu-1.jpg',
  },
  {
    id: 'hz-03',
    name: '南宋御街地下公共洗手間',
    address: '杭州市上城區中山中路62號（南宋御街地下商街南入口）',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '09:00-21:00',
    entranceNote: '南宋御街是南宋時期的皇宮專用道路，現為地下商街。洗手間在南入口右側，明清民國三朝石板路展示區旁。地下商街有空調，空氣流通，環境舒適。',
    tips: '南宋御街連接河坊街和城站火車站，是杭州老城區的中軸線。建議與河坊街一併遊覽，先逛河坊街再到御街。御街地下有很多老字號零食店，如知味觀、樓外樓。',
    distanceFromRoute: '南宋御街南入口，步行約5分鐘可達河坊街',
    imagePath: '/toilet-tour/hangzhou-songcity-1.jpg',
  },
  {
    id: 'hz-04',
    name: '吳山廣場公共洗手間',
    address: '杭州市上城區吳山廣場（吳山天風石刻旁，近河坊街出口）',
    type: 'public',
    cleanliness: 4,
    fee: '免費',
    hours: '06:00-22:00',
    entranceNote: '吳山廣場洗手間位於廣場東側，吳山天風大石刻旁。廣場每日06:00開放到22:00，早晨常有廣場舞和太極拳愛好者。節假日時廣場可聚集數萬人，此時排隊時間會大幅增加。',
    tips: '吳山廣場是杭州老城區的心臟，登上吳山可俯瞰西湖。廣場連接河坊街、十里皇城塔遺址，步行可達西湖音樂噴泉。推薦黄昏前登吳山看完日落，再下來使用洗手間。',
    distanceFromRoute: '吳山廣場東側，步行約3分鐘',
    imagePath: '/toilet-tour/hangzhou-songcity-2.jpg',
  },
  {
    id: 'hz-05',
    name: '胡慶余堂（胡雪巖故居）附設洗手間',
    address: '杭州市上城區河坊街大井巷95號（胡慶余堂園區內）',
    type: 'public',
    cleanliness: 5,
    fee: '免費（需消費）',
    hours: '08:30-17:00（胡慶余堂開放時間）',
    entranceNote: '胡雪巖創建的胡慶余堂是中醫藥博物館，園區內洗手間在入口兩側。洗手間保持五星級清潔程度，有專人打掃。門票30元，可免費使用園區洗手間。參觀時間約1小時。',
    tips: '胡慶余堂是中國最完整的民辦中醫藥博物館，展示了清代工商業文明。園區內有專人導覽服務（另收費），建議預留1.5-2小時。洗手間質量是整條河坊街最高者。',
    distanceFromRoute: '河坊街大井巷內，步行約3分鐘',
    imagePath: '/toilet-tour/hangzhou-hefang-3.jpg',
  },
  {
    id: 'hz-06',
    name: '定安路地鐵站洗手間',
    address: '杭州市上城區定安路地鐵站D出口（近西湖大道/吳山廣場方向）',
    type: 'metro',
    cleanliness: 4,
    fee: '免費',
    hours: '06:00-23:00（地鐵營運時間）',
    entranceNote: '定安路站是杭州地鐵1號線站點，洗手間位於地下一層站台區外側近D出口位置。站內指示牌清晰，有專人定期清潔。地鐵站洗手間比路面公共洗手間保持更穩定的清潔度。',
    tips: '定安路站人流相對較少，不像龍翔橋那般擁擠。從這裡往西走600米可達吳山廣場，東走500米可達河坊街南端。是杭州老城區地鐵網絡中較乾淨且少排隊的選項。',
    distanceFromRoute: '地鐵站站廳層，步行約2分鐘',
    imagePath: '/toilet-tour/hangzhou-dinganlu.jpg',
  },
  {
    id: 'hz-07',
    name: '龍翔橋地鐵站洗手間',
    address: '杭州市拱墅區龍翔橋地鐵站A出口（近延安路/西湖大道）',
    type: 'metro',
    cleanliness: 4,
    fee: '免費',
    hours: '06:00-23:00（地鐵營運時間）',
    entranceNote: '龍翔橋站是杭州地鐵1號線和龍翔橋公交樞紐的交匯站，洗手間在地下二層站台端頭近扶梯位置。站內人流量大，節假日經常排長隊，建議錯峰使用。早晚高峰（7:30-9:00、17:30-19:00）排隊時間可達15分鐘。',
    tips: '龍翔橋站是杭州地鐵最繁忙的站點之一，連接西湖大道和延安路。站內有商場和餐飲區，是武林商圈和西湖景區的中轉樞紐。從這裡步行至西湖斷橋約15分鐘，至靈隱寺有直達公交。',
    distanceFromRoute: '龍翔橋地鐵站站廳層，步行約3分鐘',
    imagePath: '/toilet-tour/hangzhou-longxiangqiao.jpg',
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
      {/* Image - 2x height */}
      <div className="relative w-full h-96 overflow-hidden bg-gray-100">
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
  const [selectedCity, setSelectedCity] = useState<'shanghai' | 'hangzhou'>('shanghai');
  const [filterType, setFilterType] = useState<string>('all');

  const currentToilets = selectedCity === 'shanghai' ? TOILETS : HANGZHOU_TOILETS;
  const filteredToilets = filterType === 'all'
    ? currentToilets
    : currentToilets.filter(t => t.type === filterType);

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
        {/* City Tabs */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => { setSelectedCity('shanghai'); setFilterType('all'); }}
            className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all ${
              selectedCity === 'shanghai'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-blue-50'
            }`}
          >
            🏙️ 上海 · 10處
          </button>
          <button
            onClick={() => { setSelectedCity('hangzhou'); setFilterType('all'); }}
            className={`flex-1 py-3 rounded-2xl font-bold text-base transition-all ${
              selectedCity === 'hangzhou'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-green-50'
            }`}
          >
            🌿 杭州 · 7處
          </button>
        </div>

        {/* City-specific Hero */}
        {selectedCity === 'shanghai' ? (
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-6 mb-5 text-white">
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
        ) : (
          <div className="bg-gradient-to-r from-green-700 to-green-500 rounded-2xl p-6 mb-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">🌿</span>
              <h2 className="text-lg font-bold">杭州 · 武林夜市 ↔ 吳山廣場 ↔ 河坊街</h2>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-1">
              武林夜市 → 河坊街/清河坊 → 南宋御街 → 吳山廣場。杭州老城區核心步行區，清新乾淨的洗手間分佈均勻，涵蓋夜市、歷史街區和景區。胡慶余堂提供五星級洗手間體驗。
            </p>
            <p className="text-white/60 text-xs">
              共收錄 {HANGZHOU_TOILETS.length} 處高評價洗手間 · 清潔度4-5星
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {[
            { id: 'all', label: '全部', count: currentToilets.length },
            { id: 'public', label: '🏛️ 公共', count: currentToilets.filter(t => t.type === 'public').length },
            { id: 'mall', label: '🏬 商場', count: currentToilets.filter(t => t.type === 'mall').length },
            ...(selectedCity === 'shanghai' && TOILETS.some(t => t.type === 'hotel')
              ? [{ id: 'hotel', label: '🏨 飯店', count: TOILETS.filter(t => t.type === 'hotel').length }]
              : []),
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filterType === f.id
                  ? selectedCity === 'shanghai' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
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

        {/* Route summary - Shanghai only */}
        {selectedCity === 'shanghai' && (
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
                  <p className="text-gray-600 text-xs mt-1">約1公里，步行約15分鐘。外灘沿線洗手間極少，<strong>外灘源商場B1</strong>是最靠譜的選項（清潔度5星）。和平飯店洗手間需消費或入住。的最佳選擇。</p>
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
        )}

        {/* Route summary - Hangzhou */}
        {selectedCity === 'hangzhou' && (
          <div className="mt-8 bg-green-50 rounded-2xl p-5 border border-green-100">
            <h3 className="text-base font-bold text-green-700 mb-3 flex items-center gap-2">
              <span className="text-xl">📋</span> 杭州段路線使用建議
            </h3>
            <div className="space-y-3 text-sm text-green-800 leading-relaxed">
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                <span className="text-xl">1️⃣</span>
                <div>
                  <p className="font-bold text-gray-800">武林夜市 → 河坊街</p>
                  <p className="text-gray-600 text-xs mt-1">武林夜市（傍晚16:00-18:00）→ 步行10分鐘至河坊街。武林夜市洗手間排隊時間波動大，建議一出夜市就處理。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                <span className="text-xl">2️⃣</span>
                <div>
                  <p className="font-bold text-gray-800">河坊街 → 南宋御街</p>
                  <p className="text-gray-600 text-xs mt-1">河坊街中段（胡慶余堂）→ 步行5分鐘至南宋御街南入口。南宋御街地下商街有空調，環境舒適，是河坊街的最佳補充。</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                <span className="text-xl">3️⃣</span>
                <div>
                  <p className="font-bold text-gray-800">南宋御街 → 吳山廣場</p>
                  <p className="text-gray-600 text-xs mt-1">南宋御街南入口 → 吳山廣場（步行約5分鐘）。建議黄昏前登吳山看完日落，下山時在廣場洗手間處理。吳山天風視野開闊，是杭州最佳夜景拍攝點之一。</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-yellow-50 rounded-2xl p-5 border border-yellow-100">
          <h3 className="text-sm font-bold text-yellow-700 mb-2 flex items-center gap-2">
            <span className="text-xl">💡</span> 實用提示
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800 leading-relaxed">
            <li>· <strong>隨身帶紙巾/濕紙巾</strong>，地鐵站和商場洗手間有時紙巾缺貨。</li>
            <li>· <strong>長時間徒步建議隨身攜帶一瓶水</strong>，既可補水亦可簡單清潔。</li>
            <li>· <strong>節假日</strong>（五一、國慶、春節）排隊時間可能增加3-5倍，建議提前一站在人少的點解決。</li>
            <li>· <strong>杭州胡慶余堂</strong>洗手間為五星級，清潔程度最高，建議與河坊街一同遊覽。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
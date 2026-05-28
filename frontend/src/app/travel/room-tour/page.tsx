'use client';
import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { id: 'all', label: '全部', emoji: '📷' },
  { id: 'room', label: '客房', emoji: '🛏️' },
  { id: 'suite', label: '套房', emoji: '🛋️' },
  { id: 'public', label: '公共區域', emoji: '🏛️' },
  { id: 'dining', label: '餐飲', emoji: '🍽️' },
  { id: 'facility', label: '設施', emoji: '🏋️' },
];

interface Photo {
  src: string;
  caption: string;
  category: string;
  location: string;
}

const HOTELS = {
  shanghai: {
    name: '上海嘉廷酒店',
    nameEn: 'Kingtown Riverside Hotel Plaza Shanghai',
    address: '上海靜安區新閘路126號（近昌平路）',
    color: 'from-blue-800 to-blue-600',
    source: undefined as string | undefined,
    photos: [
      { src: '/hotels/kingtown-plaza/shanghai/room_06.jpg', caption: '豪華客房（60平方米景觀空間）', category: 'room', location: '8-15樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_07.jpg', caption: '行政雙人床客房', category: 'room', location: '12-18樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_08.jpg', caption: '城市景觀客房（夜景）', category: 'room', location: '10-20樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_09.jpg', caption: '商務客房（辦公區配置）', category: 'room', location: '5-12樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_10.jpg', caption: '精緻雙床客房', category: 'room', location: '6-14樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_11.jpg', caption: '豪華套房臥室', category: 'room', location: '16-22樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_12.jpg', caption: '客房衛浴空間', category: 'room', location: '全館' },
      { src: '/hotels/kingtown-plaza/shanghai/room_15.jpg', caption: '精緻單人客房', category: 'room', location: '3-8樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_20.jpg', caption: '行政客房（加大床）', category: 'room', location: '18-25樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_02.jpg', caption: '豪華景觀客房', category: 'room', location: '5樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_03.jpg', caption: '商務客房', category: 'room', location: '6樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_09.jpg', caption: '行政套房', category: 'suite', location: '12樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_10.jpg', caption: '高級客房（加大床）', category: 'room', location: '13樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_11.jpg', caption: '精緻客房（mini bar）', category: 'room', location: '14樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_12.jpg', caption: '豪華景觀套房', category: 'room', location: '15樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_13.jpg', caption: '商務套房（客廳）', category: 'suite', location: '16樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_14.jpg', caption: '舒適客房（隔音設計）', category: 'room', location: '17樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_15.jpg', caption: '精緻客房（乾濕分離衛浴）', category: 'room', location: '18樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_16.jpg', caption: '豪華客房（景觀）', category: 'room', location: '19樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_17.jpg', caption: '商務套房', category: 'suite', location: '20樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_suite_01.jpg', caption: '尊享套房（60平方米）', category: 'suite', location: '20-25樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_suite_02.jpg', caption: '行政套房客廳', category: 'suite', location: '20-25樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_suite_03.jpg', caption: '尊享套房衛浴', category: 'suite', location: '20-25樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_suite_04.jpg', caption: '行政套房臥室', category: 'suite', location: '20-25樓' },
      { src: '/hotels/kingtown-plaza/shanghai/lobby_01.jpg', caption: '酒店大堂（挑高三層）', category: 'public', location: '1樓' },
      { src: '/hotels/kingtown-plaza/shanghai/lobby_02.jpg', caption: '大堂休閒區', category: 'public', location: '1樓' },
      { src: '/hotels/kingtown-plaza/shanghai/corridor_01.jpg', caption: '高空走廊景觀', category: 'public', location: '15樓' },
      { src: '/hotels/kingtown-plaza/shanghai/restaurant_01.jpg', caption: '自助餐廳', category: 'dining', location: '2樓' },
      { src: '/hotels/kingtown-plaza/shanghai/gym_01.jpg', caption: '健身中心', category: 'facility', location: '3樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_20.jpg', caption: '精緻雙人客房', category: 'room', location: '5樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_21.jpg', caption: '商務客房', category: 'room', location: '6樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_22.jpg', caption: '豪華景觀客房', category: 'room', location: '7樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_23.jpg', caption: '行政客房', category: 'room', location: '8樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_24.jpg', caption: '商務客房', category: 'room', location: '9樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_25.jpg', caption: '標準客房', category: 'room', location: '10樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_26.jpg', caption: '商務雙床房', category: 'room', location: '11樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_27.jpg', caption: '景觀客房', category: 'room', location: '12樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_28.jpg', caption: '家庭客房', category: 'room', location: '13樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_30.jpg', caption: '高級客房', category: 'room', location: '15樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_31.jpg', caption: '精緻客房', category: 'room', location: '16樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_32.jpg', caption: '豪華套房', category: 'suite', location: '17樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_33.jpg', caption: '商務套房', category: 'suite', location: '18樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_34.jpg', caption: '舒適客房', category: 'room', location: '19樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_35.jpg', caption: '精緻客房', category: 'room', location: '20樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_36.jpg', caption: '豪華客房', category: 'room', location: '3樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_37.jpg', caption: '商務套房', category: 'suite', location: '4樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_38.jpg', caption: '高級客房', category: 'room', location: '5樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_44.jpg', caption: '商務客房', category: 'room', location: '11樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_47.jpg', caption: '景觀客房', category: 'room', location: '14樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_50.jpg', caption: '高級客房', category: 'room', location: '17樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_52.jpg', caption: '豪華套房', category: 'suite', location: '19樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_53.jpg', caption: '商務套房', category: 'suite', location: '20樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_54.jpg', caption: '舒適客房', category: 'room', location: '3樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_55.jpg', caption: '精緻客房', category: 'room', location: '4樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_56.jpg', caption: '豪華客房', category: 'room', location: '5樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_57.jpg', caption: '商務套房', category: 'suite', location: '6樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_58.jpg', caption: '高級客房', category: 'room', location: '7樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_59.jpg', caption: '精緻客房', category: 'room', location: '8樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_61.jpg', caption: '商務客房', category: 'room', location: '10樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_62.jpg', caption: '豪華景觀客房', category: 'room', location: '11樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_63.jpg', caption: '行政客房', category: 'room', location: '12樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_64.jpg', caption: '商務客房', category: 'room', location: '13樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_65.jpg', caption: '標準客房', category: 'room', location: '14樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_66.jpg', caption: '商務雙床房', category: 'room', location: '15樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_67.jpg', caption: '景觀客房', category: 'room', location: '16樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_68.jpg', caption: '家庭客房', category: 'room', location: '17樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_70.jpg', caption: '高級客房', category: 'room', location: '19樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_71.jpg', caption: '精緻客房', category: 'room', location: '20樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_72.jpg', caption: '豪華套房', category: 'suite', location: '3樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_73.jpg', caption: '商務套房', category: 'suite', location: '4樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_74.jpg', caption: '舒適客房', category: 'room', location: '5樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_75.jpg', caption: '精緻客房', category: 'room', location: '6樓' },
      { src: '/hotels/kingtown-plaza/shanghai/room_new_76.jpg', caption: '豪華客房', category: 'room', location: '7樓' },
    ] as Photo[],
  },
  hangzhou: {
    name: '杭州大酒店',
    nameEn: 'Hangzhou Hotel ★★★★',
    address: '杭州延安西路と体育場路の交差点（武林広場エリア）',
    color: 'from-amber-700 to-amber-500',
    source: 'shanghainavi.com',
    photos: [
      { src: '/hotels/hangzhou-hotel/hangzhou/room_suite_01.jpg', caption: '尊享套房（湖景景觀）', category: 'suite', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_suite_02.jpg', caption: '行政套房客廳', category: 'suite', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_suite_03.jpg', caption: '尊享套房臥室', category: 'suite', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_suite_04.jpg', caption: '行政套房衛浴', category: 'suite', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_suite_05.jpg', caption: '豪華套房', category: 'suite', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_suite_06.jpg', caption: '標準套房', category: 'suite', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_01.jpg', caption: '標準客房（武林廣場景觀）', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_02.jpg', caption: '商務客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_03.jpg', caption: '豪華客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_04.jpg', caption: '景觀客房（城市天際線）', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_05.jpg', caption: '雙床客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_06.jpg', caption: '標準客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_07.jpg', caption: '商務客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_08.jpg', caption: '豪華客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_09.jpg', caption: '景觀客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_10.jpg', caption: '雙床客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_11.jpg', caption: '商務客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_12.jpg', caption: '豪華客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_13.jpg', caption: '景觀客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/room_14.jpg', caption: '精緻客房', category: 'room', location: '10-17樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/lobby_01.jpg', caption: '酒店大堂', category: 'public', location: '1樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/lobby_02.jpg', caption: '大堂休憩區', category: 'public', location: '1樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/restaurant_01.jpg', caption: '32F 旋轉餐廳「Revolving Restaurant」', category: 'dining', location: '32樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/restaurant_02.jpg', caption: '5F 中華餐廳「百合軒」', category: 'dining', location: '5樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/corridor_01.jpg', caption: '高空走廊景觀', category: 'public', location: '19-29樓' },
      { src: '/hotels/hangzhou-hotel/hangzhou/exterior_01.jpg', caption: '酒店外觀（日景）', category: 'public', location: '外觀' },
      { src: '/hotels/hangzhou-hotel/hangzhou/exterior_02.jpg', caption: '酒店外觀（武林廣場側）', category: 'public', location: '外觀' },
      { src: '/hotels/hangzhou-hotel/hangzhou/bathroom_01.jpg', caption: '衛浴空間（標準）', category: 'facility', location: '全館' },
      { src: '/hotels/hangzhou-hotel/hangzhou/bathroom_02.jpg', caption: '浴缸與備品 \u7535', category: 'facility', location: '全館' },
      { src: '/hotels/hangzhou-hotel/hangzhou/view_01.jpg', caption: '武林廣場景觀（北向き）', category: 'facility', location: '高層客房' },
    ] as Photo[],
  },
wuzhenYoushe: {
    name: '烏鎮悠舍悠得藝術酒店（西柵店）',
    nameEn: 'Wuzhen Youshe Art Hotel (Xizha)',
    address: '烏鎮鎮環河路59號（西柵北門步行2分鐘）',
    color: 'from-teal-700 to-teal-500',
    source: 'cncn.com',
    photos: [
      { src: '/hotels/wuzhen-youshe/exterior_01.jpg', caption: '酒店外觀（古典與藝術結合）', category: 'public', location: '外觀' },
      { src: '/hotels/wuzhen-youshe/lobby_01.jpg', caption: '酒店大堂', category: 'public', location: '1樓' },
      { src: '/hotels/wuzhen-youshe/corridor_01.jpg', caption: '走廊景觀', category: 'public', location: '全館' },
      { src: '/hotels/wuzhen-youshe/room_01.jpg', caption: '精緻客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_02.jpg', caption: '商務客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_03.jpg', caption: '豪華客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_04.jpg', caption: '景觀客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_05.jpg', caption: '雙床客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_06.jpg', caption: '標準客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_07.jpg', caption: '商務客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_08.jpg', caption: '豪華客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_09.jpg', caption: '景觀客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_10.jpg', caption: '雙床客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_11.jpg', caption: '商務客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_12.jpg', caption: '豪華客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_13.jpg', caption: '景觀客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_14.jpg', caption: '精緻客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_15.jpg', caption: '商務客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_16.jpg', caption: '豪華客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_17.jpg', caption: '景觀客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_18.jpg', caption: '雙床客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_19.jpg', caption: '商務客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_20.jpg', caption: '標準客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_21.jpg', caption: '豪華客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_22.jpg', caption: '景觀客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_23.jpg', caption: '精緻客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_24.jpg', caption: '商務客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_25.jpg', caption: '豪華客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/room_26.jpg', caption: '景觀客房', category: 'room', location: '2-5樓' },
      { src: '/hotels/wuzhen-youshe/bathroom_01.jpg', caption: '衛浴空間', category: 'facility', location: '全館' },
      { src: '/hotels/wuzhen-youshe/bathroom_02.jpg', caption: '衛浴設施', category: 'facility', location: '全館' },
      { src: '/hotels/wuzhen-youshe/bathroom_03.jpg', caption: '備品配置', category: 'facility', location: '全館' },
    ] as Photo[],
  },
};

type HotelKey = keyof typeof HOTELS;

export default function RoomTourPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [activeHotel, setActiveHotel] = useState<HotelKey>('shanghai');

  type HotelData = typeof HOTELS[HotelKey];
  const hotel: HotelData = HOTELS[activeHotel];
  const filtered =
    activeCategory === 'all'
      ? hotel.photos
      : hotel.photos.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${hotel.color} text-white`}>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <Link href="/travel" className="text-white/80 hover:text-white text-sm">
              ← 返回首頁
            </Link>
            <Link href="/travel/planner" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              🗓️ 行程規劃
            </Link>
          </div>

          {/* Hotel selector */}
          <div className="flex gap-3 mb-4 flex-wrap">
            {(Object.keys(HOTELS) as HotelKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveHotel(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeHotel === key
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                {HOTELS[key].name}
              </button>
            ))}
          </div>

          <h1 className="text-4xl font-bold mb-2">🏨 Room Tour</h1>
          <p className="text-white/80 text-lg">{hotel.name} · {hotel.nameEn}</p>
          <p className="text-white/60 text-sm mt-1">📍 {hotel.address}</p>
          <p className="text-white/40 text-xs mt-1">圖片來源：{hotel.source}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-gray-800 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
          <span className="ml-auto text-gray-500 text-sm self-center">
            {filtered.length} 張照片
          </span>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setLightbox(photo)}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-200 cursor-zoom-in"
            >
              <img
                src={photo.src}
                alt={photo.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.caption}
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                {photo.location}
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📷</div>
            <p>此分類暫無照片</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl w-10 h-10 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.caption}
              className="w-full max-h-[75vh] object-contain rounded-lg"
            />
            <div className="mt-4 text-center">
              <p className="text-white text-lg font-medium">{lightbox.caption}</p>
              <p className="text-white/60 text-sm mt-1">📍 {lightbox.location}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

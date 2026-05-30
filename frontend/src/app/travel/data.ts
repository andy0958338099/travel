export interface Attraction {
  name: string;
  nameEn?: string;
  ticket: string;
  hours: string;
  highlight: string;
  lat: number;
  lng: number;
  category: 'westLake' | 'wuzhen' | 'other';
  images?: string[]; // relative paths from /public/attractions/
}

export const ATTRACTIONS: { westLake: Attraction[]; wuzhen: Attraction[]; other: Attraction[] } = {
  westLake: [
    { name: "西湖（主湖區）", nameEn: "West Lake", ticket: "免費", hours: "24小時開放", highlight: "建議清晨或傍晚漫步，可騎自行車環湖", lat: 30.2464, lng: 120.1489, category: 'westLake', images: ["/attractions/wl01-1.jpg", "/attractions/wl01-2.jpg", "/attractions/wl01-3.jpg"] },
    { name: "雷峰塔", nameEn: "Leifeng Pagoda", ticket: "¥40", hours: "08:00-17:30", highlight: "可俯瞰西湖全景，登塔看夕陽", lat: 30.2317, lng: 120.1483, category: 'westLake', images: ["/attractions/wl02-1.jpg", "/attractions/wl02-2.jpg", "/attractions/wl02-3.jpg"] },
    { name: "靈隱寺", nameEn: "Lingyin Temple", ticket: "¥45+¥55", hours: "07:00-18:00", highlight: "杭州最古老寺廟，香火鼎盛", lat: 30.2378, lng: 120.0867, category: 'westLake', images: ["/attractions/wl03-1.jpg", "/attractions/wl03-2.jpg", "/attractions/wl03-3.jpg"] },
    { name: "飛來峰", nameEn: "Feilai Feng", ticket: "¥45", hours: "07:00-18:00", highlight: "靈隱寺旁的石窟山，500多尊佛像雕刻", lat: 30.2368, lng: 120.0847, category: 'westLake', images: ["/attractions/wl11-best1.jpg"] },
    { name: "永福寺", nameEn: "Yongfu Temple", ticket: "¥30", hours: "07:00-18:00", highlight: "靈隱寺旁的古剎，環境清幽，被譽為「最美尼姑庵」", lat: 30.2408, lng: 120.0897, category: 'westLake', images: ["/attractions/wl12-best1.jpg", "/attractions/wl12-1.jpg"] },
    { name: "龍井茶園", nameEn: "Longjing Tea Plantation", ticket: "免費入園", hours: "全天", highlight: "西湖龍井茶核心產區，品茶體驗¥50-200", lat: 30.2558, lng: 120.1083, category: 'westLake', images: ["/attractions/wl04-best1.jpg", "/attractions/wl04-2.jpg", "/attractions/wl04-3.jpg"] },
    { name: "河坊街", nameEn: "Hefang Street", ticket: "免費", hours: "店家約10:00-22:00", highlight: "古色古香步行街，必吃蔥包檜、定勝糕", lat: 30.2485, lng: 120.1523, category: 'westLake', images: ["/attractions/wl05-best1.jpg", "/attractions/wl05-1.jpg", "/attractions/wl05-2.jpg", "/attractions/wl05-3.jpg"] },
    { name: "蘇堤", nameEn: "Su Causeway", ticket: "免費", hours: "24小時", highlight: "蘇東坡所建，六大景區之首，漫步賞湖景", lat: 30.2424, lng: 120.1323, category: 'westLake', images: ["/attractions/wl06-best1.jpg", "/attractions/wl06-2.jpg", "/attractions/wl06-3.jpg"] },
    { name: "斷橋殘雪", nameEn: "Broken Bridge", ticket: "免費", hours: "24小時", highlight: "西湖標誌性景點，冬季賞雪最佳", lat: 30.2524, lng: 120.1523, category: 'westLake', images: ["/attractions/wl07-best1.jpg", "/attractions/wl07-2.jpg", "/attractions/wl07-3.jpg"] },
    { name: "三潭印月", nameEn: "Three Pools Mirroring the Moon", ticket: "¥55(含遊船)", hours: "視船班", highlight: "西湖最大島，需搭船前往", lat: 30.2384, lng: 120.1443, category: 'westLake', images: ["/attractions/wl08-1.jpg", "/attractions/wl08-2.jpg", "/attractions/wl08-3.jpg"] },
    { name: "湖濱步行街", nameEn: "Hubin Pedestrian Street", ticket: "免費", hours: "24小時", highlight: "西湖畔繁華商圈，音樂噴泉必看", lat: 30.2484, lng: 120.1553, category: 'westLake', images: ["/attractions/wl13-best1.jpg", "/attractions/wl13-1.jpg", "/attractions/wl13-2.jpg"] },
    { name: "西湖天地", nameEn: "West Lake Tiandi", ticket: "免費", hours: "視店家", highlight: "時尚餐飲區，網紅打卡點", lat: 30.2454, lng: 120.1523, category: 'westLake', images: ["/attractions/wl09-best1.jpg", "/attractions/wl09-2.jpg", "/attractions/wl09-3.jpg"] },
    { name: "南高峰", nameEn: "South Longmen Peak", ticket: "免費", hours: "24小時", highlight: "可徒步登山，俯瞰西湖", lat: 30.2314, lng: 120.1183, category: 'westLake', images: ["/attractions/wl10-best1.jpg", "/attractions/wl10-1.jpg", "/attractions/wl10-2.jpg", "/attractions/wl10-3.jpg"] },
  ],
  wuzhen: [
    { name: "烏鎮西柵", nameEn: "Wuzhen Xizha", ticket: "¥150", hours: "09:00-22:00", highlight: "夜景必看！燈光秀美，保存最完整的江南水鄉風貌", lat: 30.7442, lng: 120.4875, category: 'wuzhen', images: ["/attractions/wz01-best1.jpg", "/attractions/wz01-2.jpg", "/attractions/wz01-3.jpg"] },
    { name: "烏鎮東柵", nameEn: "Wuzhen Dongzheng", ticket: "¥110", hours: "07:00-18:00", highlight: "較原始的風貌，民俗館、染坊等", lat: 30.7392, lng: 120.4855, category: 'wuzhen', images: ["/attractions/wz02-best1.jpg", "/attractions/wz02-2.jpg", "/attractions/wz02-3.jpg"] },
    { name: "東西柵聯票", nameEn: "Wuzhen Combined Ticket", ticket: "¥200", hours: "各景區開放時間", highlight: "建議購買聯票，一次玩完", lat: 30.7420, lng: 120.4865, category: 'wuzhen', images: ["/attractions/wz01-best1.jpg", "/attractions/wz02-best1.jpg", "/attractions/wz03-2.jpg"] },
    { name: "木心美術館", nameEn: "Muxin Art Museum", ticket: "¥20", hours: "09:00-17:30(週一閉館)", highlight: "紀念藝術家木心，建築大師陳丹青設計", lat: 30.7462, lng: 120.4895, category: 'wuzhen', images: ["/attractions/wz04-best1.jpg", "/attractions/wz04-2.jpg", "/attractions/wz04-3.jpg"] },
  ],
  other: [
    { name: "宋城千古情", nameEn: "Songcheng Song of Song", ticket: "¥300(含演出)", hours: "10:00-21:00", highlight: "被譽為「一生必看的演出」", lat: 30.1824, lng: 120.0483, category: 'other', images: ["/attractions/ot01-1.jpg", "/attractions/ot01-2.jpg"] },
    { name: "西塘古鎮", nameEn: "Xitang Ancient Town", ticket: "¥95", hours: "24小時開放", highlight: "保存完好的明清古建築群，煙雨長廊聞名", lat: 30.9564, lng: 120.8903, category: 'other', images: ["/attractions/ot02-1.jpg", "/attractions/ot02-2.jpg", "/attractions/ot02-3.jpg"] },
    { name: "昭明書院", nameEn: "Zhaoming Academy", ticket: "含於西柵門票", hours: "09:00-22:00", highlight: "烏鎮西柵內，南朝太子讀書遺址", lat: 30.7448, lng: 120.4875, category: 'other', images: ["/attractions/wz05-best1.jpg", "/attractions/wz05-1.jpg"] },
    { name: "藍印花布作坊", nameEn: "Blue Calico Workshop", ticket: "含於西柵門票", hours: "09:00-22:00", highlight: "烏鎮傳統印染工藝體驗", lat: 30.7452, lng: 120.4868, category: 'other', images: ["/attractions/wz06-best1.jpg", "/attractions/wz06-1.jpg"] },
    { name: "白蓮塔", nameEn: "White Lotus Pagoda", ticket: "含於西柵門票", hours: "09:00-22:00", highlight: "烏鎮西柵最高建築，可登塔俯瞰水鄉", lat: 30.7448, lng: 120.4885, category: 'other', images: ["/attractions/wz07-best1.jpg", "/attractions/wz07-1.jpg"] },
    { name: "搖櫓船", nameEn: "Rowboat Ride", ticket: "¥120-180/船", hours: "09:00-22:00", highlight: "烏鎮水鄉代表性體驗，穿梭石板水道", lat: 30.7442, lng: 120.4875, category: 'other', images: ["/attractions/wz08-best1.jpg", "/attractions/wz08-1.jpg"] },
    { name: "茅盾故居", nameEn: "Mao Dun Former Residence", ticket: "¥25", hours: "08:30-17:00", highlight: "烏鎮東柵內，紀念文學家茅盾", lat: 30.7398, lng: 120.4852, category: 'other', images: ["/attractions/wz09-best1.jpg", "/attractions/wz09-1.jpg"] },
    { name: "豫園", nameEn: "Yu Garden", ticket: "¥40", hours: "09:00-17:00", highlight: "明代江南古典園林，上海必遊", lat: 31.2276, lng: 121.4895, category: 'other', images: ["/attractions/sh01-best1.jpg", "/attractions/sh01-1.jpg"] },
    { name: "城隍廟", nameEn: "City God Temple", ticket: "免費（商場）", hours: "09:00-21:00", highlight: "上海老城廂核心，小吃林立", lat: 31.2269, lng: 121.4915, category: 'other', images: ["/attractions/sh02-best1.jpg", "/attractions/sh02-1.jpg"] },
    { name: "武康路", nameEn: "Wukang Road", ticket: "免費", hours: "24小時", highlight: "上海最美落日街道，歷史建築博覽", lat: 31.2068, lng: 121.4355, category: 'other', images: ["/attractions/sh03-best1.jpg", "/attractions/sh03-1.jpg"] },
    { name: "武康大樓", nameEn: "Wukang Building", ticket: "免費", hours: "24小時", highlight: "上海網紅打卡地標，武康路icon", lat: 31.2073, lng: 121.4368, category: 'other', images: ["/attractions/sh04-best1.jpg", "/attractions/sh04-1.jpg"] },
    { name: "外灘夜景", nameEn: "The Bund Night View", ticket: "免費", hours: "24小時", highlight: "萬國建築博覽群，黃浦江畔必看", lat: 31.2408, lng: 121.4905, category: 'other', images: ["/attractions/sh05-best1.jpg", "/attractions/sh05-1.jpg"] },
    { name: "京杭大運河遊船", nameEn: "Grand Canal Cruise", ticket: "¥80-150", hours: "視船班", highlight: "世界上最長古代運河，夜遊船特別推薦", lat: 30.2744, lng: 120.1523, category: 'other', images: ["/attractions/ot04-best1.jpg"] },
    { name: "千島湖", nameEn: "Qiandao Lake", ticket: "¥130", hours: "08:00-17:00", highlight: "距杭州市區約2小時，1078個島嶼", lat: 29.8414, lng: 119.2163, category: 'other', images: ["/attractions/qd01-best1.jpg", "/attractions/qd01-1.jpg"] },
    { name: "西溪濕地", nameEn: "Xixi Wetland", ticket: "¥80(含電瓶車)", hours: "07:30-18:30", highlight: "城市濕地，電影《非誠勿擾》拍攝地", lat: 30.2634, lng: 120.0623, category: 'other', images: ["/attractions/xx01-best1.jpg", "/attractions/xx01-1.jpg"] },
    // ── 上海新品（2026-05-16 新行程）─────────────────────
    { name: "南京東路步行街", nameEn: "Nanjing East Road Pedestrian Street", ticket: "免費", hours: "24小時開放", highlight: "上海最繁華商業街，百貨商場林立，建議傍晚前往", lat: 31.2370, lng: 121.4905, category: 'other', images: ["/attractions/sh05-1.jpg", "/attractions/sh05-best1.jpg"] },
    { name: "小楊生煎", nameEn: "Xiaoyang Shengjian", ticket: "¥15-30", hours: "06:30-20:00", highlight: "上海知名生煎包連鎖，外皮酥脆多汁", lat: 31.2270, lng: 121.4895, category: 'other', images: ["/attractions/sh07-best1.jpg", "/attractions/sh07-1.jpg", "/attractions/sh07-2.jpg", "/attractions/sh07-3.jpg", "/attractions/sh07-4.jpg"] },
    { name: "南翔饅頭", nameEn: "Nanxiang Steamed Bun", ticket: "¥20-40", hours: "07:00-20:00", highlight: "豫園內超人氣小籠包老店，必吃蟹粉小籠", lat: 31.2276, lng: 121.4900, category: 'other', images: ["/attractions/sh08-best1.jpg", "/attractions/sh08-1.jpg", "/attractions/sh08-2.jpg"] },
    { name: "海底撈火鍋", nameEn: "Haidilao Hotpot", ticket: "¥150-400/人", hours: "24小時", highlight: "上海外攤店，服務聞名，營業至凌晨", lat: 31.2355, lng: 121.4905, category: 'other', images: ["/attractions/sh06-5.jpg", "/attractions/sh06-6.jpg", "/attractions/sh06-7.jpg", "/attractions/sh06-8.jpg", "/attractions/sh06-9.jpg", "/attractions/sh06-10.jpg"] },
    // ── 西塘/烏鎮新品（2026-05-16 新行程）─────────────────
    { name: "江南戲曲服飾", nameEn: "Jiangnan Opera Costume Experience", ticket: "¥80-150", hours: "08:00-18:00", highlight: "西塘古鎮內換裝拍照體驗，專業戲曲服飾與妝髮", lat: 30.9564, lng: 120.8905, category: 'other', images: ["/attractions/sh09-best1.jpg", "/attractions/sh09-1.jpg", "/attractions/sh09-2.jpg", "/attractions/sh09-3.jpg", "/attractions/sh09-4.jpg"] },
    { name: "水宴餐廳", nameEn: "Shuiyan Restaurant", ticket: "¥80-150/人", hours: "11:00-21:00", highlight: "烏鎮東柵附近水鄉菜餐廳，在地口味", lat: 30.7400, lng: 120.4865, category: 'other', images: ["/attractions/sh10-best1.jpg", "/attractions/sh10-1.jpg", "/attractions/sh10-2.jpg", "/attractions/sh10-3.jpg", "/attractions/sh10-4.jpg"] },
    { name: "椒鹽醄醄火鍋", nameEn: "Jiaoyan Peppercorn Hotpot", ticket: "¥100-180/人", hours: "11:00-22:00", highlight: "西塘古鎮內特色火鍋，椒鹽口味獨特", lat: 30.9564, lng: 120.8910, category: 'other', images: ["/attractions/sh10-1.jpg", "/attractions/sh09-2.jpg", "/attractions/sh09-3.jpg", "/attractions/sh09-4.jpg"] },
    // ── 杭州新品（2026-05-16 新行程）─────────────────────
    { name: "武林夜市", nameEn: "Wulin Night Market", ticket: "免費", hours: "17:00-23:00", highlight: "杭州最大夜市之一，小吃服飾齊全，體驗在地生活", lat: 30.2485, lng: 120.1555, category: 'other', images: ["/attractions/wl14-best1.jpg", "/attractions/wl14-1.jpg", "/attractions/wl14-2.jpg", "/attractions/wl14-3.jpg", "/attractions/wl14-4.jpg"] },
    { name: "游埠豆漿", nameEn: "Youbu Soy Milk", ticket: "¥15-30", hours: "05:30-12:00", highlight: "杭州老字號早餐店，必吃鹹豆漿配油條，凌晨4點就開門", lat: 30.2500, lng: 120.1480, category: 'other', images: ["/attractions/wl15-best1.jpg", "/attractions/wl15-1.jpg", "/attractions/wl15-2.jpg", "/attractions/wl15-3.jpg", "/attractions/wl15-4.jpg", "/attractions/wl15-5.jpg", "/attractions/wl15-6.jpg", "/attractions/wl15-7.jpg"] },
    { name: "大馬弄", nameEn: "Damalu Breakfast Market", ticket: "免費", hours: "06:00-12:00", highlight: "杭州最具市井氣息的早餐市集，隱藏版在地美食", lat: 30.2502, lng: 120.1485, category: 'other', images: ["/attractions/wl16-best1.jpg", "/attractions/wl16-1.jpg", "/attractions/wl16-2.jpg", "/attractions/wl16-3.jpg"] },
    { name: "馬鴻興川小館", nameEn: "Majingxing Restaurant", ticket: "¥80-150/人", hours: "11:00-21:30", highlight: "杭州河坊街附近老字號杭幫菜，性價比高", lat: 30.2550, lng: 120.1650, category: 'other', images: ["/attractions/wl17-best1.jpg", "/attractions/wl17-1.jpg", "/attractions/wl17-2.jpg", "/attractions/wl17-3.jpg", "/attractions/wl17-4.jpg", "/attractions/wl17-5.jpg", "/attractions/wl17-6.jpg"] },
    { name: "宮宴", nameEn: "Gongyan Palace Restaurant", ticket: "¥300-500/人", hours: "11:00-21:00", highlight: "沉浸式宮廷主題餐廳，穿古裝用餐，環境華麗", lat: 30.2650, lng: 120.1350, category: 'other', images: ["/attractions/wl18-best1.jpg", "/attractions/wl18-1.jpg", "/attractions/wl18-2.jpg", "/attractions/wl18-3.jpg", "/attractions/wl18-4.jpg", "/attractions/wl18-5.jpg", "/attractions/wl18-6.jpg"] },
  ],
};

// Flatten all attractions for map display
export const ALL_ATTRACTIONS: Attraction[] = [
  ...ATTRACTIONS.westLake,
  ...ATTRACTIONS.wuzhen,
  ...ATTRACTIONS.other,
];

export const HOTELS = {
  shanghai: [
    { name: "上海外攤茂悅大酒店", location: "外攤北段", price: "¥800-1,500/晚", highlight: "可看黃浦江夜景，位置絕佳" },
    { name: "上海和平飯店", location: "外攤", price: "¥2,000-5,000/晚", highlight: "百年傳奇飯店，歷史風情" },
    { name: "上海艾美酒店", location: "新天地", price: "¥900-1,600/晚", highlight: "時尚商圈，靠近淮海路" },
  ],
  xitang: [
    { name: "西塘煙雨江南客棧", location: "古鎮內", price: "¥200-500/晚", highlight: "住在古鎮內，賞煙雨長廊晨昏" },
    { name: "西塘人家客棧", location: "古鎮內", price: "¥150-400/晚", highlight: "明清古建築改建，極具韻味" },
  ],
  wuzhen: [
    { name: "烏鎮西柵景區內民宿", price: "¥400-1,200/晚", highlight: "住在景區內可賞夜景，體驗水鄉晨昏" },
    { name: "烏鎮黃金水岸大酒店", price: "¥300-600/晚", highlight: "性價比高，有接送服務" },
  ],
  hangzhouLuxury: [
    { name: "杭州凱悅酒店", location: "西湖天地旁", price: "¥1,200-2,500/晚", highlight: "正對西湖，位置絕佳" },
    { name: "杭州西子湖四季酒店", location: "西湖國賓館區", price: "¥3,000-6,000/晚", highlight: "別墅式酒店，庭院景觀" },
  ],
  hangzhouMid: [
    { name: "杭州馬可波羅濱江酒店", location: "錢塘江畔", price: "¥500-900/晚", highlight: "可看錢塘江夜景" },
    { name: "杭州黃龍飯店", location: "黃龍商圈", price: "¥400-700/晚", highlight: "老牌五星，交通方便" },
    { name: "全季酒店(斷橋店)", location: "斷橋附近", price: "¥300-500/晚", highlight: "經濟實惠，位置極佳" },
  ],
};

export const TRANSPORT = {
  airport: [
    { method: "地鐵1號線", duration: "約50分", price: "約¥20", route: "機場→武林廣場→龍翔橋" },
    { method: "機場大巴", duration: "約60-90分", price: "約¥20-40", route: "有多條線路可達市區各點" },
    { method: "計程車/滴滴", duration: "約40-60分", price: "約¥100-180", route: "建議使用滴滴打車App" },
  ],
  toWuzhen: [
    { method: "大巴", duration: "約1.5-2小時", price: "約¥40-60", frequency: "約30-60分鐘一班", route: "杭州客運中心(九堡)/杭州東站" },
    { method: "高鐵+大巴", duration: "約40分", price: "約¥45", route: "高鐵到桐鄉站+大巴20分鐘" },
  ],
};

export const TIPS = [
  "支付寶是必須的：地鐵、公車、商店、餐廳，支付寶一機搞定，強烈建議在機場就先開通",
  "現金仍需準備：部分傳統市場、路邊攤只收現金",
  "7月是雨季，帶好雨具和薄外套",
  "杭州到烏鎮的大巴班次很多，不用提前預訂，當天去車站買票即可",
  "西柵景區內住宿可多次進出，建議住景區內好好體驗水鄉晨昏",
  "龍井茶不要在景區買，可去龍井村向茶農直接購買更實惠",
  "外賣用「餓了麼」App，和支付寶整合很好用",
  "建議帶行動電源和萬用轉接頭（中國插座為兩腳扁型）",
  "可提前在台灣開通國際漫遊，或在淘寶買中國門號卡",
];

export const ITINERARY = [
  {
    day: "Day 1",
    title: "7/17：抵達杭州",
    highlight: "桃園起飛 → 杭州 → 西湖初印象 → 斷橋夕陽",
    content: `上午：桃園國際機場 起飛（11:15-13:20）→ 杭州蕭山機場 → 搭地鐵/大巴前往市區 → 入住飯店

下午：西湖漫步（從飯店附近開始）→ 斷橋殘雪 → 白堤
晚上：西湖天地晚餐 → 看音樂噴泉`,
    meals: { breakfast: "機上", lunch: "西湖天地（綠茶餐廳）", dinner: "西湖天地" },
    transport: "地鐵1號線→龍翔橋站",
    budget: "機票+機場交通 ¥4,500-8,000"
  },
  {
    day: "Day 2",
    title: "7/18：西湖深度一日",
    highlight: "蘇堤騎車 → 雷峰塔登高 → 三潭印月遊湖 → 龍井品茶",
    content: `清晨：蘇堤騎自行車（¥30/小時）→ 看日出
上午：雷峰塔（登塔看全景）→ 南高峰登高
午餐：外婆家（杭幫菜連鎖）
下午：遊船西湖（三潭印月）→ 龍井茶園品茶
晚上：河坊街夜市覓食`,
    meals: { breakfast: "飯店", lunch: "外婆家 ¥50-80/人", dinner: "河坊街小吃" },
    transport: "步行+公交/電動車",
    budget: "門票+餐食 ¥300-500/人"
  },
  {
    day: "Day 3",
    title: "7/19：靈隱寺 + 茶文化",
    highlight: "靈隱寺祈福 → 飛來峰石窟 → 龍井村採茶體驗",
    content: `上午：靈隱寺燒香祈福 → 飛來峰石窟造像
午餐：靈隱寺素麵（知味觀）或附近茶樓
下午：龍井村徒步 → 體驗採茶/炒茶（¥100-200體驗費）
傍晚：返回市區，錢塘江畔看夕陽
晚上：南宋御街/河坊街購物`,
    meals: { breakfast: "飯店", lunch: "靈隱素麵 ¥30-50/人", dinner: "知味觀 ¥80-120/人" },
    transport: "公交車/滴滴",
    budget: "門票+體驗 ¥200-400/人"
  },
  {
    day: "Day 4",
    title: "7/20：宋城演藝 or 運河風情",
    highlight: "宋城千古情演出 OR 京杭運河遊船",
    content: `【A行程 - 宋城】
全天：宋城主題樂園 + 《宋城千古情》演出
《宋城千古情》被譽為「一生必看」，展現杭州歷史

【B行程 - 慢遊市井】
上午：京杭大運河遊船 → 小河直街歷史街區
下午：拱宸橋 → 刀剪劍博物館/傘博物館（免費）
傍晚：武林廣場附近逛街
晚上：可選看《最憶是杭州》演出（¥300-500）`,
    meals: { breakfast: "飯店", lunch: "宋城或運河附近 ¥60-100/人", dinner: "武林商圈 ¥80-150/人" },
    transport: "地鐵/滴滴",
    budget: "宋城¥300 或 運河¥120"
  },
  {
    day: "Day 5",
    title: "7/21：出發前往烏鎮",
    highlight: "杭州 → 烏鎮 → 東柵古蹟 → 西柵夜景",
    content: `上午：睡到自然醒 → 整理行李退房
09:30 從杭州客運中心出發
10:30-11:00 抵達烏鎮 → 入住飯店
中午：西柵外圍午餐（物美價廉）
下午：遊覽東柵景區 → 染坊 → 藍印花布作坊 → 茅盾故居
傍晚：進入西柵 → 入住景區內民宿或黃金水岸大酒店
晚上：西柵夜景（燈光秀、搖櫓船夜遊¥80）`,
    meals: { breakfast: "飯店", lunch: "烏鎮 ¥60-100/人", dinner: "西柵內水鄉菜" },
    transport: "杭州→烏鎮大巴 ¥40-60/人",
    budget: "門票¥110+交通¥60+住宿¥400-800"
  },
  {
    day: "Day 6",
    title: "7/22：烏鎮西柵全天",
    highlight: "西柵晨景 → 白蓮塔 → 木心美術館 → 水鄉夜色",
    content: `清晨：西柵晨景（清晨6-8點遊客最少，水鄉晨霧）
上午：西柵老街 → 白蓮塔 → 昭明書院 → 烏將軍府
午餐：西柵水上餐廳（新鮮河鮮）
下午：木心美術館 → 參觀各式作坊（釀酒、織布、竹雕）
傍晚：在茶館喝下午茶，看水鄉夕陽
晚上：二次夜遊西柵（住景區內可多次進出）`,
    meals: { breakfast: "民宿早餐", lunch: "水上餐廳 ¥100-150/人", dinner: "西柵特色菜" },
    transport: "景區內步行+接駁車",
    budget: "木心¥20+活動¥50-100"
  },
  {
    day: "Day 7",
    title: "7/23：烏鎮 → 杭州 → 返程準備",
    highlight: "烏鎮最後巡禮 → 返回杭州 → 免稅店購物 → 晚班機返程",
    content: `清晨：最後一次晨遊西柵（可看8:30前的晨景）
上午：彌補昨晚沒看完的景點 → 購買烏鎮特產（藍印花布、絲綢）
10:00-11:00 退房，搭大巴返回杭州
12:00-13:00 抵達杭州 → 午餐

下午：自由活動（絲綢、茶葉、龍井茶採購）
傍晚：前往機場（建議地鐵避免塞車）
晚上：杭州機場免稅店購物 → 準備返程（19:50起飛）`,
    meals: { breakfast: "民宿", lunch: "杭州外婆家", dinner: "機上" },
    transport: "烏鎮→杭州大巴 ¥40-60/人",
    budget: "門票¥130+交通¥60+免稅購物"
  },
  {
    day: "Day 8",
    title: "7/24：返程",
    highlight: "杭州起飛 → 桃園抵達 → 帶回滿滿回憶",
    content: `上午：杭州蕭山機場 起飛（19:50-21:50）
中午：機上
下午：21:50 抵達桃園國際機場

【行程總結】
• 總費用估算：每人 NT$40,000-60,000
  - 機票：NT$8,000-22,000（來回）
  - 住宿：NT$8,000-15,000（7晚）
  - 門票+活動：NT$3,000-5,000
  - 餐食：NT$3,000-6,000
  - 交通：NT$2,000-3,000`,
    meals: { breakfast: "機上", lunch: "機上", dinner: "溫暖的家" },
    transport: "杭州地鐵→機場",
    budget: "免費"
  },
];
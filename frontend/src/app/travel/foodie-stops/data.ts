/**
 * 網紅名店資料 (foodie-stops) — 飲料/伴手禮/街邊名小吃
 *
 * ★ 設計定位: 跟 dining 餐廳食記互補
 *   - dining: 坐下來吃 (人均 ¥80-500)
 *   - foodie-stops: 隨手買/外帶/打卡 (人均 ¥10-50)
 *
 * ★ 圖片策略: stock photo 禁用
 *   - 真實照抓不到 → 灰底 placeholder (/foodie-stops/placeholder-*.jpg)
 *   - 連鎖店 (瑞幸/蜜雪冰城) 共用 path 即可
 *
 * ★ 瑞幸 MCP 整合: 瑞幸卡片保留 mcpConfig 欄位
 *   - 沒有公開 MCP server (搜尋結果 0 命中)
 *   - user 拿到/部署 MCP server 後填入 serverUrl + authToken 即可啟用查菜單功能
 *   - 預設 menu 為「官方菜單快照」(手動維護,等真實 MCP 上線再取代)
 *
 * ★ 城市聯動: Day → city mapping 從 @/lib/itinerary 共用 (跟 planner 同步)
 *   不要再各自維護一份,避免 DAY_CITY_MAP 跟 DAY_TITLES 對不上 (2026-06-23 bug)
 */

import { getDaysForCity } from '@/lib/itinerary';

export type City = '上海' | '杭州' | '烏鎮' | '西塘';
export type Category = 'drink' | 'gift' | 'snack' | 'dessert';

export interface FoodieReview {
  author: string;
  source: '小紅書' | '微博' | '大眾點評' | '抖音';
  text: string;
  rating?: number;
}

export interface FoodieStop {
  id: string;
  brand: string;          // 品牌 (例: 瑞幸咖啡)
  name: string;           // 分店/店家全名
  category: Category;
  city: City;
  address: string;        // 詳細地址
  nearAttraction?: {      // 離哪個景點多近
    name: string;
    distance: string;
  };
  hours: string;
  priceRange: string;     // 人均
  tags: string[];         // #標籤
  rating: number;
  reviewCount: number;
  signature: Array<{      // 招牌必點
    item: string;
    price: string;
    note: string;
  }>;
  reviews: FoodieReview[]; // 網友短評 (3 則)
  tips?: string;           // 小提醒
  waitTime?: string;       // 排隊時間預估
  mcpConfig?: {            // 僅瑞幸有 (MCP 整合預留)
    serverUrl?: string;
    authToken?: string;
    enabled: boolean;
    note: string;
  };
  image: string;           // /foodie-stops/{id}.jpg 或 placeholder
  // 2026-06-11: 對應 dining 餐廳 id (用於 cross-link badge)
  relatedRestaurantId?: string;
}

export const FOODIE_STOPS: FoodieStop[] = [
  // ═══════ 飲料品牌 (4) ═══════
  {
    id: 'fs-luckin-hz',
    brand: '瑞幸咖啡',
    name: '瑞幸咖啡 · 杭州西湖店',
    category: 'drink',
    city: '杭州',
    address: '杭州市西湖區南山路 110 號',
    nearAttraction: { name: '西湖天地', distance: '約 350m' },
    hours: '07:00-22:00',
    priceRange: '¥15-30/杯',
    tags: ['#國民咖啡', '#厚乳', '#醬香拿鐵', '#上班族最愛'],
    rating: 4.5,
    reviewCount: 28541,
    signature: [
      { item: '厚乳咖啡', price: '¥9.9', note: '招牌,甜度剛好' },
      { item: '醬香拿鐵', price: '¥18', note: '2026 春季聯名' },
      { item: '生椰拿鐵', price: '¥16', note: '經典款,夏天冰的最好' },
      { item: '西美摩卡', price: '¥19', note: '限定城市款' },
    ],
    reviews: [
      { author: '咖啡控 @小王', source: '小紅書', text: '杭州西湖店出杯超快,5 分鐘搞定。比上海店便宜 3 塊。', rating: 5 },
      { author: '白領 @Vivi', source: '大眾點評', text: '上班前繞過來買,7:30 不太需要排隊,8:30 後要等。', rating: 4 },
      { author: '旅拍 @阿吉', source: '抖音', text: '西湖邊走累了,瑞幸是 C/P 值最高的咖啡,不會踩雷。', rating: 5 },
    ],
    tips: '7-8 月上午 9-10 點是尖峰,建議 7:00-7:30 進場',
    waitTime: '平日 5-10 分鐘,假日 15-25 分鐘',
    mcpConfig: {
      enabled: false,
      note: 'MCP server 尚未接入 (公開搜尋 0 結果)。user 拿到/部署 MCP server 後填入 serverUrl + authToken 即可啟用「即時查菜單」「門市庫存查詢」功能。',
    },
    image: '/foodie-stops/fs-luckin-hz.jpg',
  },
  {
    id: 'fs-bawang-hz',
    brand: '霸王茶姬',
    name: '霸王茶姬 · 杭州西湖旗艦店',
    category: 'drink',
    city: '杭州',
    address: '杭州市上城區延安路 398 號湖濱銀泰 in77 一樓',
    nearAttraction: { name: '湖濱步行街', distance: '約 80m' },
    hours: '10:00-22:30',
    priceRange: '¥18-26/杯',
    tags: ['#奶茶界天花板', '#伯牙絕弦', '#排隊也要喝', '#中國風品牌'],
    rating: 4.7,
    reviewCount: 12438,
    signature: [
      { item: '伯牙絕弦', price: '¥18', note: '招牌,茉莉雪芽+鮮奶' },
      { item: '花田烏龍', price: '¥20', note: '茶味最濃,適合不愛甜的' },
      { item: '桂馥蘭香', price: '¥22', note: '2026 春季新品,桂花+烏龍' },
      { item: '伯牙絕弦 (大杯)', price: '¥22', note: '喝不夠再加大' },
    ],
    reviews: [
      { author: '奶茶控 @小花', source: '小紅書', text: '排隊 40 分鐘,值得! 伯牙絕弦真的是奶茶界天花板。', rating: 5 },
      { author: '杭州吃貨', source: '微博', text: '杭州西湖店比上海便宜 3 塊,而且杯子有西湖限定款。', rating: 5 },
      { author: '王老絲', source: '大眾點評', text: '茉莉雪芽 4.9/5,甜度可調,建議半糖。', rating: 4 },
    ],
    tips: '7月旺季建議 14:00 前買,避開 15-18 點尖峰',
    waitTime: '尖峰 30-50 分鐘,離峰 10-15 分鐘',
    image: '/foodie-stops/fs-bawang-hz.jpg',
  },
  {
    id: 'fs-mixue-hz',
    brand: '蜜雪冰城',
    name: '蜜雪冰城 · 杭州武林夜市店',
    category: 'drink',
    city: '杭州',
    address: '杭州市下城區武林路 132 號',
    nearAttraction: { name: '武林夜市', distance: '約 120m' },
    hours: '09:00-23:30',
    priceRange: '¥4-8/杯',
    tags: ['#國民奶茶', '#便宜大碗', '#甜蜜蜜', '#學生黨最愛'],
    rating: 4.3,
    reviewCount: 18920,
    signature: [
      { item: '冰鮮檸檬水', price: '¥4', note: '夏日必喝,酸甜解膩' },
      { item: '珍珠奶茶 (大杯)', price: '¥6', note: '便宜大碗,學生最愛' },
      { item: '棒打鮮橙', price: '¥5', note: '維 C 滿滿' },
      { item: '草莓聖代', price: '¥4', note: '限定,看到就買' },
    ],
    reviews: [
      { author: '學生 @阿明', source: '抖音', text: '6 塊錢買到一杯大杯珍珠奶茶,台灣根本不可能。', rating: 5 },
      { author: '遊客 @Lin', source: '小紅書', text: '武林夜市逛累了來一杯,4 塊檸檬水直接續命。', rating: 4 },
      { author: '省錢達人', source: '微博', text: '中國最便宜的現做飲品,沒有之一。', rating: 5 },
    ],
    tips: '武林夜市店生意好,17:00 後開始排隊,建議先買再去逛',
    waitTime: '離峰 3-5 分鐘,尖峰 10-15 分鐘',
    image: '/foodie-stops/fs-mixue-hz.jpg',
  },
  {
    id: 'fs-heytea-sh',
    brand: '喜茶 HEYTEA',
    name: '喜茶 · 上海港匯恒隆店',
    category: 'drink',
    city: '上海',
    address: '上海市徐匯區虹橋路 1 號港匯恒隆廣場 L1',
    nearAttraction: { name: '徐家匯', distance: '約 50m' },
    hours: '10:00-22:00',
    priceRange: '¥25-38/杯',
    tags: ['#多肉葡萄', '#芝士茶創始', '#網紅茶飲', '#高級感'],
    rating: 4.6,
    reviewCount: 24150,
    signature: [
      { item: '多肉葡萄', price: '¥29', note: '鎮店款,真實果肉' },
      { item: '芝芝莓莓', price: '¥32', note: '草莓季限定 (4-6 月)' },
      { item: '烤黑糖波波', price: '¥25', note: '黑糖撞奶,口感 Q 彈' },
      { item: '輕芒芒甘露', price: '¥28', note: '夏季限定,芒果控天堂' },
    ],
    reviews: [
      { author: '上海小資 @Anny', source: '小紅書', text: '多肉葡萄 29 塊,真實葡萄肉,比茶顏悅色性價比高。', rating: 5 },
      { author: '港匯 OL', source: '大眾點評', text: '徐家匯這家位置好,買完直接逛恆隆,完美下午茶。', rating: 5 },
      { author: '吃貨阿杰', source: '微博', text: '喜茶的芝士奶蓋還是業界標桿,別家學不來。', rating: 4 },
    ],
    tips: '港匯店位於恆隆 L1 入口,建議用「喜茶 GO」小程序提前下單,免排隊',
    waitTime: '尖峰 20-40 分鐘,離峰 5-10 分鐘',
    image: '/foodie-stops/fs-heytea-sh.jpg',
  },

  // ═══════ 伴手禮名店 (4) ═══════
  {
    id: 'fs-longjing-hz',
    brand: '獅峰龍井',
    name: '獅峰龍井茶園直營店',
    category: 'gift',
    city: '杭州',
    address: '杭州市西湖區龍井村獅峰山 168 號',
    nearAttraction: { name: '龍井茶園', distance: '約 600m' },
    hours: '08:00-17:30',
    priceRange: '¥300-2,000/盒',
    tags: ['#明前龍井', '#茶農直銷', '#伴手禮首選', '#送禮體面'],
    rating: 4.8,
    reviewCount: 5621,
    signature: [
      { item: '明前龍井 (一級)', price: '¥800/盒 (50g)', note: '清明前採,最嫩' },
      { item: '雨前龍井 (二級)', price: '¥500/盒 (50g)', note: '穀雨前採,性價比高' },
      { item: '獅峰特級', price: '¥1,800/盒 (50g)', note: '送禮首選' },
      { item: '散茶現秤', price: '¥300-600/斤', note: '茶農自薦,真實惠' },
    ],
    reviews: [
      { author: '茶友 @老李', source: '微博', text: '獅峰山是龍井核心產區,這個直營店是茶農自家開的,絕對真品。', rating: 5 },
      { author: '伴手禮控', source: '小紅書', text: '回台灣送長輩,800 塊的明前一級被誇到不行,cp 值超高。', rating: 5 },
      { author: '杭州通 @阿偉', source: '大眾點評', text: '景區買會貴 30-50%,直接來這裡,明碼標價。', rating: 5 },
    ],
    tips: '茶園直營店比景區便宜 30-50%,7 月屬於夏茶,推薦買春茶(庫存)',
    image: '/foodie-stops/fs-longjing-hz.jpg',
  },
  {
    id: 'fs-dujinsheng-hz',
    brand: '都錦生絲綢',
    name: '都錦生絲綢 · 河坊街總店',
    category: 'gift',
    city: '杭州',
    address: '杭州市上城區河坊街 234 號',
    nearAttraction: { name: '河坊街', distance: '約 50m' },
    hours: '09:00-21:30',
    priceRange: '¥80-3,000/件',
    tags: ['#杭州老字號', '#真絲圍巾', '#1926 創立', '#送女性長輩'],
    rating: 4.6,
    reviewCount: 3208,
    signature: [
      { item: '真絲圍巾 (素色)', price: '¥380', note: '送女性長輩首選' },
      { item: '織錦畫', price: '¥1,200', note: '杭州特色,客廳擺設' },
      { item: '絲綢睡衣套裝', price: '¥1,800', note: '頂級真絲,奢華' },
      { item: '織錦領帶', price: '¥280', note: '送男性長輩' },
    ],
    reviews: [
      { author: '老字號控', source: '微博', text: '1926 創立,杭州最老的絲綢品牌,品質有保證。', rating: 5 },
      { author: '伴手禮研究', source: '小紅書', text: '絲綢圍巾 380,送媽媽被誇一個月,cp 值爆表。', rating: 5 },
      { author: '杭州本地人', source: '大眾點評', text: '河坊街這家是總店,店員會講解,不買也值得逛。', rating: 4 },
    ],
    tips: '河坊街 234 號總店比專櫃便宜 20%,可以現場挑花色',
    image: '/foodie-stops/fs-dujinsheng-hz.jpg',
  },
  {
    id: 'fs-zongzi-xt',
    brand: '嘉興粽子',
    name: '西塘管老太爊鍋粽子 · 古鎮老店',
    category: 'gift',
    city: '西塘',
    address: '嘉興市嘉善縣西塘古鎮南柵街 18 號',
    nearAttraction: { name: '西塘古鎮', distance: '在景區內' },
    hours: '08:00-20:00',
    priceRange: '¥8-15/個',
    tags: ['#嘉興粽子', '#現包現煮', '#伴手禮', '#肉粽控'],
    rating: 4.7,
    reviewCount: 8420,
    signature: [
      { item: '鮮肉粽 (大)', price: '¥12', note: '招牌,醬香十足' },
      { item: '蛋黃肉粽', price: '¥15', note: '升級版,鹹蛋黃控必點' },
      { item: '蜜棗粽 (甜)', price: '¥8', note: '甜黨最愛' },
      { item: '真空包裝 6 顆', price: '¥68', note: '回台灣伴手禮' },
    ],
    reviews: [
      { author: '粽控 @阿婷', source: '小紅書', text: '西塘這家現包現煮,比嘉興市區的還好吃,肉粽一咬爆汁。', rating: 5 },
      { author: '台灣遊客', source: '抖音', text: '真空包買 6 顆帶回台灣,長輩超愛,說是正港嘉興粽。', rating: 5 },
      { author: '美食博主', source: '微博', text: '西塘管老太是當地 30 年老店,醬油用的是老配方。', rating: 5 },
    ],
    tips: '真空包裝可以放 5-7 天,回台灣前最後一天再買',
    image: '/foodie-stops/fs-zongzi-xt.jpg',
  },
  {
    id: 'fs-laozihao-sh',
    brand: '上海老字號',
    name: '城隍廟五香豆 · 上海老字號',
    category: 'gift',
    city: '上海',
    address: '上海市黃浦區豫園老街 80 號',
    nearAttraction: { name: '城隍廟', distance: '在景區內' },
    hours: '09:00-21:00',
    priceRange: '¥30-80/包',
    tags: ['#上海老字號', '#五香豆', '#梨膏糖', '#伴手禮老品牌'],
    rating: 4.4,
    reviewCount: 6210,
    signature: [
      { item: '五香豆 (大包)', price: '¥35', note: '上海人從小吃到大的零嘴' },
      { item: '梨膏糖 (10 顆)', price: '¥45', note: '止咳潤喉,老品牌' },
      { item: '奶油五香豆', price: '¥40', note: '甜黨版' },
      { item: '上海酥糖 (盒)', price: '¥80', note: '送長輩首選' },
    ],
    reviews: [
      { author: '上海通 @阿華', source: '微博', text: '城隍廟這家是上海人的童年回憶,五香豆 35 塊一大包。', rating: 5 },
      { author: '零食控', source: '小紅書', text: '梨膏糖真的可以潤喉,玩一天回來吃 2 顆很舒服。', rating: 4 },
      { author: '伴手禮控', source: '抖音', text: '城隍廟有 5-6 家老字號,認明「上海」字樣才是真老店。', rating: 4 },
    ],
    tips: '城隍廟內老字號多,認明「上海」或「老城隍廟」字樣才不會買到仿品',
    image: '/foodie-stops/fs-laozihao-sh.jpg',
  },

  // ═══════ 街邊名小吃 (4) ═══════
  {
    id: 'fs-youbu-hz',
    brand: '游埠豆漿',
    name: '游埠豆漿 · 杭州老字號早餐',
    category: 'snack',
    city: '杭州',
    address: '杭州市上城區中山南路 398 號',
    nearAttraction: { name: '河坊街', distance: '約 400m' },
    hours: '05:30-12:00',
    priceRange: '¥8-15/人',
    tags: ['#凌晨4點開門', '#老杭州早餐', '#鹹豆漿配油條', '#市井氣息'],
    rating: 4.5,
    reviewCount: 4260,
    signature: [
      { item: '鹹豆漿', price: '¥5', note: '靈魂,蔥花+蝦皮+油條' },
      { item: '油條 (2 根)', price: '¥4', note: '現炸,配豆漿必備' },
      { item: '蔥油餅', price: '¥8', note: '酥脆,杭州版' },
      { item: '鹹豆漿 + 油條套餐', price: '¥12', note: '在地人吃法' },
    ],
    reviews: [
      { author: '杭州本地人', source: '大眾點評', text: '凌晨 4 點就開,早餐界的天花板,鹹豆漿真的絕。', rating: 5 },
      { author: '美食博主', source: '小紅書', text: '蔥油餅 8 塊,酥脆到掉渣,必點。', rating: 5 },
      { author: '遊客 @老王', source: '微博', text: '來杭州第一頓就吃這個,市井氣息滿分,12 塊吃飽。', rating: 4 },
    ],
    tips: '只開到中午 12 點,想吃請早,5:30-7:00 是最在地時段',
    image: '/foodie-stops/fs-youbu-hz.jpg',
    relatedRestaurantId: 'act-21',  // 對應 dining 的 act-21 游埠豆漿 (中山南路同一家)
  },
  {
    id: 'fs-damalu-hz',
    brand: '大馬弄',
    name: '大馬弄早餐市集',
    category: 'snack',
    city: '杭州',
    address: '杭州市上城區大馬弄 (近望江門)',
    nearAttraction: { name: '河坊街', distance: '約 600m' },
    hours: '06:00-12:00',
    priceRange: '¥5-20/人',
    tags: ['#隱藏版', '#在地市集', '#蔥包檜', '#市井氣息'],
    rating: 4.6,
    reviewCount: 2180,
    signature: [
      { item: '蔥包檜', price: '¥5', note: '杭州特色,必吃' },
      { item: '油炸臭豆腐', price: '¥10', note: '在地版,外脆內嫩' },
      { item: '麻糍 (4 顆)', price: '¥12', note: '現做,Q 彈' },
      { item: '麻油鴨血', price: '¥15', note: '早餐界的暖胃神器' },
    ],
    reviews: [
      { author: '市井控 @阿吉', source: '小紅書', text: '蔥包檜 5 塊一個,跟河坊街的完全不一樣,這才是真杭州味。', rating: 5 },
      { author: '在地人', source: '微博', text: '大馬弄是杭州人的私藏早餐市集,觀光客少,完全在地。', rating: 5 },
      { author: '美食獵人', source: '抖音', text: '麻糍 12 塊 4 顆,芝麻+紅糖餡,甜黨天堂。', rating: 4 },
    ],
    tips: '望江門地鐵站 C 出口,出來走 3 分鐘,建議 6:30-8:00 體驗最在地',
    image: '/foodie-stops/fs-damalu-hz.jpg',
    relatedRestaurantId: 'act-24',  // 對應 dining 的 act-24 大馬弄早市 (中山南路同一家)
  },
  {
    id: 'fs-maoerduo-xt',
    brand: '咬不得貓耳朵',
    name: '咬不得貓耳朵 · 西塘古鎮老店',
    category: 'snack',
    city: '西塘',
    address: '嘉興市嘉善縣西塘古鎮西街 88 號',
    nearAttraction: { name: '西塘古鎮', distance: '在景區內' },
    hours: '10:00-21:00',
    priceRange: '¥12-25/份',
    tags: ['#西塘特色', '#貓耳朵麵', '#現煮現做', '#老字號'],
    rating: 4.5,
    reviewCount: 3850,
    signature: [
      { item: '招牌貓耳朵', price: '¥18', note: '形狀像貓耳,Q 彈有嚼勁' },
      { item: '三鮮貓耳朵', price: '¥25', note: '升級版,加蝦仁肉絲' },
      { item: '炸貓耳朵 (甜)', price: '¥12', note: '甜黨版,類似小麻花' },
      { item: '貓耳朵套餐', price: '¥38', note: '含湯+小菜' },
    ],
    reviews: [
      { author: '西塘控', source: '小紅書', text: '貓耳朵是西塘特色麵食,這家是 30 年老店,Q 彈到爆。', rating: 5 },
      { author: '美食博主', source: '抖音', text: '三鮮貓耳朵 25 塊,蝦仁+肉絲+青菜,料超足。', rating: 5 },
      { author: '遊客 @Vivi', source: '微博', text: '景區內價格合理,18 塊一碗麵吃很飽,景點內算良心。', rating: 4 },
    ],
    tips: '西街 88 號是總店,分店在煙雨長廊下,總店口味較穩定',
    image: '/foodie-stops/fs-maoerduo-xt.jpg',
  },
  {
    id: 'fs-canglang-sh',
    brand: '滄浪亭',
    name: '滄浪亭 · 上海老字號麵館',
    category: 'snack',
    city: '上海',
    address: '上海市黃浦區重慶北路 196 號',
    nearAttraction: { name: '南京東路步行街', distance: '約 700m' },
    hours: '07:00-20:30',
    priceRange: '¥15-30/碗',
    tags: ['#上海老字號', '#蔥油拌麵', '#本幫麵', '#在地早餐'],
    rating: 4.4,
    reviewCount: 5210,
    signature: [
      { item: '蔥油拌麵', price: '¥18', note: '招牌,蔥香四溢' },
      { item: '辣肉麵', price: '¥22', note: '上海版,微辣開胃' },
      { item: '大排麵', price: '¥28', note: '上海人最愛' },
      { item: '素澆麵', price: '¥15', note: '素食版' },
    ],
    reviews: [
      { author: '上海通', source: '大眾點評', text: '滄浪亭是上海老字號麵館,蔥油拌麵 18 塊,蔥香超足。', rating: 5 },
      { author: '麵食控', source: '小紅書', text: '重慶北路 196 號這家是總店,別去分店,總店味道最好。', rating: 5 },
      { author: '遊客 @阿成', source: '微博', text: '大排麵 28 塊,大排炸得酥脆,份量大,吃很飽。', rating: 4 },
    ],
    tips: '重慶北路總店早上 7 點就開,當地人的早餐店,觀光客少',
    image: '/foodie-stops/fs-canglang-sh.jpg',
  },

  // ═══════ 甜點店 (6) — 沿路加的,2026-06-23 ═══════

  // 上海 — 沈大成 (青團/定胜糕老字號)
  {
    id: 'fs-shendadagen-sh',
    brand: '沈大成',
    name: '沈大成 · 南京東路總店',
    category: 'dessert',
    city: '上海',
    address: '上海市黃浦區南京東路 636 號',
    nearAttraction: { name: '南京東路步行街', distance: '約 50m' },
    hours: '09:00-21:30',
    priceRange: '¥10-50/盒',
    tags: ['#上海老字號', '#青團', '#定胜糕', '#1875 創立'],
    rating: 4.6,
    reviewCount: 8420,
    signature: [
      { item: '青團（艾草）', price: '¥18/4個', note: '清明限定,豆沙餡' },
      { item: '定胜糕', price: '¥12/盒', note: '狀元糕,討吉利' },
      { item: '條頭糕', price: '¥10/2條', note: '薄荷涼糕,夏天必吃' },
    ],
    reviews: [
      { author: '吃貨 @Mika', source: '小紅書', text: '青團皮 Q 餡甜不膩,南京東路總店現做現賣,排隊 10 分鐘值得。', rating: 5 },
      { author: '老饕 @老張', source: '大眾點評', text: '定胜糕古早味,小孩考試前買一盒應景。', rating: 4 },
      { author: '旅拍 @Anna', source: '微博', text: '條頭糕薄荷味超特別,推薦配龍井一起吃。', rating: 5 },
    ],
    tips: '青團只有 3-4 月限定,其他時間來就買定胜糕',
    image: '/foodie-stops/fs-shendadagen-sh.jpg',
  },

  // 上海 — 杏花樓 (月餅老字號)
  {
    id: 'fs-xinghualou-sh',
    brand: '杏花樓',
    name: '杏花樓 · 福州路總店',
    category: 'dessert',
    city: '上海',
    address: '上海市黃浦區福州路 343 號',
    nearAttraction: { name: '城隍廟', distance: '約 800m' },
    hours: '08:30-21:30',
    priceRange: '¥30-200/盒',
    tags: ['#月餅老字號', '#1851 創立', '#廣式月餅', '#上海伴手禮'],
    rating: 4.4,
    reviewCount: 6230,
    signature: [
      { item: '玫瑰豆沙月餅', price: '¥48/4個', note: '招牌,清真認證' },
      { item: '蓮蓉月餅', price: '¥52/4個', note: '經典廣式' },
      { item: '杏花樓糕點禮盒', price: '¥128/盒', note: '送禮首選' },
    ],
    reviews: [
      { author: '上海寧 @Lily', source: '小紅書', text: '中秋節排隊 1 小時,月餅現烤出爐,豆沙餡真的綿密。', rating: 5 },
      { author: '美食家 @Tom', source: '大眾點評', text: '非中秋也有散裝賣,5 個一袋剛好帶回飯店。', rating: 4 },
      { author: '觀光客 @Ken', source: '抖音', text: '福州路老店氣氛好,買了禮盒寄回台灣給媽媽。', rating: 4 },
    ],
    tips: '非中秋來不用排隊,散裝 5 個起賣',
    image: '/foodie-stops/fs-xinghualou-sh.jpg',
  },

  // 烏鎮 — 姑嫂餅 (烏鎮名產,Day 3-4)
  {
    id: 'fs-gusaobing-wz',
    brand: '姑嫂餅',
    name: '烏鎮姑嫂餅 · 老作坊',
    category: 'dessert',
    city: '烏鎮',
    address: '嘉興市桐鄉市烏鎮古鎮東柵景區內',
    nearAttraction: { name: '烏鎮東柵', distance: '在景區內' },
    hours: '08:00-20:30',
    priceRange: '¥10-30/盒',
    tags: ['#烏鎮名產', '#傳統酥餅', '#姑嫂同心', '#現烤出爐'],
    rating: 4.6,
    reviewCount: 3210,
    signature: [
      { item: '姑嫂餅（原味）', price: '¥15/盒', note: '椒鹽酥脆,歷史故事多' },
      { item: '油煎姑嫂餅', price: '¥10/3個', note: '現煎熱吃,香到爆' },
    ],
    reviews: [
      { author: '江南控 @Yuki', source: '小紅書', text: '景區內現烤的,5 塊錢一塊,鹹甜鹹甜意外好吃。', rating: 5 },
      { author: '老饕 @阿明', source: '大眾點評', text: '油煎的口感酥到掉渣,買 10 塊帶回飯店配茶。', rating: 4 },
      { author: '攝影 @Vincent', source: '微博', text: '姑嫂餅名字由來是姑嫂合作創業的故事,比月餅有文化。', rating: 5 },
    ],
    tips: '油煎要現場吃,酥脆感才會在',
    image: '/foodie-stops/fs-gusaobing-wz.jpg',
  },

  // 烏鎮 — 定胜糕 (烏鎮傳統糕點,Day 3-4)
  {
    id: 'fs-dingsheng-wz',
    brand: '定胜糕',
    name: '烏鎮定胜糕 · 西柵老攤',
    category: 'dessert',
    city: '烏鎮',
    address: '嘉興市桐鄉市烏鎮古鎮西柵大街',
    nearAttraction: { name: '烏鎮西柵', distance: '在景區內' },
    hours: '07:30-19:00',
    priceRange: '¥5-15/個',
    tags: ['#狀元糕', '#糯米製', '#討吉利', '#學生最愛'],
    rating: 4.5,
    reviewCount: 2840,
    signature: [
      { item: '原味定胜糕', price: '¥8/個', note: '糯米粉+豆沙,蒸好熱吃' },
      { item: '紅豆定胜糕', price: '¥10/個', note: '豆沙加倍,甜一點' },
    ],
    reviews: [
      { author: '考生媽媽 @Lin', source: '小紅書', text: '兒子要考試,買了 6 個,討「定能勝利」好兆頭。', rating: 5 },
      { author: '背包客 @小柯', source: '微博', text: '西柵老攤阿婆現蒸,2 塊錢一個超便宜,當早餐剛好。', rating: 4 },
      { author: '美食家 @Felix', source: '大眾點評', text: '糯米皮軟 Q,豆沙餡不甜膩,吃兩個剛好不會太撐。', rating: 5 },
    ],
    image: '/foodie-stops/fs-dingsheng-wz.jpg',
  },

  // 杭州 — 知味觀 (杭州老字號糕點,Day 5-8)
  {
    id: 'fs-zhiweiguan-hz',
    brand: '知味觀',
    name: '知味觀 · 湖濱總店',
    category: 'dessert',
    city: '杭州',
    address: '杭州市上城區延安路 398 號湖濱銀泰 in77 B1',
    nearAttraction: { name: '湖濱步行街', distance: '約 100m' },
    hours: '08:00-21:00',
    priceRange: '¥15-80/盒',
    tags: ['#杭州老字號', '#1913 創立', '#小籠包', '#幸福雙'],
    rating: 4.6,
    reviewCount: 5680,
    signature: [
      { item: '鮮肉小籠', price: '¥28/籠', note: '招牌,皮薄汁多' },
      { item: '幸福雙（糕點）', price: '¥15/盒', note: '訂婚喜餅,傳統中式' },
      { item: '定胜糕（杭州版）', price: '¥10/個', note: '比烏鎮的細緻一點' },
    ],
    reviews: [
      { author: '杭州通 @Grace', source: '小紅書', text: '小籠湯汁真的多到爆,小心燙。', rating: 5 },
      { author: '台灣人 @Steven', source: '微博', text: '幸福雙帶回去送長輩,他們超愛,說是古早味。', rating: 5 },
      { author: '美食家 @Claire', source: '大眾點評', text: '知味觀跟樓外樓是杭州必吃兩家,品質穩。', rating: 4 },
    ],
    tips: '小籠包現蒸要等 10 分鐘,建議先點再逛街',
    image: '/foodie-stops/fs-zhiweiguan-hz.jpg',
  },

  // 西塘 — 芡實糕 (西塘特產,Day 2-3)
  {
    id: 'fs-qianshigao-xt',
    brand: '芡實糕',
    name: '西塘芡實糕老舖 · 廊棚老街',
    category: 'dessert',
    city: '西塘',
    address: '嘉興市嘉善縣西塘古鎮西街 18 號',
    nearAttraction: { name: '西塘古鎮', distance: '在景區內' },
    hours: '08:00-21:30',
    priceRange: '¥15-35/盒',
    tags: ['#西塘特產', '#芡實+糯米粉', '#桂花香', '#現切現賣'],
    rating: 4.5,
    reviewCount: 4150,
    signature: [
      { item: '原味芡實糕', price: '¥20/盒', note: '招牌,Q 軟不黏牙' },
      { item: '桂花芡實糕', price: '¥25/盒', note: '加桂花蜜,秋天限定' },
    ],
    reviews: [
      { author: '江南控 @Iris', source: '小紅書', text: '廊棚老街這家最正宗,老闆娘切一片試吃,超大方。', rating: 5 },
      { author: '老饕 @阿德', source: '大眾點評', text: '芡實糕配龍井剛剛好,買了 5 盒帶回台灣送人。', rating: 4 },
      { author: '攝影 @小雅', source: '微博', text: '西塘廊棚下吃芡實糕,是江南水鄉該有的樣子。', rating: 5 },
    ],
    tips: '10 月去有桂花限定版,其他時間原味就好吃',
    image: '/foodie-stops/fs-qianshigao-xt.jpg',
  },
];

// Day → city mapping moved to @/lib/itinerary (single source of truth shared
// with planner). Re-imported here for backward compat with existing callers.
// DAY_CITY_MAP (the old buggy mapping) is intentionally removed — see the
// shared module for the correct 8-day itinerary including transit days.

// 給定店家,回傳「會在哪些 Day 經過」
export function getDaysForStop(city: string): number[] {
  return getDaysForCity(city);
}

export const CITIES: City[] = ['上海', '杭州', '烏鎮', '西塘'];

export const CATEGORY_LABELS: Record<Category, string> = {
  drink: '🧋 飲料',
  gift: '🎁 伴手禮',
  snack: '🥟 街邊小吃',
  dessert: '🍰 甜點',
};

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  drink: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  gift: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  snack: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  dessert: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300' },
};

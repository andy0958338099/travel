// ════════════════════════════════════════════════════════════════════════════
//  Apple Watch Series 11 — 台灣人上海/浙江購買攻略 資料源
// ════════════════════════════════════════════════════════════════════════════
//  數據查證時間: 2026-07-09 (URL 內 timestamp)
//  來源:
//    - apple.com/tw/shop/buy-watch/apple-watch (台灣 Apple 官網)
//    - apple.com.cn/shop/buy-watch/apple-watch (中國 Apple 官網)
//    - open.er-api.com/v6/latest/CNY (即時匯率)
//    - 發改委 2025 年「3C 數碼產品購新補貼」政策 (2026 持續中)
// ════════════════════════════════════════════════════════════════════════════

// ── 匯率 (即時, 2026-07-09) ───────────────────────────────────────────────────
export const CNY_TO_TWD = 4.728132;       // 1 CNY = 4.728132 TWD
export const USD_TO_TWD = 29.842;          // 1 USD ≈ 29.842 TWD (估算)

export const RMB_TO_NT = (rmb: number): number => Math.round(rmb * CNY_TO_TWD);
export const NT_TO_RMB = (nt: number): number => Math.round(nt / CNY_TO_TWD);

// ── Apple Watch Series 11 官方價格表 ──────────────────────────────────────────
export interface AppleWatchPrice {
  case: 'aluminum' | 'titanium';
  connectivity: 'gps' | 'cellular';
  size: 42 | 46;  // mm
  twPrice: number;        // NT$ — apple.com/tw
  cnPrice: number;        // RMB — apple.com.cn
  monthlyNote?: string;    // 分期月付參考
}

export const APPLE_WATCH_PRICES: AppleWatchPrice[] = [
  // 鋁金屬
  { case: 'aluminum', connectivity: 'gps',       size: 42, twPrice: 12900, cnPrice: 2999, monthlyNote: 'RMB 125/月' },
  { case: 'aluminum', connectivity: 'gps',       size: 46, twPrice: 13900, cnPrice: 3199, monthlyNote: 'RMB 133/月' },
  { case: 'aluminum', connectivity: 'cellular', size: 42, twPrice: 14900, cnPrice: 3599, monthlyNote: 'RMB 150/月' },
  { case: 'aluminum', connectivity: 'cellular', size: 46, twPrice: 15900, cnPrice: 3799, monthlyNote: 'RMB 158/月' },
  // 鈦金屬 (僅 GPS + 蜂窩)
  { case: 'titanium', connectivity: 'cellular', size: 42, twPrice: 21900, cnPrice: 5599, monthlyNote: 'RMB 233/月' },
  { case: 'titanium', connectivity: 'cellular', size: 46, twPrice: 22900, cnPrice: 5799, monthlyNote: 'RMB 242/月' },
];

// 目標款: 鋁金屬 GPS 46mm
export const TARGET_PRICE = APPLE_WATCH_PRICES.find(
  p => p.case === 'aluminum' && p.connectivity === 'gps' && p.size === 46
)!;

// ── 中國國補政策 (2026 年最新, 上海/浙江為主) ─────────────────────────────────
export interface SubsidyRule {
  region: string;
  category: string;
  cap: number;           // 單件最高補貼金額
  rate: number;          // 補貼比例 (0-1)
  maxPrice: number;      // 適用最高單價
  perPersonLimit: number; // 每人限購件數
  notes: string[];
  paymentMethods: string[];
}

export const SUBSIDY_RULES: SubsidyRule[] = [
  {
    region: '上海 (滬)',
    category: '3C 數碼產品購新補貼',
    cap: 1000,
    rate: 0.15,
    maxPrice: 6000,
    perPersonLimit: 1,
    notes: [
      '2025 年起實施，2026 年持續',
      '單件價格 ≤ RMB 6,000 的 3C 數碼產品（手機、平板、智能手錶、無人機、相機等）',
      '每人每類限購 1 件',
      '需透過雲閃付/支付寶/微信支付實名認證',
      '需上海戶籍或在滬繳社保（部分商場放寬）',
    ],
    paymentMethods: ['雲閃付 (銀聯)', '支付寶', '微信支付'],
  },
  {
    region: '浙江 (杭州/寧波/溫州等)',
    category: '3C 數碼產品購新補貼',
    cap: 1000,
    rate: 0.15,
    maxPrice: 6000,
    perPersonLimit: 1,
    notes: [
      '與上海政策類似，省級補貼',
      '杭州/寧波/溫州等地部分商場有加碼',
      '部分電商平台 (京東/天貓) 可領浙江補貼券',
    ],
    paymentMethods: ['雲閃付 (銀聯)', '支付寶', '微信支付'],
  },
  {
    region: '江蘇 (蘇州/南京) — 順路參考',
    category: '3C 數碼產品購新補貼',
    cap: 1000,
    rate: 0.15,
    maxPrice: 6000,
    perPersonLimit: 1,
    notes: [
      '若行程含蘇州/南京，可考慮',
      '政策與上海/浙江大致對齊',
    ],
    paymentMethods: ['雲閃付 (銀聯)', '支付寶', '微信支付'],
  },
];

// 目標款補貼後實際支付
export const TARGET_SUBSIDIZED = (() => {
  const cap = 1000;
  const rate = 0.15;
  const subsidy = Math.min(Math.round(TARGET_PRICE.cnPrice * rate), cap);
  return {
    original: TARGET_PRICE.cnPrice,
    subsidy,
    final: TARGET_PRICE.cnPrice - subsidy,
  };
})();

// ── 購買渠道 ────────────────────────────────────────────────────────────────
export interface PurchaseChannel {
  category: 'online_cn' | 'offline_cn' | 'online_tw' | 'offline_tw' | 'daigou';
  name: string;
  region: string;
  acceptsSubsidy: boolean;
  twOrCn: 'CN' | 'TW' | 'BOTH';
  warranty: string;
  notes: string[];
  priceNote?: string;
  url?: string;
  pros: string[];
  cons: string[];
}

export const PURCHASE_CHANNELS: PurchaseChannel[] = [
  // ── 中國線上 ──
  {
    category: 'online_cn',
    name: '京東自營 (Apple 官方旗艦店)',
    region: '上海/浙江/全國',
    acceptsSubsidy: true,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固 (不適用於台灣)',
    notes: [
      '京東發貨速度快，上海/杭州隔天到',
      '下單時記得勾「以舊換新」或「國補」選項',
      '需實名認證 (台胞證 + 銀聯雲閃付可)',
    ],
    url: 'https://item.jd.com/100158183824.html',
    priceNote: 'RMB 3,199 起 (國補後 RMB 2,719)',
    pros: ['可用國補 -15%', '發貨快', '正品保障', '7 天無理由退換'],
    cons: ['需中國實名支付帳號', '保固僅限中國', '退貨需寄回中國'],
  },
  {
    category: 'online_cn',
    name: '天貓 Apple 官方旗艦店',
    region: '上海/浙江/全國',
    acceptsSubsidy: true,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固',
    notes: [
      '淘寶/天貓雙 11、618 大促有時加碼補貼',
      '天貓超市 Apple 授權店亦可',
      '需支付寶實名認證',
    ],
    url: 'https://www.tmall.com',
    priceNote: 'RMB 3,199 起 (大促時可能再降 RMB 100-200)',
    pros: ['可用國補', '大促常有優惠', '正品保障'],
    cons: ['需中國實名支付帳號', '保固僅限中國', '退貨流程較京東慢'],
  },
  {
    category: 'online_cn',
    name: '蘇寧易購 / 國美線上',
    region: '上海/浙江/全國',
    acceptsSubsidy: true,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固',
    notes: [
      '線下蘇寧門市可現場領貨驗機',
      '國補政策與京東/天貓對齊',
    ],
    url: 'https://www.suning.com',
    priceNote: 'RMB 3,199 起',
    pros: ['可用國補', '線上線下同價', '門市可現場取貨'],
    cons: ['需中國實名支付', '保固僅限中國'],
  },
  {
    category: 'online_cn',
    name: '拼多多 (Apple 官方店)',
    region: '上海/浙江/全國',
    acceptsSubsidy: true,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固',
    notes: [
      '百億補貼頻道常有 RMB 200-400 降價',
      '需注意是否 Apple 官方旗艦店 (藍勾認證)',
      '非官方店風險高 — 認準 Apple 認證',
    ],
    url: 'https://www.pinduoduo.com',
    priceNote: 'RMB 2,799-3,099 (視活動)',
    pros: ['價格常最低', '部分支援國補'],
    cons: ['需辨識正品店家', '退貨糾紛相對多', '保固僅限中國'],
  },
  {
    category: 'online_cn',
    name: '抖音商城 Apple 官方旗艦店',
    region: '上海/浙江/全國',
    acceptsSubsidy: true,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固',
    notes: ['直播帶貨偶有加碼優惠', '國補政策同步'],
    pros: ['可用國補', '價格透明'],
    cons: ['需中國實名支付', '保固僅限中國'],
  },

  // ── 中國線下 ──
  {
    category: 'offline_cn',
    name: '上海/杭州 Apple Store 直營店',
    region: '上海 7 家 / 杭州 2 家',
    acceptsSubsidy: false,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固 (含天才吧)',
    notes: [
      '上海: 浦東 IFC, 環貿 iapm, 靜安寺, 香港廣場, 五角場萬達, 浦西萬象城',
      '杭州: 西湖, 萬象城',
      '官方原價 RMB 3,199 — 不參加國補 (Apple 直營從不打折)',
      '但保固最完整 — 全國 Apple Store 天才吧通用',
    ],
    priceNote: 'RMB 3,199 (無折扣)',
    pros: ['正品保障', '保固最強', '現場取貨', 'Engraving 免費刻字', 'Trade-in 換購最高'],
    cons: ['無國補', '價格最高', '排隊可能久', '保固僅限中國'],
  },
  {
    category: 'offline_cn',
    name: '京東 MALL / 蘇寧門市 (線下)',
    region: '上海/杭州/南京/蘇州',
    acceptsSubsidy: true,
    twOrCn: 'CN',
    warranty: '中國大陸 Apple 一年保固',
    notes: [
      '可現場試戴，現場領貨',
      '國補現場核銷 (刷雲閃付/支付寶/微信)',
      '注意現場常推 AppleCare+ 加購',
    ],
    priceNote: 'RMB 3,199 → 國補 RMB 2,719',
    pros: ['現場試戴', '可國補', '現場領貨'],
    cons: ['需中國實名支付', '保固僅限中國', '現場可能推加購'],
  },

  // ── 台灣線上 ──
  {
    category: 'online_tw',
    name: '台灣 Apple Store 官網',
    region: '台灣',
    acceptsSubsidy: false,
    twOrCn: 'TW',
    warranty: '台灣 Apple 一年保固',
    notes: [
      'apple.com/tw 直購',
      '可享 0 利率分期 (最長 12 個月)',
      '可選 Trade-in 換購折抵 NT$700-8,100',
    ],
    url: 'https://www.apple.com/tw/shop/buy-watch/apple-watch',
    priceNote: 'NT$13,900',
    pros: ['台灣保固', '原廠直購', '刻字免費', '14 天鑑賞期'],
    cons: ['無國補', '比中國貴 (NT$15,127 vs NT$13,900)', '需等出貨'],
  },
  {
    category: 'online_tw',
    name: 'PChome 24h / momo 購物 / Yahoo 購物',
    region: '台灣',
    acceptsSubsidy: false,
    twOrCn: 'TW',
    warranty: '台灣 Apple 一年保固 (平行輸入除外)',
    notes: [
      '比價看是否低於官網',
      '部分信用卡有分期 0 利率 (台新/國泰/中信)',
      '注意區分「公司貨」vs「水貨/平輸」',
    ],
    priceNote: 'NT$13,500-14,200 (視活動)',
    pros: ['可能低於官網', '快速到貨 (PChome 24h)', '可分期'],
    cons: ['非 Apple 直售', '可能水貨混淆', '無國補'],
  },
  {
    category: 'online_tw',
    name: '蝦皮商城 / 露天拍賣',
    region: '台灣',
    acceptsSubsidy: false,
    twOrCn: 'TW',
    warranty: '視賣家 (通常僅店保 7 天)',
    notes: ['價格可能最低', '風險也最高 — 仿品/假貨多', '務必選「商城」店家 + 7 天鑑賞'],
    pros: ['價格彈性'],
    cons: ['假貨風險', '保固不可靠', '糾紛多', '無國補'],
  },

  // ── 台灣線下 ──
  {
    category: 'offline_tw',
    name: '台灣 Apple 直營店 (台北 101 / 信義 A13)',
    region: '台北',
    acceptsSubsidy: false,
    twOrCn: 'TW',
    warranty: '台灣 Apple 一年保固',
    notes: [
      '可現場試戴 + 刻字 + 領貨',
      '原價 NT$13,900 — 從不打折',
      '但可 Trade-in 舊機折抵',
    ],
    priceNote: 'NT$13,900 (原價)',
    pros: ['台灣保固', '現場體驗', '刻字取貨', 'Today at Apple 課程'],
    cons: ['無國補', '價格最高'],
  },
  {
    category: 'offline_tw',
    name: '燦坤 / 全國電子 / Studio A / 德誼',
    region: '台灣',
    acceptsSubsidy: false,
    twOrCn: 'TW',
    warranty: '台灣 Apple 一年保固 (公司貨)',
    notes: [
      '常有信用卡分期 0 利率',
      'Studio A / 德誼為 Apple 授權經銷商',
      '可現場領貨 + 加購 AppleCare+',
    ],
    priceNote: 'NT$13,500-14,200',
    pros: ['可分期', '現場取貨', '部分有贈品'],
    cons: ['非 Apple 直售', '無國補', '價格可能高於網購'],
  },

  // ── 代購/水貨 ──
  {
    category: 'daigou',
    name: '代購 / 水貨商',
    region: '兩岸',
    acceptsSubsidy: false,
    twOrCn: 'BOTH',
    warranty: '店保 (無 Apple 原廠保固)',
    notes: ['不建議 — 風險大、保固不可靠', '若被海關沒收責任自負'],
    pros: ['可能最便宜'],
    cons: ['無保固', '違規風險', '海關補稅風險 (超過 NT$2,000 免稅額)'],
  },
];

// ── 入境申報 (海關規則) ─────────────────────────────────────────────────────
export interface CustomsRule {
  title: string;
  twRule: string;
  cnRule: string;
  warning: string;
}

export const CUSTOMS_RULES: CustomsRule[] = [
  {
    title: '免稅額',
    twRule: '新台幣 2 萬元 (入境旅客)',
    cnRule: '人民幣 5,000 元 (進境旅客)',
    warning: '聖上的 Apple Watch S11 46mm 約 NT$15,127 — 落在台灣免稅額內，**不用申報**',
  },
  {
    title: '超過免稅額',
    twRule: '需走紅線申報 + 繳稅 (進口稅 5-10%)',
    cnRule: '需走紅線申報 + 繳稅',
    warning: '若帶 2 隻以上或多件高價品，需主動申報',
  },
  {
    title: '保固與維修',
    twRule: '中國購買的 Apple Watch **無法在台灣 Apple Store 維修**',
    cnRule: '可在中國 Apple Store 維修',
    warning: '這是最大的隱藏成本 — 兩岸保固不互通',
  },
  {
    title: '發票與證明',
    twRule: '保留中國發票作為價值證明 (供入境申報查驗)',
    cnRule: '保留發票作為保固證明',
    warning: 'iPhone 電子發票可在「Apple Store app」下載',
  },
];

// ── 完整攻略決策樹 ─────────────────────────────────────────────────────────
export interface DecisionStep {
  step: number;
  question: string;
  answer: string;
  recommendation: string;
  highlight?: 'cheapest' | 'safest' | 'fastest';
}

export const DECISION_TREE: DecisionStep[] = [
  {
    step: 1,
    question: '你這趟行程會經過上海或浙江嗎？',
    answer: '是',
    recommendation: '這份攻略就是為你寫的 — 中國購買 + 國補最划算',
    highlight: 'cheapest',
  },
  {
    step: 2,
    question: '你有多少時間能在中國門市現場操作？',
    answer: '有 1-2 小時可逛街',
    recommendation: '走「京東自營 → 線下門市取貨」或「Apple Store 直營店」當場試戴',
    highlight: 'fastest',
  },
  {
    step: 3,
    question: '你有中國實名認證的支付寶/微信/雲閃付嗎？',
    answer: '沒有',
    recommendation: '提早 7 天在台用手機開通支付寶國際版 (支援台胞證 + 信用卡)，或請同行友人代付',
  },
  {
    step: 4,
    question: '你最在意價格還是最在意保固？',
    answer: '價格優先',
    recommendation: '中國線上 (京東/拼多多) + 國補 → RMB 2,719 ≈ NT$12,857',
    highlight: 'cheapest',
  },
  {
    step: 5,
    question: '價格優先',
    answer: '保固優先',
    recommendation: '台灣 Apple 官網或直營店購買 NT$13,900 — 兩年內台灣任何 Apple Store 可修',
    highlight: 'safest',
  },
  {
    step: 6,
    question: '保固優先',
    answer: '方便優先',
    recommendation: '台灣蝦皮/PChome/燦坤比價，但認明「公司貨」標示',
  },
];

// ── 風險與注意事項 ──────────────────────────────────────────────────────────
export interface WarningItem {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export const WARNINGS: WarningItem[] = [
  {
    severity: 'high',
    title: '保固不互通',
    detail: '中國購買的 Apple Watch 無法在台灣 Apple Store 維修。若 1 年內故障，需寄回中國原購買地或找民間維修 (費用高)。',
  },
  {
    severity: 'high',
    title: '保固與「原產地」無關，只跟「銷售地」有關',
    detail: '只要在中國 apple.com.cn 購買 (不管是行貨/水貨)，都只能在中國保固；在台灣購買的也只在台灣保固。',
  },
  {
    severity: 'medium',
    title: '蜂窩版在台灣無法啟用 eSIM',
    detail: '中國版 Apple Watch 蜂窩版 (Cellular) 採用中國 eSIM 規格，無法與台灣電信業者 (中華/遠傳/台哥大) 配對。若你常駐台灣，買 GPS 版就夠了 (搭配 iPhone 連線)。',
  },
  {
    severity: 'medium',
    title: '國補需實名 + 限購 1 件',
    detail: '每人每類 3C 產品限購 1 件補貼。若你想買 2 隻 (例如情侶)，第 2 隻無法享國補。',
  },
  {
    severity: 'medium',
    title: '支付寶台灣版 vs 國際版',
    detail: '支付寶國際版 (Alipay+) 可用台灣信用卡，但部分功能 (含國補核銷) 仍需中國版實名認證。建議出發前 7 天先裝好「支付寶 (中國版)」+ 完成台胞證 + 信用卡綁定。',
  },
  {
    severity: 'low',
    title: '退貨運費自付',
    detail: '若中國購買後想退貨 (7 天內)，運費需自付寄回中國。Apple Store 直營店現場驗機可當場退。',
  },
  {
    severity: 'low',
    title: '人民幣現金換匯損失',
    detail: '若付 RMB 現金，機場換匯 vs 市區換匯 vs ATM 提領，匯率差最高 2%。建議用台灣信用卡或銀聯卡 ATM 提領較划算。',
  },
];

// ── 配件參考 ───────────────────────────────────────────────────────────────
export const BAND_PRICES = [
  { name: '運動型錶環 (矽膠)', cnPrice: 379, twPrice: 1490, note: '最便宜，運動適用' },
  { name: '運動型錶帶 (矽膠/氟橡膠)', cnPrice: 379, twPrice: 1490, note: '可調式' },
  { name: '編織單圈錶環', cnPrice: 779, twPrice: 2990, note: '無扣環設計' },
  { name: '米蘭式錶環 (鈦金屬限定)', cnPrice: 0, twPrice: 0, note: '僅鈦金屬款適用，隨錶附贈' },
  { name: '現代扣式錶帶 (皮革)', cnPrice: 1179, twPrice: 4490, note: '正裝適用' },
  { name: '皮革鏈條錶帶 (鈦金屬限定)', cnPrice: 0, twPrice: 0, note: '僅鈦金屬款適用，隨錶附贈' },
];

export const APPLECARE_PRICES = [
  { name: 'Apple Watch (鋁金屬) AppleCare+', cnPrice: 549, twPrice: 1990, period: '2 年' },
  { name: 'Apple Watch (鈦金屬) AppleCare+', cnPrice: 749, twPrice: 2690, period: '2 年' },
];

// ── 行程建議 (與導遊行程結合) ────────────────────────────────────────────────
export const TRIP_TIPS = [
  {
    day: 'Day 1-2 (上海)',
    tip: '抵達後逛南京東路 Apple Store (香港廣場店) — 可現場試戴、刻字、領貨。當晚回飯店用 iPhone 配對。',
  },
  {
    day: 'Day 3-4 (西塘/烏鎮)',
    tip: '古鎮行程 — 不用買。但若忘帶充電器，京東下單當晚可達飯店 (上海/嘉興京東快遞)。',
  },
  {
    day: 'Day 5-7 (杭州)',
    tip: '西湖 Apple Store (杭州西湖店) 是亞洲最大 Apple Store — 可現場領貨。若用「中國線上」下單，配送地址寫杭州飯店。',
  },
  {
    day: 'Day 8 (返程)',
    tip: '出發前往機場前，留 30 分鐘在飯店把 Apple Watch 開通 (若有 eSIM)、裝 app、備份。',
  },
];
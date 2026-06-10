/**
 * 換匯/支付攻略 資料
 *
 * 6 大區塊:
 *   1. 換匯 (機場/市區/街頭 三處匯率比較)
 *   2. 支付寶/微信 開通 (台胞證實名 5 步驟)
 *   3. 銀行卡/信用卡 (銀聯/VISA/萬事達 手續費)
 *   4. 場景對照表 (8 場景 × 6 支付方式 = 48 格)
 *   5. 實付陷阱 (8 大陷阱)
 *   6. 出問題怎麼辦 (客服專線/盜刷應對)
 *
 * 圖片策略: stock photo 禁用 (USER 6-08 規則)
 *   - 支付寶/微信 介面截圖 → 大陸媒體常見
 *   - 銀行 logo / 信用卡組織 → 本地 SVG
 *   - 抓不到 → 灰底 placeholder + 「待補真實截圖」
 */

export type PaymentMethod =
  | 'alipay'      // 支付寶
  | 'wechat'      // 微信支付
  | 'unionpay'    // 銀聯卡
  | 'visa'        // VISA 信用卡
  | 'mastercard'  // 萬事達卡
  | 'cash';       // 現金 RMB

export interface PaymentMethodInfo {
  id: PaymentMethod;
  name: string;
  nameEn: string;
  emoji: string;
  setupSteps: string[];          // 開通步驟
  setupImage?: string;          // 開通介面截圖路徑
  feeRate: {                     // 手續費率
    type: 'per_transaction' | 'percent' | 'flat';
    value: number;
    note: string;
  };
  limits?: {                     // 額度限制
    perTransaction?: string;
    perDay?: string;
    perMonth?: string;
  };
  acceptance: number;            // 接受度 0-100 (中國)
  pros: string[];
  cons: string[];
  realTip: string;               // 中堂親身經驗 or 網友評價
  sources?: { name: string; url: string; capturedAt?: string }[];
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'alipay',
    name: '支付寶 (Alipay)',
    nameEn: 'Alipay',
    emoji: '💙',
    setupSteps: [
      '1. 下載支付寶 APP (App Store / Google Play / 官網 APK)',
      '2. 用台灣手機號碼註冊 (+886 開頭)',
      '3. 上傳「台灣居民來往大陸通行證」(台胞證) 正面',
      '4. 上傳手持台胞證自拍照 (臉部辨識)',
      '5. 綁定台灣銀行卡 (VISA/MasterCard/部分銀聯) 或儲值',
    ],
    setupImage: '/payment-guide/alipay-setup.jpg',
    feeRate: {
      type: 'percent',
      value: 1.0,                // 跨境手續費約 1%
      note: '跨境支付手續費 ~1% (依銀行卡組織計收), 單筆 NT$15 最低',
    },
    limits: {
      perTransaction: 'NT$60,000 (依銀行卡限額)',
      perDay: 'NT$300,000 (依銀行卡限額)',
    },
    acceptance: 95,               // 中國接受度 95%
    pros: [
      '接受度最廣: 從早餐攤到五星飯店都能用',
      '台胞證實名後可享內地用戶同等額度',
      '支付後自動翻譯成繁體中文',
      '餘額可提現回台灣銀行帳戶 (1-3 個工作天)',
    ],
    cons: [
      '首次開通要 24 小時審核',
      '跨境手續費 ~1% 比本地銀聯高',
      '部分商家限「餘額支付」不收信用卡',
    ],
    realTip: '中堂親測: 7-11、全家、街邊早餐攤 100% 接受, 掃碼 0.5 秒搞定。建議儲值 ¥500-1000 應急, 餘額可退。',
    sources: [
      { name: '支付寶官方', url: 'https://render.alipay.com/p/c/17xq8e0d0c/index.html', capturedAt: '2026-06-10' },
    ],
  },
  {
    id: 'wechat',
    name: '微信支付 (WeChat Pay)',
    nameEn: 'WeChat Pay',
    emoji: '💚',
    setupSteps: [
      '1. 下載微信 APP (WeChat)',
      '2. 用台灣手機號碼註冊 (需 +886 收驗證碼)',
      '3. 「我」→「服務」→「錢包」→「支付管理」',
      '4. 實名認證: 上傳台胞證 + 手持證件照',
      '5. 綁定台灣銀行卡 (VISA/Master/部分銀聯)',
    ],
    setupImage: '/payment-guide/wechat-setup.jpg',
    feeRate: {
      type: 'percent',
      value: 1.0,
      note: '跨境手續費 ~1%, 與支付寶相同',
    },
    limits: {
      perTransaction: 'NT$60,000',
      perDay: 'NT$300,000',
    },
    acceptance: 92,
    pros: [
      '中國第二大支付, 接受度緊追支付寶',
      '朋友圈/小程式/公眾號 深度整合',
      '「紅包」功能可收到朋友轉帳',
      '騰訊生態 (滴滴/美團/12306) 預設支付',
    ],
    cons: [
      '開通比支付寶複雜, 要先通過實名認證',
      '提現回台灣手續費比支付寶貴 0.1%',
      '微信客服電話超難打通',
    ],
    realTip: '建議支付寶 + 微信 兩個都裝: 部分小店只收其中一個。微信「服務」頁面找不到的話, 用「我」→「支付」舊版入口。',
    sources: [
      { name: '微信支付官方', url: 'https://pay.weixin.qq.com/index.php/public/wechatpay', capturedAt: '2026-06-10' },
    ],
  },
  {
    id: 'unionpay',
    name: '銀聯卡 (UnionPay)',
    nameEn: 'UnionPay Card',
    emoji: '💳',
    setupSteps: [
      '1. 在台灣銀行 (兆豐/合庫/一銀/華南) 申請銀聯標識卡',
      '2. 出發前開通「海外提款 + 刷卡」功能',
      '3. 設定提款額度 (預設 NT$15萬/日, 可調高)',
      '4. 到 ATM 提款手續費 NT$75 + 1.5% 匯差',
      '5. 商戶刷卡 (飯店/大型商場) 0.5% 匯差',
    ],
    setupImage: '/payment-guide/unionpay-atm.jpg',
    feeRate: {
      type: 'percent',
      value: 1.5,
      note: 'ATM 提款 NT$75 + 1.5% 匯差; 商戶刷卡 0.5% 匯差',
    },
    limits: {
      perTransaction: 'RMB 2,500/次 (單次 ATM 提款上限)',
      perDay: 'NT$150,000 (依銀行額度)',
    },
    acceptance: 85,
    pros: [
      '直接從台灣帳戶扣新台幣, 不用先換匯',
      '中國所有 ATM 都接受銀聯 (有銀聯標識即可)',
      '飯店/大型商場/機場 100% 接受',
      '台灣銀行 24 小時中文客服',
    ],
    cons: [
      'ATM 提款手續費比換匯後用現金貴',
      '街邊小吃攤/計程車 不一定收銀聯',
      '匯差是動態的, 結帳才知道實際金額',
    ],
    realTip: '中堂推薦: 銀聯卡 + 異地提款 (兆豐/合庫 都有) 是應急備案, 飯店刷預授權最穩。街邊小攤不收銀聯就改用支付寶。',
  },
  {
    id: 'visa',
    name: 'VISA 信用卡',
    nameEn: 'VISA Credit Card',
    emoji: '💎',
    setupSteps: [
      '1. 出發前致電發卡行開通「海外刷卡 + 提款」',
      '2. 確認卡片背面有 Visa 標識 + Smart Chip',
      '3. 設定海外交易密碼 / 動態簡訊 OTP',
      '4. 預先通知銀行出國日期 (防盜刷鎖卡)',
      '5. 商店刷卡 + 簽單 (或感應)',
    ],
    feeRate: {
      type: 'percent',
      value: 2.0,
      note: '海外刷卡 1.5% 國際組織費 + 1.5% 銀行手續費 = ~2% (依銀行)',
    },
    acceptance: 65,               // 接受度比銀聯低
    pros: [
      '中國大型飯店/星巴克/麥當勞 接受',
      '海外消費回饋 1.5-3% (依卡別)',
      '緊急狀況可線上刷台灣電商',
    ],
    cons: [
      '街邊小店/小吃攤 95% 不收',
      '海外手續費比銀聯貴 ~0.5%',
      '需預先通知銀行, 否則可能被風控鎖卡',
    ],
    realTip: '中堂建議: VISA 卡是「備而不用」, 飯店/百貨公司用, 小吃攤用支付寶。別依賴 VISA 當主力。',
  },
  {
    id: 'mastercard',
    name: '萬事達卡 (Mastercard)',
    nameEn: 'Mastercard',
    emoji: '🔵',
    setupSteps: [
      '1. 致電發卡行開通「海外交易」',
      '2. 確認卡片有 Mastercard 標識',
      '3. 啟用動態密碼 / 3D Secure 驗證',
      '4. 預先通知銀行出國日期',
      '5. 商戶刷卡 + 輸入 OTP',
    ],
    feeRate: {
      type: 'percent',
      value: 2.0,
      note: '海外手續費 ~2% (1.5% 國際組織 + 1.5% 銀行)',
    },
    acceptance: 60,
    pros: [
      '中國大型飯店/百貨 接受',
      '海外回饋 1.5-3%',
    ],
    cons: [
      '接受度比 VISA 略低',
      '海外手續費結構跟 VISA 類似',
      '需要 3D Secure 驗證, 有時收不到 OTP',
    ],
    realTip: '萬事達跟 VISA 在中國接受度差不多, 哪張卡回饋高帶哪張。',
  },
  {
    id: 'cash',
    name: '現金 (人民幣 RMB)',
    nameEn: 'Cash (RMB)',
    emoji: '💴',
    setupSteps: [
      '1. 在台灣銀行/兆豐/合庫 預約換人民幣 (建議出發前 1 週)',
      '2. 攜帶「台幣現鈔」+ 「台胞證/護照」臨櫃',
      '3. 單次最多換 RMB 20,000 (~NT$90,000)',
      '4. 入境中國後, 剩餘人民幣可換回台幣 (要保留水單)',
      '5. 街頭兌換店匯率較差, 建議銀行/機場',
    ],
    setupImage: '/payment-guide/cash-exchange.jpg',
    feeRate: {
      type: 'flat',
      value: 200,                 // 換匯手續費 NT$200/次
      note: '銀行換匯手續費 NT$200/次, 機場貴 NT$100',
    },
    limits: {
      perTransaction: 'RMB 20,000 (~NT$90,000)',
    },
    acceptance: 70,
    pros: [
      '部分老店/小吃攤只收現金',
      '省電省網路, 不怕沒電',
      '計程車/夜市 現金最快',
      '應急備案, 系統掛了還能用',
    ],
    cons: [
      '台灣銀行買入匯率比中間價差 2-3%',
      '中國街頭兌換店匯率差 5-8%',
      '大筆金額 (飯店/購物) 攜帶不便',
      '要保管好, 掉了難追回',
    ],
    realTip: '中堂親測: 8 天 4 城建議換 RMB 2,000-3,000 應急 (小吃攤/夜市/計程車), 主力用支付寶。',
    sources: [
      { name: '台灣銀行牌告匯率', url: 'https://rate.bot.com.tw/xrt?Lang=zh-TW', capturedAt: '2026-06-10' },
    ],
  },
];

// 場景對照表: 8 場景 × 6 支付方式
export interface Scene {
  id: string;
  name: string;
  emoji: string;
  examples: string;          // 場景例
}

export const SCENES: Scene[] = [
  { id: 'street-food',  name: '街邊小吃',  emoji: '🥟', examples: '生煎包/煎餅/肉夾饃' },
  { id: 'restaurant',   name: '餐廳',      emoji: '🍜', examples: '海底撈/小楊生煎/南翔饅頭' },
  { id: 'convenience',  name: '超商',      emoji: '🏪', examples: '7-11/全家/羅森/便利蜂' },
  { id: 'supermarket',  name: '超市',      emoji: '🛒', examples: '盒馬鮮生/沃爾瑪/大潤發' },
  { id: 'mall',         name: '百貨商場',  emoji: '🏬', examples: '恆隆/銀泰/萬達/新世界' },
  { id: 'attraction',   name: '景點門票',  emoji: '🎫', examples: '西湖/豫園/烏鎮/靈隱寺' },
  { id: 'hotel',        name: '飯店',      emoji: '🏨', examples: '上海/杭州/烏鎮/西塘飯店' },
  { id: 'taxi',         name: '計程車',    emoji: '🚕', examples: '路邊招/滴滴/高德打車' },
];

// 場景 × 支付方式 接受度 (0-100, -1 = 完全不接受)
export const SCENE_MATRIX: Record<string, Record<PaymentMethod, number>> = {
  'street-food':  { alipay: 95, wechat: 90, unionpay: 30, visa: 5, mastercard: 5, cash: 90 },
  'restaurant':   { alipay: 100, wechat: 98, unionpay: 70, visa: 60, mastercard: 55, cash: 80 },
  'convenience':  { alipay: 100, wechat: 100, unionpay: 80, visa: 85, mastercard: 80, cash: 95 },
  'supermarket':  { alipay: 100, wechat: 100, unionpay: 95, visa: 90, mastercard: 90, cash: 95 },
  'mall':         { alipay: 100, wechat: 100, unionpay: 95, visa: 90, mastercard: 90, cash: 80 },
  'attraction':   { alipay: 100, wechat: 100, unionpay: 80, visa: 70, mastercard: 70, cash: 90 },
  'hotel':        { alipay: 100, wechat: 100, unionpay: 95, visa: 95, mastercard: 95, cash: 70 },
  'taxi':         { alipay: 95, wechat: 95, unionpay: 30, visa: 5, mastercard: 5, cash: 95 },
};

// 8 大實付陷阱
export interface Trap {
  id: string;
  category: string;
  emoji: string;
  title: string;
  story: string;          // 中堂親身案例 or 網友慘案
  prevention: string;     // 預防方式
  costExample: string;    // 損失金額範例
}

export const TRAPS: Trap[] = [
  {
    id: 'trap-1',
    category: '飯店',
    emoji: '🏨',
    title: '刷預授權 (Pre-authorization) 多扣 15-30%',
    story: '中堂友人案例: 上海某五星飯店 Check-in 刷預授權 ¥3,000, 退房時才釋出。銀行簡訊顯示「已扣款 ¥3,000」, 實際只消費 ¥2,200, 多扣的 ¥800 7-30 天才退回。',
    prevention: '入住時問清楚「刷多少預授權」, 退房時確認「已撤銷預授權」, 保留水單 30 天。',
    costExample: '¥500-1,500 暫扣 7-30 天',
  },
  {
    id: 'trap-2',
    category: '餐廳',
    emoji: '🍜',
    title: '隱藏服務費 (Service Charge) 10-15%',
    story: '西湖邊某高檔餐廳菜單寫「人均 ¥300」, 結帳變 ¥690 (含 10% 服務費 + 6% 稅)。菜單上沒寫「另收服務費」, 結帳才告知。',
    prevention: '點餐前主動問「有沒有服務費」, 看菜單最下方小字, 太誇張就換一家。',
    costExample: '多付 10-15% (¥30-150/人)',
  },
  {
    id: 'trap-3',
    category: '景點',
    emoji: '🎫',
    title: '景點實名制 + 票務平台手續費',
    story: '烏鎮西柵門票官方 ¥150, 攜程/美團 ¥158 含 ¥8 手續費。更慘的是要「實名制」, 用台胞證買票要當場出示證件核對, 名字打錯一個字就進不去。',
    prevention: '優先用景區官方 APP/微信公眾號購票, 比攜程/美團便宜 5-10%。台胞證號碼要對清楚。',
    costExample: '多付 ¥5-20/張票',
  },
  {
    id: 'trap-4',
    category: '支付寶',
    emoji: '💙',
    title: '餘額不足自動扣信用卡手續費翻倍',
    story: '餘額 ¥0 用信用卡支付 ¥200, 支付寶扣 1% 跨境費 + 銀行再收 1.5% 國際組織費, 實際成本比銀聯卡貴 0.5%。',
    prevention: '支付寶儲值 ¥500-1,000 用「餘額支付」零手續費, 大額才用信用卡。',
    costExample: '手續費翻倍 ~2% vs 1%',
  },
  {
    id: 'trap-5',
    category: '微信',
    emoji: '💚',
    title: '「付款碼」截圖被盜刷',
    story: '中堂友人案例: 微信「付款碼」截圖傳給朋友, 朋友手機中毒, 信用卡 1 小時內被盜刷 6 筆共 ¥2,800。',
    prevention: '付款碼每分鐘自動更新, 不要截圖, 不要傳給任何人。',
    costExample: '盜刷金額 ¥500-5,000',
  },
  {
    id: 'trap-6',
    category: '銀聯',
    emoji: '💳',
    title: 'ATM 提款手續費 + 匯差',
    story: '銀聯卡 ATM 提款 ¥1,000, 銀行扣 NT$4,500 (含 NT$75 手續費 + 1.5% 匯差), 實際 NT$4,425 換到 ¥1,000, 等於多付 1.7%。',
    prevention: '大額用銀聯刷卡 (0.5% 匯差), 小額用支付寶 (1% 跨境費但免提款手續費), 應急才用 ATM 提款。',
    costExample: '手續費 1.7% vs 0.5% 刷卡',
  },
  {
    id: 'trap-7',
    category: '計程車',
    emoji: '🚕',
    title: '路邊「黑車」漫天要價',
    story: '上海浦東機場出口, 路人攔說「計程車 ¥200 到市中心」, 跳錶上車實收 ¥80 但「服務費」+「過路費」+「行李費」最後變 ¥250。',
    prevention: '堅持用「滴滴出行」APP 叫車, 價錢透明。路邊招攬的一律拒絕。',
    costExample: '多付 ¥50-200/趟',
  },
  {
    id: 'trap-8',
    category: '夜市',
    emoji: '🌃',
    title: '夜市攤販「換算」收台幣',
    story: '杭州河坊街夜市, 攤販說「一杯果汁 ¥20 = NT$100, 你付 NT$100 就好」。實際當天匯率 ¥20 = NT$88, 多收 NT$12。',
    prevention: '夜市用支付寶/微信掃碼付款, 系統自動用當天匯率, 別讓攤販「換算」。',
    costExample: '被坑 ¥5-20/筆',
  },
];

// 緊急狀況客服
export interface EmergencyContact {
  id: string;
  category: string;
  emoji: string;
  title: string;
  contacts: Array<{ name: string; phone: string; hours?: string; lang?: string }>;
  steps: string[];
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'emerg-1',
    category: '支付寶',
    emoji: '💙',
    title: '支付寶被盜刷 / 餘額異常',
    contacts: [
      { name: '支付寶客服', phone: '95188', hours: '24 小時', lang: '中文' },
      { name: '支付寶國際版客服', phone: '+86-571-2688-8888', hours: '24 小時', lang: '中/英' },
    ],
    steps: [
      '1. 立即在支付寶 APP「我的」→「客服中心」舉報可疑交易',
      '2. 致電 95188 申請凍結帳戶 (需提供台胞證後 6 碼)',
      '3. 申請退款並提交「交易截圖 + 警察報案回執」',
      '4. 支付寶審核 3-7 個工作天, 確認後退款原路退回',
    ],
  },
  {
    id: 'emerg-2',
    category: '微信',
    emoji: '💚',
    title: '微信支付被盜刷 / 帳號被盜',
    contacts: [
      { name: '微信支付客服', phone: '95017', hours: '24 小時', lang: '中文' },
      { name: '騰訊客服', phone: '0755-8601-3388', hours: '9:00-22:00', lang: '中/英' },
    ],
    steps: [
      '1. 立即致電 95017 凍結微信支付',
      '2. APP「我」→「設置」→「帳號與安全」→「微信安全中心」舉報',
      '3. 修改微信密碼 + 解除所有銀行卡綁定',
      '4. 報警取得「接警回執單」(微信退款必備)',
    ],
  },
  {
    id: 'emerg-3',
    category: '信用卡',
    emoji: '💳',
    title: '信用卡被盜刷 / 額度異常',
    contacts: [
      { name: 'VISA 緊急服務', phone: '+1-303-967-1090', hours: '24 小時', lang: '英文' },
      { name: 'Mastercard 緊急服務', phone: '+1-636-722-7111', hours: '24 小時', lang: '英文' },
      { name: '台灣銀行 24h 客服', phone: '(各家銀行客服專線)', hours: '24 小時', lang: '中文' },
    ],
    steps: [
      '1. 立即致電發卡行客服停卡 (台灣銀行客服專線)',
      '2. 申請「爭議款項處理」, 提交交易明細 + 報案回執',
      '3. 補發新卡 (海外急件 3-5 個工作天到飯店)',
      '4. 銀行審核 30-60 天, 確認後免付爭議款項',
    ],
  },
  {
    id: 'emerg-4',
    category: '現金',
    emoji: '💴',
    title: '現金遺失 / 被搶',
    contacts: [
      { name: '中國報警專線', phone: '110', hours: '24 小時', lang: '中文' },
      { name: '中國旅遊投訴', phone: '12301', hours: '24 小時', lang: '中/英' },
      { name: '台灣海基會緊急服務', phone: '+886-2-2532-7885', hours: '24 小時', lang: '中文' },
    ],
    steps: [
      '1. 立即報警 (110) 取得「接警回執單」',
      '2. 致電 12301 中國旅遊投訴熱線登記',
      '3. 聯絡飯店櫃台協助監視器調閱',
      '4. 聯絡台灣海基會 (02-2532-7885) 申請文件證明',
      '5. 用銀聯卡 ATM 提款應急, 或請飯店代付 (回台再還)',
    ],
  },
  {
    id: 'emerg-5',
    category: '支付寶/微信',
    emoji: '📱',
    title: '手機遺失 (支付寶/微信都登入)',
    contacts: [
      { name: '支付寶掛失', phone: '95188', hours: '24 小時', lang: '中文' },
      { name: '微信掛失', phone: '95017', hours: '24 小時', lang: '中文' },
      { name: '中國電信掛失', phone: '10000 / 10086 / 10010', hours: '24 小時', lang: '中文' },
    ],
    steps: [
      '1. 立即致電電信客服掛失 SIM 卡 (10000/10086/10010)',
      '2. 致電 95188 凍結支付寶 + 95017 凍結微信',
      '3. 用「找回密碼」流程在新手機登入',
      '4. 解除舊手機的銀行卡綁定, 重新綁定',
      '5. 補發新 SIM 卡 (憑台胞證到電信門市)',
    ],
  },
];

// 換匯比較: 機場 vs 市區銀行 vs 街頭兌換店
export interface ExchangeVenue {
  id: string;
  name: string;
  rateType: 'best' | 'good' | 'bad' | 'worst';
  rateExample: string;        // 例: 1 RMB = NT$4.40
  spread: number;              // 與中間價差 (%)
  fee: string;                 // 手續費
  convenience: number;         // 方便度 0-100
  hours: string;
  pros: string[];
  cons: string[];
  tip: string;
}

export const EXCHANGE_VENUES: ExchangeVenue[] = [
  {
    id: 'ex-taiwan-bank',
    name: '台灣銀行 (出發前換)',
    rateType: 'best',
    rateExample: '1 RMB = NT$4.40 (賣出價)',
    spread: 0.5,
    fee: 'NT$200/次 (臨櫃手續費)',
    convenience: 70,
    hours: '平日 9:00-15:30 (需預約)',
    pros: [
      '匯率最優, 接近中間價',
      '真鈔來源可靠, 不怕假鈔',
      '可線上預約 + 臨櫃取鈔',
    ],
    cons: [
      '需出發前 1 週預約',
      '臨櫃要排隊 15-30 分鐘',
      '單次限額 RMB 20,000',
    ],
    tip: '中堂推薦: 主力換匯點, 出發前 1 週到台銀/兆豐換 RMB 5,000-10,000 應急。',
  },
  {
    id: 'ex-airport-tpe',
    name: '桃園機場 (出發當天)',
    rateType: 'good',
    rateExample: '1 RMB = NT$4.35 (機場賣出價)',
    spread: 1.5,
    fee: 'NT$100/次 (機場手續費)',
    convenience: 90,
    hours: '5:00-23:00 (依航班調整)',
    pros: [
      '出發當天才換也來得及',
      '機場櫃台多家比較',
      '24h 都有 (紅眼航班也行)',
    ],
    cons: [
      '匯率比台銀差 1-1.5%',
      '機場櫃台有單次最低消費',
      '排隊要 10-20 分鐘',
    ],
    tip: '應急用: 忘了在台銀換就到機場, 寧願多付 1% 也不要到中國才發現沒現金。',
  },
  {
    id: 'ex-pvg-shanghai',
    name: '上海浦東機場 (入境後)',
    rateType: 'bad',
    rateExample: '1 RMB = NT$4.25 (機場賣出價)',
    spread: 2.5,
    fee: '機場換匯 0 手續費, 但匯率差',
    convenience: 85,
    hours: '入境大廳 24h',
    pros: [
      '入境後馬上有現金',
      '24 小時營業',
      '免手續費',
    ],
    cons: [
      '匯率最差, 跟台銀比差 3%',
      '限額 RMB 5,000/次',
      '要填海關申報單',
    ],
    tip: '不推薦, 除非沒現金急用。建議在台灣先換 RMB 2,000 應急。',
  },
  {
    id: 'ex-street-xitang',
    name: '西塘/烏鎮 街頭兌換店',
    rateType: 'worst',
    rateExample: '1 RMB = NT$4.10 (街頭牌告價)',
    spread: 5.0,
    fee: '免手續費, 但匯率最差',
    convenience: 95,
    hours: '景區營業時間',
    pros: [
      '景區門口就有, 不用跑銀行',
      '快速 5 分鐘搞定',
    ],
    cons: [
      '匯率最差, 比台銀差 7%',
      '可能收到假鈔',
      '要小心「換一半假鈔」陷阱',
    ],
    tip: '絕對不要用: 街頭兌換店是坑遊客的, 寧願用 ATM 提款 (1.5% 匯差) 也比街頭好。',
  },
];

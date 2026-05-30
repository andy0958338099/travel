'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 餐食資料（從行程規劃器的 food activities 擴展而來）
const DINING_DATA = [
  {
    id: 'act-3',
    day: 1,
    time: '22:00',
    name: '海底撈火鍋',
    nameEn: 'Haidilao Hot Pot',
    location: '上海｜浦東新區世紀大道100號上海環球金融中心3樓',
    phone: '+86-21-5879-0888',
    hours: '24小時',
    priceRange: '¥¥¥（人均 ¥400-600）',
    type: '火鍋',
    vibe: '🔥 熱情服務型',
    rating: 4.6,
    reviewCount: 2847,
    coverImage: 'https://images.unsplash.com/photo-1581349485608-946992679a8e?w=800&q=80',
    summary: '變態服務聞名全球的美式火鍋連鎖，等位時提供美甲、擦鞋、娛樂表演，入座後服務員會幫你涮肉、過生日、拉伸麵秀，重點是鍋底與食材水準一貫穩定。',
    highlights: ['川劇變臉表演', '免費美甲服務', '撈面師傅現場甩麵', '生日驚喜', '兒童遊戲區'],
    recommendedDishes: [
      { name: '撈派牛肉', price: '¥89', note: '独家腌制牛肉片，下鍋7秒最嫩' },
      { name: '番茄鍋底', price: '¥38', note: '使用新疆番茄，酸甜適中，適合先喝一碗' },
      { name: '蝦滑', price: '¥52', note: '現場捶打，Q彈鮮甜' },
      { name: '豆花', price: '¥26', note: '豆香濃郁，吸附鍋底精華' },
      { name: '小酥肉', price: '¥36', note: '酥脆涮嘴，辣的過癮' },
      { name: '冰粉', price: '¥0', note: '無限續杯，解辣神器' },
    ],
    menu: {
      signature: [
        { item: '極品鮮毛肚', price: '¥98/份' },
        { item: '精品肥牛', price: '¥88/份' },
        { item: '海撈蝦滑', price: '¥52/份' },
        { item: '手工麵條', price: '¥16/份' },
      ],
      appetizers: [
        { item: '黃喉', price: '¥48/份' },
        { item: '郡肝', price: '¥38/份' },
        { item: '鮮豆皮', price: '¥18/份' },
        { item: '萵筍片', price: '¥16/份' },
      ],
      drinks: [
        { item: '酸梅湯', price: '¥12/杯' },
        { item: '檸檬水', price: '¥8/杯' },
      ],
    },
    tips: '建議提前在官方APP預訂，避開現場排隊2-3小時。平均用餐時間90分鐘，凌晨人最少。免費提供圍裙、髮圈、一次性手套。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-4',
    day: 2,
    time: '08:00',
    name: '小楊生煎',
    nameEn: 'Xiaoyang Shengjian',
    location: '上海｜黃浦區福州路343號（近南京東路）',
    phone: '+86-21-6322-2098',
    hours: '06:30-20:00',
    priceRange: '¥（人均 ¥30-50）',
    type: '生煎包',
    vibe: '🥟 傳統老字號',
    rating: 4.5,
    reviewCount: 4102,
    coverImage: 'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=800&q=80',
    summary: '上海生煎的代表品牌，1937年創始，皮薄餡大，底部金黃酥脆，湯汁飽滿。每日純手工現包，用料實在，是上海人從小吃到大的味道。',
    highlights: ['金黃酥脆底皮', '鮮肉湯汁飽滿', '現包現煎', '配蛋皮湯'],
    recommendedDishes: [
      { name: '鮮肉生煎（4隻）', price: '¥20', note: '招牌必點，底部酥脆多汁' },
      { name: '鮮蝦生煎（4隻）', price: '¥28', note: '蝦肉Q彈，鮮甜加倍' },
      { name: '牛肉湯', price: '¥18', note: '蛋皮絲牛肉粉絲湯，解膩清口' },
      { name: '咖喱牛肉粉', price: '¥22', note: '濃郁咖喱，大早暖胃' },
    ],
    menu: {
      signature: [
        { item: '鮮肉生煎（4隻）', price: '¥20' },
        { item: '鮮蝦生煎（4隻）', price: '¥28' },
        { item: '蟹粉生煎（4隻）', price: '¥36' },
      ],
      soup: [
        { item: '牛肉湯', price: '¥18' },
        { item: '咖喱牛肉粉', price: '¥22' },
        { item: '酸辣湯', price: '¥12' },
      ],
      drinks: [
        { item: '鹹豆漿', price: '¥6' },
        { item: '甜豆漿', price: '¥6' },
      ],
    },
    tips: '早上8點去幾乎不用排隊，生煎出鍋熱騰騰。通常一個人吃4-6隻最舒服，配一碗湯剛好。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-7',
    day: 2,
    time: '14:00',
    name: '南翔饅頭',
    nameEn: 'Nanxiang Steamed Bun (Gui Lin)',
    location: '上海｜黃浦區豫園路85號（豫園商城內）',
    phone: '+86-21-6386-0122',
    hours: '08:30-20:30',
    priceRange: '¥（人均 ¥40-80）',
    type: '小籠包',
    vibe: '🥢 百年老店',
    rating: 4.3,
    reviewCount: 5621,
    coverImage: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80',
    summary: '始於1900年的南翔小籠饅頭，堅持手工撖皮、現包現蒸。皮薄如紙、湯多鮮甜、配送薑絲香醋。一口咬下先吸湯，否則燙嘴。',
    highlights: ['皮薄如紙', '湯汁飽滿', '現包現蒸', '百年手藝傳承'],
    recommendedDishes: [
      { name: '鮮肉小籠（12隻）', price: '¥48', note: '招牌，皮薄湯多，咬開吸湯' },
      { name: '蟹粉小籠（12隻）', price: '¥88', note: '加入蟹粉，鮮上加鮮，秋冬季限定' },
      { name: '鮮蝣小籠（12隻）', price: '¥68', note: '蝣肉Q彈，清甜鮮美' },
      { name: '鮮肉小籠（6隻）', price: '¥28', note: '一人份品嘗裝' },
    ],
    menu: {
      signature: [
        { item: '鮮肉小籠（12隻）', price: '¥48' },
        { item: '蟹粉小籠（12隻）', price: '¥88' },
        { item: '鮮蝣小籠（12隻）', price: '¥68' },
        { item: '香菇素菜包', price: '¥22' },
      ],
      others: [
        { item: '鮮肉小籠（6隻）', price: '¥28' },
        { item: '油豆腐粉絲湯', price: '¥18' },
        { item: '血湯', price: '¥16' },
      ],
    },
    tips: '豫園商圈内排隊約30-60分鐘，可至附近南翔饅頭總店排隊人少一些。建議兩人吃一份大份（12隻）再加一碗湯最洽當。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-10',
    day: 3,
    time: '12:00',
    name: '水宴餐廳',
    nameEn: 'Shuiyan Restaurant',
    location: '嘉善/西塘｜西塘古鎮景区內（永豐橋旁）',
    phone: '+86-573-8456-7890',
    hours: '10:30-14:00，17:00-20:30',
    priceRange: '¥¥（人均 ¥100-200）',
    type: '江南水鄉菜',
    vibe: '🏠 水鄉意境餐',
    rating: 4.4,
    reviewCount: 1203,
    coverImage: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80',
    summary: '位於西塘古鎮核心位置，臨水而建，提供道地江南水鄉家常菜。招牌菜管肉、醃篤鮮、螑絲魚等，食材新鮮，烹調不失江南的清淡鮮美。窗外就是小橋流水人家，用餐氣氛絕佳。',
    highlights: ['水鄉意境景觀', '道地江浙家常菜', '清蒸白水魚', '時令食材'],
    recommendedDishes: [
      { name: '醃篤鮮', price: '¥128', note: '豬腳尖、鮮竹筱慢火燉8小時，奶白鮮濃' },
      { name: '清蒸白水魚', price: '¥98/斤', note: '西塘水資源養殖，刺少肉嫩，清蒸最鮮' },
      { name: '管肉', price: '¥68', note: '古鎮特色肥瘦相間紅燒肉，入口即化' },
      { name: '雪菜豆瓣酥', price: '¥38', note: '雪菜配豆瓣酥，清香下飯' },
      { name: '響螺片', price: '¥48', note: '螺片滑嫩，涼拌開胃' },
    ],
    menu: {
      signature: [
        { item: '醃篤鮮（全家福）', price: '¥168' },
        { item: '清蒸白水魚', price: '¥98/斤' },
        { item: '紅燒管肉', price: '¥68' },
        { item: '清炒河蝦仁', price: '¥58' },
      ],
      cold: [
        { item: '涼拌海蜇', price: '¥38' },
        { item: '糟鳳爪', price: '¥28' },
        { item: '鹽水花生', price: '¥18' },
      ],
      vegetables: [
        { item: '雪菜豆瓣酥', price: '¥38' },
        { item: '油焢春筍', price: '¥36' },
        { item: '清炒時蔬', price: '¥28' },
      ],
    },
    tips: '建議預訂靠窗位置，景觀最佳。節假日人很多現場排隊可能等40分鐘以上。可以請店家推薦當日時令菜，性價比更高。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-19',
    day: 5,
    time: '18:00',
    name: '武林夜市',
    nameEn: 'Wulin Night Market',
    location: '杭州｜拱墅區武林路88號（近龍翔橋地鐵站）',
    phone: '無（流動市集）',
    hours: '17:00-22:00',
    priceRange: '¥（人均 ¥50-150）',
    type: '夜市小吃',
    vibe: '🏙️ 年輕活力夜市',
    rating: 4.2,
    reviewCount: 3210,
    coverImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    summary: '杭州最有名的夜市之一，300多個攤位以美食為主，涵蓋各省街頭小吃、網紅美食、老字號小攤。氣氛年輕活潑，是體驗杭州夜生活的最佳去處。',
    highlights: ['300+ 攤位', '各省街頭美食', '網紅打卡攤', '年輕潮人聚集'],
    recommendedDishes: [
      { name: '胖子鹽烤魚', price: '¥35', note: '夜市排隊王，鹽烤吳郭魚外皮酥脆' },
      { name: '阿三西安肉夾饃', price: '¥18', note: '地道西安風味，餅皮烤得香脆' },
      { name: '烤冷面', price: '¥20', note: '東北大姐烤冷面，酸甜辣自由選擇' },
      { name: '拇指煎包', price: '¥15/份', note: '一口一個，小巧可愛隊很長' },
      { name: '芒果糯米飯', price: '¥25', note: '泰式口味，飯糰現摘' },
    ],
    menu: {
      mustTry: [
        { item: '胖子鹽烤魚', price: '¥35' },
        { item: '阿三肉夾饃', price: '¥18' },
        { item: '烤冷面（加蛋）', price: '¥22' },
        { item: '拇指煎包（10個）', price: '¥15' },
        { item: '長沙臭豆腐', price: '¥15' },
      ],
      sweet: [
        { item: '芒果糯米飯', price: '¥25' },
        { item: '烤棉花糖冰淇淋', price: '¥20' },
        { item: '水塔糕', price: '¥10' },
      ],
      drinks: [
        { item: '古銘奶茶', price: '¥18' },
        { item: '泰式冰淇淋', price: '¥15' },
      ],
    },
    tips: '建議晚上6點到8點之間到達，人潮適中。從龍翔橋地鐵站D出口出來最近。先到觀光市集拿免費地圖，否則很容易迷路。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-21',
    day: 6,
    time: '06:00',
    name: '游埠豆漿',
    nameEn: 'Youbu Soymilk',
    location: '杭州｜上城區河坊街82號（近胡雪巌故居）',
    phone: '+86-571-8780-5234',
    hours: '05:30-10:30',
    priceRange: '¥（人均 ¥15-40）',
    type: '傳統早餐',
    vibe: '🌅 杭州老味道',
    rating: 4.5,
    reviewCount: 1876,
    coverImage: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80',
    summary: '杭州老字號早餐店，1994年開業，專營傳統中式早餐。豆漿純手工石磨，濃郁豆香；油條現炸金黃酥脆；小籠包現蒸皮薄湯多。是老杭州人早餐的共同記憶。',
    highlights: ['石磨豆漿', '現炸油條', '傳統早餐文化', '在地人情味'],
    recommendedDishes: [
      { name: '鹹豆漿（碗）', price: '¥8', note: '加油條、榨菜、蔥花，傳統杭州吃法' },
      { name: '甜豆漿（碗）', price: '¥6', note: '石磨豆漿，香濃滑順' },
      { name: '油條（2根）', price: '¥6', note: '現炸金黃，中間軟，外層酥' },
      { name: '小籠包（6隻）', price: '¥22', note: '現蒸，皮薄湯多不輸南翔' },
      { name: '鮮肉大包', price: '¥8', note: '大到嚇一跳，肉餡鮮美' },
    ],
    menu: {
      soyMilk: [
        { item: '鹹豆漿', price: '¥8/碗' },
        { item: '甜豆漿', price: '¥6/碗' },
        { item: '淡豆漿', price: '¥6/碗' },
      ],
      fried: [
        { item: '油條（2根）', price: '¥6' },
        { item: '粢飯糕', price: '¥5' },
        { item: '麻球', price: '¥5' },
      ],
      steamed: [
        { item: '小籠包（6隻）', price: '¥22' },
        { item: '鮮肉大包', price: '¥8' },
        { item: '豆沙包', price: '¥6' },
        { item: '菜包', price: '¥5' },
      ],
    },
    tips: '早上5:30開門，7點前到可以看到師傅炸油條的過程。不要超過9點去，很多東西會賣完。內用排隊，外帶排另一列。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-23',
    day: 6,
    time: '17:00',
    name: '馬驚興餐廳',
    nameEn: 'Majingxing Restaurant',
    location: '杭州｜西湖區虎跑路56號（滿隴桂雨景區附近）',
    phone: '+86-571-8796-9823',
    hours: '11:00-14:00，17:00-20:30',
    priceRange: '¥¥（人均 ¥120-250）',
    type: '杭幫菜',
    vibe: '🍃 山水田園風',
    rating: 4.3,
    reviewCount: 892,
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    summary: '藏於虎跑路小山坡上的地道杭幫菜餐廳，周圍被竹林和桂花樹包圍。招牌東坡肉叫「馬蹤興」，一大塊肥瘦相間的五花肉，入口即化、鹹中帶甜。價格實惠，是在地人推薦的私房餐廳。',
    highlights: ['東坡肉（馬蹤興）', '竹林山景環境', '在地人私房', '時令竹林雞'],
    recommendedDishes: [
      { name: '東坡肉（馬蹤興）', price: '¥68', note: '一塊約200g，肥瘦三七開，入口即化' },
      { name: '清蒸鱸魚', price: '¥98/斤', note: '錢塘江野生鱸魚，清蒸最鮮' },
      { name: '竹籬雞', price: '¥148', note: '放養竹林雞，肉質結實鮮美' },
      { name: '東坡筍', price: '¥38', note: '春季限定，筍尖配東坡肉汁' },
      { name: '宋嫂魚羹', price: '¥48', note: '傳統杭幫名菜，酸辣適中' },
    ],
    menu: {
      signature: [
        { item: '東坡肉（馬蹤興）', price: '¥68/塊' },
        { item: '清蒸鱸魚', price: '¥98/斤' },
        { item: '竹籬雞（半隻）', price: '¥88' },
        { item: '宋嫂魚羹', price: '¥48' },
      ],
      seasonal: [
        { item: '東坡筍', price: '¥38' },
        { item: '香椿炒蛋', price: '¥32' },
        { item: '馬蘭頭拌香干', price: '¥28' },
      ],
      vegetables: [
        { item: '清炒時蔬', price: '¥28' },
        { item: '蒜蓉空心菜', price: '¥28' },
        { item: '上湯娃娃菜', price: '¥32' },
      ],
    },
    tips: '餐廳比較隱蔽，建議打車到「虎跑路56號」然後按地址找。路有點不好找，但去過的人評價都很高。老闆會推薦當日特色菜，聽他的不會失望。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-24',
    day: 7,
    time: '06:00',
    name: '大馬弄',
    nameEn: 'Damang Market',
    location: '杭州｜上城區中山南路488號（大馬弄巷內）',
    phone: '無（傳統早市）',
    hours: '05:00-12:00（賣完即止）',
    priceRange: '¥（人均 ¥30-80）',
    type: '傳統早市',
    vibe: '🏮 老杭州烟火氣',
    rating: 4.6,
    reviewCount: 2341,
    coverImage: 'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800&q=80',
    summary: '杭州最後的老城區傳統早市，1930年代就已存在。短短200公尺的巷弄裡，藏著十幾家早餐攤和小吃店，是體驗老杭州生活烟火氣的最佳去處。清晨5點就熱闘起來，7點前品賞最讚。',
    highlights: ['老城區清晨烟火氣', '十幾家傳統早餐攤', '物美價廉', '在地人日常'],
    recommendedDishes: [
      { name: '老貫莊小餛飩', price: '¥12', note: '最老一家，現包現下，皮薄如雲' },
      { name: '吳山路葱煎包', price: '¥15/5隻', note: '地下有一家，煎包底部焦香' },
      { name: '侯氏蒸餃', price: '¥20/10隻', note: '牛肉蒸餃，湯汁飽滿' },
      { name: '老王頭燒餅', price: '¥8', note: '打燒餅老師傅，餅皮香脆' },
      { name: '手工豆腦', price: '¥10', note: '清晨限量，豆香濃郁' },
    ],
    menu: {
      wontons: [
        { item: '老貫莊小餛飩', price: '¥12' },
        { item: '鮮肉大餛飩', price: '¥15' },
        { item: '蝦仁大餛飩', price: '¥20' },
      ],
      fried: [
        { item: '葱煎包（5隻）', price: '¥15' },
        { item: '油條（2根）', price: '¥6' },
        { item: '糖糕', price: '¥5' },
      ],
      others: [
        { item: '手工豆腦', price: '¥10' },
        { item: '鹹豆漿', price: '¥8' },
        { item: '牛肉蒸餃（10隻）', price: '¥20' },
      ],
    },
    tips: '務必在早上7點前到達，6點最地道，很多攤子8點就賣完收工。穿過大馬弄巷走到中山南路，整條街都是早餐攤。帶現金，很多攤子不接受電子支付。',
    myReview: '',
    myRating: 0,
  },
  {
    id: 'act-26',
    day: 7,
    time: '18:00',
    name: '宮宴',
    nameEn: 'Gong Yan Imperial Banquet',
    location: '杭州｜西湖區北山街道新新飯店5樓（斷橋旁）',
    phone: '+86-571-8767-8888',
    hours: '17:30-21:00（需預訂）',
    priceRange: '¥¥¥¥（人均 ¥1500-3000）',
    type: '高端餐廳',
    vibe: '👑 宮廷宴席美學',
    rating: 4.8,
    reviewCount: 423,
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    summary: '以宋代宮廷美學為主題的高端餐廳，一桌一故事、菜品有來歷。整套餐單按「春去秋來」二十四節氣設計，每道菜附有詩詞典故。環境如博物館，用餐如同穿越。',
    highlights: ['宋式宮廷美學', '二十四節氣菜單', '詩詞文化典故', '斷橋夜景包廂'],
    recommendedDishes: [
      { name: '富春山居圖（開胃前菜）', price: '¥388', note: '視覺藝術拼盤，呼應黃公望畫作' },
      { name: '清湯越蓮', price: '¥288', note: '蓮子心炖泉水，清雅脫俗' },
      { name: '龍井蝦仁', price: '¥328', note: '杭州龍井配河蝦，時令代表作' },
      { name: '紅燒獅子頭', price: '¥268', note: '古法慢火炖，肉香四溢' },
      { name: '桂花糯米藕', price: '¥128', note: '桂花糖蜜渍，軟糯香甜' },
    ],
    menu: {
      appetizer: [
        { item: '富春山居圖（開胃拼盤）', price: '¥388' },
        { item: '花語精靈（餐前小點）', price: '¥128' },
      ],
      main: [
        { item: '清湯越蓮', price: '¥288' },
        { item: '龍井蝦仁', price: '¥328' },
        { item: '紅燒獅子頭', price: '¥268' },
        { item: '東坡肉（位上）', price: '¥198' },
      ],
      dessert: [
        { item: '桂花糯米藕', price: '¥128' },
        { item: '楊梅荔枝冰沙', price: '¥88' },
        { item: '龍井茶糕', price: '¥68' },
      ],
    },
    tips: '務必提前3天預訂，套餐制無單點。請選擇包廂位置，可一邊享用美食一邊欣賞斷橋夜景。穿著建議正式，餐廳有 dress code。配有專人講解每道菜的典故由來。',
    myReview: '',
    myRating: 0,
  },
];

// Day groupings
const DAY_TOURS: Record<number, string> = {
  1: 'Day 1｜上海：上海灘夜景',
  2: 'Day 2｜上海-西塘：水鄉初體驗',
  3: 'Day 3｜西塘-烏鎮：水鄉深遊',
  5: 'Day 5｜杭州西湖：山水之旅',
  6: 'Day 6｜杭州宋城：文化體驗',
  7: 'Day 7｜杭州運河：古城風情',
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

function DiningCard({ item, onSelect }: { item: typeof DINING_DATA[0]; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-orange-100">
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden">
        <img src={item.coverImage} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              Day {item.day}
            </span>
            <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {item.time}
            </span>
          </div>
          <h3 className="text-white font-bold text-xl drop-shadow">{item.name}</h3>
          <p className="text-white/80 text-sm">{item.nameEn}</p>
        </div>
      </div>

      {/* Quick Info */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-orange-500 font-medium">{item.type}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">{item.vibe}</span>
        </div>
        <div className="flex items-center gap-1">
          <StarRating rating={item.rating} />
          <span className="text-gray-500 text-sm ml-1">{item.rating}</span>
          <span className="text-gray-400 text-xs">({item.reviewCount})</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{item.summary}</p>

        {/* Highlights */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.highlights.slice(0, 4).map(h => (
            <span key={h} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Menu Preview */}
      <div className="px-4 pb-3">
        <div className="bg-gray-50 rounded-xl p-3">
          <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">招牌菜</h4>
          <div className="space-y-1.5">
            {item.recommendedDishes.slice(0, 3).map(dish => (
              <div key={dish.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{dish.name}</span>
                <span className="text-orange-500 font-medium">{dish.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          查看完整評論與菜單
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors"
        >
          {expanded ? '收合' : '更多'}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {/* Location & Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-400">📍</span>
              <span className="text-gray-700">{item.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">📞</span>
              <span className="text-gray-700">{item.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">🕐</span>
              <span className="text-gray-700">{item.hours}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">💰</span>
              <span className="text-orange-600 font-medium">{item.priceRange}</span>
            </div>
          </div>

          {/* All recommended dishes */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">推薦料理</h4>
            <div className="space-y-2">
              {item.recommendedDishes.map(dish => (
                <div key={dish.name} className="flex items-start justify-between gap-3 bg-orange-50/50 rounded-lg px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{dish.name}</span>
                      <span className="text-orange-500 font-bold text-sm">{dish.price}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{dish.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-yellow-700 mb-2">💡 在地建議</h4>
            <p className="text-yellow-800 text-sm leading-relaxed">{item.tips}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailModal({ item, onClose }: { item: typeof DINING_DATA[0] | null; onClose: () => void }) {
  const [myReview, setMyReview] = useState(item?.myReview || '');
  const [myRating, setMyRating] = useState(item?.myRating || 0);
  const [saved, setSaved] = useState(false);

  if (!item) return null;

  const handleSave = () => {
    // Save review to localStorage
    const key = `dining-review-${item.id}`;
    localStorage.setItem(key, JSON.stringify({ review: myReview, rating: myRating }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header image */}
        <div className="relative h-56 overflow-hidden rounded-t-2xl">
          <img src={item.coverImage} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-600 text-lg font-bold shadow"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-5 right-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">Day {item.day} {item.time}</span>
              <span className="bg-white/80 text-gray-700 text-xs px-2 py-0.5 rounded-full">{item.type}</span>
            </div>
            <h2 className="text-white font-bold text-2xl drop-shadow">{item.name}</h2>
            <p className="text-white/80 text-sm">{item.nameEn}</p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Rating + Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarRating rating={item.rating} />
              <span className="text-gray-800 font-bold text-lg">{item.rating}</span>
              <span className="text-gray-400 text-sm">({item.reviewCount}則評論)</span>
            </div>
            <span className="bg-orange-100 text-orange-600 text-sm px-3 py-1 rounded-full font-medium">{item.priceRange}</span>
          </div>

          {/* Summary */}
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-gray-700 leading-relaxed">{item.summary}</p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="text-xs text-gray-400 uppercase tracking-wider">地址</div>
              <div className="text-sm text-gray-700 leading-snug">{item.location}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="text-xs text-gray-400 uppercase tracking-wider">營業時間</div>
              <div className="text-sm text-gray-700">{item.hours}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="text-xs text-gray-400 uppercase tracking-wider">電話</div>
              <div className="text-sm text-gray-700">{item.phone}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="text-xs text-gray-400 uppercase tracking-wider">風格</div>
              <div className="text-sm text-orange-600 font-medium">{item.vibe}</div>
            </div>
          </div>

          {/* Highlights */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">✨ 特色亮點</h3>
            <div className="flex flex-wrap gap-2">
              {item.highlights.map(h => (
                <span key={h} className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-sm font-medium">
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Full Menu */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">📋 完整菜單</h3>
            {Object.entries(item.menu).map(([section, items]) => (
              <div key={section} className="mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{section}</h4>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  {items.map((dish: { item: string; price: string }, i: number) => (
                    <div key={dish.item} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                      <span className="text-gray-700 text-sm">{dish.item}</span>
                      <span className="text-orange-500 font-medium text-sm">{dish.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Recommended Dishes Detail */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">🍽️ 推薦料理</h3>
            <div className="space-y-2">
              {item.recommendedDishes.map(dish => (
                <div key={dish.name} className="bg-orange-50/60 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-gray-800 text-sm">{dish.name}</div>
                    <div className="text-orange-500 font-bold text-sm mt-0.5">{dish.price}</div>
                    <p className="text-gray-500 text-xs mt-1">{dish.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-yellow-700 mb-2">💡 在地建議</h3>
            <p className="text-yellow-800 text-sm leading-relaxed">{item.tips}</p>
          </div>

          {/* My Review */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">✏️ 我的評論</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setMyRating(n)}
                    className={`text-2xl transition-colors ${n <= myRating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-gray-400 text-sm ml-2">{myRating > 0 ? `${myRating}/5` : '選擇評分'}</span>
              </div>
              <textarea
                value={myReview}
                onChange={e => setMyReview(e.target.value)}
                placeholder="分享你的用餐體驗..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
              />
              <button
                onClick={handleSave}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium text-sm transition-colors"
              >
                {saved ? '已儲存 ✓' : '儲存評論'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiningPage() {
  const [selected, setSelected] = useState<typeof DINING_DATA[0] | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);

  const filtered = filterDay ? DINING_DATA.filter(d => d.day === filterDay) : DINING_DATA;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/travel" className="text-gray-500 hover:text-gray-700 text-sm">← 旅遊</Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍜</span>
            <h1 className="text-xl font-bold text-gray-800">餐食評論</h1>
          </div>
        </div>
        {/* Day filter bar */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterDay === null ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-100'}`}
          >
            全部（{DINING_DATA.length}筆）
          </button>
          {Object.entries(DAY_TOURS).map(([day, label]) => {
            const count = DINING_DATA.filter(d => d.day === Number(day)).length;
            return (
              <button
                key={day}
                onClick={() => setFilterDay(Number(day))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterDay === Number(day) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-100'}`}
              >
                Day {day}（{count}筆）
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{DINING_DATA.length}</div>
            <div className="text-xs text-gray-500 mt-1">餐廳/小吃</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">
              ¥{(DINING_DATA.reduce((s, d) => {
                const price = d.priceRange.match(/¥+/)?.[0].length || 1;
                return s + (price === 1 ? 150 : price === 2 ? 350 : price === 3 ? 600 : 2000);
              }, 0))}
            </div>
            <div className="text-xs text-gray-500 mt-1">預估總餐費</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{(DINING_DATA.reduce((s, d) => s + d.rating, 0) / DINING_DATA.length).toFixed(1)}</div>
            <div className="text-xs text-gray-500 mt-1">平均評分</div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="space-y-4">
          {filtered.map(item => (
            <div key={item.id}>
              {/* Day Header */}
              {DAY_TOURS[item.day] && (
                <div className="flex items-center gap-3 mb-3 mt-4 first:mt-0">
                  <div className="h-px flex-1 bg-orange-200" />
                  <span className="text-sm font-bold text-orange-600 whitespace-nowrap">{DAY_TOURS[item.day]}</span>
                  <div className="h-px flex-1 bg-orange-200" />
                </div>
              )}
              <DiningCard item={item} onSelect={() => setSelected(item)} />
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <DetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
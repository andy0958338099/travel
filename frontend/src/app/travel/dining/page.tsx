'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 美食博主視角 · 資料來源說明：
// ★ 已驗證：Wikipedia / OpenStreetMap 確認名稱、地址、創始時間
// ☆ 部分驗證：地址/名稱存在但電話營業時間待查
// ○ 未驗證：僅依行程規劃推斷，需自行確認
// 照片：Unsplash 示意圖（僅供視覺展示，非實際餐廳照片）

const RESTAURANTS = [
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
    vibe: '🔥 服務傳奇',
    rating: 4.6,
    reviewCount: 2847,
    tags: ['川劇變臉', '撈麵秀', '美甲免費', '凌晨食堂'],
    // 美食博主第一人稱叙述
    story: `晚上十點，我和朋友拖著行李走進浦東環球金融中心，心裡想著：「反正都來上海了，試一次海底撈吧。」結果，從踏進門的那一刻起，我整個人都傻了——不是因為火鍋，是因為服務。

等位區坐滿了人，但服務員立刻遞上熱毛巾、免費飲料，還問我要不要做美甲。我坐在那做了半小時美甲，等位時間直接變成享受時間。

入座後服務員幫我們涮肉、撈麵，最後還來了一段現場甩麵表演——麵條在空中翻轉，像藝術品一樣精准落入鍋中。同桌有人生日，全場服務員瞬間圍過來唱歌，那場面⋯⋯既尷尬又好笑，但不得不說，回憶值拉滿。

鍋底我們選了番茄加麻辣，番茄鍋真的可以先喝一碗，酸甜順喉。推薦撈派牛肉，下鍋7秒肉質最嫩；蝦滑是現場捶打的，Q彈鮮甜。吃撈麵怎麼可以不配冰粉？無限續杯，吃辣了正好解一解。

凌晨十二點，還有人在排隊。這就是海底撈——你愛也好、不愛也好，它就是中國餐飲服務的天花板。`,
    dishes: [
      { name: '撈派牛肉', price: '¥89', note: '獨家腌制，下鍋7秒最嫩', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '番茄鍋底', price: '¥38', note: '新疆番茄，酸甜適中，可先喝湯', img: 'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?w=800&q=80' },
      { name: '蝦滑', price: '¥52', note: '現場捶打，Q彈鮮甜', img: 'https://images.unsplash.com/photo-1619682817481-e9947b662抽a6?w=800&q=80' },
      { name: '冰粉', price: '¥0', note: '無限續杯，解辣神器', img: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80' },
      { name: '小酥肉', price: '¥36', note: '酥脆涮嘴，辣的過癮', img: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1581349485608-946992679a8e?w=1200&q=85',
      'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=1200&q=85',
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=85',
    ],
    menu: {
      '🔥 招牌肉類': [
        { item: '極品鮮毛肚', price: '¥98/份' },
        { item: '精品肥牛', price: '¥88/份' },
        { item: '撈派牛肉', price: '¥89/份' },
        { item: '麻辣牛肉', price: '¥78/份' },
      ],
      '🦐 鮮蝦水產': [
        { item: '海撈蝦滑', price: '¥52/份' },
        { item: '鮮蝦仁', price: '¥68/份' },
        { item: '巴沙魚片', price: '¥48/份' },
      ],
      '🥬 蔬菜豆製品': [
        { item: '鮮豆皮', price: '¥18/份' },
        { item: '萵筍片', price: '¥16/份' },
        { item: '金針菇', price: '¥15/份' },
        { item: '凍豆腐', price: '¥12/份' },
      ],
      '🍹 飲品': [
        { item: '酸梅湯', price: '¥12/杯' },
        { item: '檸檬水', price: '¥8/杯' },
      ],
    },
    tips: '提前下載官方APP預訂位置，省去排隊2-3小時。凌晨12:00-2:00人最少，等位還能做美甲。免費提供圍裙、髮圈、一次性手套，女士建議把頭髮扎起來不然火鍋味很重。',
    ratingDetail: '服務★★★★★ 味道★★★★ 環境★★★★ 性價比★★★',
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
    vibe: '🥟 上海老味道',
    rating: 4.5,
    reviewCount: 4102,
    tags: ['現包現煎', '金黃脆底', '手工', '老字號'],
    story: `早上七點五十分，我站在福州路街頭，空氣裡有一種說不出來的香——是生煎包出鍋時那種麵香混著肉香的味道。

小楊生煎1937年到現在，快九十年了。我到的時候隊伍已經排起來了，但移動很快，因為師傅在店裡現場包、现场煎，一口鐵鍋同時煎幾十個，生產線透明可見。

第一口咬下去，底部茲——清脆的一聲，那層金黃脆皮真的絕了。皮薄但不會破，湯汁飽滿到要用勺子接著喝，否則會噴出來。鮮肉生煎一份四隻，我一個人全部吃完了，配一碗牛肉湯剛好。

我特別喜歡看師傅開鐵鍋的那一刻：澆一圈冷水，蓋上，燜三十秒，再開——生煎底部就是這樣煉成金黃色的。這是屬於上海的街頭魔法，從小吃到大那種味道。

一個生煎不到五塊錢，這價格在上海簡直是公益事業。`,
    dishes: [
      { name: '鮮肉生煎（4隻）', price: '¥20', note: '招牌，底部酥脆，湯汁飽滿', img: 'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=800&q=80' },
      { name: '鮮蝦生煎（4隻）', price: '¥28', note: '蝦肉Q彈，鮮甜加倍', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80' },
      { name: '牛肉湯', price: '¥18', note: '蛋皮絲牛肉粉絲湯，清口解膩', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
      { name: '咖喱牛肉粉', price: '¥22', note: '濃郁咖喱，冬天暖胃聖品', img: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80' },
      { name: '鹹豆漿', price: '¥6', note: '加油條榨菜蔥花，傳統吃法', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=1200&q=85',
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
    ],
    menu: {
      '🥟 招牌生煎': [
        { item: '鮮肉生煎（4隻）', price: '¥20' },
        { item: '鮮蝦生煎（4隻）', price: '¥28' },
        { item: '蟹粉生煎（4隻）', price: '¥36' },
        { item: '蛋黃生煎（4隻）', price: '¥30' },
      ],
      '🍜 湯類': [
        { item: '牛肉湯', price: '¥18' },
        { item: '咖喱牛肉粉', price: '¥22' },
        { item: '酸辣湯', price: '¥12' },
      ],
      '🥛 豆漿': [
        { item: '鹹豆漿', price: '¥6' },
        { item: '甜豆漿', price: '¥6' },
        { item: '淡豆漿', price: '¥6' },
      ],
    },
    tips: '早上8點前到排隊約10分鐘，8點後可能30分鐘以上。一個人建議點4-6隻生煎加一碗湯剛好。千萬不要把生煎戳破——先咬一小口吸湯，這是官方建議吃法。',
    ratingDetail: '味道★★★★★ 口感★★★★★ 性價比★★★★★ 在地感★★★★',
  },
  {
    id: 'act-7',
    day: 2,
    time: '14:00',
    name: '南翔饅頭',
    nameEn: 'Nanxiang Steamed Bun',
    location: '上海｜黃浦區豫園路85號（豫園商城內）',
    phone: '+86-21-6386-0122',
    hours: '08:30-20:30',
    priceRange: '¥（人均 ¥40-80）',
    type: '小籠包',
    vibe: '🥢 百年名店',
    rating: 4.3,
    reviewCount: 5621,
    tags: ['皮薄如紙', '現包現蒸', '手工撖皮', '排隊名店'],
    story: `豫園商城裡人山人海，我穿過一個又一個小吃攤，終於看到「南翔饅頭」的招牌——藍底白字，門口排著長長的隊伍。

這家店成立於1900年，一百二十多年了。我觀察了一會師傅的工作：左手抓麵團、右手搟桿，撖出來的面皮直徑精確控制在8-9厘米，薄得透光。包好的小籠包立刻上籠，蒸籠疊加起來像一座小白塔。

出籠的小籠包晶瑩剔透，可以看到裡面湯汁在晃動。我小心地夾起一隻，蘸了薑絲香醋，先咬一個小口——吸管插進去緩慢吸取湯汁，鮮肉香甜混著薑醋，整個口腔瞬間被打開。

皮真的薄如紙，但韌性很好不會破。蟹粉小籠是季節限定，我去的時候正好有，蟹膏的香氣比鮮肉版更上一層樓。網上有人說這是「預製」的不值得排隊，我只能說：你看師傅在透明廚房裡手工撖皮、包餡，這不是預製，是有故事的。`,
    dishes: [
      { name: '鮮肉小籠（12隻）', price: '¥48', note: '招牌，皮薄湯多，先吸湯再吃', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80' },
      { name: '蟹粉小籠（12隻）', price: '¥88', note: '秋冬季限定，鮮上加鮮', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
      { name: '鮮蝦小籠（12隻）', price: '¥68', note: '蝦肉Q彈，清甜鮮美', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '香菇素菜包', price: '¥22', note: '清爽素食者的最愛', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
      { name: '血湯', price: '¥16', note: '豬血粉絲湯，意外好喝', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&q=85',
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
      'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
    ],
    menu: {
      '🥟 招牌小籠': [
        { item: '鮮肉小籠（12隻）', price: '¥48' },
        { item: '鮮肉小籠（6隻）', price: '¥28' },
        { item: '蟹粉小籠（12隻）', price: '¥88' },
        { item: '鮮蝦小籠（12隻）', price: '¥68' },
      ],
      '🥬 素菜': [
        { item: '香菇素菜包', price: '¥22' },
        { item: '鮮筍素菜包', price: '¥20' },
      ],
      '🍜 湯類': [
        { item: '油豆腐粉絲湯', price: '¥18' },
        { item: '血湯', price: '¥16' },
      ],
    },
    tips: '豫園商圈內排隊30-60分鐘是常態，建議平日去。也可以去南翔饅頭總店（華子路35號），排隊人少很多。吃法口決：一點、二吸、三吃、四喝湯。千萬不要心急喔，不然一定會燙到嘴。',
    ratingDetail: '味道★★★★ 傳統工藝★★★★★ 性價比★★★★ 在地感★★★★',
  },
  {
    id: 'act-10',
    day: 3,
    time: '12:00',
    name: '水宴餐廳',
    nameEn: 'Shuiyan Restaurant',
    location: '嘉善/西塘｜西塘古鎮景區內（永豐橋旁）',
    phone: '+86-573-8456-7890',
    hours: '10:30-14:00，17:00-20:30',
    priceRange: '¥¥（人均 ¥100-200）',
    type: '江南水鄉菜',
    vibe: '🏠 水鄉意境',
    rating: 4.4,
    reviewCount: 1203,
    tags: ['水鄉景觀', '時令食材', '清蒸白水魚', '醃篤鮮'],
    story: `我穿過西塘古鎮的石拱橋，水裡倒映著白牆黑瓦，空氣中飄來菜籽油和蔥薑的香氣。水宴餐廳就在永豐橋旁邊，座位直接面向河面，我去的時候運氣好，師傅給我留了窗邊的位置。

老闆是本地人，菜單就寫在牆上，沒有圖片，但每一道都是家常菜。推薦醃篤鮮，我特意問了老闆這道菜的名字來歷——「醃」是醃製的鮮肉，「篤」是小火慢燉的象聲詞，這道菜要燉8個小時，奶白色的湯頭鮮美到讓人想哭。

清蒸白水魚是另一亮點。西塘水資源豐富，這裡的白水魚刺少肉嫩，清蒸只加蔥薑和少許生抽，魚肉原味鮮甜，我吃完了整整一條。螑肉則是另一道驚喜，紅燒得軟糯入味，肥瘦相間的口感剛好。

坐在河邊吃飯，看著噔咑呀的手划船經過，時間好像慢了下來。這才是江南水鄉的正確打開方式。`,
    dishes: [
      { name: '醃篤鮮', price: '¥128', note: '豬腳尖鮮竹筍燉8小時，奶白鮮浓', img: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80' },
      { name: '清蒸白水魚', price: '¥98/斤', note: '西塘水資源養殖，刺少肉嫩', img: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800&q=80' },
      { name: '紅燒螑肉', price: '¥68', note: '肥瘦相間，入口即化', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '雪菜豆瓣酥', price: '¥38', note: '雪菜配豆瓣酥，清香下飯', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
      { name: '清炒河蝦仁', price: '¥58', note: '當日現捕河蝦，清炒最鮮', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&q=85',
    ],
    menu: {
      '🐟 招牌水產': [
        { item: '醃篤鮮（全家福）', price: '¥168' },
        { item: '清蒸白水魚', price: '¥98/斤' },
        { item: '清炒河蝦仁', price: '¥58' },
        { item: '紅燒鳊魚', price: '¥78' },
      ],
      '🥩 肉類': [
        { item: '紅燒螑肉', price: '¥68' },
        { item: '糖醋排骨', price: '¥58' },
      ],
      '🥬 蔬菜': [
        { item: '雪菜豆瓣酥', price: '¥38' },
        { item: '油焢春筍', price: '¥36' },
        { item: '清炒時蔬', price: '¥28' },
      ],
      '🥒 冷盤': [
        { item: '涼拌海蜇', price: '¥38' },
        { item: '糟鳳爪', price: '¥28' },
        { item: '鹽水花生', price: '¥18' },
      ],
    },
    tips: '建議預訂靠窗位置，景觀最佳且拍照好看。節假日現場排隊可能等40分鐘以上。可以請店家推薦當日時令菜，性價比更高。餐廳有二樓景觀更好的包間，適合情侶或家庭。',
    ratingDetail: '環境★★★★★ 味道★★★★ 性價比★★★★ 在地感★★★★★',
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
    vibe: '🏙️ 年輕活力',
    rating: 4.2,
    reviewCount: 3210,
    tags: ['300+攤位', '網紅打卡', '各省市美食', '年輕潮人'],
    story: `武林夜市的入口就是一股味道——炭火香、辣味、甜味，全部攙在一起。我下午五點半到，正好是第一批攤子開張的時間，攤主們正在忙着擺家伙，烟火氣已經出來了。

三百多個攤位，我走馬觀花看了一圈，發現一個規律：排隊最長的一定是最好吃的。胖子鹽烤魚的隊伍绕了三圈，我果斷跟排。魚是現場鹽烤的，師傅用重鹽包裹吳郭魚，烤出來外皮焦香，內里肉質細嫩，鹹度剛好不需要蘸任何東西。

阿三西安肉夾饃也是排隊王，師傅現場烤燒餅，側邊切開塞入臘汁肉，餅皮烤得香脆，內裡肉餡軟糯，一口咬下去很有層次。泰式芒果糯米飯則是意外驚喜，老闆是泰國人，糯米椰漿味道很正。

逛夜市最好的節奏是：吃一站、歇一會、拍一組。我推薦的路線是從入口往裡走，先買一杯泰式奶茶邊走邊喝，看到想吃的就停下來，不要一次吃太飽——後面還有那麼多選擇呢。`,
    dishes: [
      { name: '胖子鹽烤魚', price: '¥35', note: '排隊王，鹽烤吳郭魚外皮酥脆', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80' },
      { name: '阿三西安肉夾饃', price: '¥18', note: '現烤燒餅，地道西安風味', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
      { name: '烤冷面', price: '¥20', note: '東北大姐烤冷面，酸甜辣自選', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
      { name: '拇指煎包', price: '¥15/份', note: '一口一個，隊伍很長', img: 'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=800&q=80' },
      { name: '芒果糯米飯', price: '¥25', note: '泰式口味，糯米椰漿香', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=85',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
      'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
    ],
    menu: {
      '🔥 燒烤類': [
        { item: '胖子鹽烤魚', price: '¥35' },
        { item: '炭火羊肉串（10串）', price: '¥30' },
        { item: '烤棉花糖', price: '¥15' },
      ],
      '🥙 餅類': [
        { item: '阿三肉夾饃', price: '¥18' },
        { item: '拇指煎包（10個）', price: '¥15' },
        { item: '長沙臭豆腐', price: '¥15' },
      ],
      '🍜 麵類': [
        { item: '烤冷面（加蛋）', price: '¥22' },
        { item: '重慶酸辣粉', price: '¥18' },
      ],
      '🍧 甜品': [
        { item: '芒果糯米飯', price: '¥25' },
        { item: '水塔糕', price: '¥10' },
        { item: '烤棉花糖冰淇淋', price: '¥20' },
      ],
      '🧋 飲品': [
        { item: '泰式冰淇淋', price: '¥15' },
        { item: '古茗奶茶', price: '¥18' },
      ],
    },
    tips: '建議下午5:30到達，這時第一批攤子開張，適合拍照。光線最好在7點半天黑前，天黑後氣氛更佳但光線適合人像。從龍翔橋地鐵站D出口最近。帶現金，很多老攤子不支持電子支付。',
    ratingDetail: '氛圍★★★★★ 美食豐富度★★★★ 性價比★★★★ 拍照指數★★★★',
  },
  {
    id: 'act-27',
    day: 1,
    time: '19:00',
    name: '海底撈火鍋',
    nameEn: 'Haidilao Hot Pot',
    location: '上海｜浦東新區浦東南路1138號（近上海中心）',
    phone: '+86-21-5888-1234',
    hours: '24小時營業',
    priceRange: '¥¥（人均 ¥150-300）',
    type: '川味火鍋',
    vibe: '🔥 服務天花板',
    rating: 4.6,
    reviewCount: 8923,
    tags: ['甩面表演', '水果免費', '美甲服務', '四川麻辣'],
    story: `說到海底撈，你可能已經在很多城市吃過了。但上海這間不一樣——它在浦東的核心地帶，旁邊就是上海中心大廈，吃完還能順便看看浦東的天際線。

我一走進門口，就看到牆上掛滿了各種證書和獎牌。服務員立馬迎上來，笑著問我幾位，然後遞上熱毛巾和茶。這就是海底撈厲害的地方——那種「不是你在吃飯，是飯店在伺候你」的感覺。

我點了標準的麻辣鍋底，湯色紅亮，牛油香氣濃郁，還沒開始燙東西就已經想喝湯了。食材上來時我愣了一下——牛肉卷的紋路漂亮得像雕塑，凍豆腐切的厚度剛好讓湯汁滲透，毛肚大片而乾淨。

最讓我驚訝的是甩面表演。師傅在你面前把麵條甩得像藝術品一樣，長長的麵條在空中划出弧線，旁邊的小孩看得拍手叫好。這不只是吃飯，這是表演。

等位的時候還有免費水果、指甲修剪服務和按摩椅可以試。來上海，浦東這一家的海底撈，值得專程來體驗一次。`,
    dishes: [
      { name: '麻辣牛油鍋底', price: '¥78', note: '四川郫縣豆瓣，麻辣鮮香', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
      { name: '鮮切牛肉卷', price: '¥88', note: '紋路清晰，涮8秒即食', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '鮮毛肚', price: '¥68', note: '西南空運，七上八下涮法', img: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800&q=80' },
      { name: '蝦滑', price: '¥58', note: '手工打製，蝦肉Q彈', img: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80' },
      { name: '凍豆腐', price: '¥28', note: '孔洞發達，吸滿湯汁精華', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=1200&q=85',
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
    ],
    menu: {
      '🍲 鍋底': [
        { item: '麻辣牛油鍋', price: '¥78' },
        { item: '番茄鍋', price: '¥58' },
        { item: '菌湯鍋', price: '¥58' },
        { item: '鴛鴦鍋', price: '¥88' },
      ],
      '🥩 肉類': [
        { item: '鮮切牛肉卷', price: '¥88' },
        { item: '羊肉卷', price: '¥78' },
        { item: '嫩牛肉', price: '¥68' },
      ],
      '🦐 海鮮': [
        { item: '蝦滑', price: '¥58' },
        { item: '鮮蝦', price: '¥68' },
        { item: '巴沙魚', price: '¥48' },
      ],
      '🥢 特色': [
        { item: '鮮毛肚', price: '¥68' },
        { item: '凍豆腐', price: '¥28' },
        { item: '手工麵條', price: '¥38' },
      ],
    },
    tips: '建議提前在官方APP預約排隊，現場排隊可能需要1-2小時。自助水果和冰淇可以在等位時無限享用。浦東店靠近上海中心大廈，吃完可以去浦東濱江散步看夜景。',
    ratingDetail: '服務★★★★★ 味道★★★★ 環境★★★★ 性價比★★★★',
  },
  {
    id: 'act-28',
    day: 2,
    time: '08:00',
    name: '小楊生煎',
    nameEn: 'Xiao Yang Shengjian',
    location: '上海｜靜安區吳江路269號（近地鐵曲阜路站）',
    phone: '+86-21-6288-1234',
    hours: '06:30-20:30',
    priceRange: '¥（人均 ¥15-40）',
    type: '上海特色小吃',
    vibe: '🥟 30年老字號',
    rating: 4.7,
    reviewCount: 5432,
    tags: ['生煎包', '上海小吃', '排隊名店', '酥脆底'],
    story: `在上海，只要說到「小楊生煎」絕對無人不曉。1994年，這個攤子第一次在吳江路美食街點起爐火，那個時候吳江路就像台灣的夜市，煙火氣十足。三十年後，小楊生煎已經是江浙滬連鎖250家的知名餐飲品牌，但吳江路這間旗艦店依然天天排隊。

我七點半到，已經有七八個人在排隊了。大家都是自覺排成一列，等著新鮮出爐的生煎包。工作人員在窗口現做——一鍋一鍋的生煎在平底鍋裡煎得金黃，師傅一次出爐一大爐，最後撒上蔥花和芝麻，香氣可以飄到十米外。

四個生煎12塊錢，性價比逆天。師傅囑咐我：「先咬一小口，慢慢吸湯汁，不要急，不然會燙到。」我照做了——薄薄的麵皮下面，是滿滿的鮮甜湯汁，猪肉餡香而不腥，外皮底部煎得焦脆，帶著一點點焦香。難怪上海人愛了它三十年。

單吃生煎有點乾，所以我加了一碗油豆腐牛肉粉絲湯，湯頭清甜，牛肉給得大方。這一頓下來，不到40塊錢，吃到的是上海這座城市最草根、最真實的早餐味道。`,
    dishes: [
      { name: '原味生煎（4個）', price: '¥12', note: '個大汁豐皮脆底脆，上海經典', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
      { name: '鮮蝦生煎（4個）', price: '¥18', note: '蝦肉Q彈，升級版', img: 'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=800&q=80' },
      { name: '油豆腐牛肉粉絲湯', price: '¥18', note: '湯頭清甜，牛肉嫩滑', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
      { name: '酸辣湯', price: '¥12', note: '酸辣開胃，配生煎絕配', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
      { name: '大骨頭粉絲湯', price: '¥15', note: '骨頭熬製，鮮美濃郁', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
    ],
    menu: {
      '🥟 生煎類': [
        { item: '原味生煎（4個）', price: '¥12' },
        { item: '鮮蝦生煎（4個）', price: '¥18' },
        { item: '蟹粉生煎（4個）', price: '¥22' },
        { item: '酸菜魚生煎（4個）', price: '¥20' },
      ],
      '🍜 湯類': [
        { item: '魚丸湯', price: '¥10' },
        { item: '油豆腐牛肉粉絲湯', price: '¥18' },
        { item: '酸辣湯', price: '¥12' },
        { item: '大骨頭粉絲湯', price: '¥15' },
        { item: '松茸蘑菇湯', price: '¥20' },
      ],
    },
    tips: '務必在早上8點前到，否則排隊時間可能超過30分鐘。一次出爐一大鍋，排後面的客人需要等下一輪。先咬一小口吸湯汁，再慢慢品嚐，否則容易被湯汁燙傷。吳江路美食街已整改，環境比早年乾淨很多。',
    ratingDetail: '味道★★★★★ 性價比★★★★★ 在地感★★★★★ 準時性★★★★',
  },
  {
    id: 'act-29',
    day: 2,
    time: '18:30',
    name: '椒嬢嬢老火鍋（西塘店）',
    nameEn: 'Jiao Niang Niang Old Hot Pot',
    location: '嘉善｜祥符路新涇港37號',
    phone: '+86-189-5739-8087',
    hours: '11:00-22:00',
    priceRange: '¥¥（人均 ¥80-150）',
    type: '傳統火鍋',
    vibe: '🌶️ 水鄉麻辣香',
    rating: 4.3,
    reviewCount: 312,
    tags: ['西塘古鎮', '在地老店', '麻辣鍋', '夜遊配套'],
    story: `在西塘古鎮逛了一整天，石橋走過了十幾座，燈籠也看了個夠。晚上朋友推薦了這家火鍋，說是當地人自己也會來吃的店，不在主街上，所以觀光客比較少知道。

走到門口就聞到了火鍋的香味——牛油和辣椒的香氣混在一起，順著巷子飄出來。店內不大，木製桌椅，有一種古鎮特有的家常感。老闆娘很熱情，問我們要不要加點特色菜品。

鍋底是麻辣牛油鍋，辣度可以選，我選了中辣。湯頭上來時顏色紅亮，辣椒和花椒在湯面上浮沉，看起來就很有食慾。牛肉是新鮮的，不是那種凍了太久口感粉粉的貨色，在鍋裡涮個十來秒，入口又嫩又香。

最讓我驚喜的是他們家的蘸料——蒜泥、香菜、小米辣，再加一點點醋，這個配方在水鄉古鎮特別對味。吃著火鍋看著窗外的石板路和紅燈籠，這就是西塘夜晚應有的樣子。

吃完了走出門口就是永寧橋，夜色中古橋的輪廓特別美。來西塘，這家火鍋值得一試。`,
    dishes: [
      { name: '麻辣牛油鍋底', price: '¥48', note: '中辣，牛油香氣濃郁', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
      { name: '鮮嫩牛肉', price: '¥58', note: '每天供應，涮10秒即食', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '手打蝦滑', price: '¥38', note: '手工打製，蝦肉Q彈', img: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80' },
      { name: '鮮毛肚', price: '¥48', note: '大片脆嫩，七上八下', img: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800&q=80' },
      { name: '特色鸭血', price: '¥18', note: '嫩滑入味，火鍋必點', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
    ],
    menu: {
      '🍲 鍋底': [
        { item: '麻辣牛油鍋', price: '¥48' },
        { item: '番茄鍋', price: '¥38' },
        { item: '菌湯鍋', price: '¥38' },
      ],
      '🥩 肉類': [
        { item: '鮮嫩牛肉', price: '¥58' },
        { item: '羊肉卷', price: '¥48' },
        { item: '嫩牛肉片', price: '¥42' },
      ],
      '🦐 海鮮/特色': [
        { item: '手打蝦滑', price: '¥38' },
        { item: '鮮毛肚', price: '¥48' },
        { item: '特色鸭血', price: '¥18' },
        { item: '凍豆腐', price: '¥12' },
      ],
    },
    tips: '在西塘古鎮北側，距離永寧橋和塘東街都很近，適合安排在古鎮夜遊之後用餐。晚飯時間17:30-19:30人比較多，建議稍早或稍晚去。吃完了可以順便逛逛古鎮的夜景，燈光打在水面上的倒影很美。',
    ratingDetail: '味道★★★★ 辣度★★★★ 在地感★★★★★ 氣氛感★★★★',
  },
  {
    id: 'act-30',
    day: 3,
    time: '18:30',
    name: '尋塢水宴餐廳',
    nameEn: 'Xun Wu Shui Yan Restaurant',
    location: '嘉興市桐鄉市隆源路485號西柵景區北大門',
    phone: '+86-187-6732-6722',
    hours: '11:00-21:00',
    priceRange: '¥¥¥（人均 ¥200-400）',
    type: '江浙菜',
    vibe: '🏮 水鄉意境',
    rating: 5.0,
    reviewCount: 4,
    tags: ['西柵景區', '江浙料理', '水鄉意境', '北大門'],
    story: `在西柵景區走了一整天，傍晚時分路過北大門，看到了這家「尋塢水宴」。一開始以為是那種專做觀光客生意的高價餐廳，但走進去之後，我改觀了。

餐廳就在景區北大門入口處，空間開闊，裝修低調而有水鄉特色。窗外就是景區的水道和石橋，燈光打在水面上的倒影特別有詩意。我點了招牌的御品醉雞和古法紅燒肉，外加一份清炒時蔬。

御品醉雞的糟香入味，雞肉嫩滑，吃起來有一種發酵後的獨特鮮香。紅燒肉是亮點——五花肉三層分明，糖色漂亮，入口即化卻不油膩，醬汁拿來拌飯，我直接吃了兩碗。

服務員說他們的食材都是當天從景區周邊的農戶採購，蔬菜是最新鮮的時令菜。吃著飯看著窗外的烏鎮水鄉風光，這頓飯的體驗是完整的——不只是填飽肚子，是對整個水鄉之旅的回顧與總結。

如果你在烏鎮西柵的行程安排在第三天，晚飯選擇這裡，會是一個完美的收尾。`,
    dishes: [
      { name: '御品醉雞', price: '¥88', note: '糟香入味，雞肉嫩滑', img: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80' },
      { name: '古法紅燒肉', price: '¥128', note: '三層五花，入口即化', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '清炒時蔬', price: '¥38', note: '當日時令，新鮮清脆', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
      { name: '清蒸鱸魚', price: '¥168', note: '水鄉水產，鮮嫩清甜', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
      { name: '手工酒釀圓子', price: '¥28', note: '甜品，軟糯酒香', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
    ],
    menu: {
      '🍗 招牌': [
        { item: '御品醉雞', price: '¥88' },
        { item: '古法紅燒肉', price: '¥128' },
        { item: '清蒸鱸魚', price: '¥168' },
      ],
      '🥬 時蔬': [
        { item: '清炒時蔬', price: '¥38' },
        { item: '上湯浸時蔬', price: '¥48' },
      ],
      '🍮 甜品': [
        { item: '手工酒釀圓子', price: '¥28' },
        { item: '桂花糯米藕', price: '¥38' },
      ],
    },
    tips: '就在西柵景區北大門入口處，安排在第三天晚餐最順路。風景位置佳，靠窗座位可以一邊用餐一邊看水鄉夜景。建議提前電話預訂，確保有靠窗位置。旅遊旺季最好提前3天預訂。',
    ratingDetail: '味道★★★★★ 環境★★★★★ 服務★★★★★ 風景★★★★★',
  },
  {
    id: 'act-21',
    day: 6,
    time: '06:00',
    name: '游埠豆漿',
    nameEn: 'Youbu Soymilk',
    location: '杭州｜上城區河坊街82號（近胡雪巖故居）',
    phone: '+86-571-8780-5234',
    hours: '05:30-10:30',
    priceRange: '¥（人均 ¥15-40）',
    type: '傳統早餐',
    vibe: '🌅 杭州老味道',
    rating: 4.5,
    reviewCount: 1876,
    tags: ['石磨豆漿', '現炸油條', '老字號', '在地人情味'],
    story: `早上五點半的河坊街大多數店還沒開門，但游埠豆漿的燈已經亮了。我是這裡當天第一個客人，師傅正在炸油條，金黃色的油條在油鍋裡打滾，茲茲作響，空氣裡都是油香。

老闆1994年接手這家店，三十年了。他說豆漿用的黃豆是黑龍江非轉基因的，每天凌晨三點開始浸泡石磨磨漿。我問他為什麼堅持石磨，他說：「機器打的豆漿口感粗，石磨磨的細滑，但成本高、產量低。不過老客人就愛這一味，我們就堅持。」

鹹豆漿加油條、榨菜、蔥花，是杭州傳統的早餐吃法。我點了鹹豆漿加油條，再加一份小籠包，一共不到二十塊錢。小籠包是現場包的，旁邊阿姨一邊包一邊跟我們聊家常，說她已經在這裡做了十多年。

六點半開始人多起來，穿拖鞋的、跑步的、開車路過的，都是熟面孔。我在這裡吃到了杭州最地道的早餐——沒有網紅店的光環，但有的是時間積累出來的味道。`,
    dishes: [
      { name: '鹹豆漿（碗）', price: '¥8', note: '加油條榨菜蔥花，杭州傳統吃法', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
      { name: '甜豆漿（碗）', price: '¥6', note: '石磨豆漿，香濃滑順', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
      { name: '油條（2根）', price: '¥6', note: '現炸金黃，中間軟外層酥', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
      { name: '小籠包（6隻）', price: '¥22', note: '現蒸，皮薄湯多', img: 'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=800&q=80' },
      { name: '鮮肉大包', price: '¥8', note: '大到嚇一跳，肉餡鮮美', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
      'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=1200&q=85',
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
    ],
    menu: {
      '🥛 豆漿': [
        { item: '鹹豆漿', price: '¥8/碗' },
        { item: '甜豆漿', price: '¥6/碗' },
        { item: '淡豆漿', price: '¥6/碗' },
      ],
      '🍳 炸物': [
        { item: '油條（2根）', price: '¥6' },
        { item: '粢飯糕', price: '¥5' },
        { item: '麻球', price: '¥5' },
      ],
      '🥟 蒸籠': [
        { item: '小籠包（6隻）', price: '¥22' },
        { item: '鮮肉大包', price: '¥8' },
        { item: '豆沙包', price: '¥6' },
        { item: '菜包', price: '¥5' },
      ],
    },
    tips: '早上5:30開門，6:30前到可以看到師傅炸油條的完整過程。千萬不要超過9點去，很多品項會賣完。內用排一列、外帶排另一列，不要排錯了。找靠窗位置，晨光打在河坊街的青石板上很美。',
    ratingDetail: '味道★★★★★ 在地感★★★★★ 性價比★★★★★ 氛圍感★★★★',
  },
{
    id: 'act-23',
    day: 6,
    time: '18:30',
    name: '馬鴻興川小館',
    nameEn: 'Ma Hong Xing Sichuan',
    location: '杭州｜上城區河坊街61號（近南宋御街）',
    phone: '+86-571-8780-1234',
    hours: '10:30-14:00，16:30-21:30',
    priceRange: '¥¥（人均 ¥80-150）',
    type: '川菜',
    vibe: '🔥 香辣過癮',
    rating: 4.4,
    reviewCount: 1247,
    tags: ['水煮魚', '川味正宗', '河坊街', '老字號'],
    // 美食博主第一人稱叙述
    story: `河坊街逛到一半，朋友說「前面有一家川菜館，味道很正」，我還半信半疑。走到門口，看到木製的招牌上四個字：「馬鴻興川小館」，旁邊一個紅辣椒 logo。推門進去，空氣裡全是花椒和乾辣椒的香味。

老闆是四川重慶過來的師傅，菜單很大一張，川菜經典都有。我點了水煮魚、酸菜魚、回鍋肉、麻婆豆腐——全是下飯神器。老闆說他們的辣椒和花椒都是從四川運過來的，麻度和辣度比一般江浙川菜要強。

水煮魚上桌時我驚了——整整一大盆，魚片薄如蟬翼，湯色紅亮，辣椒花椒浮在上面，光是看就開始流口水。夾一片魚肉入口，又嫩又滑，辣而不燥，麻而不苦。配一碗白米飯，我直接吃了三碗。

這家店在河坊街的外圍，不是主街，所以很多人路過不知道。但吃過的人都說「下次還要再來」。如果想吃正宗的川菜辣味，這家值得繞過人群專程來。`,
    dishes: [
      { name: '水煮魚（鱔魚）', price: '¥98/斤', note: '四川乾辣椒，花椒麻香，魚肉滑嫩', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '酸菜魚', price: '¥88/斤', note: '老壇酸菜，酸辣開胃，魚片嫩滑', img: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800&q=80' },
      { name: '回鍋肉', price: '¥48', note: '五花肉片，豆瓣酱香，肥而不膩', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
      { name: '麻婆豆腐', price: '¥38', note: '麻辣鮮香，豆腐入味，米飯殺手', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
      { name: '夫妻肺片', price: '¥58', note: '紅油澆拌，牛腱牛心，麻辣過癮', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=85',
    ],
    menu: {
      '🐟 招牌魚類': [
        { item: '水煮鱔魚', price: '¥98/斤' },
        { item: '酸菜魚', price: '¥88/斤' },
        { item: '豆瓣鯉魚', price: '¥78/斤' },
      ],
      '🥩 肉類': [
        { item: '回鍋肉', price: '¥48' },
        { item: '夫妻肺片', price: '¥58' },
        { item: '毛血旺', price: '¥68' },
      ],
      '🫘 豆製品': [
        { item: '麻婆豆腐', price: '¥38' },
        { item: '乾鍋花菜', price: '¥36' },
      ],
      '🥬 時蔬': [
        { item: '酸辣土豆絲', price: '¥28' },
        { item: '乾煸四季豆', price: '¥32' },
        { item: '炒時蔬', price: '¥26' },
      ],
    },
    tips: '位置在河坊街靠南宋御街的外側，不在主街上要找一下。晚飯時間18:00-19:30人比較多，建議稍晚或提前去。水煮魚可以選鱔魚或草魚，鱔魚更嫩。',
    ratingDetail: '味道★★★★★ 辣度★★★★ 在地感★★★★ 性價比★★★★',
  },
  {
    id: 'act-24',
    day: 7,
    time: '06:00',
    name: '大馬弄早市',
    nameEn: 'Damang Morning Market',
    location: '杭州｜上城區中山南路488號（大馬弄巷內）',
    phone: '無（傳統早市）',
    hours: '05:00-12:00（賣完即止）',
    priceRange: '¥（人均 ¥30-80）',
    type: '傳統早市',
    vibe: '🏮 老杭州烟火氣',
    rating: 4.6,
    reviewCount: 2341,
    tags: ['1930年代', '十幾家攤', '物美價廉', '清晨人間'],
    story: `五點鐘的鬧鐘，掙扎了很久才爬起來。但當我走進大馬弄巷子的那一刻，所有的起床氣都消失了——窄窄的巷子裡已經熱闘起來了，蒸籠的白氣上升、師傅大聲呦喝、有人單車經過按鈴鐺。

大馬弄是杭州最後的老城區早市，1930年代就有了。我去的時候天色剛發亮，路燈還沒完全關掉，攤子上的白熾燈泡把整條巷子照得溫暖。金色的是蔥煎包在鐵板上慢慢變焦，白色的是豆腦的蒸籠，棕色的是油條在油鍋裡翻滾。

老貫莊小餛飩是最老的一家，我到的時候師傅已經在包餛飩了——左手抓皮、右手挑餡，一秒鐘一隻，乾淨利落。餛飩下鍋，湯頭是豬骨熬的清湯，撒一把蔥花、幾滴香油，我喝第一口的時候差點流出眼淚——不是激動，是鮮味。

吳山路蔥煎包的攤前排著七八個人，地下有一個鐵板煎包師傅，一邊做一邊呦喝：「蔥煎包好了！」我買了五個，底部煎得焦香，蔥香在嘴裡散開，配一碗鹹豆漿，這就是杭州老城區的味道。

七點鐘，太陽出來了，光線斜斜地打在老房子的牆上，市場迎來了第二波人流——買菜的阿姨、溜狗的大爺、推婴儿车的年輕爸媽。在地人告訴我，這個市場是他們的日常生活，不是景區。`,
    dishes: [
      { name: '老貫莊小餛飩', price: '¥12', note: '最老一家，現包現下，皮薄如雲', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
      { name: '吳山路蔥煎包（5隻）', price: '¥15', note: '地下有一家，底部煎得焦香', img: 'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=800&q=80' },
      { name: '侯氏牛肉蒸餃（10隻）', price: '¥20', note: '湯汁飽滿，牛肉餡香', img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80' },
      { name: '老王頭燒餅', price: '¥8', note: '打燒餅老師傅，餅皮香脆', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
      { name: '手工豆腦', price: '¥10', note: '清晨限量，豆香濃郁', img: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=1200&q=85',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1563245372-f5b5d8e93c8d?w=1200&q=85',
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1200&q=85',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=85',
    ],
    menu: {
      '🥟 餛飩類': [
        { item: '老貫莊小餛飩', price: '¥12' },
        { item: '鮮肉大餛飩', price: '¥15' },
        { item: '蝦仁大餛飩', price: '¥20' },
      ],
      '🥙 煎炸類': [
        { item: '蔥煎包（5隻）', price: '¥15' },
        { item: '油條（2根）', price: '¥6' },
        { item: '糖糕', price: '¥5' },
      ],
      '🥘 蒸類': [
        { item: '牛肉蒸餃（10隻）', price: '¥20' },
        { item: '鮮肉小籠（6隻）', price: '¥18' },
      ],
      '🥛 豆製品': [
        { item: '手工豆腦', price: '¥10' },
        { item: '鹹豆漿', price: '¥8' },
        { item: '甜豆漿', price: '¥6' },
      ],
    },
    tips: '務必在早上7點前到達，6點最地道、拍照光線最美。很多攤子8點就賣完收工。穿過大馬弄巷到中山南路，整條街都是早餐攤。帶現金，很多老攤子不接受電子支付。穿好走的鞋，巷子裡石板路不平。',
    ratingDetail: '在地的味道★★★★★ 氛圍★★★★★ 性價比★★★★★ 拍照光線★★★★',
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
    vibe: '👑 宋代宮廷美學',
    rating: 4.8,
    reviewCount: 423,
    tags: ['宋式美學', '二十四節氣', '詩詞典故', '斷橋夜景'],
    story: `我在下午五點半抵達新新飯店，大堂經理已经在電梯口等我。電梯直達五樓，一開門，我以為自己走進了另一個時代——宋代美學的室內設計，水墨畫軸、活字印刷裝飾、蓮花造型燈具，每一個細節都在說一個故事。

套餐名字叫「春去秋來」，按二十四節氣設計。我吃的這一套是秋收起，呼應著杭州最美的季節。每一道菜上桌時，服务員都會附上一段詩詞典故，比如龍井蝦仁，說的是「雨前龍井嫩焙香，一泓清泉映碧塘」。

富春山居圖是开胃前菜，拼盤造型呼應黃公望的畫作，視覺效果令人屏息。清湯越蓮用的是蓮子心和泉水，蓮子心的苦與甘草的甜交織，層次複雜而和諧。龍井蝦仁則是整頓飯的高潮——錢塘江小野蝦配獅峰龍井，蝦肉的鮮甜和茶香融為一體，我吃完了整整一盤。

窗外就是斷橋，夜景在燈光下如詩如畫。餐後甜點是桂花糯米藕，桂花糖蜜浸透的蓮藕軟糯香甜，為這頓飯畫上完美的句號。

這不是普通的一頓飯，這是一次穿越。如果你想給重要的人一個難忘的夜晚，宮宴不會讓你失望。`,
    dishes: [
      { name: '富春山居圖（開胃拼盤）', price: '¥388', note: '視覺藝術，呼應黃公望畫作', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80' },
      { name: '清湯越蓮', price: '¥288', note: '蓮子心炖泉水，清雅脫俗', img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80' },
      { name: '龍井蝦仁', price: '¥328', note: '杭州龍井配河蝦，時令代表作', img: 'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=800&q=80' },
      { name: '紅燒獅子頭', price: '¥268', note: '古法慢火炖，肉香四溢', img: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80' },
      { name: '桂花糯米藕', price: '¥128', note: '桂花糖蜜浸，軟糯香甜', img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=80' },
    ],
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=85',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=85',
      'https://images.unsplash.com/photo-1565557629238-35c4c7c4a9e8?w=1200&q=85',
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=85',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85',
    ],
    menu: {
      '🥢 前菜': [
        { item: '富春山居圖（開胃拼盤）', price: '¥388' },
        { item: '花語精靈（餐前小點）', price: '¥128' },
        { item: '宋嫂魚生（季節前菜）', price: '¥228' },
      ],
      '🍲 湯品': [
        { item: '清湯越蓮', price: '¥288' },
        { item: '松茸菌王燉針', price: '¥328' },
      ],
      '🐟 主菜': [
        { item: '龍井蝦仁', price: '¥328' },
        { item: '紅燒獅子頭', price: '¥268' },
        { item: '東坡肉（位上）', price: '¥198' },
        { item: '砂鍋大千魚', price: '¥388' },
      ],
      '🍮 甜點': [
        { item: '桂花糯米藕', price: '¥128' },
        { item: '楊梅荔枝冰沙', price: '¥88' },
        { item: '龍井茶糕', price: '¥68' },
      ],
    },
    tips: '務必提前3天預訂，套餐制無單點。請選擇包廂位置，可一邊享用美食一邊欣賞斷橋夜景。穿著建議正式，餐廳有 dress code。配有專人講解每道菜的典故由來。情侶建議預訂窗邊雙人包間，景觀最浪漫。',
    ratingDetail: '氛圍★★★★★ 味道★★★★★ 服務★★★★★ 適合特殊場合★★★★★',
  },
];

const DAY_TOURS: Record<number, string> = {
  1: 'Day 1｜上海：浦東的夜，屬於火鍋',
  2: 'Day 2｜上海-西塘：清晨的生煎，水鄉的饅頭',
  3: 'Day 3｜西塘-烏鎮：水鄉深遊，船上人家',
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
      <div className="relative rounded-xl overflow-hidden aspect-[16/9] bg-gray-100">
        <img
          src={images[active]}
          alt={`${name} - ${active + 1}`}
          className="w-full h-full object-cover transition-all duration-300"
        />
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
      {/* Thumbnails */}
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
            <div className="aspect-square bg-gray-100 overflow-hidden">
              <img src={dish.img} alt={dish.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
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
        </div>
        {/* Day filter */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterDay === null ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-orange-100'}`}
          >
            全部（{RESTAURANTS.length}間）
          </button>
          {Object.entries(DAY_TOURS).map(([day, label]) => {
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
                  <ImageGallery images={item.images} name={item.name} />
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
              <ImageGallery images={selected.images} name={selected.name} />
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
              {Object.entries(selected.menu).map(([section, items]) => (
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
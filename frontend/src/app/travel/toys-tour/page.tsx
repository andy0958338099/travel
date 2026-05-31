'use client';
import { useState } from 'react';
import Link from 'next/link';

type ToyStore = {
  id: string;
  name: string;
  address: string;
  category: 'model' | 'anime' | 'educational' | 'remote' | 'wholesale' | 'department' | 'cards';
  priceRange: '¥' | '¥¥' | '¥¥¥' | '¥¥¥¥';
  hours: string;
  description: string;
  highlight: string;
  tips: string;
  distanceFromRoute: string;
  imageUrl: string;
};

const SH_TOYS: ToyStore[] = [
  {
    id: 'sh-01',
    name: '玩具反斗城（Toys "R" Us）新華聯店',
    address: '上海市黃浦區南京東路680號新華聯商廈2-3樓',
    category: 'department',
    priceRange: '¥¥¥',
    hours: '10:00-21:30',
    description: '亞洲最大玩具連鎖之一，南京東路旗艦店。涵蓋樂高、美泰、孩之寶等國際一線品牌，兼有日本卡通授權玩具、遙控飛機、變形金剛模型等。',
    highlight: '樂高、變形金剛、高達模型、芭比娃娃',
    tips: '節假日人流量大，下午2-4點是相對低峰時段。2樓有試玩區可免費體驗遙控玩具。消費滿500元可辦會員卡享95折。',
    distanceFromRoute: '南京東路680號，步行約3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  },
  {
    id: 'sh-02',
    name: '第一百貨兒童玩具館',
    address: '上海市黃浦區南京東路830號第一百貨商店3樓',
    category: 'department',
    priceRange: '¥¥',
    hours: '10:00-21:30',
    description: '上海老字號百貨的玩具專區，以中高性價比玩具為主。涵蓋國產優質品牌（奧傑壹胎、凱德鹿）和部分進口品牌。周末常有品牌促銷活動。',
    highlight: '國產精品玩具、模型、益智拼圖',
    tips: '可以使用商場停車優惠。3樓玩具區經常與童裝區聯動促銷，母嬰用品同步選購更划算。每周六下午有免費試玩活動。',
    distanceFromRoute: '南京東路830號，步行約2分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80',
  },
  {
    id: 'sh-03',
    name: '來福士廣場 Kidsland 旗艦店',
    address: '上海市黃浦區西藏中路118號來福士廣場2樓',
    category: 'model',
    priceRange: '¥¥¥¥',
    hours: '10:00-22:00',
    description: '高端玩具集合店，匯集萬代（S.H.Figuarts、Metal Build）、樂高旗艦版、Hot Toys等高端模型品牌。店內有變形金剛旗艦展區和高達限定區域。',
    highlight: '高端模型、Hot Toys、S.H.Figuarts、限定版',
    tips: '會員可優先購買限定商品。店內提供免費WiFi查詢官網庫存。靠近人民廣場地鐵站，交通便利。節假日排隊，建議早上11點前到。',
    distanceFromRoute: '西藏中路118號，步行約5分鐘（人民廣場地鐵站）',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  },
  {
    id: 'sh-04',
    name: '上海世茂廣場 LEGO Certified Store',
    address: '上海市黃浦區南京東路829號世茂廣場1樓',
    category: 'model',
    priceRange: '¥¥¥¥',
    hours: '10:00-22:00',
    description: '樂高認證認證門市，上海第二家樂高官方旗艦店。擁有亞洲最大樂高馬賽克牆，提供獨家限定版（如上海建築系列）、免費試玩區和積木拼搭體驗。',
    highlight: '樂高限定版、馬賽克牆、免費試玩、定制服務',
    tips: '可以現場拼搭並拍照。限定版需要排隊購買，建議開門就到。門市提供免費WiFi下載樂高應用。消費可全額抵扣停車。',
    distanceFromRoute: '南京東路829號，步行約4分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=80',
  },
  {
    id: 'sh-05',
    name: '豫園商城福佑路玩具禮品區',
    address: '上海市黃浦區福佑路豫園商城B1-B2層',
    category: 'wholesale',
    priceRange: '¥',
    hours: '09:00-21:00',
    description: '結合觀光與批發的傳統商街，玩具種類齊全從10元起的國產玩具到高端模型都有。路邊攤和店鋪混合，適合喜歡淘貨探險的家庭。這裡的價格通常比商場實惠30-50%。',
    highlight: '平價玩具、批發價格、傳統市集氛圍',
    tips: '一定要殺價！同款商品不同店家價格差異可達2倍。推薦往福佑路北側的批發店深入探索。人流高峰在下午3-6點。',
    distanceFromRoute: '豫園商城B1-B2，步行約5分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
  },
  {
    id: 'sh-06',
    name: '上海國際旅遊用品城（玩具批發區）',
    address: '上海市黃浦區麗水路68號上海國際旅遊用品城3樓',
    category: 'wholesale',
    priceRange: '¥',
    hours: '09:00-18:00（批發為主）',
    description: '上海規模最大的旅遊用品和玩具批發市場之一，玩具種類涵蓋遙控飛機、模型、絨毛玩具、積木等。兼有零售和批發，週末對散客也開放。',
    highlight: '遙控飛機、模型套裝、絨毛玩具、積木',
    tips: '營業時間到下午6點，建議上午去選擇最齊全。大量採購可享批發價。距離豫園步行約10分鐘，可以和豫園一起遊覽。',
    distanceFromRoute: '麗水路68號，步行約8分鐘（豫園附近）',
    imageUrl: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&q=80',
  },
  {
    id: 'sh-07',
    name: '大丸百貨玩具層',
    address: '上海市黃浦區南京東路228號大丸百貨5樓',
    category: 'department',
    priceRange: '¥¥¥',
    hours: '10:00-21:30',
    description: '日系高端百貨的玩具專區，以日本進口玩具為特色，包括萬代中高達、壽屋、Figma等品牌。服務質量高，試玩空間舒適，適合追求品質的家庭。',
    highlight: '日版高達、壽屋、Figma、日系精品玩具',
    tips: '可使用免稅服務（需護照）。5樓玩具區經常與4樓童裝聯動。消費滿1000元可抵扣2小時停車。節假日人少，體驗好。',
    distanceFromRoute: '南京東路228號，步行約3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  },
  {
    id: 'sh-08',
    name: 'M&M\'s World 上海旗艦店',
    address: '上海市黃浦區南京東路步行街689號（近河南中路）',
    category: 'department',
    priceRange: '¥¥',
    hours: '10:00-22:00',
    description: '全球第9家M&M\'s旗艦店，4層主題空間展示超過200種M&M\'s商品。以M&M\'s角色周邊為主，包括公仔、文具、服飾、糖果等。4樓有DIY調色體驗區。',
    highlight: 'M&M\'s公仔、DIY調色、角色周邊、拍照打卡',
    tips: "4樓DIY調色體驗（約100元）建議提前預約。1樓有巨型M&M's公仔免費拍照。步行街人流量大，但排隊進店時間通常不超過10分鐘。",
    distanceFromRoute: '南京東路步行街689號，步行約3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
  },
  {
    id: 'sh-09',
    name: '外灘中央商場禮品玩具店',
    address: '上海市黃浦區中山東一路外灘中央商場2樓',
    category: 'department',
    priceRange: '¥¥',
    hours: '10:00-22:00',
    description: '外灘歷史建築内的商場，2樓有數家精品玩具禮品店，以文創玩具和手工藝品為特色。包括金屬火車模型、船模、文創公仔等，適合小男孩的火車和軍事模型愛好者。',
    highlight: '火車模型、船模、軍事模型、文創公仔',
    tips: '與外灘景點結合遊覽，建議傍晚看完外灘夜景後逛。外灘中央商場建築本身是優秀歷史建築，值得一看。部分店鋪接受支付寶/微信。',
    distanceFromRoute: '中山東一路外灘，步行約5分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  },
  {
    id: 'sh-10',
    name: '虹口足球場主題玩具店',
    address: '上海市虹口區東江灣路564號虹口足球場商圈',
    category: 'model',
    priceRange: '¥¥',
    hours: '10:00-21:00',
    description: '以足球和運動主題玩具為特色的玩具店，兼售各類主流玩具。距離四行倉庫約1.5公里，是四行倉庫遊覽後的理想延伸目的地。籃球、足球相關玩具齊全。',
    highlight: '運動主題玩具、足球、籃球、卡通周邊',
    tips: '離四行倉庫較近，適合遊覽完四行倉庫後順路前往。商場有餐飲設施，可以在此午餐。四行倉庫的遊客服務中心有洗手間和休息區。',
    distanceFromRoute: '虹口足球場，步行約20分鐘或地鐵3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=800&q=80',
  },
  {
    id: 'sh-11',
    name: '安利美特（Animate）上海南京路店',
    address: '上海市黃浦區南京東路558號近福建南路',
    category: 'cards',
    priceRange: '¥¥¥',
    hours: '10:00-22:00',
    description: '日本最大動漫精品連鎖の中國旗艦店。3樓卡牌遊戲區有齊全的寶可夢TCG、遊戲王OCG商品，以及萬代卡牌戰士系列。4樓動漫周邊和角色扮演用品齊全，是二次元愛好者必訪之地。',
    highlight: '寶可夢TCG、游戏王OCG、動漫周邊、角色扮演',
    tips: '南京東路558號，從南京東路地鐵站步行約5分鐘。2樓有輕食區可以休息。中國限定商品較多，適合購買限定周邊。支付寶/微信/銀行卡均可。',
    distanceFromRoute: '南京東路558號，步行約5分鐘',
    imageUrl: '/toys-tour/pokemon_tcg_booster.jpg',
  },
  {
    id: 'sh-12',
    name: '百聯ZX造趣場 卡牌專區',
    address: '上海市楊浦區國濟路100號百聯ZX造趣場（近五角場）',
    category: 'cards',
    priceRange: '¥¥',
    hours: '10:00-21:30',
    description: '2024年12月新開幕的ACG主題商場，前身是百聯奧特萊斯。商場內有多家卡牌專賣店，集中銷售寶可夢TCG、遊戲王、NBA卡牌等熱門集換式卡牌遊戲商品。商場還有動漫周邊、模型、手辦等專區。',
    highlight: '多家卡牌店匯聚、寶可夢/遊戲王/MLB卡、動漫周邊',
    tips: '地鐵10號線五角場站步行約8分鐘，或8號線直達。商場1樓有咖啡輕食。B1層卡牌專區店鋪最集中，建議先逛這層。節假日人流量大，建議避開週末下午。',
    distanceFromRoute: '國濟路100號五角場，步行約15分鐘或地鐵10分鐘',
    imageUrl: '/toys-tour/yugioh_collection.jpg',
  },
];

const HZ_TOYS: ToyStore[] = [
  {
    id: 'hz-01',
    name: '杭州工聯玩具城',
    address: '杭州市拱墅區武林廣場地鐵商場B2層（近武林廣場）',
    category: 'wholesale',
    priceRange: '¥',
    hours: '09:30-21:00',
    description: '杭州最大型玩具批發市場之一，兼營零售，涵蓋0-12歲各類玩具。價格實惠，款式更新快，是杭州本地家長購買玩具的首選地。節假日人流量大。',
    highlight: '平價玩具、批發價格、款式齊全',
    tips: '建議上午去，庫存最齊全。可以大量議價，同款比商場便宜40-60%。武林廣場地鐵站A出口直達商場B2層。',
    distanceFromRoute: '武林廣場B2層，步行約3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  },
  {
    id: 'hz-02',
    name: '國脈文化創意玩具城',
    address: '杭州市拱墅區武林廣場289號國脈大廈3樓',
    category: 'model',
    priceRange: '¥¥',
    hours: '10:00-21:00',
    description: '以創意玩具和文創類玩具為主的高端玩具店，包括金屬拼圖、3D木質拼圖、編程機器人等。適合喜歡動手創造的小男孩，是杭州素質教育玩具的代表店鋪。',
    highlight: '創意玩具、編程機器人、3D木質拼圖、金屬模型',
    tips: '可以現場體驗編程玩具。工作日晚上和周末下午人流量大。國脈大廈對面是杭州大廈，可以安排一起遊覽。',
    distanceFromRoute: '武林廣場289號，步行約4分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&q=80',
  },
  {
    id: 'hz-03',
    name: '銀樂薈（武林廣場店）',
    address: '杭州市拱墅區武林廣場銀泰百貨6樓',
    category: 'department',
    priceRange: '¥¥',
    hours: '10:00-21:30',
    description: '武林廣場銀泰百貨的玩具專區，國際品牌和國產精品兼顧。週末有品牌促銷活動，包括樂高、芭比、小馬寶莉等。銀泰會員可享折上折優惠。',
    highlight: '樂高、芭比、小馬寶莉、銀泰會員折扣',
    tips: '銀泰會員日（每月8日）優惠力度最大，可以線上領券。6樓玩具區靠近親子樂園，可以安排半天時間。消費滿300元可減免2小時停費。',
    distanceFromRoute: '武林廣場銀泰百貨6樓，步行約5分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  },
  {
    id: 'hz-04',
    name: '杭州大廈玩具禮品店',
    address: '杭州市拱墅區武林廣場1號杭州大廈A座3樓',
    category: 'department',
    priceRange: '¥¥¥',
    hours: '10:00-21:30',
    description: '杭州最高端的商場之一，玩具區以進口品牌和高端禮品玩具為主。包括德國STEM玩具、日本工匠玩具、歐美益智玩具等。服務專業，包裝精美，適合送禮。',
    highlight: '德國STEM玩具、日本工匠玩具、歐美益智玩具',
    tips: '杭州大廈停車較貴，建議地鐵前往。玩具區導購服務專業，可以根據孩子年齡和愛好推薦。商場會員可以累積積分抵現。',
    distanceFromRoute: '武林廣場1號，步行約5分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=80',
  },
  {
    id: 'hz-05',
    name: '河坊街玩具禮品小店群',
    address: '杭州市上城區河坊街歷史街區（主街兩側）',
    category: 'wholesale',
    priceRange: '¥',
    hours: '09:00-22:00（商店各異）',
    description: '河坊街歷史街區內有十餘家玩具禮品小店，售賣傳統手工藝玩具（陀螺、空竹、風車）和潮流卡通周邊。價格實惠，適合給小朋友購買具中國傳統特色的玩具。',
    highlight: '傳統手工藝玩具、中國風公仔、卡通周邊',
    tips: '河坊街晚上的夜景比白天更有特色，建議傍晚遊覽並購買。街區內物流不便，建議輕裝前往。河坊街中間段玩具店最集中。',
    distanceFromRoute: '河坊街歷史街區，步行約5分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
  },
  {
    id: 'hz-06',
    name: '南宋御街地下商街玩具精品店',
    address: '杭州市上城區南宋御街地下商街B1層',
    category: 'educational',
    priceRange: '¥¥',
    hours: '10:00-21:30',
    description: '有空調的地下商街，玩具精品店林立，以益智玩具和創意禮品為主。兼顧遊客和本地居民，價格適中，環境舒適，是河坊街遊覽時的理想休憩和購物點。',
    highlight: '益智玩具、創意禮品、空調環境',
    tips: '地下商街有空調，是夏天遊覽河坊街時的良好選擇。B1層玩具店集中在中部區域，可以快速找到。南宋御街和河坊街的交界處是最大型的玩具店。',
    distanceFromRoute: '南宋御街B1層，步行約3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&q=80',
  },
  {
    id: 'hz-07',
    name: '吳山廣場親子玩具店',
    address: '杭州市上城區吳山廣場地鐵商場（7號線吳山廣場站）',
    category: 'model',
    priceRange: '¥¥',
    hours: '10:00-21:30',
    description: '吳山廣場地鐵商場內的玩具專區，以中高檔模型和卡通周邊為主。交通便利，是遊覽完吳山廣場和河坊街後的理想購物點。',
    highlight: '模型、卡通周邊、交通便利',
    tips: '吳山廣場地鐵7號線直達，與火車站和西湖都有地鐵連接。玩具店在地鐵商場2樓，出口即達。建議遊覽完吳山廣場後直接來這裡。',
    distanceFromRoute: '吳山廣場地鐵商場2樓，步行約2分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  },
  {
    id: 'hz-08',
    name: '杭州大廈501城市廣場玩具店',
    address: '杭州市拱墅區武林廣場501城市廣場3樓',
    category: 'department',
    priceRange: '¥¥',
    hours: '10:00-22:00',
    description: '新型社區型商場的玩具專區，以家庭客群為主，玩具種類齊全。室內空間開闘，玩具陳列生動，小朋友可以近距離接觸試玩。',
    highlight: '家庭型商場、互動試玩空間、親子友好',
    tips: '商場的餐飲設施齊全，可以在這裡用餐同時遊玩。週末有親子工作坊活動，關注商場公眾號報名。停車方便，適合自駕家庭。',
    distanceFromRoute: '武林廣場501城市廣場3樓，步行約8分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80',
  },
  {
    id: 'hz-09',
    name: '定安路地鐵商場玩具精品店',
    address: '杭州市上城區定安路地鐵站1號線站內商舖',
    category: 'educational',
    priceRange: '¥',
    hours: '06:00-23:00（地鐵營運時間）',
    description: '地鐵站內的小型玩具店，以便攜式玩具和益智小玩具為主。適合等車時快速選購，或者在前往景點的路上順路看看。價格實惠，款式更新快。',
    highlight: '便攜玩具、價格實惠、交通便利',
    tips: '地鐵站內商店規模較小，不建議專程前往。適合在等車時順路看看。地鐵站靠近西湖和吳山廣場，是遊覽間隙的理想購物點。',
    distanceFromRoute: '定安路地鐵站1號線站內，步行約2分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  },
  {
    id: 'hz-10',
    name: '龍翔橋地鐵樞紐玩具店',
    address: '杭州市拱墅區龍翔橋地鐵站（1號線龍翔橋站）',
    category: 'model',
    priceRange: '¥¥',
    hours: '06:00-23:00（地鐵營運時間）',
    description: '杭州最大地鐵樞紐站的站內玩具店，靠近西湖大道和延安路繁華商圈。玩具種類多樣，包括流行卡通周邊、模型、遙控玩具等。',
    highlight: '卡通周邊、遙控玩具、地鐵樞紐',
    tips: '早晚高峰期人流極大，建議避開7:30-9:00和17:30-19:00。龍翔橋站連接西湖和市中心，可以安排在西湖遊覽後的返程中順路遊覽。',
    distanceFromRoute: '龍翔橋地鐵站站內，步行約3分鐘',
    imageUrl: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=800&q=80',
  },
  {
    id: 'hz-11',
    name: '杭州安利美特（Animate）門店',
    address: '杭州市拱墅區武林廣場10號杭州大廈C座1樓',
    category: 'cards',
    priceRange: '¥¥¥',
    hours: '10:00-21:30',
    description: '日本安利美特在杭州的門市，毗鄰武林廣場商圈。店內有齊全的動漫精品和卡牌遊戲專區，包括寶可夢TCG、遊戲王OCG等熱門卡牌遊戲商品，以及動漫周邊、手辦模型。',
    highlight: '寶可夢TCG、游戏王OCG、動漫周邊、手辦模型',
    tips: '武林廣場站步行約3分鐘。商場地下有餐飲區域可以用餐休息。杭州大廈停車不便，建議地鐵或公車前往。節假日期間人流量大。',
    distanceFromRoute: '武林廣場10號杭州大廈，步行約5分鐘',
    imageUrl: '/toys-tour/pokemon_tcg_booster.jpg',
  },
  {
    id: 'hz-12',
    name: '杭州工聯玩具城 卡牌專區',
    address: '杭州市拱墅區武林廣場地鐵商場B2層（近武林廣場）',
    category: 'cards',
    priceRange: '¥¥',
    hours: '09:30-21:00',
    description: '杭州最大型玩具批發市場的卡牌專區，集中了多家卡牌遊戲專賣店。涵蓋寶可夢TCG、遊戲王OCG、NBA卡牌等熱門集換式卡牌遊戲商品，價格實惠齊全。',
    highlight: '多家卡牌店匯聚、批發價格、款式齊全',
    tips: '武林廣場地鐵站A出口直達B2層。建議上午去人較少，批發價格可以議價。中庭電梯直達，週末下午人流最大建議避開。',
    distanceFromRoute: '武林廣場B2層，步行約3分鐘',
    imageUrl: '/toys-tour/yugioh_collection.jpg',
  },
];

function StarDisplay({ level }: { level: string }) {
  const map: Record<string, string> = {
    '¥': '💰 經濟實惠',
    '¥¥': '💰💰 中等價位',
    '¥¥¥': '💰💰💰 中高價位',
    '¥¥¥¥': '💰💰💰💰 高端精選',
  };
  return (
    <span className="text-xs sm:text-sm text-gray-600">
      {map[level] || level}
    </span>
  );
}

function CategoryBadge({ cat }: { cat: ToyStore['category'] }) {
  const config: Record<ToyStore['category'], { label: string; color: string }> = {
    model: { label: '🎮 模型/公仔', color: 'bg-purple-100 text-purple-700' },
    anime: { label: '📺 動漫周邊', color: 'bg-pink-100 text-pink-700' },
    educational: { label: '🧩 益智玩具', color: 'bg-blue-100 text-blue-700' },
    remote: { label: '🚗 遙控玩具', color: 'bg-green-100 text-green-700' },
    wholesale: { label: '🏪 批發/市集', color: 'bg-amber-100 text-amber-700' },
    department: { label: '🏬 百貨專區', color: 'bg-indigo-100 text-indigo-700' },
    cards: { label: '🃏 卡牌遊戲', color: 'bg-rose-100 text-rose-700' },
  };
  const { label, color } = config[cat];
  return (
    <span className={`text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-bold ${color}`}>
      {label}
    </span>
  );
}

function ToyCard({ toy }: { toy: ToyStore }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      {/* Image */}
      <div className="relative w-full h-56 sm:h-72 md:h-80 overflow-hidden bg-gray-100">
        <img
          src={toy.imageUrl}
          alt={toy.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Category badge */}
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
          <CategoryBadge cat={toy.category} />
        </div>
        {/* Price badge */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 bg-white/90 backdrop-blur rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1">
          <StarDisplay level={toy.priceRange} />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-gray-800 text-base sm:text-lg leading-snug mb-1.5 sm:mb-2">{toy.name}</h3>

        {/* Address */}
        <div className="bg-amber-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3 border-l-4 border-amber-400">
          <p className="text-xs sm:text-sm font-bold text-amber-800 leading-relaxed">
            📍 {toy.address}
          </p>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-600 mb-2.5 sm:mb-3 leading-relaxed">
          {toy.description}
        </p>

        {/* Hours */}
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm bg-gray-100 text-gray-600 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
            🕐 {toy.hours}
          </span>
          <span className="text-xs sm:text-sm text-gray-500 leading-relaxed">
            ↗️ {toy.distanceFromRoute}
          </span>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-1.5 sm:py-2 text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-semibold border border-purple-100 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? '▲ 收起' : '▼ 精選與攻略'}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-2.5 sm:mt-3 space-y-2.5 sm:space-y-3">
            <div className="bg-purple-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
              <h4 className="text-xs font-bold text-purple-700 mb-1">⭐ 精選商品</h4>
              <p className="text-xs sm:text-sm text-purple-900 leading-relaxed">{toy.highlight}</p>
            </div>
            <div className="bg-green-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
              <h4 className="text-xs font-bold text-green-700 mb-1">💡 遊玩攻略</h4>
              <p className="text-xs sm:text-sm text-green-900 leading-relaxed">{toy.tips}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ToysTourPage() {
  const [selectedCity, setSelectedCity] = useState<'shanghai' | 'hangzhou'>('shanghai');
  const [filterCat, setFilterCat] = useState<string>('all');

  const currentToys = selectedCity === 'shanghai' ? SH_TOYS : HZ_TOYS;
  const filteredToys = filterCat === 'all'
    ? currentToys
    : currentToys.filter(t => t.category === filterCat);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/travel" className="text-gray-400 hover:text-gray-600 text-sm">
            ← 旅遊
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧸</span>
            <h1 className="text-xl font-bold text-gray-800">玩具尋寶導覽</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* City Tabs */}
        <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-5">
          <button
            onClick={() => { setSelectedCity('shanghai'); setFilterCat('all'); }}
            className={`flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all ${
              selectedCity === 'shanghai'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-purple-50'
            }`}
          >
            🏙️ 上海 · 12處
          </button>
          <button
            onClick={() => { setSelectedCity('hangzhou'); setFilterCat('all'); }}
            className={`flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all ${
              selectedCity === 'hangzhou'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-green-50'
            }`}
          >
            🌿 杭州 · 12處
          </button>
        </div>

        {/* City-specific Hero */}
        {selectedCity === 'shanghai' ? (
          <div className="bg-gradient-to-r from-purple-700 to-purple-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-5 text-white">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <span className="text-2xl sm:text-3xl">🧸</span>
              <h2 className="text-base sm:text-lg font-bold">上海 · 親子玩具尋寶地圖</h2>
            </div>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-1">
              從四行倉庫沿南京東路到外灘、豫園，精選12處適合小男孩的玩具店：國際品牌旗艦店、傳統批發市場、卡牌專賣店、文創精品店，主題多元，價格從平價到高端全覆盖。
            </p>
            <p className="text-white/60 text-xs">
              共收錄 {SH_TOYS.length} 處玩具尋寶地點 · 價格💰-💰💰💰💰
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-green-700 to-green-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-5 text-white">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <span className="text-2xl sm:text-3xl">🧸</span>
              <h2 className="text-base sm:text-lg font-bold">杭州 · 武林廣場 ↔ 河坊街玩具地圖</h2>
            </div>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-1">
              武林廣場商場群 → 河坊街歷史街區 → 吳山廣場地鐵商場。從高端百貨到傳統市集，從日系精品到國產平價，卡牌專賣店到傳統玩具，12處多元類型玩具店，適合不同預算和喜好。
            </p>
            <p className="text-white/60 text-xs">
              共收錄 {HZ_TOYS.length} 處玩具尋寶地點 · 價格💰-💰💰💰💰
            </p>
          </div>
        )}

        {/* Filter by category */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-3 sm:mb-4 -mx-1 px-1">
          {[
            { id: 'all', label: '全部', count: currentToys.length },
            { id: 'model', label: '🎮 模型/公仔', count: currentToys.filter(t => t.category === 'model').length },
            { id: 'educational', label: '🧩 益智玩具', count: currentToys.filter(t => t.category === 'educational').length },
            { id: 'wholesale', label: '🏪 批發/市集', count: currentToys.filter(t => t.category === 'wholesale').length },
            { id: 'department', label: '🏬 百貨專區', count: currentToys.filter(t => t.category === 'department').length },
            { id: 'cards', label: '🃏 卡牌', count: currentToys.filter(t => t.category === 'cards').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterCat(f.id)}
              className={`flex-shrink-0 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                filterCat === f.id
                  ? selectedCity === 'shanghai' ? 'bg-purple-600 text-white' : 'bg-green-600 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-purple-50'
              }`}
            >
              {f.label}（{f.count}）
            </button>
          ))}
        </div>

        {/* Toy store list */}
        <div className="space-y-0">
          {filteredToys.map(toy => (
            <ToyCard key={toy.id} toy={toy} />
          ))}
        </div>

        {filteredToys.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p>目前沒有符合條件的玩具店</p>
          </div>
        )}

        {/* Tips for parents */}
        <div className="mt-6 bg-purple-50 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-purple-100">
          <h3 className="text-xs sm:text-sm font-bold text-purple-700 mb-1.5 sm:mb-2 flex items-center gap-2">
            <span className="text-base sm:text-xl">👨‍👦</span> 家長攻略
          </h3>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-purple-800 leading-relaxed">
            <li>· <strong>建議遊玩順序：</strong>先到批發市場或平價商店激發興趣，再到高端旗艦店體驗限定商品。</li>
            <li>· <strong>價格談判：</strong>批發市場一定要殺價，同款商品不同店家價格差可達2倍。</li>
            <li>· <strong>携带建议：</strong>建議隨身携带小背包，便於收納購買的玩具。地鐵站內玩具店規模小，不建議專程前往。</li>
            <li>· <strong>時間安排：</strong>商場玩具店建議下午3-5點前往，避開午餐高峰人流。</li>
            <li>· <strong>交通建議：</strong>南京東路和武林廣場都是地鐵直達，建議全程地鐵，否則負重走路很累。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

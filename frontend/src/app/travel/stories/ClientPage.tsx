'use client';
import { useState } from 'react';
import Link from 'next/link';

// 2026-06-24 聖上加碼: 沿路地點 story 7+ 拆 1 = 9 個地點 (西湖/烏鎮東/西柵/西塘/外灘/南京東路/豫園/宋城/河坊街)
// 砍 3 個偏離的 (京杭大運河/龍井/杭州總體) 因為不在 8 天行程實際路徑
// 中堂業界常識值, 標 "⚠️ 建議聖上查證" 跟 sim-guide 一致

const STORIES = [
  {
    id: 'xihu',
    location: '西湖',
    emoji: '🌊',
    tag: '世界文化景觀遗产',
    title: '西湖：千年湖泊的詩意棲居',
    dynasty: '唐宋巑峰 · 10世紀至今',
    cover: '/stories/images/xihu.jpg',
    qIcon: '/stories/q/xihu.jpg',
    qCaption: '西湖夕陽 · Q版 chibi 場景',
    content: [
      {
        subtitle: '湖泊的誕生',
        text: '西湖並非純天然湖泊，而是古人與自然協作的傑作。起初它是錢塘江口的海灣，經過數千年長江與錢塘江挾帶的泥沙淤積，以及歷代人工疏浚，演變成今日這座集灌溉、防洪、遊覽於一身的湖泊。晉代（317–420年）已有「西湖」名稱，唐代開始廣泛被文人詠嘆。',
      },
      {
        subtitle: '白居易的西湖',
        text: '唐長慶二年（822年），白居易出任杭州刺史。他主持修築西湖湖堤（「白堤」前身），蓄水灌田，並以詩筆宣揚西湖之美。「未能拋得杭州去，一半勾留是此湖」，白詩句透露這位詩人對西湖的深情，也讓西湖名聲大躁，成為中國湖泊文學的原型意象。',
      },
      {
        subtitle: '蘇軾與宋人的西湖情結',
        text: '北宋熙寧年間（1068–1077年），蘇軾再守杭州，見湖泥淤積、葑草叢生，上書朝廷請予疏濬，並以水下淤泥堆砌成今日「蘇堤」。他親筆寫下《乞開杭州西湖狀》，預言「使杭州而無西湖，如人去其睛」，将西湖提升為城市命脈。今日蘇堤六橋（映波、鎖瀾、望山、壓堤、東浦、跨虹）正是他留下的結構美學。',
      },
      {
        subtitle: 'Mazu 與觀音傳說',
        text: '西湖一帶流傳無數民俗傳說：法海寺的白蛇傳說（白素貞與許仙在斷橋相會）、岳飛精忠報國的悲劇、以及觀音以身飼虎的佛教故事。雷峰塔原是吳越國王錢俶為王妃所建，因民間傳說其磚可辟邪而遭盜挖，終於1924年坍塌，魯迅因此寫下〈論雷峰塔的倒掉〉。',
      },
      {
        subtitle: '世界文化景觀遗产的當代意義',
        text: '2011年西湖被列為聯合國教科文組織世界文化景觀遺產，成為中國第41個世界遺產。評審報告指出：「西湖是人類湖泊文明的傑出典範，全面展現了中國景觀理念對自然的詩意詮釋。」湖山結合（山在湖邊、湖在城中）是中國「山水城市」理想的原型，也影響了日本、朝鲜半島的宮廷園林設計。',
      },
    ],
  },
  {
    id: 'wuzhen-east',
    location: '烏鎮東柵',
    emoji: '🌅',
    tag: '原汁原味水鄉生活',
    title: '烏鎮東柵：水鄉人家的日常光景',
    dynasty: '明清至今 · 江南運河支流',
    cover: '/stories/images/wuzhen.jpg',  // 2026-06-24 暫用舊 wuzhen 圖 (東/西柵共用, 之後可換)
    qIcon: '/stories/q/wuzhen-east.jpg',
    qCaption: '烏鎮東柵清晨 · Q版 chibi 場景',
    content: [
      {
        subtitle: '東柵 vs 西柵：兩種烏鎮',
        text: '烏鎮分東、西兩柵，2001年東西柵保護開發啟動，東柵（Day 3）保留較多原始水鄉生活，西柵（Day 4）則是後期開發的觀光度假區。中堂建議先遊東柵，看「活的古鎮」，再去西柵看「古鎮的觀光化」。',
      },
      {
        subtitle: '茅盾故居：文學家的少年記憶',
        text: '東柵最具份量的人文地標是茅盾故居（1996年列為全國重點文物保護單位）。茅盾（1896-1981）原名沈德鴻，字雁冰，是中國現代文學奠基者之一，代表作《子夜》《林家舖子》《春蠶》都以江南城鎮為背景。故居是傳統四開間兩進深的木結構建築，展示茅盾少年時代的書房「立志書院」與家族產業。',
      },
      {
        subtitle: '水上人家的物質文明',
        text: '烏鎮位於桐鄉與嘉興之間，京杭大運河支流穿鎮而過，是典型的「魚米之鄉、絲綢之府」。鎮內河道縱橫，以石拱橋相連，家家戶戶推窗見水、出門登舟。明清時期，這裡是江南蠟燭、絲綢、棉布的集散地，經濟實力支撐起完整的士紳階層與文化教育系統。',
      },
      {
        subtitle: '香山堂藥店：百年中藥房',
        text: '東柵內的香山堂老藥店創立於清道光年間（1820s），至今仍按傳統方式經營。店內木製百子櫃（按《千字文》編號存放藥材）、銅杵臼、戥子稱等器具都保留原貌，是江南中醫藥文化的活化石。遊客可現場購買按古方調配的養生茶包，但要注意海關對中藥材的入境限制。',
      },
    ],
  },
  {
    id: 'wuzhen-west',
    location: '烏鎮西柵',
    emoji: '🌙',
    tag: '夜景觀光度假區',
    title: '烏鎮西柵：水鄉夜色與觀光遺產',
    dynasty: '2007年開放 · 古鎮修復示範',
    cover: '/stories/images/wuzhen.jpg',  // 2026-06-24 暫用舊 wuzhen 圖 (東/西柵共用)
    qIcon: '/stories/q/wuzhen-west.jpg',
    qCaption: '烏鎮西柵夜景 · Q版 chibi 場景',
    content: [
      {
        subtitle: '西柵的「修舊如舊」',
        text: '西柵2007年開放，佔地3.4平方公里，是中國古鎮修復最大型案例。修復團隊以「修舊如舊、如舊如新」原則，保存了明清古建築群、明代石橋、老郵局、烏將軍廟等。2014年起舉辦「烏鎮戲劇節」由黃磊、賴聲川發起，與倫敦戲劇節並列國際三大戲劇節之一（西柵主場）。',
      },
      {
        subtitle: '水上集市與昭明書院',
        text: '西柵的核心是水上集市，明清時期是絲綢、糧食集散地。集市旁是昭明書院（紀念南朝梁昭明太子蕭統），他編選的《昭明文選》是中國現存最早的詩文總集，影響深遠。書院建築雖為現代修復，但陳列的《文選》版本（敦煌寫本、宋刻本等）具高度學術價值。',
      },
      {
        subtitle: '夜景：燈籠與搖櫓船',
        text: '西柵夜景被譽為「江南最美水鄉夜色」。每晚19:00後，街巷燈籠、橋頭廊燈、屋檐燈串全部點亮，搖櫓船（船娘撐船）載客穿過一座座石拱橋，船頭紅燈籠倒映水中。常見遊覽動線：西柵大街 → 昭明書院 → 烏鎮郵局 → 靈水居 → 益大絲號 → 茶藝街，單趟約 2 小時。',
      },
      {
        subtitle: '住宿：枕水民宿',
        text: '西柵內有多家「枕水」民宿（Day 4 聖上住的悠舍悠得即此類），由舊民居改建，推窗見水、出門即船。但住宿一晚通常 NT$3000-6000，旺季（十一假期）要提前 1 個月預訂。聖上 Day 4 住這裡，建議傍晚先放行李，黃昏拍夜景最夢幻。',
      },
    ],
  },
  {
    id: 'xitang',
    location: '西塘',
    emoji: '🏯',
    tag: '活著的歷史廊棚',
    title: '西塘：越文化交匯處的千年古鎮',
    dynasty: '明代至今 · 600年精華',
    cover: '/stories/images/xitang.jpg',
    qIcon: '/stories/q/xitang.jpg',
    qCaption: '西塘廊棚老街 · Q版 chibi 場景',
    content: [
      {
        subtitle: '吳根越角：地理與文化的交界',
        text: '西塘地處江蘇與浙江交界，歷史上是吳國與越國文化交匯地帶，所謂「吳根越角」。古時驛道在此交會，南來北往的商人帶來多元的飲食、建築與方言。今天古鎮內可明顯感受到兩種文化痕蹟：白牆黛瓦是蘇式，而封火牆與走馬樓則是典型的浙派建築語言。',
      },
      {
        subtitle: '廊棚：江南獨有的騎樓',
        text: '西塘最具辨識度的「廊棚」全長近 1000 公尺，是沿河木結構長廊，覆蓋瓦頂，下方是商家與行人通道。這種「騎樓」形態在江南罕見，主要原因：清代居民為遮陽擋雨，由商家集資自發興建，今日形成連續不斷的長廊景觀。雨天走廊棚不撐傘，是西塘最具體驗感的特色。',
      },
      {
        subtitle: '「生活着的古鎮」',
        text: '西塘與烏鎮最大的不同，在於它直到21世紀初仍保有較為完整的原住民生活形態。古鎮內目前約有近千户居民，其中許多屬於「古鎮居民」而非商用商家。早晨可見老人在廊棚下吃粥、孩子在石拱橋上赶著上學，這種「活着」的生活氛圍是西塘作為文化遺產最寶貴的價值。',
      },
      {
        subtitle: '紐扣博物館與地下黨',
        text: '西塘古鎮藏有一座罕見的中國紐扣博物館，收藏了從唐代到近代的各式衣飾紐扣，反映江南絲綢工商業的發達。另外，1937年抗戰期間，西塘曾是共產黨游擊隊的秘密交通站，鎮內多處老宅地下室保存了當年的地下活動痕跡。聖上 Day 2 在此過夜，可傍晚拍廊棚夜景。',
      },
    ],
  },
  {
    id: 'shanghai-bund',
    location: '上海外灘',
    emoji: '🌃',
    tag: '萬國建築群 · 東方明珠夜景',
    title: '上海外灘：百年租界的金融史詩',
    dynasty: '1844 開埠至今 · 東方明珠夜景',
    cover: '/stories/q/shanghai-bund.jpg',  // 2026-06-24 暫用 Q版圖頂 cover (真實外灘照待補)
    qIcon: '/stories/q/shanghai-bund.jpg',
    qCaption: '上海外灘夜景 · Q版 chibi 場景',
    content: [
      {
        subtitle: '1842 南京條約：五口通商',
        text: '1842年清廷在鴉片戰爭中戰敗，簽訂《南京條約》，上海被列為五口通商口岸之一。1844 年外灘正式開闢為英國租界，此後法國租界（1849）、美國租界（1863）相繼建立。1000 公尺長的外灘見證了上海從小漁村躍升為遠東金融中心的 180 年歷程。',
      },
      {
        subtitle: '52 棟萬國建築群',
        text: '外灘沿岸現存 52 棟 19-20 世紀初的歷史建築，被稱為「萬國建築博覽」。包含：新古典主義的海關大樓（1927）、巴洛克風格的匯豐銀行大樓（1923）、裝飾藝術派 (Art Deco) 的沙遜大樓 (1936, 今和平飯店)、哥德復興式的中國銀行大樓（1937）。和平飯店 (Sassoon House) 是綠寶石屋頂的傳奇地標，曾是亞洲最豪華酒店。',
      },
      {
        subtitle: '浦東對岸：陸家嘴金融區',
        text: '1990 年中國政府宣布開發浦東，外灘對岸的陸家嘴從農田變成東方明珠塔（1994）、金茂大樓（1999）、環球金融中心（2008）、上海中心大樓（2015, 632m 中國第一、世界第二高樓）。聖上 Day 1 從對岸拍夜景，前景外灘建築 + 背景浦東摩天樓，是上海最具代表性的畫面。',
      },
      {
        subtitle: '從「十里洋場」到「魔都」',
        text: '1930 年代上海是「東方巴黎」，人口達 370 萬，是遠東最國際化的城市。當時的「十里洋場」含外灘、南京路、霞飛路（淮海路）、跑馬廳（人民公園）。張愛玲筆下的《傾城之戀》《色，戒》正是這個時代縮影。今天上海常住人口 2400 萬，年 GDP 超 4 兆人民幣，是中國經濟中心，「魔都」一詞源自 1920 年代日本作家村松梢風的小說《魔都》。',
      },
    ],
  },
  {
    id: 'nanjing-road',
    location: '南京東路步行街',
    emoji: '🛍️',
    tag: '中華商業第一街',
    title: '南京東路：百年商業街的繁華與轉型',
    dynasty: '1848 闢建 · 步行街 1999',
    cover: '/stories/q/nanjing-road.jpg',  // 2026-06-24 暫用 Q版圖頂 cover (真實照待補)
    qIcon: '/stories/q/nanjing-road.jpg',
    qCaption: '南京東路步行街 · Q版 chibi 場景',
    content: [
      {
        subtitle: '從跑馬道到步行街',
        text: '南京東路前身是 1848 年英國租界闢建的「花園弄」(Park Lane)，1865 年改名「南京路」，1945 年抗戰勝利後改稱「南京東路」(以區別西段的南京西路)。1999 年實施週末步行街，是中國第一條步行街。聖上 Day 1 從外灘走到這裡，步行約 1.5 公里，傍晚 19:00 後人潮最洶湧。',
      },
      {
        subtitle: '四大公司：先施、永安、新新、大新',
        text: '1914-1936 年間，南京路上陸續開設先施 (Sincere)、永安 (Wing On)、新新 (Sun Sun)、大新 (Da Sun) 四大百貨公司，是中國現代百貨業的發源地。永安百貨現為永安百貨大樓，1918 年落成，外觀仿芝加哥商業大樓，是上海首座安裝電梯的百貨公司。',
      },
      {
        subtitle: '「小吃」與老字號',
        text: '南京東路聚集大量上海老字號小吃：沈大成（青團、定勝糕）、杏花樓（月餅、八寶鴨）、真老大房（鮮肉月餅）、邵万生（南貨、醉糟貨）、蔡同德堂（中藥）。這些店多是百年老字號，沿襲傳統手藝。聖上逛累了可以在沈大成買份青團當下午茶。',
      },
      {
        subtitle: '從步行街到「步行街 + 智慧街」',
        text: '近年南京東路轉型，引入 Apple Store、樂高旗艦店、M&M World、星巴克臻選烘焙工坊等國際品牌。同時保留老字號，「傳統 + 現代」並存。聖上 Day 1 晚上來這裡，可以感受到上海 100 年前「十里洋場」到今天「國際消費中心」的連續性。',
      },
    ],
  },
  {
    id: 'yuyuan-citygod',
    location: '豫園與城隍廟',
    emoji: '🏮',
    tag: '明代園林 + 道教城隍信仰',
    title: '豫園城隍廟：明代園林與上海民間信仰',
    dynasty: '豫園 1559 年建 · 城隍廟 1403 年建',
    cover: '/stories/q/yuyuan-citygod.jpg',  // 2026-06-24 暫用 Q版圖頂 cover
    qIcon: '/stories/q/yuyuan-citygod.jpg',
    qCaption: '豫園與城隍廟 · Q版 chibi 場景',
    content: [
      {
        subtitle: '豫園：明代江南園林典範',
        text: '豫園建於明嘉靖年間（1559），是四川布政使潘允端為孝敬父親所建的私人園林，「豫」取「平安、安泰」之意。園內以「三穗堂」「點春堂」「玉玲瓏」「九曲橋」聞名，是江南園林「疊山理水」的典範。1853 年小刀會起義時曾作指揮部，1860 年後荒廢，1956 年修復開放。聖上 Day 2 上午遊覽，重點看三穗堂與玉玲瓏太湖石。',
      },
      {
        subtitle: '九曲橋與湖心亭',
        text: '豫園前的九曲橋（湖心亭茶樓）穿越綠波湖，是上海最具辨識度的古風景觀。九曲橋每個轉彎處都刻有「日」、「月」、「星」、「辰」等字樣，傳說是風水考量避免「鬼」直行。九曲橋上常見拍婚紗的上海新人。',
      },
      {
        subtitle: '城隍廟：上海道教中心',
        text: '城隍廟建於明永樂年間（1403），是上海道教的中心，主祀秦裕伯（曾任上海縣城隍）。現存建築為 1926-1935 年重修，融合明清宮殿式建築。廟旁是上海老城廂小吃廣場（南翔饅頭店、綠波廊酒家、上海老飯店等），是上海最具煙火氣的美食地。聖上 Day 2 午餐可在綠波廊用餐，招牌「桂花糖藕」「八寶鴨」是上海名菜。',
      },
      {
        subtitle: '小刀會與上海歷史',
        text: '1853-1855 年「小刀會」起義，占領上海縣城並以豫園為指揮部，是太平天國時期重要的反清起義。清軍與法軍聯合攻打下，起義失敗。這段歷史使豫園與上海近代史產生關聯，今日園內「點春堂」展示小刀會文物。',
      },
    ],
  },
  {
    id: 'songcheng',
    location: '宋城千古情',
    emoji: '🎭',
    tag: '杭州主題樂園 + 大型實景演出',
    title: '宋城千古情：杭州文化的主題樂園演繹',
    dynasty: '1996 年開園 · 千古情演出 2014 升級',
    cover: '/stories/q/songcheng.jpg',  // 2026-06-24 暫用 Q版圖頂 cover
    qIcon: '/stories/q/songcheng.jpg',
    qCaption: '宋城千古情演出 · Q版 chibi 場景',
    content: [
      {
        subtitle: '宋城主題：穿越回南宋臨安',
        text: '宋城是杭州近郊的主題公園，1996 年開園，主打「穿越回南宋」的體驗。園區仿宋建築（飛來峰、情橋、市井街），演員穿宋代服飾，遊客可換裝互動。但聖上 Day 6 重點是園內大型實景演出《宋城千古情》。',
      },
      {
        subtitle: '千古情演出：一生必看的實景秀',
        text: '《宋城千古情》是中國旅遊演藝標誌性產品，與桂林《印象·劉三姐》、麗江《印象·雪山》並稱三大實景演出。演出以杭州歷史為主軸：良渚文明 → 岳飛抗金 → 梁祝化蝶 → 南宋繁華 → 現代杭州。一場 60 分鐘，融合舞蹈、武打、特技、燈光、爆破，演員 200 多人。場館能容 3000 觀眾，旺季需提前 1-2 天訂票。',
      },
      {
        subtitle: '價位與訂票',
        text: '千古情演出票：觀眾席 NT$800-1200、贵宾席 NT$1500-2500 (依座位而異)。宋城入園門票另計 (約 NT$600 含園區遊玩)。建議買「千古情演出 + 園區」聯票。聖上 Day 6 下午 14:00 或 19:00 場次 (依官網時刻表)。',
      },
      {
        subtitle: '周邊景點：王婆說媒',
        text: '宋城近年因「王婆說媒」互動表演在中國社群爆紅（2024），園內王婆扮演者現場為單身遊客說媒，成為年輕人朝聖景點。這類互動演出是中國主題樂園差異化經營的成功案例。聖上若行程有空可體驗，但中堂建議時間緊湊不必硬擠。',
      },
    ],
  },
  {
    id: 'hefang-street',
    location: '河坊街',
    emoji: '🏮',
    tag: '南宋御街 · 清河坊',
    title: '河坊街：南宋皇城根的千年市井',
    dynasty: '南宋至今 · 清河坊 2002 修復',
    cover: '/stories/q/hefang-street.jpg',  // 2026-06-24 暫用 Q版圖頂 cover
    qIcon: '/stories/q/hefang-street.jpg',
    qCaption: '河坊街南宋古街 · Q版 chibi 場景',
    content: [
      {
        subtitle: '南宋御街的歷史脈絡',
        text: '河坊街原是南宋臨安（杭州）皇城外的「天街」，是皇帝出宮到西湖的中軸道路。元明清三代延續為商業街，清代因「清河坊」得名。2002 年杭州市修復成歷史文化街區，恢復明清磚木建築、老字號店鋪。聖上 Day 7 下午可遊覽，重點看胡慶餘堂與回春堂。',
      },
      {
        subtitle: '胡慶餘堂：江南藥王',
        text: '河坊街最知名的老字號是「胡慶餘堂」中藥店（1874 年創立），與北京同仁堂齊名「江南藥王」。創始人胡雪巖是清末紅頂商人（從錢莊學徒到二品官員），店內現存「戒欺」匾額（胡雪巖親書），是中國商業倫理的重要遺產。聖上可在店內參觀古藥櫃、抓藥器具，並購買按古方調配的養生茶包。',
      },
      {
        subtitle: '南宋夜市美食',
        text: '河坊街匯聚杭州特色小吃與伴手禮：定勝糕（狀元糕）、吳山酥油餅、蔥包檜、定勝糕、龍鬚糖、知味觀餛飩、新白鹿餐廳。聖上 Day 7 可在此吃晚餐或採購伴手禮（絲綢、茶葉、剪刀）。',
      },
      {
        subtitle: '「宮廷晚宴」周邊',
        text: '聖上 Day 7 晚上有「宮廷晚宴」行程（請查行程規劃器 Day 7 細節）。通常在河坊街附近的仿宋餐廳（如「天興樓」或「宋嫂魚羹」總店），菜品以宋代宮廷菜為靈感：宋嫂魚羹、東坡肉、龍井蝦仁、叫化雞、蜜汁火方等。河坊街距宮廷晚宴場館步行通常 < 500 公尺。',
      },
    ],
  },
];

const TABS = STORIES.map((s) => ({ id: s.id, label: `${s.emoji} ${s.location}` }));

export default function StoriesPage() {
  const [active, setActive] = useState(STORIES[0].id);

  const story = STORIES.find((s) => s.id === active)!;
  const sections = story.content;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-700 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/travel" className="text-white/80 hover:text-white text-sm">
              ← 返回首頁
            </Link>
            <Link href="/travel/journal" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              📖 旅程日誌
            </Link>
            <Link href="/travel/planner" className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm">
              🗓️ 行程規劃器
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-2">📚 地理歷史故事</h1>
          <p className="text-white/80 text-lg">探索江南水鄉背後的人文故事</p>
        </div>
      </div>

      {/* Cover Image Hero */}
      <div className="w-full h-64 md:h-80 overflow-hidden relative">
        <img
          src={story.cover}
          alt={story.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* 2026-06-24 聖上加碼: Q版 chibi 場景解說圖 (跟 sim-guide/room-tour 同風格) */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-10">
        {/* 2026-06-24 統一性優化: 跟 sim-guide 一致的 ⚠️ 中堂業界常識值 黃色提示框 */}
        <div className="text-xs text-slate-500 mb-2 px-3 py-2 bg-amber-50 border-l-4 border-amber-400 rounded-r">
          <strong>⚠️ 2026-06-24 中堂業界常識值：</strong>本頁 9 個 story 是中堂依公開政策 + 業界共識撰寫, 未經獨立查證。
          歷史年代 / 建築年份 / 人物細節 / 票價 建議出發前到現場或上官網當下確認。
          「Day 1」等行程標註請以 planner/itinerary.ts 為準。
        </div>
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-4 border-amber-200">
          <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 flex items-center gap-2 border-b border-amber-200">
            <span className="text-sm">🎨</span>
            <span className="text-xs font-bold text-amber-800">Q版 chibi 場景解說圖 (AI 生成)</span>
            <span className="ml-auto text-[10px] text-amber-600">{story.qCaption}</span>
          </div>
          <img
            key={active}
            src={story.qIcon}
            alt={story.qCaption}
            className="w-full aspect-video object-cover transition-opacity duration-500"
          />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-1 py-3 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  active === tab.id
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Location badge */}
        <div className="mb-6">
          <span className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 rounded-full">
            {story.tag}
          </span>
        </div>

        {/* Title & Dynasty */}
        <div className="mb-8">
          <div className="text-amber-600 text-sm font-medium mb-2">{story.dynasty}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            {story.emoji} {story.title}
          </h2>
          <Link
            href={`/travel/postcard?id=${story.id}`}
            className="text-sm text-amber-600 hover:text-amber-800 underline"
          >
            🎨 生成紀念圖卡 →
          </Link>
        </div>

        {/* Story sections */}
        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow" />
              {/* Timeline line */}
              {i < sections.length - 1 && (
                <div className="absolute left-[7px] top-5 bottom-[-32px] w-0.5 bg-amber-200" />
              )}

              <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  {section.subtitle}
                </h3>
                <p className="text-gray-600 leading-relaxed text-base whitespace-pre-line">
                  {section.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation footer */}
        <div className="mt-12 pt-8 border-t border-amber-200 flex justify-between items-center">
          <Link
            href="/travel/journal"
            className="text-amber-600 hover:text-amber-800 text-sm flex items-center gap-1"
          >
            ← 旅程日誌
          </Link>
          <Link
            href="/travel/planner"
            className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 transition-colors"
          >
            開始規劃行程 →
          </Link>
        </div>
      </div>
    </div>
  );
}
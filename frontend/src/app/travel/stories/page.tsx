'use client';
import { useState } from 'react';
import Link from 'next/link';

const STORIES = [
  {
    id: 'xihu',
    location: '西湖',
    emoji: '🌊',
    tag: '世界文化景觀遗产',
    title: '西湖：千年湖泊的詩意棲居',
    dynasty: '唐宋巑峰 · 10世紀至今',
    cover: '/stories/images/xihu.jpg',
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
    id: 'wuzhen',
    location: '烏鎮',
    emoji: '🌉',
    tag: '中國最後的枕水人家',
    title: '烏鎮：江南水鄉的完整標本',
    dynasty: '南宋至今 · 800年歷史',
    cover: '/stories/images/wuzhen.jpg',
    content: [
      {
        subtitle: '水上人家的物質文明',
        text: '烏鎮位於桐鄉與嘉興之間，京杭大運河支流穿鎮而過，是典型的「魚米之鄉、絲綢之府」。鎮內河道縱橫，以石拱橋相連，家家户户推窗見水、出門登舟。明清時期，這裡是江南蠟燭、絲綢、棉布的集散地，經濟實力支撐起完整的士紳階層與文化教育系統，鎮內至今保有完整的明清建築羣。',
      },
      {
        subtitle: '文學洗禮：木心的還鄉',
        text: '烏鎮出生的文學家木心（本名孫璞），1927年生於鎮上書香門第，歷經文革苦難後流亡美國，1994年再訪故里，寫下《烏鎮》與《溫馨的舊時光》。他的散文以細緻的感官記憶重建了烏鎮的氣味、聲音與色調，讓這座水鄉成為中國文學地理的重要地標。故居現已改建為木心紀念館。',
      },
      {
        subtitle: '保存模式的演變：從原始水移到現代古鎮',
        text: '烏鎮的保存模式是中國古鎮中最具争议的案例之一。1990年代旅遊開發後，鎮區進行了大規模「修舊如舊」改造，部分原住民遷出，傳統手工藝店鋪被替换為服務旅客的商業形態。但另一面，管道、排水、消防等基礎設施的現代化也使古建築得到更好的保護。今天的烏鎮是「真古蹟假生活」的標本，也是中國文化遺產如何在商業化與真實性之間掙扎的縮影。',
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
    content: [
      {
        subtitle: '吳根越角：地理與文化的交界',
        text: '西塘地處江蘇與浙江交界，歷史上是吳國與越國文化交匯地帶，所謂「吳根越角」。古時驛道在此交會，南來北往的商人帶來多元的飲食、建築與方言。今天古鎮內可明顯感受到兩種文化痕蹟：白牆黛瓦是蘇式，而封火牆與走馬樓則是典型的浙派建築語言。',
      },
      {
        subtitle: '「生活着的古鎮」',
        text: '西塘與烏鎮最大的不同，在於它直到21世紀初仍保有較為完整的原住民生活形態。古鎮內目前約有近千户居民，其中許多屬於「古鎮居民」而非商用商家。早晨可見老人在廊棚下吃粥、孩子在石拱橋上赶著上學，這種「活着」的生活氛圍是西塘作為文化遺產最寶貴的價值。',
      },
      {
        subtitle: '紐扣博物館與地下黨',
        text: '西塘古鎮藏有一座罕見的中國紐扣博物館，收藏了從唐代到近代的各式衣飾紐扣，反映江南絲綢工商業的發達。另外，1937年抗戰期間，西塘曾是共產黨游擊隊的秘密交通站，鎮內多處老宅地下室保存了當年的地下活動痕跡。',
      },
    ],
  },
  {
    id: 'hangzhou-history',
    location: '杭州',
    emoji: '🏯',
    tag: '南宋行在 · 絲綢之路起點',
    title: '杭州：帝國經濟中心的千年榮光',
    dynasty: '隋唐確立 · 南宋鼎盛 · 明清延續',
    cover: '/stories/images/hangzhou.jpg',
    content: [
      {
        subtitle: '隋煬帝的運河與杭州的興起',
        text: '隋大業六年（610年），隋煬帝詔開江南運河，欲將杭州與洛陽、北京連成一線。運河開通後，杭州從海邊小縣一躍成為南北物資轉運樞紐港口，唐代已形容這裡「商旅輻輳，屋瓦鱗次」。白居易在《杭州郡齋偶作》寫道：「羨他肉食取，何似此間清」，顯示杭州已在唐代成为文人憧憬之地。',
      },
      {
        subtitle: '南宋行在：世界第一都會',
        text: '1127年金兵攻陷汴京（开封），宋高宗趙構南渡，1138年定都杭州，改名「臨安」，史稱「南宋」。鼎盛時期杭州人口超過150萬，是當時世界上最大的城市，超過同時期的君士坦丁堡與巴格達。義大利修士馬可孛羅在《游記》中稱其為「世界上最美麗、最繁華的城市」，記載了錢塘江潮、運河船舶、夜間市集等景象。',
      },
      {
        subtitle: '絲綢之路的南方起點',
        text: '杭州是「海上絲綢之路」的重要節點。宋代，這裡設有市舶司，管理對外貿易，出口絲綢、瓷器、茶葉。南宋官窯燒製的青瓷代表了宋代美學的最高峰，現 故宫博物院亦有大量收藏。茶葉方面，杭州「嚇煞人香」（即後來的龍井）自清代起列為貢品，是中國十大名茶之首。',
      },
      {
        subtitle: '明清變局與近代新生',
        text: '鴉片戰爭（1842年）後，上海開埠，浙江沿海經濟重心向上海轉移，杭州一度沉寂。1895年《馬關條約》後，杭州對外開放，成為最早有自來水與電報的城市之一。1920年代，滬杭鐵路通車，杭州開始近代化转型。2016年，G20峰會在杭州舉辦，這座城市再次站在中國與世界對話的舞台上。',
      },
    ],
  },
  {
    id: 'grand-canal',
    location: '京杭大運河',
    emoji: '🚢',
    tag: '世界文化遺產 · 世界上最長的運河',
    title: '京杭大運河：流動的文明史詩',
    dynasty: '隋唐 Dynasty · 始於公元前5世紀 · 全線通航608年',
    cover: '/stories/images/grand-canal.jpg',
    content: [
      {
        subtitle: '不是一個人挖的',
        text: '京杭大運河並非一夜之間由任何一位君王完成。比秦始皇更早的公元前5世紀，長江流域已有引水渠。真正意義上的「京杭大運河」是以隋煬帝大業元年（605年）詔令大規模式開鑿洛陽至江都段為標誌，至唐宋逐步連接北京與杭州，全長約1,794公里，是巴拿馬運河的10倍、蘇伊士運河的8倍。',
      },
      {
        subtitle: '隋煬帝：罪在當代，功在千秋',
        text: "隋煬帝開河的歷史形象長期被《隋書》負面塑造，認爲他豪華逸樂、耗竭民力。但客觀而論，這條運河在唐代已成為國家經濟命脈，將江南的米糧、絲綢運往北方首都。杜甫名句「星垂平野闊，月湧大江流」據考證正是其在疏浚運河期間途經江南時所作。美國學者 Kenneth J. Hammond 稱其為「人類史上最大的基礎設施項目」。",
      },
      {
        subtitle: '流動的文化走廊',
        text: '運河不僅是經濟通道，也是文化傳播的血管。元代雜劇、明清說唱文學、江南絲竹樂種，都是經由運河沿線城鎮傳播並形成流派。沿岸的窯口（德化窑、景德镇窑、宜興窑）生產的瓷器通過運河到达北京與海外。可以說，沒有運河，就沒有今天所見的中國陶瓷美學。2014年列入世界文化遺產。',
      },
    ],
  },
  {
    id: 'longjing',
    location: '龍井',
    emoji: '🍃',
    tag: '中國十大名茶之首',
    title: '龍井村：一片茶葉里的中國美學',
    dynasty: '唐代陸羽《茶經》記載 · 清代列為貢品',
    cover: '/stories/images/longjing.jpg',
    content: [
      {
        subtitle: '陸羽之前的杭州茶',
        text: '唐代茶聖陸羽在《茶經》中記載杭州天竺、靈隱二寺已經種茶，這是杭州產茶最早的文獻記載。但「龍井」茶的崛起要等到清代。據《西湖遊覽志》記載，相傳乾隆皇帝第四次南巡（1749年）至杭州，品嚐龍井山胡公隖茶後列為貢品，並封了「十八棵」茶樹為「御茶」，從此龍井名聲大振。',
      },
      {
        subtitle: '手工輝鍋的工藝',
        text: '龍井茶的製作工藝是中國茶葉中工序最繁複者之一。清明前採摘，必須在日光下晾青，然後以手工輝鍋（炒茶）。輝鍋時師傅以手掌感受鍋溫，將茶葉以特定手法在鍋壁翻炒，數量、溫度、時間全凭經驗與手感。一鍋一般只炒200克左右的茶青，一個人一天最多只能輝兩鍋，是極為耗時耗神的傳統工藝。2011年，龍井茶手工輝鍋技藝被列入浙江省非物質文化遺產名錄。',
      },
      {
        subtitle: '茶文化中的哲學',
        text: '龍井茶在中國士人文化中代表的是一種「淡而有味」的美學理想。反覆冲泡而滋味不減，正如宋代文人的「格物致知」精神——在一件簡單事物中持續追究，可得深層次意義。清代畫家、八大山人之一的石濤晚年隠居杭州龍井山，所繪山水多以茶入畫，茶烟與雲嵐交融，是中國美學中「天人合一」精神的具體呈現。',
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
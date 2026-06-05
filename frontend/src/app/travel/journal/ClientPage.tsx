"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import "leaflet/dist/leaflet.css";
import { ALL_ATTRACTIONS } from "../data";
import { useCloudState } from "@/utils/useCloudState";
import ShareButtons from "@/components/ShareButtons";

// Dynamic import for Leaflet (no SSR)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then(m => m.Polyline), { ssr: false });

// Route order mapping
const ROUTE_ORDER: Record<string, number> = {
  // D1 上海
  "外灘夜景": 1,
  "南京東路步行街": 2,
  "海底撈火鍋": 3,
  // D2 上海→西塘
  "小楊生煎": 4,
  "豫園": 5,
  "城隍廟": 6,
  "南翔饅頭": 7,
  "西塘古鎮": 8,
  // D3 西塘→烏鎮
  "江南戲曲服飾": 9,
  "水宴餐廳": 10,
  "烏鎮東柵": 11,
  // D4 烏鎮西柵
  "烏鎮西柵": 12,
  "白蓮塔": 13,
  "昭明書院": 14,
  "木心美術館": 15,
  "搖櫓船": 16,
  // D5 杭州
  "西湖（主湖區）": 17,
  "斷橋殘雪": 18,
  "蘇堤": 19,
  "武林夜市": 20,
  "河坊街": 21,
  // D6 杭州
  "游埠豆漿": 22,
  "宋城千古情": 23,
  "馬鴻興川小館": 24,
  // D7 杭州
  "大馬弄": 25,
  "京杭大運河遊船": 26,
  "宮宴": 27,
  // D8 返程
  "龍井茶園": 28,
};

// Day colors
const DAY_COLORS: Record<string, string> = {
  D1: "#3b82f6",
  D2: "#10b981",
  D3: "#8b5cf6",
  D4: "#f59e0b",
  D5: "#ef4444",
  D6: "#ec4899",
  D7: "#06b6d4",
  D8: "#6b7280",
};

// Day dates — match narrative content (7月17日=第一天)
const DAY_DATES: Record<string, string> = {
  D1: "7/17",  // 7月17日
  D2: "7/18",  // 7月18日
  D3: "7/19",  // 7月19日
  D4: "7/20",  // 7月20日
  D5: "7/21",  // 7月21日
  D6: "7/22",  // 7月22日
  D7: "7/23",  // 7月23日
  D8: "7/24",  // 7月24日
};

// Narrative content generator
function generateNarrative(day: string, attractions: string[]): string {
  const narratives: Record<string, string> = {
    D1: `抵達上海，江南的繁華氣息扑面而來。下午從桃園國際機場起飛，經過約兩小時的航程，抵達上海浦東國際機場。拖著行李走出航站樓，空氣中帶著都會特有的潮濕與現代感。乘車進入上海市區，窗外的高樓大廈在眼前一閃而過，讓人心中滿是期待。

傍晚時分，來到外灘黃浦江畔。萬國建築博覽群在夕陽的餘暉中泛著金色的光澤，哥德式、文藝復興式、巴洛克式等各具風格的建築一字排開，仿佛一本立體的建築史書。沿著外灘的濱江大道漫步，對岸陸家嘴的摩天大樓群在暮色中亮起萬家燈火，上海中心大廈（632米）、上海環球金融中心（492米）、金茂大廈（420米）三座巨塔在夜空下熠熠生輝。19:00整，外灘的景觀燈全部亮起，整個黃浦江畔被金色的光芒所籠罩，仿佛穿越回了上世紀30年代的十里洋場。晚餐安排在海底撈火鍋上海外灘店，享譽全球的服務與正宗的川渝火鍋讓人食指大動，撈麵表演與貼心服務更讓這頓晚餐成為難忘的體驗。夜晚，入住南京東路步行街附近的飯店，窗外是上海最繁華的夜景，這一天，為這趟江南水鄉物語拉開了美好的序幕。`,

    D2: `上海的早晨是從味覺開始的。早餐來到知名的小楊生煎，這裡的生煎包外皮酥脆、底部金黃焦香，內餡鮮嫩多汁，一口咬下去，肉汁在口腔中迸發，是上海人最愛的早餐沒有之一。配上配套的鮮肉餛飩或雞蛋湯，就是一份完美的上海早餐。

上午漫步豫園，這座始建於明代江南古典園林以其精巧的布局與深厚的文化底蘊聞名。假山、流水、亭台、迴廊，每一處都是古代園林藝術的典範。九曲橋蜿蜒於池塘之上，池中的鯉魚悠閒地游動，偶爾跳出水面濺起陣陣漣漪。穿過豫園的龍門，便是城隍廟商圈，這裡是上海老城廂的心臟，小吃林立、人聲鼎沸。接近中午時分，來到南翔饅頭店，這裡的小籠包皮薄汁多、鮮美無比，尤其是蟹粉小籠，每一口都是濃郁的蟹香與鮮肉的完美結合，讓人回味無窮。

下午搭乘長途客運前往西塘古鎮。抵達時正值傍晚時分，古鎮被溫暖的夕陽所籠罩。煙雨長廊在昏黃的燈光下更顯江南水鄉的詩情畫意，水鄉特有的柔美與寧靜讓人彷彿穿越到了另一個時代。晚餐安排在古鎮內的椒鹽蝸蝸火鍋，這種結合了海鮮與火鍋的獨特口味，是西塘在地的特色美食，椒鹽的香氣與海鮮的鮮甜在舌尖上交織成難忘的味覺記憶。夜晚入住西塘古鎮景區內的客棧，聽著窗外潺潺的水聲，感受這片水鄉的獨特魅力。`,

    D3: `上午來到江南戲曲服飾體驗。在古鎮內的專業戲曲體驗館，換上了精美的戲曲服飾，專業的化妝師描繪了傳統戲曲妝容，鏡子裡的自己彷彿穿越了時空。專業攝影師記錄下了這珍貴的一刻，換裝拍照的過程本身就是一種深入了解江南文化的獨特體驗。

依依不捨地告別西塘，乘車前往烏鎮。抵達烏鎮東柵時正值下午時分，這裡是烏鎮最早的開發區，保留了更多的原始水鄉風貌。入住東柵景區內的客棧後，晚餐安排在水宴餐廳，這家水鄉菜餐廳以新鮮的河鮮與道地的江南菜聞名，清蒸白水魚、銀魚炒蛋、醬爆河蝦，每一道菜都展現著水鄉特有的鮮美與樸實。夜晚，在水鄉的寧靜中入睡，期待明天完整探索烏鎮西柵。`,

    D4: `全天轉往烏鎮西柵，這是烏鎮最完整、最具規模的景區。一早進入景區，避開人潮，享受水鄉清晨特有的寧靜與美。沿著青石板路漫步，兩岸的明清建築在晨光中更顯古樸韻味，小橋、流水、人家的經典江南畫卷在眼前徐徐展開。

白蓮塔是烏鎮西柵的最高建築，我拾級而上，木製的台階發出輕輕的響聲。登塔遠眺，整個西柵的美景盡收眼底，縱橫交錯的水系、黑白相間的屋頂、綠色的植被與遠處的田野構成了一幅美麗的江南水鄉圖。昭明書院裡似乎還能聽到千年前朗朗讀書聲，這座紀念南朝太子蕭統的書院環境清幽，是文人墨客喜愛之地。午後進入木心美術館，這座由建築大師陳丹青設計的美術館線條簡潔現代，與古鎮的傳統風格形成鮮明的對比，卻又和諧地融為一體。館內展示著藝術家木心的繪畫與文學作品，從中國山水到抽象表現主義，木心的藝術跨越了傳統與現代，其建築本身就是一件藝術品，讓人流連忘返。傍晚，搭乘搖櫓船穿梭於水鄉的石橋水巷之間，船夫的搖櫓聲與水波聲交織成一首悠揚的樂曲，兩岸的燈火倒映在水中，波光粼粼，仿佛進入了一個夢幻般的水鄉世界，這就是烏鎮聞名世界的「枕水人家」風情。`,

    D5: `告別烏鎮，踏上前往杭州的旅程。抵達杭州時正值下午時分，這座兼具歷史與現代氣息的城市空氣中似乎都帶著一股詩意。首先來到西湖畔，沿著湖畔漫步。斷橋殘雪是西湖最具標誌性的景點，白娘子與許仙的故事在此流傳千年。夕陽的餘暉灑在湖面上，波光粼粼，仿佛撒了一地碎金。

蘇堤是蘇東坡任杭州太守時所建，是西湖十景之首。沿著蘇堤緩緩前行，六橋十八亭在暮色中若隐若现，橋下的湖水清澈見底，魚兒悠閒地游來游去，空氣中帶著荷花的清香，混合著傍晚的涼爽，讓人心旷神怡。

傍晚來到武林夜市，這是杭州最大、最熱鬧的夜市之一。美食攤位林立，各種杭州特色小吃應有盡有：定勝糕、蔥包檜、臭豆腐、串串香，讓人食指大动。逛完夜市後，順道來到河坊街，這條古色古香的步行街在夜晚的燈光下更顯韻味，各式各樣的茶葉、絲綢、藥材店鋪讓人目不暇接。夜晚入住杭州西湖仁和飯店，為這一天的美好行程畫上完美句點。`,

    D6: `杭州的早晨從一碗正宗的鹹豆漿開始。清晨來到游埠豆漿，這家老字號早餐店凌晨4點就開門營業，是真正杭州人的早餐聖地。點了一碗鹹豆漿配油條，鹹豆漿的獨特口味讓人驚艷，豆花的滑嫩配上榨菜、蔥花、油條段，是最道地的杭州早餐味道。

下午來到宋城千古情主題樂園，一走進園區，仿佛穿越到了千年之前的南宋都城。街頭的宋代模擬場景栩栩如生，身著古裝的演員穿梭其間，熱情的招呼聲與叫賣聲讓人沉浸其中。《宋城千古情》演出被譽為「一生必看的演出」，以高科技手段展現杭州從史前良渚文化到現代的歷史變遷。舞台上光影交錯，演員們翩翩起舞，演繹著梁祝、白蛇傳等流傳千年的愛情故事，巨大的水幕、實時的特效與演員們精湛的表演完美結合，讓觀眾彷彿穿越時空，經歷了一場視覺與聽覺的盛宴。

晚上來到河坊街的馬鴻興川小館，這是一家老字號川菜館，味道非常正宗。老板娘是四川重慶人，做的水煮魚和回鍋肉堪稱一絕，配上一碗白米飯直接吃撐。`,

    D7: `杭州的最後一天，從最具市井氣息的早餐開始。清晨來到大馬弄，這是杭州隱藏版的在地早餐市集，一條小巷兩旁全是早餐攤位，各種傳統小吃應有盡有：小籠包、餛飩、豆腐腦、糯米飯，每一個攤位前都排著長長的人龍，都是在地杭州人。感受著最local的杭州生活氣息，為這次旅程留下最深刻的記憶。

下午安排乘坐京杭大運河遊船。京杭大運河是世界上最長的古代運河，全長1797公里，開鑿至今已有2500多年的歷史。船行水上，穿梭於古老的拱宸橋與現代的高樓大廈之間，看著兩岸的老杭州人悠閒地生活著，彷彿時光在這裡放慢了腳步。傍晚，來到宮宴餐廳，這是一家沉浸式宮廷主題餐廳，穿古裝用餐，環境華麗，菜品精緻，仿佛回到了古代的皇宮盛宴，為這次杭州之行留下最難忘的回憶。

夜晚，入住杭州西湖仁和飯店，明天即將返程，心中滿是不捨。`,

    D8: `返程的日子，帶著滿滿的回憶與不捨離開杭州。上午抓緊最後的時間，再次遊覽西湖湖畔，看著平靜的湖面與遠處的雷峰塔，心中湧起萬般思緒。這八天的江南水鄉之旅，從上海的繁華到西塘的寧靜，從烏鎮的水巷到杭州的詩意，每一個瞬間都深深烙印在心中。

遊覽完西湖後，前往龍井茶園。這片位於西湖群山之間的茶園是杭州茶文化的代表，漫山遍野的茶樹在晨霧中顯得格外翠綠，空氣中飄逸著淡淡的茶香。在茶農的帶領下，參觀傳統的茶葉製作過程，品嚐一杯現炒的龍井新茶，清香甘醇、回味無窮。下午前往杭州蕭山機場，回首這八天的旅程，外灘的萬國建築、西塘的煙雨長廊、烏鎮的搖櫓船、杭州的龍井茶園、河坊街的繁華夜景，每一個腳步都在訴說著一段故事。

西湖的詩意、江南的柔情，這些都將成為心中最美的畫卷。帶著滿滿的回憶與依依不捨，登上返回台灣的航班，期待著下一次的重逢。`,
  };
  return narratives[day] || `今日行程豐富精彩，遊覽了${attractions.join("、")}。`;
}

interface DayEntry {
  day: string;
  title: string;
  description?: string;
  attractions: string[];
}

const PRESET_ITINERARY: DayEntry[] = [
  { day: "D1", title: "台北 ➔ 上海", attractions: ["外灘夜景", "南京東路步行街", "海底撈火鍋"] },
  { day: "D2", title: "上海 ➔ 西塘", attractions: ["小楊生煎", "豫園", "城隍廟", "南翔饅頭", "西塘古鎮"] },
  { day: "D3", title: "西塘 ➔ 烏鎮東柵", attractions: ["西塘古鎮", "江南戲曲服飾", "水宴餐廳", "烏鎮東柵"] },
  { day: "D4", title: "烏鎮西柵深度一日遊", attractions: ["烏鎮西柵", "白蓮塔", "昭明書院", "木心美術館", "搖櫓船"] },
  { day: "D5", title: "烏鎮 ➔ 杭州西湖", attractions: ["西湖（主湖區）", "斷橋殘雪", "蘇堤", "武林夜市", "河坊街"] },
  { day: "D6", title: "杭州宋城文化體驗", attractions: ["游埠豆漿", "宋城千古情", "河坊街", "馬鴻興川小館"] },
  { day: "D7", title: "杭州運河與宮廷晚宴", attractions: ["大馬弄", "京杭大運河遊船", "宮宴"] },
  { day: "D8", title: "杭州 ➔ 台北", attractions: ["西湖（主湖區）", "龍井茶園"] },
];

// Countdown Timer Component
function CountdownTimer({ departureDate }: { departureDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = departureDate.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [departureDate]);
  
  return (
    <div className="mb-8">
      <div className="flex flex-wrap justify-center gap-4">
        <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-5 border border-white border-opacity-30 shadow-xl text-center min-w-[100px]">
          <div className="text-4xl md:text-5xl font-bold text-white">{timeLeft.days}</div>
          <div className="text-sm text-white text-opacity-80 mt-1">天</div>
        </div>
        <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-5 border border-white border-opacity-30 shadow-xl text-center min-w-[100px]">
          <div className="text-4xl md:text-5xl font-bold text-white">{timeLeft.hours}</div>
          <div className="text-sm text-white text-opacity-80 mt-1">時</div>
        </div>
        <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-5 border border-white border-opacity-30 shadow-xl text-center min-w-[100px]">
          <div className="text-4xl md:text-5xl font-bold text-white">{timeLeft.minutes}</div>
          <div className="text-sm text-white text-opacity-80 mt-1">分</div>
        </div>
        <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-5 border border-white border-opacity-30 shadow-xl text-center min-w-[100px]">
          <div className="text-4xl md:text-5xl font-bold text-white">{timeLeft.seconds}</div>
          <div className="text-sm text-white text-opacity-80 mt-1">秒</div>
        </div>
      </div>
      <p className="text-center text-white text-opacity-70 mt-4 text-lg">倒數至出發日 7月17日</p>
    </div>
  );
}

export default function TravelJournalPage() {
  // Itinerary is shared with /travel and /travel/planner via cloud.
  // DayEntry shape is a subset of PlannedDay (no description needed here).
  // We only read here; the writer is /travel and /travel/planner.
  const [itinerary, , itineraryStatus] = useCloudState<DayEntry[]>(
    "hangzhou-trip-itinerary",
    PRESET_ITINERARY
  );
  // Turn off the initial loading spinner once the cloud fetch settles
  // (whether it produced data or failed back to defaults).
  useEffect(() => {
    if (itineraryStatus !== "loading") setLoading(false);
  }, [itineraryStatus]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editedNarrative, setEditedNarrative] = useState<string>("");
  const dayRefs = useRef<Record<string, HTMLElement | null>>({});
  // Cloud-synced custom narratives (replaces localStorage useEffect pair).
  const [customNarratives, setCustomNarratives] = useCloudState<
    Record<string, string>
  >("hangzhou-trip-journal-narratives", {});

  // Re-render hook for itinerary — but we also need to load it once on mount.
  // Use a separate useCloudState so it follows the same cloud source as
  // /travel and /travel/planner.

  const startEditing = (day: string) => {
    const dayEntry = itinerary.find(d => d.day === day);
    if (dayEntry) {
      setEditingDay(day);
      setEditedNarrative(customNarratives[day] || generateNarrative(day, dayEntry.attractions));
    }
  };

  const saveEditing = () => {
    if (editingDay && editedNarrative.trim()) {
      setCustomNarratives(prev => ({ ...prev, [editingDay]: editedNarrative.trim() }));
    }
    setEditingDay(null);
    setEditedNarrative("");
  };

  const cancelEditing = () => {
    setEditingDay(null);
    setEditedNarrative("");
  };

  const getNarrative = (day: string, attractions: string[]): string => {
    return customNarratives[day] || generateNarrative(day, attractions);
  };

  const scrollToDay = (day: string) => {
    const element = dayRefs.current[day];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && lightboxIndex < lightboxImages.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
        setLightboxImage(lightboxImages[lightboxIndex + 1]);
      } else if (e.key === "ArrowLeft" && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
        setLightboxImage(lightboxImages[lightboxIndex - 1]);
      } else if (e.key === "Escape") {
        setLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxImage, lightboxIndex, lightboxImages]);

  // Get all unique attractions in route order
  const allAttractions = itinerary.flatMap(day => day.attractions);
  const uniqueAttractions: string[] = [];
  const seen = new Set<string>();
  for (const name of allAttractions) {
    if (!seen.has(name)) {
      seen.add(name);
      uniqueAttractions.push(name);
    }
  }

  // Calculate stats
  const totalAttractions = uniqueAttractions.length;

  // Import L lazily to avoid SSR issues
  const [L, setL] = useState<typeof import("leaflet") | null>(null);
  useEffect(() => {
    import("leaflet").then(mod => setL(mod));
  }, []);

  // Create custom marker icons
  const createRouteMarker = (number: number, color: string = "#ef4444") => {
    if (!L) return undefined;
    return L.divIcon({
      className: "route-marker",
      html: `<div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      ">
        <span style="color: white; font-weight: bold;">${number}</span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  // Create mini map marker with global route number (larger, 32px, 14px font)
  const createMiniMarker = (name: string, color: string) => {
    if (!L) return undefined;
    const routeNum = ROUTE_ORDER[name] || 1;
    return L.divIcon({
      className: "mini-marker",
      html: `<div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
      ">
        <span style="color: white;">${routeNum}</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入旅程日誌...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <Image
              src={lightboxImage}
              alt="Lightbox image"
              width={800}
              height={600}
              className="object-contain rounded-lg"
              unoptimized
            />
            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm font-medium">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
            {/* Close button */}
            <button 
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
            >
              ×
            </button>
            {/* Prev button */}
            {lightboxIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIdx = lightboxIndex - 1;
                  setLightboxIndex(newIdx);
                  setLightboxImage(lightboxImages[newIdx]);
                }}
              >
                ‹
              </button>
            )}
            {/* Next button */}
            {lightboxIndex < lightboxImages.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  const newIdx = lightboxIndex + 1;
                  setLightboxIndex(newIdx);
                  setLightboxImage(lightboxImages[newIdx]);
                }}
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div 
        className="relative py-16 px-4 overflow-hidden"
        style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white bg-opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white bg-opacity-10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative">
          {/* Countdown Timer */}
          <CountdownTimer departureDate={new Date('2026-07-17')} />
          
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg tracking-tight">
              江南水鄉八日物語
            </h1>
            <div className="flex justify-center mb-2">
              <ShareButtons
                title="江南水鄉八日物語"
                text="2026 夏季江南水鄉八日物語 📖 8 天 4 座城市 · 一段慢慢走的故事"
                variant="icon"
              />
            </div>
            <p className="text-xl text-white text-opacity-90 mb-8 font-light">
              杭州 · 烏鎮 · 西塘 深度漫遊日誌
            </p>
            
            {/* Stats Bar */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-4 border border-white border-opacity-30 shadow-xl">
                <div className="text-3xl font-bold text-white">{totalAttractions}</div>
                <div className="text-sm text-white text-opacity-80">精彩景點</div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-4 border border-white border-opacity-30 shadow-xl">
                <div className="text-3xl font-bold text-white">8</div>
                <div className="text-sm text-white text-opacity-80">天數</div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-4 border border-white border-opacity-30 shadow-xl">
                <div className="text-3xl font-bold text-white">7</div>
                <div className="text-sm text-white text-opacity-80">晚數</div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl px-6 py-4 border border-white border-opacity-30 shadow-xl">
                <div className="text-3xl font-bold text-white">2</div>
                <div className="text-sm text-white text-opacity-80">人同行</div>
              </div>
            </div>

            {/* PDF Export Button */}
            <div className="flex justify-center gap-3">
              <button
                onClick={async () => {
                  const { jsPDF } = await import('jspdf');
                  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                  const pageW = doc.internal.pageSize.getWidth();
                  let y = 20;

                  // Title
                  doc.setFontSize(20);
                  doc.setFont('helvetica', 'bold');
                  doc.text('江南水鄉八日物語 — 旅程日誌', pageW / 2, y, { align: 'center' });
                  y += 12;
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(100);
                  doc.text('杭州 · 烏鎮 · 西塘 深度漫遊日誌', pageW / 2, y, { align: 'center' });
                  y += 10;

                  // Load journal data
                  const raw = localStorage.getItem('hangzhou-trip-journal-narratives');
                  if (!raw) {
                    doc.setTextColor(0);
                    doc.text('尚無日誌資料', pageW / 2, y + 10, { align: 'center' });
                  } else {
                    const days = JSON.parse(raw) as Record<string, { narrative?: string; editedNarrative?: string; photos?: string[]; route?: string[] }>;
                    const dayLabels = ['第一天 7/17', '第二天 7/18', '第三天 7/19', '第四天 7/20', '第五天 7/21', '第六天 7/22', '第七天 7/23', '第八天 7/24'];

                    for (const [day, data] of Object.entries(days)) {
                      const dayNum = parseInt(day.replace('day', ''));
                      const label = dayLabels[dayNum - 1] || day;
                      const text = data.editedNarrative || data.narrative || '';

                      if (y > 250) { doc.addPage(); y = 20; }

                      // Day header
                      doc.setFillColor(102, 126, 234);
                      doc.rect(14, y, pageW - 28, 8, 'F');
                      doc.setFontSize(11);
                      doc.setFont('helvetica', 'bold');
                      doc.setTextColor(255);
                      doc.text(label, 16, y + 5.5);
                      doc.setTextColor(0);

                      // Route
                      if (data.route && data.route.length > 0) {
                        y += 10;
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'italic');
                        doc.setTextColor(120);
                        doc.text('路線：' + data.route.join(' → '), 14, y);
                        doc.setTextColor(0);
                      }

                      // Narrative
                      y += 8;
                      doc.setFontSize(9);
                      doc.setFont('helvetica', 'normal');
                      const lines = doc.splitTextToSize(text, pageW - 28);
                      for (const line of lines) {
                        if (y > 280) { doc.addPage(); y = 20; }
                        doc.text(line, 14, y);
                        y += 5;
                      }

                      // Photo count
                      if (data.photos && data.photos.length > 0) {
                        y += 2;
                        doc.setFontSize(8);
                        doc.setTextColor(150);
                        doc.text(`📷 ${data.photos.length} 張照片`, 14, y);
                        doc.setTextColor(0);
                      }

                      y += 10;
                    }
                  }

                  // Footer
                  if (y > 270) doc.addPage();
                  doc.setFontSize(8);
                  doc.setTextColor(180);
                  doc.text('由 江南水鄉八日之旅 自動生成 — ' + new Date().toLocaleDateString('zh-TW'), pageW / 2, 290, { align: 'center' });

                  doc.save(`journey-journal-${new Date().toISOString().slice(0,10)}.pdf`);
                }}
                className="bg-white hover:bg-gray-100 text-purple-700 font-bold px-6 py-2 rounded-full shadow-lg transition-all text-sm flex items-center gap-2"
              >
                📄 匯出旅程日誌 PDF
              </button>
            </div>
          </div>

          {/* Mini Route Map */}
          <div className="bg-white rounded-2xl shadow-2xl p-4 overflow-hidden">
            <h3 className="text-lg font-bold text-gray-700 mb-3 text-center">📍 完整路線圖</h3>
            <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: "750px" }}>
              <MapContainer
                center={[30.4, 120.2]}
                zoom={9}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Route line for all attractions */}
                {(() => {
                  const positions = uniqueAttractions.map(name => {
                    const attr = ALL_ATTRACTIONS.find(a => a.name === name);
                    return attr ? [attr.lat, attr.lng] as [number, number] : null;
                  }).filter(Boolean) as [number, number][];
                  return positions.length > 1 ? (
                    <Polyline
                      positions={positions}
                      pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.8 }}
                    />
                  ) : null;
                })()}
                {/* Numbered markers */}
                {uniqueAttractions.map((name, idx) => {
                  const attraction = ALL_ATTRACTIONS.find(a => a.name === name);
                  if (!attraction) return undefined;
                  return (
                    <Marker
                      key={`route-${name}-${idx}`}
                      position={[attraction.lat, attraction.lng]}
                      icon={createRouteMarker(idx + 1)}
                    />
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top + Day Navigation */}
      <div className="sticky top-0 z-40 bg-white bg-opacity-95 backdrop-blur-sm shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
            {itinerary.map((day) => (
              <button
                key={day.day}
                onClick={() => scrollToDay(day.day)}
                className="flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: DAY_COLORS[day.day],
                  color: "white",
                }}
              >
                {day.day}
              </button>
            ))}
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all hover:scale-110 shadow-sm"
            title="回到頂部"
          >
            ▲
          </button>
        </div>
      </div>

      {/* Daily Journal Entries */}
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">
        {itinerary.map((day) => {
          const dayColor = DAY_COLORS[day.day];
          const dayDate = DAY_DATES[day.day];
          
          // Get positions for mini map
          const dayPositions = day.attractions.map(name => {
            const attr = ALL_ATTRACTIONS.find(a => a.name === name);
            return attr ? [attr.lat, attr.lng] as [number, number] : null;
          }).filter(Boolean) as [number, number][];

          // Calculate bounding box center for the day's attractions
          const mapCenter: [number, number] = dayPositions.length > 0
            ? [
                dayPositions.reduce((sum, pos) => sum + pos[0], 0) / dayPositions.length,
                dayPositions.reduce((sum, pos) => sum + pos[1], 0) / dayPositions.length,
              ]
            : [30.25, 120.15];

          // Determine zoom level based on spread of attractions
          let zoomLevel = 13;
          if (dayPositions.length > 1) {
            const lats = dayPositions.map(p => p[0]);
            const lngs = dayPositions.map(p => p[1]);
            const latSpread = Math.max(...lats) - Math.min(...lats);
            const lngSpread = Math.max(...lngs) - Math.min(...lngs);
            const maxSpread = Math.max(latSpread, lngSpread);
            if (maxSpread > 0.08) zoomLevel = 12;
            else if (maxSpread > 0.04) zoomLevel = 13;
            else zoomLevel = 14;
          }

          return (
            <section
              key={day.day}
              ref={(el) => { dayRefs.current[day.day] = el; }}
              className="scroll-mt-20"
            >
              {/* Day Header */}
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: dayColor }}
                >
                  <span className="text-2xl font-bold">{day.day}</span>
                  <span className="text-xs opacity-80">{dayDate}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{day.title}</h2>
                  <p className="text-gray-500">Day {day.day.replace("D", "")} · {dayDate}</p>
                </div>
              </div>

              {/* Narrative */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                {editingDay === day.day ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">✏️ 編輯遊記</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={saveEditing}
                          className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          儲存
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editedNarrative}
                      onChange={(e) => setEditedNarrative(e.target.value)}
                      className="w-full min-h-[200px] p-4 border border-gray-200 rounded-xl text-gray-700 leading-relaxed text-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder="撰寫今日遊記..."
                    />
                  </div>
                ) : (
                  <div className="relative group cursor-pointer" onClick={() => startEditing(day.day)}>
                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                      {getNarrative(day.day, day.attractions)}
                    </p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">✏️ 編輯</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Route Sequence */}
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-6 mb-6 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                  🚶 路線安排
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {day.attractions.map((name, idx) => (
                    <div key={name} className="flex items-center gap-2">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
                        style={{ backgroundColor: dayColor }}
                      >
                        {ROUTE_ORDER[name] || idx + 1}
                      </span>
                      <span className="font-medium text-gray-700">{name}</span>
                      {idx < day.attractions.length - 1 && (
                        <span className="text-gray-400 mx-1">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Gallery — Featured Layout */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-lg p-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    📷 照片集 ({day.attractions.reduce((acc, name) => {
                      const attr = ALL_ATTRACTIONS.find(a => a.name === name);
                      return acc + (attr?.images?.length || 0);
                    }, 0)} 張)
                  </h3>

                  {/* Collect all images from all attractions this day */}
                  {(() => {
                    const allImgs: { src: string; name: string }[] = [];
                    for (const n of day.attractions) {
                      const a = ALL_ATTRACTIONS.find(x => x.name === n);
                      if (a?.images) {
                        for (const img of a.images) {
                          allImgs.push({ src: img, name: n });
                        }
                      }
                    }

                    if (allImgs.length === 0) {
                      return <div className="text-gray-400 text-sm py-8 text-center">尚無照片</div>;
                    }

                    const featured = allImgs[0];
                    const rest = allImgs.slice(1);

                    return (
                      <div className="space-y-3">
                        {/* Featured image — large hero */}
                        <div
                          className="relative rounded-xl overflow-hidden cursor-pointer group bg-gray-100"
                          style={{ height: '220px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImages(allImgs.map(x => x.src));
                            setLightboxIndex(0);
                            setLightboxImage(featured.src);
                          }}
                        >
                          <img
                            src={featured.src}
                            alt={featured.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              void (target.parentElement && (target.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'));
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3 flex items-center gap-2">
                            <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                              ⭐ 精選
                            </span>
                            <span className="text-white text-sm font-medium">
                              {featured.name}
                            </span>
                          </div>
                          {/* Expand icon */}
                          <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </div>
                        </div>

                        {/* Thumbnail grid */}
                        {rest.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {rest.map((img, idx) => (
                              <div
                                key={`${img.name}-${idx}`}
                                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const globalIdx = idx + 1;
                                  setLightboxImages(allImgs.map(x => x.src));
                                  setLightboxIndex(globalIdx);
                                  setLightboxImage(img.src);
                                }}
                              >
                                <img
                                  src={img.src}
                                  alt={img.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* See all photos button */}
                        {allImgs.length > 1 && (
                          <button
                            className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                            onClick={() => {
                              setLightboxImages(allImgs.map(x => x.src));
                              setLightboxIndex(0);
                              setLightboxImage(featured.src);
                            }}
                          >
                            📖 看全部 {allImgs.length} 張照片
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="bg-white rounded-2xl shadow-lg p-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    🗺️ 當日路線圖
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: "280px" }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={zoomLevel}
                      style={{ height: "100%", width: "100%" }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* Day route line */}
                      {dayPositions.length > 1 && (
                        <Polyline
                          positions={dayPositions}
                          pathOptions={{ color: dayColor, weight: 4, opacity: 0.8 }}
                        />
                      )}
                      {/* Numbered markers with global route numbers */}
                      {day.attractions.map((name) => {
                        const attr = ALL_ATTRACTIONS.find(a => a.name === name);
                        if (!attr) return undefined;
                        return (
                          <Marker
                            key={`mini-${day.day}-${name}`}
                            position={[attr.lat, attr.lng]}
                            icon={createMiniMarker(name, dayColor)}
                          />
                        );
                      })}
                    </MapContainer>
                  </div>
                </div>
              </div>

              {/* Weather Info */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">☀️</span>
                  <div>
                    <p className="font-bold text-amber-800">晴朗炎熱</p>
                    <p className="text-amber-600 text-sm">氣溫 30-35°C · 建議攜帶遮陽用品與飲用水</p>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Story Summary */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 py-16 mt-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-10">旅程回顧</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white bg-opacity-20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <div className="text-5xl mb-3">📍</div>
              <div className="text-4xl font-bold text-white mb-2">{totalAttractions}</div>
              <div className="text-white text-opacity-80">個景點走訪</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <div className="text-5xl mb-3">🗺️</div>
              <div className="text-4xl font-bold text-white mb-2">320+</div>
              <div className="text-white text-opacity-80">公里總路程</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <div className="text-5xl mb-3">💰</div>
              <div className="text-4xl font-bold text-white mb-2">NT$45K</div>
              <div className="text-white text-opacity-80">人均預算</div>
            </div>
          </div>
          <div className="mt-10 text-center text-white text-opacity-80">
            <p className="text-lg">感謝觀看這段江南之旅</p>
            <p className="text-sm mt-2">西湖的柔波、烏鎮的水巷、龍井的茶香 · 期待再會</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .route-marker, .mini-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}

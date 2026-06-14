"use client";
import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import ShareButtons from "@/components/ShareButtons";
import { toast } from "@/components/GlobalToastHost";
// 2026-06-14 聖上拍板: 生圖模型庫 (25 個 pockgo image model, 從 pricing API 抽出)
import {
  POCKGO_IMAGE_MODELS,
  DEFAULT_ENABLED_MODELS,
  FALLBACK_MODEL,
  ENABLED_MODELS_KEY,
  SELECTED_MODEL_KEY,
  type PockgoImageModel,
  type ModelSeries,
} from "@/lib/pockgo-image-models";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "hangzhou-trip-postcard";
const IMG_STORAGE_KEY = "hangzhou-trip-postcard-img-";
const SONG_STORAGE_KEY = "hangzhou-trip-postcard-song-";
const PROMPT_STORAGE_KEY = "postcard_prompt_v1";  // 2026-06-12: 聖上拍板可改 prompt

// 2026-06-12 聖上拍板: 程式自動 per-day 組裝 prompt, USER 不再手動改
// 從 itinerary events (morning/afternoon/night) 跟 DAY_META 自動生成完整 prompt
// 強調繁體中文大字, 16:9 寬卡, 4K 解析度
function buildDayPrompt(day: number, dayEvents: ItineraryEvent[], meta: DayData): string {
  const eventsByPeriod = {
    morning: dayEvents.filter(e => e.period === "morning").map(e => e.title).join(", ") || "(free time)",
    afternoon: dayEvents.filter(e => e.period === "afternoon").map(e => e.title).join(", ") || "(free time)",
    night: dayEvents.filter(e => e.period === "night").map(e => e.title).join(", ") || "(free time)",
  };
  return `Create a horizontal Chinese travel itinerary illustration for ${meta.label} (${meta.date}) in 16:9 ultra wide landscape format.

Day ${day} theme: ${meta.theme}

Itinerary:
- Morning: ${eventsByPeriod.morning}
- Afternoon: ${eventsByPeriod.afternoon}
- Night: ${eventsByPeriod.night}

Visual elements: ${meta.visual.join(", ")} (${meta.icons.join(" ")})

Style requirements:
- Song Dynasty ink painting aesthetic (宋畫)
- Chinese hand-drawn travel atlas style
- Vintage parchment paper background
- Elegant Chinese decorative borders and cloud patterns (雲紋)
- Seal stamps (印章) as accents
- Traditional Chinese ink and watercolor illustration
- Travel handbook publication style
- 16:9 ultra wide panoramic composition
- Timeline flows from left to right across the entire width

Typography (CRITICAL):
- LARGE Traditional Chinese (繁體中文) labels for headings
- Big bold Traditional Chinese characters for section titles
- Perfect Traditional Chinese characters throughout
- NO spelling errors, NO garbled text, NO fake Chinese characters
- Looks like an official Chinese tourism bureau guide

Highly detailed. 4K resolution.`;
}

// ── Song data type ─────────────────────────────────────────────────────────────
type SongData = {
  title: string;
  lyrics: string[];       // one line per lyric bar
  description: string;
  mood: string;
  imagePrompt: string;
  musicPrompt?: string;   // for AI music generation
  singerVoice?: string;  // MiniMax voice_id for narration
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Period = "morning" | "afternoon" | "night";
type Category = "food" | "hotel" | "transport" | "spot" | "shopping";

type ItineraryEvent = {
  day: number;
  period: Period;
  title: string;
  location?: string;
  description?: string;
  category: Category;
};

type DayData = {
  label: string;
  date: string;
  theme: string;
  visual: string[];
  icons: string[];
};

// ── Category config ────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<Category, { icon: string; color: string; bg: string; border: string }> = {
  food:      { icon: "🍜", color: "#C084FC", bg: "bg-purple-100", border: "border-purple-300" },
  hotel:     { icon: "🏨", color: "#FB923C", bg: "bg-orange-100", border: "border-orange-300" },
  transport: { icon: "🚄", color: "#22D3EE", bg: "bg-cyan-100",   border: "border-cyan-300" },
  spot:      { icon: "📍", color: "#FACC15", bg: "bg-yellow-100", border: "border-yellow-300" },
  shopping:  { icon: "🛍️", color: "#F9A8D4", bg: "bg-pink-100",   border: "border-pink-300" },
};

// ── Period config ──────────────────────────────────────────────────────────
const PERIOD_CONFIG: Record<Period, { icon: string; color: string; label: string; gradient: string }> = {
  morning:   { icon: "🌅", color: "#F59E0B", label: "早", gradient: "linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)" },
  afternoon: { icon: "🌞", color: "#F97316", label: "午", gradient: "linear-gradient(135deg,#fb923c 0%,#f97316 100%)" },
  night:     { icon: "🌙", color: "#7C3AED", label: "晚", gradient: "linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)" },
};

// ── Card dimensions (story mode = IG portrait) ──────────────────────────────
const CARD_W = 540;
const CARD_H = 960;
const _HEADER_H = 80;

// ── Day meta ───────────────────────────────────────────────────────────────
const DAY_META: Record<number, DayData> = {
  1: { label: "Day 1", date: "7/17", theme: "國際移動 × 上海經典夜景", visual: ["上海 skyline","外灘","磁浮列車","南京東路","夜景","海底撈"], icons: ["✈️","🚄","🏙️","🌆","🍲","🏨"] },
  2: { label: "Day 2", date: "7/18", theme: "江南老街 × 水鄉古鎮",     visual: ["豫園","城隍廟","江南古鎮","紅燈籠","石橋","河道"], icons: ["🥟","🏮","🏯","🚐","🌃","🍲","🏨"] },
  3: { label: "Day 3", date: "7/19", theme: "江南水鄉慢旅行",         visual: ["烏鎮","西柵","水鄉","烏篷船","古橋","夜色"], icons: ["☕","🚕","🏮","🌉","🍽️","🏨"] },
  4: { label: "Day 4", date: "7/20", theme: "西柵表演 × 江南文化",     visual: ["評彈","花鼓戲","古鎮表演","茶館","河岸","夜燈"], icons: ["🍳","🎭","☕","🌃","🍢","🏨"] },
  5: { label: "Day 5", date: "7/21", theme: "西湖經典景點日",          visual: ["西湖","遊船","柳樹","雷峰塔","夜市","杭州"], icons: ["☕","🚗","🌿","🚤","🌸","🌃","🏨"] },
  6: { label: "Day 6", date: "7/22", theme: "宋城表演 × 杭州文化",    visual: ["宋城","千古情","古風表演","杭州文化","實景秀"], icons: ["🥣","☕","🎭","🏮","🍜","🏨"] },
  7: { label: "Day 7", date: "7/23", theme: "宮宴 × 河坊街 × 宋代文化", visual: ["宮宴","古裝","河坊街","宋代文化","燈籠街道"], icons: ["🍜","👘","🏮","🍡","📸","🍽️","🏨"] },
  8: { label: "Day 8", date: "7/24", theme: "旅行收尾日",              visual: ["杭州","返程","旅行結束","機場"], icons: ["☕","🛍️","✈️"] },
};

// ── Default songs per day ─────────────────────────────────────────────────────
const DEFAULT_SONGS: Record<number, SongData> = {
  1: {
    title: "啟程滬上夜未央",
    mood: "🎬 史詩冒險 · 繁華都會",
    description: "台北到上海的航班穿過雲層，降落浦東機場。磁浮列車以時速 430 公里奔馳，夜色中的外灘萬國建築博覽會拉開序幕。第一晚的上海，在海底撈的火鍋香氣中沸騰。",
    lyrics: [
      "✈️ 起飛的引擎轟鳴，台北的天空逐漸退遠",
      "虹橋機場的燈光，像星河倒映在眼眶",
      "🚄 磁浮列車貼地飛行，城市在窗外流成光帶",
      "外攤的鐘樓敲響十點，黃浦江畔霓虹閃耀",
      "🌆 高樓林立的天際線，是時代的詩篇",
      "海底撈的服務生笑容溫暖，這座城市的第一夜",
      "屬於冒險，屬於出發，屬於我們的長三角",
    ],
    imagePrompt: "Epic aerial night view of Shanghai skyline, Pudong skyscrapers illuminated, Huangpu River reflecting neon lights, Shanghai Bund historic buildings, maglev train motion blur, cinematic atmosphere, pastel purple and gold tones, no text, flat illustration style",
    musicPrompt: "Slow-tempo Chinese pop ballad, guzheng and erhu melody, male vocalist, moderate pace not rushed, romantic longing mood, Shanghai journey theme, Jay Chou style Chinese R&B with traditional Chinese instruments, melodic and lyrical, smooth arrangement, emotional but restrained chorus, 72 BPM",
    singerVoice: "male-qingnian",
  },
  2: {
    title: "豫園夢裡江南雨",
    mood: "🌸 古典浪漫 · 園林水墨",
    description: "豫園的曲徑通幽，城隍廟的人聲鼎沸。中午包車前往西塘古鎮，傍晚時分抵達石橋流水人家。燈籠亮起的時候，整座水鄉像一幅活的清明上河圖。",
    lyrics: [
      "🥟 清晨的小楊生煎，薄皮多汁的第一口",
      "豫園的九曲橋下，鯉魚悠游過百年",
      "🏯 城隍廟的香火裊裊，祈願牌在風中輕搖",
      "中巴穿過高速路口，窗外的田野逐漸展開",
      "🚐 石拱橋倒映在水面上，烏篷船划過倒影",
      "西塘古鎮的夜燈，一盞一盞亮起來了",
      "🥘 椒頭辣火鍋的香氣，和水鄉的清涼交織",
    ],
    imagePrompt: "Traditional Chinese water town at dusk, Xitang ancient streets with red lanterns reflecting on canals, stone bridges, Jiangnan architecture, misty atmosphere, soft moonlight, pastel watercolor style, no text, dreamy romantic mood",
    musicPrompt: "Moderate-tempo Chinese classical pop, guzheng and pipa lead, female vocalist, smooth Jay Chou style Chinese R&B rhythm, Jiangnan water town atmosphere, romantic and dreamy, gentle melody not rushed, elegant and lyrical, soft erhu countermelody, 78 BPM",
    singerVoice: "female-tianyuan",
  },
  3: {
    title: "烏鎮水燈夜泊船",
    mood: "🌙 靜謐古鎮 · 水上人家",
    description: "清晨的西塘古鎮散去喧囂，回歸水鄉最純粹的模樣。午後打滴前往烏鎮，西柵的戲服街和古橋流水構成另一幅江南畫卷。",
    lyrics: [
      "☀️ 清晨的西塘，遊客還未到來",
      "石板路上的露水，倒映著白牆黑瓦",
      "🚕 打滴沿著公路前進，城鎮在車窗外倒退",
      "烏鎮西柵的大戲台，紅綢布幔尚未拉開",
      "🏮 水域倒映著古橋，搖櫓船在水面上滑行",
      "水宴餐廳的窗外，是烏篷船的燈火",
      "🌉 夜裡的水鄉，倒影比實景更美",
    ],
    imagePrompt: "Wuzhen water town at night, West Zone ancient streets with lantern light reflecting on canals, traditional wooden boats, Chinese opera stage, dreamy Jiangnan night scene, indigo and amber tones, soft reflection on water, no text, tranquil atmospheric style",
    musicPrompt: "Slow Chinese ambient folk, guzheng and soft erhu, female vocalist, tranquil not rushed, peaceful and meditative, water town night atmosphere, Jay Chou style minimal arrangement, smooth Chinese pop melody, gentle pace, 68 BPM",
    singerVoice: "female-tianyuan",
  },
  4: {
    title: "西柵晨曦聽評彈",
    mood: "🎭 文化沉浸 · 江南雅韻",
    description: "西柵景區的清晨，評彈藝術家已經開嗓。傳統戲曲的吳儂軟語在水鄉上空迴盪，古鎮的每一個角落都是文化的舞台。",
    lyrics: [
      "🍳 景區門口的老闆娘，端上熱氣騰騰的早飯",
      "評彈的琵琶聲，在晨霧中緩緩飄來",
      "🎭 演員的水袖拋出優雅，吳儂軟語訴衷腸",
      "花鼓戲的鑼鼓點子，敲在水鄉的節奏裡",
      "☕ 河岸茶館的藤椅，一杯綠茶消磨整個下午",
      "🌃 西柵的夜燈亮了，演員謝幕掌聲雷動",
      "🍢 燒烤小攤前人聲鼎沸，古鎮的夜剛剛開始",
    ],
    imagePrompt: "Wuzhen West Zone cultural performance scene, traditional Chinese opera singers in costume, ancient water town teahouse, lantern-lit night streets, traditional instrument player, Jiangnan cultural atmosphere, warm amber and deep blue tones, no text, artistic watercolor style",
    musicPrompt: "Moderate-tempo Chinese classical crossover, guzheng and pipa duet, male and female duet, Jay Chou style theatrical elegance, cultural performance mood, Peking opera melody integrated smoothly, melodic and not rushed, elegant Chinese pop, 82 BPM",
    singerVoice: "male-qingnian",
  },
  5: {
    title: "西湖十景詩畫中",
    mood: "🌿 詩意田園 · 湖光山色",
    description: "杭州西湖，蘇東坡筆下的詩意天堂。西湖十景的經典畫面一幕幕展開：蘇堤春曉、曲院風荷、雷峰塔夕照。遊船飄蕩在湖面上，垂柳依依。",
    lyrics: [
      "☕ 龍井茶村的清晨，露水還掛在茶葉上",
      "🚗 打滴前往西湖，司機哼著越劇小調",
      "🌿 蘇堤的垂柳拂過水面，蘇東坡的詩句浮現",
      "曲院風荷的荷花正豔蓮葉何田田",
      "🚤 遊船緩緩前進，三潭印月在遠方佇立",
      "🌸 雷峰塔在夕陽中鍍金，白蛇傳說再現",
      "🌃 武林夜市的燈光照亮歸途，杭州的夜繁華",
    ],
    imagePrompt: "West Lake Hangzhou famous scenic view, lotus flowers on calm lake, Leifeng Pagoda in golden sunset, traditional Chinese landscape painting style, weeping willows, pleasure boats on the water, summer palace atmosphere, misty mountains in background, no text, traditional Chinese ink wash painting aesthetic",
    musicPrompt: "Slow Chinese poetic ballad, guzheng melody dominant, female vocalist, West Lake scenery, serene and romantic, Jay Chou style gentle Chinese pop, moderate pace not rushed, lyrical and melodic, traditional elegance, 74 BPM",
    singerVoice: "female-tianyuan",
  },
  6: {
    title: "宋城千古一場夢",
    mood: "🎭 大型史詩 · 實景秀",
    description: "宋城千古情，大型實景歷史秀。用現代科技重現大宋王朝的繁華勝景，張藝謀風格的視覺震撼，配上馬鴻興川小館的正宗川辣味。",
    lyrics: [
      "🥣 清晨的杭州白粥，配上小籠包最對味",
      "☕ 慢步走過南山路，梧桐樹葉在頭頂交錯",
      "🎭 宋城的城門緩緩打開，時光倒流一千年",
      "千古情的大幕拉開，燈光秀震撼全場",
      "🏮 實景秀的演員陣容浩大，戰馬奔騰火焰沖天",
      "🍜 馬鴻興川小館的水煮魚，辣得過癮",
      "🌃 杭州大酒店的窗外，西湖的夜色靜靜流淌",
    ],
    imagePrompt: "Song Cheng theme park grand historical show, Song Dynasty epic performance with thousands of performers, traditional Chinese costumes and pyrotechnics, ancient capital Kaifeng re-enactment, dramatic stage lighting, red and gold color scheme, no text, cinematic grandeur style",
    musicPrompt: "Moderate-tempo Chinese epic song, guzheng and Chinese drums, male vocalist, Song Dynasty theme, grand but not rushed, Jay Chou style melodic Chinese pop, dramatic orchestration without being aggressive, triumphant yet emotional, 86 BPM",
    singerVoice: "male-qingnian",
  },
  7: {
    title: "宮宴古裝夢繁華",
    mood: "👘 穿越宋代 · 宮廷盛宴",
    description: "大馬弄的市井早餐，然後穿越到宋代的宮宴現場。古風服飾、精緻菜餚、宮廷禮儀，沉浸式體驗南宋皇室風華。午後河坊街帶來現實的繁華。",
    lyrics: [
      "🍜 大馬弄的蔥油拌麵，是杭州最local的早晨",
      "👘 宮宴入口，工作人員為我披上漢服",
      "🥢 穿越的那一刻，侍女正在擺放宮廷宴席",
      "古箏的琴音裊裊，宋詞在空氣中飄蕩",
      "🏮 河坊街的歷史街區，卻有著現代的活力",
      "📸 漢服寫真在古街上拍攝，路人頻頻回頭",
      "🍽️ 傍晚的自由晚餐，探索杭州美食地圖",
    ],
    imagePrompt: "Immersive Song Dynasty palace banquet experience, elegant ancient Chinese palace costume dining, traditional Hanfu attire, classical Chinese musical performance, ornate palace interior with lanterns, romantic atmosphere with traditional decorations, no text, luxurious imperial aesthetic",
    musicPrompt: "Slow Chinese palace song, guzheng and dizi flute, female vocalist, Song Dynasty hanfu experience, elegant and luxurious, Jay Chou style refined Chinese pop, gentle pace not rushed, classical romantic mood, melodic and lyrical, 76 BPM",
    singerVoice: "female-tianyuan",
  },
  8: {
    title: "歸途亦是再出發",
    mood: "✈️ 依依不捨 · 收藏回憶",
    description: "最後一個早晨，在杭州的咖啡廳裡寫下這幾天的回憶。西湖邊的最後一杯龍井，回程的航班將我們送回台北，但這趟旅程已經永遠刻在心底。",
    lyrics: [
      "☕ 最後一杯龍井，看茶葉在杯中舒展",
      "✈️ 蕭山機場的航班，載著豐盛的回憶起飛",
      "🛍️ 行李箱裡裝滿了，杭州的茶和上海的糖",
      "西湖的水光從此在心間",
      "🌸 烏鎮的夜景永遠不會褪色",
      "🎭 宋城的燈光還在腦海閃耀",
      "🏠 台灣的家人在等我們歸來",
      "這趟旅程，是下一次出發的起點",
    ],
    imagePrompt: "Traveler at Hangzhou Xiaoshan airport looking out window with airplane wing, nostalgic sunset atmosphere, suitcase packed with souvenirs, Chinese tea and local snacks, bittersweet farewell mood, warm golden hour lighting, no text, emotional travel photography aesthetic",
    musicPrompt: "Slow bittersweet Chinese ballad, guzheng and soft erhu, male vocalist, Hangzhou departure farewell, nostalgic and emotional, moderate tempo not rushed, Jay Chou style sentimental Chinese R&B pop, melodic and longing, gentle goodbye mood, 70 BPM",
    singerVoice: "male-qingnian",
  },
};

// ── Default itinerary ──────────────────────────────────────────────────────
const DEFAULT_ITINERARY: ItineraryEvent[] = [
  { day:1, period:"morning",   title:"台北飛上海",          category:"transport", location:"CI 581 08:30 TPE→HGH" },
  { day:1, period:"afternoon", title:"磁浮列車體驗",         category:"transport", location:"上海特色高速交通" },
  { day:1, period:"afternoon", title:"廣場嘉廷飯店 Check-in", category:"hotel" },
  { day:1, period:"afternoon", title:"南京東路步行街",      category:"shopping",  location:"上海最熱鬧商圈" },
  { day:1, period:"night",     title:"外灘夜景",            category:"spot",     location:"黃浦江經典景色 · 建議夜拍" },
  { day:1, period:"night",     title:"海底撈火鍋",          category:"food",     location:"上海外攤" },

  { day:2, period:"morning",   title:"小楊生煎",            category:"food" },
  { day:2, period:"morning",   title:"豫園",               category:"spot",     location:"明代江南園林" },
  { day:2, period:"morning",   title:"城隍廟",             category:"spot",     location:"上海經典老街" },
  { day:2, period:"afternoon", title:"中巴包車前往西塘",    category:"transport" },
  { day:2, period:"night",     title:"西塘古鎮夜遊",        category:"spot",     location:"水鄉燈景 · 石橋河道" },
  { day:2, period:"night",     title:"椒嬢嬢老火鍋",        category:"food",     location:"西塘" },
  { day:2, period:"night",     title:"西塘住宿",            category:"hotel" },

  { day:3, period:"morning",   title:"西塘古鎮散步",        category:"spot",     location:"古街拍照 · 水鄉晨景" },
  { day:3, period:"afternoon", title:"打滴前往烏鎮",         category:"transport" },
  { day:3, period:"afternoon", title:"烏鎮西柵",            category:"spot",     location:"江南戲服街景 · 古鎮水道" },
  { day:3, period:"night",     title:"尋塢水宴餐廳",        category:"food" },
  { day:3, period:"night",     title:"烏鎮夜景",            category:"spot",     location:"水岸倒影 · 夜色燈光" },
  { day:3, period:"night",     title:"烏鎮住宿",            category:"hotel" },

  { day:4, period:"morning",   title:"烏鎮找早餐",          category:"food" },
  { day:4, period:"morning",   title:"西柵景區",             category:"spot",     location:"評彈 · 花鼓戲 · 古鎮展演" },
  { day:4, period:"afternoon", title:"西柵慢遊",             category:"spot",     location:"河岸散步 · 茶館休息" },
  { day:4, period:"night",     title:"景區小吃",            category:"food" },
  { day:4, period:"night",     title:"西柵夜景",            category:"spot",     location:"夜燈水岸 · 古鎮夜拍" },
  { day:4, period:"night",     title:"烏鎮臨水屋",          category:"hotel" },

  { day:5, period:"morning",   title:"早餐",                category:"food" },
  { day:5, period:"morning",   title:"打滴前往西湖",         category:"transport" },
  { day:5, period:"afternoon", title:"西湖十景",             category:"spot",     location:"蘇堤春曉 · 曲院風荷 · 花港觀魚 · 雷峰塔" },
  { day:5, period:"afternoon", title:"西湖遊船",            category:"transport", location:"西湖" },
  { day:5, period:"night",     title:"武林夜市",             category:"shopping" },
  { day:5, period:"night",     title:"杭州大酒店",           category:"hotel" },

  { day:6, period:"morning",   title:"早餐",                category:"food" },
  { day:6, period:"morning",   title:"杭州慢步調",           category:"spot" },
  { day:6, period:"afternoon", title:"宋城千古情",           category:"spot",     location:"大型歷史實景秀 · 杭州代表演出" },
  { day:6, period:"night",     title:"馬鴻興川小館",       category:"food",     location:"杭州" },
  { day:6, period:"night",     title:"杭州大酒店",           category:"hotel" },

  { day:7, period:"morning",   title:"大馬弄早餐",           category:"food" },
  { day:7, period:"morning",   title:"宮宴體驗",             category:"food",     location:"宋代沉浸式餐宴 · 古風服飾" },
  { day:7, period:"afternoon", title:"河坊街",               category:"shopping", location:"南宋古街 · 小吃與伴手禮" },
  { day:7, period:"night",     title:"自由晚餐",             category:"food" },
  { day:7, period:"night",     title:"杭州大酒店",           category:"hotel" },

  { day:8, period:"morning",   title:"杭州自由活動",         category:"spot",     location:"咖啡廳 · 最後採買" },
  { day:8, period:"afternoon", title:"返回台灣",             category:"transport" },
];

// ── MiniMax image generator (server-side proxy via /api/postcard/generate) ──
//    Key 留在 server 端（process.env），前端不暴露
async function generateMiniMaxImage(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("/api/postcard/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.image ?? null;
  } catch { return null; }
}

// ── Pockgo image generator (server-side proxy via /api/postcard/generate-pockgo) ──
//    2026-06-11 新增 — 跟 minimax 並存，UI 可切換
//    2026-06-14 聖上拍板: model 從 25 個模型庫選, 不再 env
//    2026-06-14 聖上拍板 A: 帶 autoFallback flag, server 端 fallback 到 FALLBACK_MODEL
//      回傳 modelUsed + isFallback + fallbackReason 給 UI
type PockgoGenResult = {
  base64: string;
  modelUsed: string;       // server 實際出圖成功的 model
  isFallback: boolean;
  fallbackReason: string | null;
};
async function generatePockgoImage(prompt: string, model?: string, autoFallback: boolean = true): Promise<PockgoGenResult | null> {
  try {
    const res = await fetch("/api/postcard/generate-pockgo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model, autoFallback }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error(`[pockgo] HTTP ${res.status}:`, data.error || "(no body)");
      return null;
    }
    const data = await res.json();
    return {
      base64: data.image,
      modelUsed: data.model ?? model ?? "unknown",
      isFallback: !!data.isFallback,
      fallbackReason: data.fallbackReason ?? null,
    };
  } catch (e) {
    console.error("[pockgo] fetch err:", e);
    return null;
  }
}

// ── MiniMax music generator (server-side proxy via /api/postcard/music) ──
//    Key 留在 server 端，前端不暴露
async function generateMiniMaxMusic(prompt: string, lyrics: string): Promise<string | null> {
  try {
    const res = await fetch("/api/postcard/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, lyrics }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const hexAudio = data.audio as string | null;
    if (!hexAudio) return null;
    // Server returns hex string; convert to bytes → blob URL
    try {
      const len = hexAudio.length / 2;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < hexAudio.length; i += 2) {
        bytes[i / 2] = parseInt(hexAudio.substring(i, i + 2), 16);
      }
      const blob = new Blob([bytes], { type: "audio/mp3" });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  } catch { return null; }
}

// ── MiniCard: renders a day into an offsreen div for html2canvas capture ─────
function MiniCard({ events, day, generatedImage }: { events: ItineraryEvent[]; day: number; generatedImage?: string }) {
  const meta = DAY_META[day] ?? { label: `Day ${day}`, date: "", theme: "", visual: [], icons: [] };

  const grouped: Record<Period, ItineraryEvent[]> = {
    morning:   events.filter(e => e.period === "morning"),
    afternoon: events.filter(e => e.period === "afternoon"),
    night:     events.filter(e => e.period === "night"),
  };

  return (
    <div
      data-day={day}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: "linear-gradient(160deg,#fef9f0 0%,#f0f7ff 100%)",
        fontFamily: "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)", padding: "20px 24px 16px", flexShrink: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500 }}>{meta.theme}</div>
        <div style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{meta.label} · {meta.date}</div>
      </div>

      {/* Top half: timeline (40%) */}
      <div style={{ flex: 4, overflow: "hidden", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {(Object.entries(grouped) as [Period, ItineraryEvent[]][]).map(([period, periodEvents]) => {
          if (!periodEvents.length) return null;
          const pcfg = PERIOD_CONFIG[period];
          return (
            <div key={period}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: pcfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{pcfg.icon}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2 }}>{period}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 14 }}>
                {periodEvents.map((event, i) => {
                  const cat = CATEGORY_CONFIG[event.category as Category];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: cat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, borderRadius: 10, padding: "8px 10px", background: cat.bg, border: `2px solid ${cat.border}`, minHeight: 38 }}>
                        <div style={{ fontWeight: 700, color: "#1f2937", fontSize: 13, lineHeight: 1.3 }}>{event.title}</div>
                        {event.location && <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 2 }}>{event.location}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom half: visual keywords + AI image (60%) */}
      <div style={{ flex: 6, display: "flex", flexDirection: "column", padding: "12px 24px 16px", gap: 8, overflow: "hidden" }}>
        {/* Visual Keywords */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Visual Keywords</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {meta.visual.map((v, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 7px", background: "#eef2ff", color: "#6366f1", borderRadius: 20, border: "1px solid #c7d2fe", fontWeight: 500 }}>{v}</span>
            ))}
          </div>
        </div>

        {/* AI Image — fills remaining space */}
        {generatedImage ? (
          <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: "hidden", border: "2px solid #fda4af", position: "relative" }}>
            <img
              src={`data:image/png;base64,${generatedImage}`}
              alt={`Day ${day}`}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, borderRadius: 12, background: "#fdf2f8", border: "2px dashed #fda4af", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fda4af", fontSize: 11, fontWeight: 600 }}>🎨 AI Image Area</span>
          </div>
        )}
      </div>

      {/* Footer icons + watermark */}
      <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: 16 }}>{meta.icons.join(" ")}</div>
      <div style={{ position: "absolute", bottom: 12, left: 16, fontSize: 10, color: "rgba(156,163,175,0.6)", fontWeight: 500 }}>✈️ 杭州之旅 2026</div>
    </div>
  );
}

// ── MergedPoster: renders all 8 days in a 2×4 grid for export ───────────────
function MergedPoster({ itinerary, generatedImages }: { itinerary: ItineraryEvent[]; generatedImages: Record<number, string> }) {
  const days = [1, 2, 3, 4, 5, 6, 7, 8];
  // 2 columns × 4 rows, each card CARD_W × CARD_H
  const POSTER_W = CARD_W * 2; // 1080
  const POSTER_H = CARD_H * 4; // 3840

  return (
    <div
      id="merged-poster"
      style={{
        width: POSTER_W,
        height: POSTER_H,
        background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr 1fr 1fr",
        gap: 12,
        padding: 12,
        fontFamily: "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif",
      }}
    >
      {days.map(day => {
        const events = itinerary.filter(e => e.day === day);
        return (
          <div key={day} style={{ position: "relative" }}>
            <MiniCard events={events} day={day} generatedImage={generatedImages[day]} />
          </div>
        );
      })}
    </div>
  );
}

// 2026-06-14 聖上拍板: 生圖模型庫組件
// 25 個 pockgo image model 表列 + 勾選啟用 + ✕ 隱藏 + 點選為當前 model
// 聖上原話: 「直接表列在頁面上方讓我選擇後使用再生成, 若我覺得不好則刪除」
// 2026-06-14 聖上拍板 A: 加 🛡️ 自動 fallback checkbox (default on)
function ModelLibrary({
  enabledModels,
  setEnabledModels,
  selectedModel,
  setSelectedModel,
  showAllModels,
  setShowAllModels,
  autoFallback,
  setAutoFallback,
}: {
  enabledModels: Set<string>;
  setEnabledModels: (s: Set<string>) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  showAllModels: boolean;
  setShowAllModels: (b: boolean) => void;
  autoFallback: boolean;
  setAutoFallback: (b: boolean) => void;
}) {
  // 篩選: 已啟用 vs 全部 (含已隱藏)
  const visibleModels = showAllModels
    ? POCKGO_IMAGE_MODELS
    : POCKGO_IMAGE_MODELS.filter(m => enabledModels.has(m.name));

  // 各系列已啟用統計
  const seriesStats: Record<string, { enabled: number; total: number }> = {};
  POCKGO_IMAGE_MODELS.forEach(m => {
    if (!seriesStats[m.series]) seriesStats[m.series] = { enabled: 0, total: 0 };
    seriesStats[m.series].total++;
    if (enabledModels.has(m.name)) seriesStats[m.series].enabled++;
  });

  const toggleEnabled = (name: string) => {
    const next = new Set(enabledModels);
    if (next.has(name)) {
      next.delete(name);
      // 如果刪的是當前選的, 切到第一個還啟用的 (避免刪了選不到)
      if (selectedModel === name) {
        const first = [...next][0];
        if (first) setSelectedModel(first);
      }
    } else {
      next.add(name);
    }
    setEnabledModels(next);
  };

  const statusBadge = (m: PockgoImageModel) => {
    if (m.status === "verified") return <span title="6-12 4K verify 成功 1510KB">✅</span>;
    if (m.status === "known-bad") return <span title={m.notes ?? "已知失敗"}>❌</span>;
    return <span className="opacity-40" title="未測試">❓</span>;
  };

  return (
    <div
      className="mb-4 bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl p-4 shadow border-2 border-amber-200"
      data-testid="model-library"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2
            className="text-lg font-black text-gray-800"
            style={{ fontFamily: "'Noto Serif TC', 'Songti TC', serif" }}
          >
            🖼️ 生圖模型庫
            <span className="ml-2 text-sm font-bold text-amber-700">
              已啟用 {enabledModels.size} / 25
            </span>
            {selectedModel !== FALLBACK_MODEL && (
              <span className="ml-2 text-xs text-rose-700 font-bold">
                · 當前: <span className="font-mono">{selectedModel}</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            勾選啟用 · 點選為當前 model · ✕ 隱藏 (壞的刪掉) · 來源 https://newapi.pockgo.com/api/pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 2026-06-14 A: 🛡️ 自動 fallback 開關 (聖上拍板 client-side 控制) */}
          <label
            data-testid="auto-fallback-toggle"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border-2 cursor-pointer transition-colors ${
              autoFallback
                ? "bg-amber-100 border-amber-500 text-amber-900 hover:bg-amber-200"
                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
            title={autoFallback
              ? "✅ 已開: client 選的 model 失敗 (no channel) → 自動 fallback 到 gemini-2.5-flash-image"
              : "❌ 已關: 第 1 選失敗直接報, 不 fallback"}
          >
            <input
              type="checkbox"
              checked={autoFallback}
              onChange={e => setAutoFallback(e.target.checked)}
              className="w-3.5 h-3.5 accent-amber-500"
            />
            <span>🛡️ 自動 fallback</span>
          </label>
          <button
            onClick={() => setShowAllModels(!showAllModels)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-50"
            data-testid="toggle-show-all"
            title={showAllModels ? "只看啟用" : "看全部 (含已隱藏)"}
          >
            {showAllModels ? "📋 只看啟用" : "👁️ 看全部"}
          </button>
          <button
            onClick={() => {
              if (confirm("確定要重置成預設 3 個啟用嗎? 會清空你的客製化清單")) {
                setEnabledModels(new Set(DEFAULT_ENABLED_MODELS));
                setSelectedModel(FALLBACK_MODEL);
              }
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
            title="清空客製化, 回到預設 3 個"
          >
            ↺ 重置預設
          </button>
        </div>
      </div>

      {/* Model list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {visibleModels.map(m => {
          const isEnabled = enabledModels.has(m.name);
          const isSelected = selectedModel === m.name;
          return (
            <div
              key={m.name}
              className={`relative flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-amber-500 bg-gradient-to-r from-amber-100 to-rose-100 shadow-md"
                  : isEnabled
                    ? "border-amber-200 bg-white"
                    : "border-gray-200 bg-gray-50 opacity-60"
              }`}
              data-testid={`model-${m.name}`}
            >
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => toggleEnabled(m.name)}
                className="w-4 h-4 accent-amber-500 flex-shrink-0"
                title="啟用此 model"
                data-testid={`toggle-${m.name}`}
              />
              <button
                onClick={() => isEnabled && setSelectedModel(m.name)}
                disabled={!isEnabled}
                className="flex-1 text-left min-w-0 disabled:cursor-not-allowed"
                title={isSelected ? "當前選用" : "點擊設為當前 model"}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm">{statusBadge(m)}</span>
                  <span
                    className={`text-xs font-mono font-bold truncate ${
                      isSelected ? "text-rose-700" : "text-gray-800"
                    }`}
                  >
                    {m.name}
                  </span>
                  {isSelected && <span className="text-xs">👉</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-white rounded border border-gray-200">{m.vendor}</span>
                  <span className="font-bold text-amber-700">¥{m.price}</span>
                  {m.resolution && (
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-bold">
                      {m.resolution}
                    </span>
                  )}
                  {m.notes && <span className="italic">{m.notes}</span>}
                </div>
              </button>
              <button
                onClick={() => toggleEnabled(m.name)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-bold text-base"
                title={isEnabled ? "隱藏 (USER 試不 work 的刪掉)" : "啟用"}
                data-testid={`delete-${m.name}`}
              >
                {isEnabled ? "✕" : "+"}
              </button>
            </div>
          );
        })}
      </div>

      {/* 系列統計 footer */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
        {Object.entries(seriesStats).map(([series, stats]) => (
          <span
            key={series}
            className="px-2 py-0.5 bg-white rounded border border-amber-200"
          >
            <span className="font-bold text-amber-700">{series}</span>: {stats.enabled}/{stats.total}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function PostcardPage() {
  const [itinerary, setItinerary] = useState<ItineraryEvent[]>([]);
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  // 2026-06-12: 圖片模型切換 minimax / pockgo
  // 2026-06-12: 預設改 pockgo (聖上指示)
  const [imageModel, setImageModel] = useState<"minimax" | "pockgo">("pockgo");
  const [providerSwitchToast, setProviderSwitchToast] = useState<string | null>(null);
  const [exportingMerged, setExportingMerged] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editEvents, setEditEvents] = useState<ItineraryEvent[]>([]);
  const [playingDay, setPlayingDay] = useState<number | null>(null);
  const [generatedMusic, setGeneratedMusic] = useState<Record<number, string>>({});   // day -> audio_url
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null);        // which day is generating
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);       // playing day
  const [lyricsMode, setLyricsMode] = useState<number | null>(null);                 // day for full lyrics page
  // 2026-06-14 聖上拍板 🅐: 中文 Overlay 開關 (gemini 繁中文字偶有錯字, HTML overlay 中文保證 100% 對)
  const [showOverlay, setShowOverlay] = useState(true);
  // 2026-06-14 聖上拍板: 生圖模型庫 (25 個 pockgo image model, client-side 控制, 不再寫 env)
  // enabledModels: USER 啟用清單 (勾選中) — 存 localStorage
  // selectedModel: 當前要用的 model (預設 FALLBACK_MODEL) — 存 localStorage
  // showAllModels: 是否顯示「已刪除」(隱藏的) model, 用於從垃圾桶恢復
  const [enabledModels, setEnabledModels] = useState<Set<string>>(
    () => new Set(DEFAULT_ENABLED_MODELS)
  );
  const [selectedModel, setSelectedModel] = useState<string>(FALLBACK_MODEL);
  const [showAllModels, setShowAllModels] = useState(false);
  // 2026-06-14 聖上拍板 A: 主+備模型 auto fallback 開關
  // 預設 true: client 選的 model distributor 無 channel → 自動 fallback 到 FALLBACK_MODEL
  // false: 第 1 選失敗直接報 (USER 明確要「不要 fallback, 我要看真實錯誤」)
  const [autoFallback, setAutoFallback] = useState<boolean>(true);
  // 2026-06-14 聖上拍板 🆎: 自訂 prompt (per-day) — 留空=用 buildDayPrompt() 自動模板, 有值=覆蓋
  // 存 localStorage (`postcard_prompt_v1` key 已預留, 6-12 拍板可改但當時未實作)
  const [customPrompts, setCustomPrompts] = useState<Record<number, string>>({});
  const [showPromptModal, setShowPromptModal] = useState(false);
  // 2026-06-14 聖上怒: 出圖失敗時顯眼顯示, 不再靜默 (USER 看不到錯誤以為 model 沒換 = 浪費 token)
  const [imageErrors, setImageErrors] = useState<Record<number, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mergedRef = useRef<HTMLDivElement>(null);

  // Load itinerary & images & music from localStorage
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItinerary(DEFAULT_ITINERARY);
    // Load images
    const savedImgs: Record<number, string> = {};
    for (let d = 1; d <= 8; d++) {
      const stored = localStorage.getItem(`${IMG_STORAGE_KEY}${d}`);
      if (stored) { try { savedImgs[d] = JSON.parse(stored).url; } catch {} }
    }
    setGeneratedImages(savedImgs);
    // Load music URLs — skip blob: URLs (old corrupt data) and only keep valid https:// URLs
    const savedMusic: Record<number, string> = {};
    for (let d = 1; d <= 8; d++) {
      const stored = localStorage.getItem(`${SONG_STORAGE_KEY}${d}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Only accept valid https URLs (not blob: URLs from old buggy code)
          if (parsed.url && parsed.url.startsWith('https://')) {
            savedMusic[d] = parsed.url;
          } else {
            // Clear corrupt old entry
            localStorage.removeItem(`${SONG_STORAGE_KEY}${d}`);
          }
        } catch {}
      }
    }
    setGeneratedMusic(savedMusic);
  }, []);

  // Save itinerary
  useEffect(() => {
    if (itinerary.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary));
  }, [itinerary]);

  // 2026-06-12: 切換 provider → 不刪舊圖 (USER 抱怨: 浪費), 只給提示
  // 舊圖仍保留, 按 🎨 或「🔄 強制重跑」才會覆蓋
  useEffect(() => {
    const providerKey = "postcard_img_provider_v1";
    const prev = typeof window !== "undefined" ? localStorage.getItem(providerKey) : null;
    if (prev && prev !== imageModel) {
      const providerLabel = imageModel === "pockgo" ? "🆕 pockgo" : "🎨 MiniMax";
      setProviderSwitchToast(`已切到 ${providerLabel}, 舊圖保留。要用新 provider? 按 🎨 重跑單天 或 「🔄 強制重跑」`);
      setTimeout(() => setProviderSwitchToast(null), 6000);
    }
    if (typeof window !== "undefined") localStorage.setItem(providerKey, imageModel);
  }, [imageModel]);

  // 2026-06-14 聖上怒修法: 切 model 時清舊 imageErrors (避免舊 model 失敗 badge 殘留誤導 USER)
  useEffect(() => {
    setImageErrors({});
  }, [selectedModel]);

  // 2026-06-12: 載入圖片從 IndexedDB (替換 localStorage 5MB limit)
  useEffect(() => {
    if (typeof window === "undefined") return;
    (async () => {
      try {
        const { loadAllImages } = await import("@/lib/postcard-storage");
        const all = await loadAllImages();
        const imgs: Record<number, string> = {};
        for (const [dayStr, data] of Object.entries(all)) {
          imgs[parseInt(dayStr, 10)] = data.url;
        }
        setGeneratedImages(imgs);
      } catch (e) {
        console.warn("[postcard] IndexedDB load failed, fallback memory-only:", e);
      }
    })();
  }, []);

  // 2026-06-14 聖上拍板 🅐: 載入 Overlay 開關 (localStorage 持久化)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem("postcard_overlay_v1");
    if (v !== null) setShowOverlay(v === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("postcard_overlay_v1", showOverlay ? "1" : "0");
  }, [showOverlay]);

  // 2026-06-14 聖上拍板: 載入 + 持久化 生圖模型庫
  // 載入: 啟用清單 + 當前選用 model
  useEffect(() => {
    if (typeof window === "undefined") return;
    const enabledStr = localStorage.getItem(ENABLED_MODELS_KEY);
    if (enabledStr) {
      try {
        const arr = JSON.parse(enabledStr) as string[];
        // 過濾掉已從 POCKGO_IMAGE_MODELS 移除的 (中堂之後改 metadata 也不會 crash)
        const valid = arr.filter(name => POCKGO_IMAGE_MODELS.some(m => m.name === name));
        if (valid.length > 0) setEnabledModels(new Set(valid));
      } catch { /* keep default */ }
    }
    const selected = localStorage.getItem(SELECTED_MODEL_KEY);
    if (selected) setSelectedModel(selected);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ENABLED_MODELS_KEY, JSON.stringify([...enabledModels]));
  }, [enabledModels]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SELECTED_MODEL_KEY, selectedModel);
  }, [selectedModel]);

  // 2026-06-14 聖上拍板 A: 載入 + 持久化 autoFallback 開關
  const AUTO_FALLBACK_KEY = "postcard_auto_fallback_v1";
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = localStorage.getItem(AUTO_FALLBACK_KEY);
    if (v !== null) setAutoFallback(v === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTO_FALLBACK_KEY, autoFallback ? "1" : "0");
  }, [autoFallback]);

  // 2026-06-14 聖上拍板 🆎: 載入 + 持久化 自訂 prompt (per-day 覆蓋 buildDayPrompt 自動模板)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, string>;
        // 確保 key 是 number, 過濾空字串
        const cleaned: Record<number, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const day = parseInt(k, 10);
          if (Number.isInteger(day) && day >= 1 && day <= 8 && typeof v === "string" && v.trim()) {
            cleaned[day] = v;
          }
        }
        if (Object.keys(cleaned).length > 0) setCustomPrompts(cleaned);
      } catch { /* keep default */ }
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(customPrompts));
  }, [customPrompts]);

  // Generate image for one day
  // 2026-06-14 聖上怒修法: catch error 顯眼 toast + 記錄到 imageErrors (USER 看到失敗, 不會誤以為 model 沒換)
  const generateDayImage = async (day: number) => {
    const dayEvents = itinerary.filter(e => e.day === day);
    const meta = DAY_META[day];
    if (!meta) return;
    // 切 model 前先清舊錯誤, 避免上一個 model 的錯誤誤導
    setImageErrors(prev => { const next = { ...prev }; delete next[day]; return next; });
    setGeneratingDay(day);
    try {
      // 2026-06-12 聖上拍板: 程式自動 per-day 組裝 prompt (從 itinerary + DAY_META)
      // 2026-06-14 聖上拍板 🆎: customPrompts[day] 優先 (USER 編輯的), 沒有才用自動模板
      const defaultPrompt = buildDayPrompt(day, dayEvents, meta);
      const customPrompt = customPrompts[day]?.trim();
      const prompt = customPrompt || defaultPrompt;
      if (customPrompt) console.log(`[postcard] day ${day} 用自訂 prompt (${customPrompt.length} chars), 自動模板 fallback ${defaultPrompt.length} chars`);
      // 2026-06-14 聖上拍板: 傳 selectedModel + autoFallback 給 pockgo
      // 2026-06-14 聖上拍板 A: 拆 pockgo result → base64 + 追蹤 usedModel/isFallback
      const isPockgo = imageModel === "pockgo";
      let imgBase64: string | null = null;
      let usedModel = selectedModel;     // 實際出圖的 model (可能 != selectedModel, fallback 後)
      const usedProvider = imageModel;   // provider 切換時跟著變 (不重複賦值)
      let pockgoFallback: { isFallback: boolean; reason: string | null } = { isFallback: false, reason: null };

      if (isPockgo) {
        const result = await generatePockgoImage(prompt, selectedModel, autoFallback);
        if (result) {
          imgBase64 = result.base64;
          usedModel = result.modelUsed;
          pockgoFallback = { isFallback: result.isFallback, reason: result.fallbackReason };
        }
      } else {
        imgBase64 = await generateMiniMaxImage(prompt);
        usedModel = "minimax";
      }

      if (imgBase64) {
        // 2026-06-12: 改用 IndexedDB 持久化 (localStorage 5MB 不夠 8 個 1.7MB 圖)
        // 2026-06-14 A: 存 usedModel (實際出圖的), 切換/重出後查得出來
        try {
          const { saveImage } = await import("@/lib/postcard-storage");
          await saveImage(day, { url: imgBase64, prompt, provider: usedProvider, model: usedModel });
        } catch (e: any) {
          console.warn(`[postcard] IndexedDB save failed, day ${day} 圖只存記憶體:`, e?.message);
        }
        setGeneratedImages(prev => ({ ...prev, [day]: imgBase64! }));
        setImageErrors(prev => { const next = { ...prev }; delete next[day]; return next; });
        // 2026-06-14 A: 顯示實際出圖 model. fallback 時多一行原因
        if (pockgoFallback.isFallback) {
          toast.success(`Day ${day} ✅ 用 ${usedModel} (fallback from ${selectedModel}, ${pockgoFallback.reason ?? "no channel"})`);
        } else {
          toast.success(`Day ${day} 出圖成功 (${usedModel})`);
        }
      } else {
        // 2026-06-14 聖上怒修法: null result (server 端 throw 但 catch 內部) — 顯眼錯誤
        // 2026-06-14 A: 提示 autoFallback 是否開 + 實際嘗試的 model
        const fallbackHint = autoFallback ? " (autoFallback 已開, 主+備都失敗)" : " (autoFallback 關, 第 1 選就失敗)";
        const errMsg = `❌ ${selectedModel} 出圖失敗${fallbackHint}`;
        setImageErrors(prev => ({ ...prev, [day]: errMsg }));
        toast.error(errMsg);
      }
    } catch (err: any) {
      // 2026-06-14 聖上怒修法: 顯眼 toast + 卡片 ❌ 標記, USER 不會再誤以為「model 沒換」
      const errBody = err?.message || "unknown error";
      const shortErr = errBody.replace(/^pockgo\s+\S+\s+/, '').slice(0, 150);
      const errMsg = `❌ ${selectedModel} 出圖失敗: ${shortErr}`;
      console.error(`[postcard] day ${day} failed:`, err);
      setImageErrors(prev => ({ ...prev, [day]: errMsg }));
      toast.error(errMsg);
    }
    finally { setGeneratingDay(null); }
  };

  // Generate all 8 days sequentially — 預設跳過已有圖 (增量)
  // 2026-06-12: 加 force 旗標, force=true 永遠全部跑 (覆蓋現有)
  const generateAllDays = async (force = false) => {
    setGeneratingAll(true);
    for (let d = 1; d <= 8; d++) {
      if (force || !generatedImages[d]) {
        await generateDayImage(d);
        await new Promise(r => setTimeout(r, 500)); // brief pause between calls
      }
    }
    setGeneratingAll(false);
  };

  // Generate song for one day
  const generateDayMusic = async (day: number) => {
    const song = DEFAULT_SONGS[day];
    if (!song) return;
    setGeneratingMusic(day);
    try {
      const lyricsText = song.lyrics.join("\n");
      const musicUrl = await generateMiniMaxMusic(song.musicPrompt ?? `${song.title} ${song.mood}`, lyricsText);
      if (musicUrl) {
        localStorage.setItem(`${SONG_STORAGE_KEY}${day}`, JSON.stringify({ url: musicUrl, title: song.title }));
        setGeneratedMusic(prev => ({ ...prev, [day]: musicUrl }));
      }
    } catch (err) { console.error(err); }
    finally { setGeneratingMusic(null); }
  };

  // Generate all 8 days songs sequentially
  const generateAllMusic = async () => {
    setGeneratingMusic(-1);  // -1 indicates "generating all" flag
    for (let d = 1; d <= 8; d++) {
      if (!generatedMusic[d]) {
        await generateDayMusic(d);
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setGeneratingMusic(null);
  };

  // Play/Pause a day's song
  const togglePlay = (day: number, musicUrl: string) => {
    if (currentlyPlaying === day && audioRef.current) {
      audioRef.current.pause();
      setCurrentlyPlaying(null);
    } else {
      if (audioRef.current) { audioRef.current.pause(); }
      const audio = new Audio(musicUrl);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setCurrentlyPlaying(null);
      setCurrentlyPlaying(day);
    }
  };

  // Download a day's song
  const downloadSong = (day: number) => {
    const url = generatedMusic[day];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `day${day}-${DEFAULT_SONGS[day]?.title ?? "song"}.mp3`;
    a.target = "_blank";
    a.click();
  };

  // Download a single day's card as PNG
  const downloadDayCard = async (day: number) => {
    const dayEvents = itinerary.filter(e => e.day === day);
    if (!dayEvents.length) return;
    const container = document.createElement("div");
    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;z-index:-1`;
    document.body.appendChild(container);
    const { createRoot } = await import("react-dom/client");
    const root = createRoot(container);
    await new Promise<void>(resolve => {
      root.render(
        React.createElement(MiniCard, { events: dayEvents, day, generatedImage: generatedImages[day] }),
      );
      setTimeout(resolve, 100);
    });
    try {
      const canvas = await html2canvas(container as HTMLElement, {
        scale: 2,
        backgroundColor: "#fef9f0",
        useCORS: true,
        logging: false,
        width: CARD_W,
        height: CARD_H,
      });
      const a = document.createElement("a");
      a.download = `day${day}-${DAY_META[day]?.date ?? ""}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      root.unmount();
      document.body.removeChild(container);
    }
  };

  // Download all 8 days as separate PNGs
  const downloadAllDays = async () => {
    setExportingMerged(true);
    for (let d = 1; d <= 8; d++) {
      await downloadDayCard(d);
      await new Promise(r => setTimeout(r, 400));
    }
    setExportingMerged(false);
  };

  // Export merged poster as PNG
  const exportMergedPoster = async () => {
    if (!mergedRef.current) return;
    setExportingMerged(true);
    try {
      const canvas = await html2canvas(mergedRef.current as HTMLElement, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#1e1b4b",
        logging: false,
        width: CARD_W * 2 + 24,
        height: CARD_H * 4 + 24,
      });
      const link = document.createElement("a");
      link.download = "hangzhou-trip-merged.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) { console.error(err); }
    finally { setExportingMerged(false); }
  };

  const days = [1, 2, 3, 4, 5, 6, 7, 8];

  // Edit handlers
  const startEdit = (day: number) => {
    setEditingDay(day);
    setEditEvents(itinerary.filter(e => e.day === day));
  };
  const cancelEdit = () => { setEditingDay(null); setEditEvents([]); };
  const saveEdit = () => {
    if (editingDay === null) return;
    setItinerary(prev => [...prev.filter(e => e.day !== editingDay), ...editEvents.map(e => ({ ...e, day: editingDay }))]);
    setEditingDay(null);
    setEditEvents([]);
  };
  const removeEvent = (idx: number) => setEditEvents(prev => prev.filter((_, i) => i !== idx));
  const addEvent = () => {
    if (editingDay === null) return;
    setEditEvents(prev => [...prev, { day: editingDay, period: "morning", title: "新活動", category: "spot" }]);
  };
  const updateEvent = (idx: number, field: keyof ItineraryEvent, value: unknown) => {
    setEditEvents(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800">🖼️ 卡通旅遊行程圖卡</h1>
            <p className="text-gray-500 text-sm mt-1">一鍵生成可分享的旅程圖卡 · 8天精華合併成一圖</p>
            <div className="mt-2">
              <ShareButtons
                title="卡通旅遊行程圖卡"
                text="2026 江南水鄉八日 🖼️ 8 天精華合併成一圖卡 · 可分享到 LINE / FB"
                variant="icon"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {/* 2026-06-11: 圖片模型切換 */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow border border-indigo-100" data-testid="image-model-toggle">
              <button
                onClick={() => setImageModel("minimax")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  imageModel === "minimax"
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                title="預設 MiniMax image-01"
              >
                🎨 MiniMax
              </button>
              <button
                onClick={() => setImageModel("pockgo")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  imageModel === "pockgo"
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                title="pockgo gemini-2.5-flash-image (新, 預設)"
              >
                🆕 pockgo
              </button>
            </div>
            {/* 2026-06-14 聖上拍板 🅐: 中文 Overlay 開關 (gemini 中文錯字 → HTML overlay 100% 對) */}
            <label
              data-testid="overlay-toggle"
              className="flex items-center gap-1.5 bg-white rounded-xl p-2 shadow border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={e => setShowOverlay(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-xs font-bold text-gray-700">🪧 中文 Overlay</span>
            </label>
            {/* 2026-06-12: provider 切換 toast 提示 */}
            {providerSwitchToast && (
              <div
                data-testid="provider-switch-toast"
                className="px-3 py-2 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold rounded-lg shadow animate-pulse"
                style={{ maxWidth: 280 }}
              >
                {providerSwitchToast}
              </div>
            )}
            <button
              onClick={() => { generateAllDays(false); }}
              disabled={generatingAll || generatingDay !== null}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow disabled:opacity-50 text-sm flex items-center gap-1.5"
            >
              <span>{generatingAll ? "⏳" : ""}</span>
              {generatingAll ? "生成中..." : "一鍵生成 8 天圖片"}
            </button>
            {/* 2026-06-12: 強制重跑 8 天 (覆蓋現有), 切換 provider 後用這個 */}
            <button
              onClick={() => {
                if (confirm(`確定要強制重跑 8 天圖片嗎? 將覆蓋現有 ${Object.keys(generatedImages).filter(k => generatedImages[+k]).length} 張圖`)) {
                  generateAllDays(true);
                }
              }}
              disabled={generatingAll || generatingDay !== null}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow disabled:opacity-50 text-sm flex items-center gap-1.5"
              title="覆蓋現有 8 天圖, 用當前 provider 強制重跑 (切 provider 後必按)"
            >
              🔄 強制重跑 8 天
            </button>
            <button
              onClick={exportMergedPoster}
              disabled={exportingMerged}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow disabled:opacity-50 text-sm flex items-center gap-1.5"
            >
              {exportingMerged ? "⏳" : "📥"} 合併 PNG
            </button>
            <button
              onClick={downloadAllDays}
              disabled={exportingMerged}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow disabled:opacity-50 text-sm flex items-center gap-1.5"
            >
              {exportingMerged ? "⏳" : "🗂️"} 下載全部 PNG
            </button>
            <button
              onClick={generateAllMusic}
              disabled={generatingMusic !== null || generatingAll}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all shadow disabled:opacity-50 text-sm flex items-center gap-1.5"
            >
              {generatingMusic ? "⏳" : "🎵"} 生成 8 天歌曲
            </button>
            <button
              onClick={() => setLyricsMode(1)}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-xl hover:from-violet-600 hover:-purple-600 transition-all shadow text-sm flex items-center gap-1.5"
            >
              🎵 歌詞專頁
            </button>
            {/* 2026-06-14 聖上拍板 🆎: 編輯 8 天生圖 prompt (留空=用自動模板) */}
            <button
              onClick={() => setShowPromptModal(true)}
              data-testid="open-prompt-editor"
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow text-sm flex items-center gap-1.5"
              title="自訂 8 天生圖 prompt · 留空用自動模板"
            >
              ✏️ 編輯 8 天 prompt
              {Object.keys(customPrompts).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/30 rounded text-xs font-black">
                  {Object.keys(customPrompts).length}/8
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2026-06-14 聖上拍板: 生圖模型庫 (25 個 pockgo image model, 勾選啟用 + ✕ 隱藏 + 點選用為當前 model) */}
        {imageModel === "pockgo" && (
          <ModelLibrary
            enabledModels={enabledModels}
            setEnabledModels={setEnabledModels}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            showAllModels={showAllModels}
            setShowAllModels={setShowAllModels}
            autoFallback={autoFallback}
            setAutoFallback={setAutoFallback}
          />
        )}

        {/* Day cards — 2026-06-12 聖上拍板: 滿圖效果, 移除標題, prompt 自動 per-day */}
        <div className="flex flex-col gap-3 mb-6">
          {days.map(day => {
            const dayEvents = itinerary.filter(e => e.day === day);
            const img = generatedImages[day];
            return (
              <div key={day} className="rounded-xl overflow-hidden shadow-lg border border-amber-200 bg-white">
                {/* 滿圖: 16:9 寬卡, 圖占 100% */}
                <div className="w-full" style={{ aspectRatio: "16/9", position: "relative", background: "#fdf2f8" }}>
                  {img ? (
                    <img src={`data:image/png;base64,${img}`} alt={DAY_META[day].label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : imageErrors[day] ? (
                    // 2026-06-14 聖上怒修法: 失敗時沒圖 → 紅色「❌ 出圖失敗」提示 (USER 一眼看到失敗)
                    <div
                      data-testid={`err-noimg-${day}`}
                      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#dc2626", fontWeight: 700, background: "rgba(254,226,226,0.6)", padding: 16, textAlign: "center", gap: 4 }}
                    >
                      <div style={{ fontSize: 28 }}>❌</div>
                      <div style={{ fontSize: 12, lineHeight: 1.4 }}>出圖失敗 (沒舊圖)</div>
                      <div style={{ fontSize: 10, color: "#7f1d1d", maxWidth: "90%" }}>{imageErrors[day]?.slice(0, 80)}</div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fda4af", fontWeight: 600 }}>
                      🎨 等待生成
                    </div>
                  )}
                  {/* 2026-06-14 聖上怒修法: 有舊圖但最後一次出圖失敗 → 左上角 ❌ badge 標記 (不擋 overlay) */}
                  {img && imageErrors[day] && (
                    <div
                      data-testid={`err-badge-${day}`}
                      title={imageErrors[day]}
                      style={{ position: "absolute", top: 8, left: 8, zIndex: 6, background: "#dc2626", color: "white", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, boxShadow: "0 2px 6px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 4, pointerEvents: "auto" }}
                    >
                      ❌ {selectedModel}
                    </div>
                  )}
                  {/* Generating overlay */}
                  {generatingDay === day && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 18 }}>
                      ⏳ 生成中... (約 15s)
                    </div>
                  )}
                  {/* 2026-06-14 聖上拍板 🅐: 中文 Overlay Layer (HTML 100% 中文對, 不依賴 gemini 圖) */}
                  {showOverlay && img && (
                    <div data-testid={`overlay-${day}`} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
                      {/* Top gradient mask (深→透) */}
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "45%",
                        background: "linear-gradient(180deg, rgba(15,23,42,0.75) 0%, rgba(15,23,42,0.4) 50%, transparent 100%)",
                      }} />
                      {/* Bottom gradient mask (透→深) */}
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
                        background: "linear-gradient(0deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.5) 55%, transparent 100%)",
                      }} />
                      {/* Top-left: Day label + date (思源宋體大字) */}
                      <div style={{
                        position: "absolute", top: 14, left: 20, color: "white",
                        fontFamily: "'Noto Serif TC', 'Songti TC', 'STSong', serif",
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.7)", letterSpacing: 2 }}>{DAY_META[day].label}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 1, letterSpacing: 1.5 }}>{DAY_META[day].date}</div>
                      </div>
                      {/* Top-right: 朱紅印章「杭」字 (globals.css .chinese-seal) */}
                      <div
                        className="chinese-seal"
                        style={{
                          position: "absolute", top: 12, right: 18, width: 42, height: 42,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 22, transform: "rotate(-6deg)", borderRadius: 4,
                        }}
                        title="杭州之旅 2026"
                      >
                        杭
                      </div>
                      {/* Top-center: theme (紅金 gradient 大字) */}
                      <div style={{
                        position: "absolute", top: 20, left: 0, right: 0, textAlign: "center",
                        fontFamily: "'Noto Serif TC', 'Songti TC', serif",
                        pointerEvents: "none",
                      }}>
                        <span style={{
                          display: "inline-block", fontSize: 20, fontWeight: 900, letterSpacing: 3,
                          background: "linear-gradient(90deg,#fbbf24 0%,#f59e0b 45%,#dc2626 100%)",
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                          padding: "0 10px",
                        }}>
                          {DAY_META[day].theme}
                        </span>
                      </div>
                      {/* Bottom: visual keywords (中文標籤) + icons */}
                      <div style={{
                        position: "absolute", bottom: 16, left: 20, right: 20,
                        display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12,
                      }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1, maxWidth: "72%" }}>
                          {DAY_META[day].visual.slice(0, 4).map((v, i) => (
                            <span key={i} style={{
                              fontSize: 11, fontWeight: 600, color: "white",
                              background: "rgba(220,38,38,0.78)", padding: "3px 9px",
                              borderRadius: 12, border: "1px solid rgba(245,158,11,0.5)",
                              fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
                              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                            }}>{v}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 20, flexShrink: 0, textShadow: "0 2px 4px rgba(0,0,0,0.6)", lineHeight: 1 }}>
                          {DAY_META[day].icons.slice(0, 4).join(" ")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* 下方小字 + 3 按鈕 (聖上拍板: 沒標題, 只 metadata) */}
                <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
                  <span className="font-bold text-gray-700 flex items-center gap-1">
                    {DAY_META[day].label}
                    {customPrompts[day]?.trim() && (
                      <span
                        title={`已自訂 prompt (${customPrompts[day].trim().length} chars)\n按 ✏️ 編輯 8 天 prompt 改`}
                        className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded"
                        data-testid={`day-custom-badge-${day}`}
                      >
                        ✏️ 自訂
                      </span>
                    )}
                  </span>
                  <span className="flex-1 mx-2 truncate">{DAY_META[day].date} · {DAY_META[day].theme}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setPlayingDay(day); }}
                      className="px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded hover:from-amber-500 hover:to-orange-500"
                      title="生成歌曲"
                    >🎵</button>
                    <button
                      onClick={() => generateDayImage(day)}
                      disabled={generatingDay === day || generatingAll}
                      className="px-2 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
                      title="重生圖"
                    >
                      {generatingDay === day ? "⏳" : "🎨"}
                    </button>
                    <button
                      onClick={() => startEdit(day)}
                      className="px-2 py-1 bg-white text-gray-600 text-xs font-medium rounded border hover:bg-gray-50"
                      title="編輯行程"
                    >✏️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hidden merged poster for export */}
        <div ref={mergedRef} style={{ position: "fixed", left: -9999, top: 0 }}>
          <MergedPoster itinerary={itinerary} generatedImages={generatedImages} />
        </div>

        {/* Edit Modal */}
        {editingDay !== null && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="text-xl font-black text-gray-800">編輯 {DAY_META[editingDay].label} 行程</h2>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
              </div>
              <div className="p-5 space-y-3">
                {editEvents.map((event, i) => {
                  const cat = CATEGORY_CONFIG[event.category as Category];
                  return (
                    <div key={i} className={`rounded-xl p-4 border-2 ${cat.border} ${cat.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{cat.icon}</span>
                        <button onClick={() => removeEvent(i)} className="text-red-400 hover:text-red-600 text-sm font-medium">移除</button>
                      </div>
                      <input
                        type="text" value={event.title}
                        onChange={e => updateEvent(i, "title", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg mb-2 font-bold" placeholder="活動名稱"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <select value={event.period} onChange={e => updateEvent(i, "period", e.target.value as Period)} className="px-2 py-1.5 border rounded-lg text-sm">
                          <option value="morning">🌅 早</option>
                          <option value="afternoon">🌞 午</option>
                          <option value="night">🌙 晚</option>
                        </select>
                        <select value={event.category} onChange={e => updateEvent(i, "category", e.target.value as Category)} className="flex-1 min-w-[100px] px-2 py-1.5 border rounded-lg text-sm">
                          {Object.entries(CATEGORY_CONFIG).map(([key, val]) => (
                            <option key={key} value={key}>{val.icon} {key}</option>
                          ))}
                        </select>
                        <input
                          type="text" value={event.location ?? ""}
                          onChange={e => updateEvent(i, "location", e.target.value)}
                          className="flex-1 min-w-[80px] px-2 py-1.5 border rounded-lg text-sm" placeholder="地點"
                        />
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={addEvent}
                  className="w-full py-3 border-2 border-dashed border-indigo-300 text-indigo-500 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-700 transition-colors"
                >+ 新增活動</button>
              </div>
              <div className="flex gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
                <button onClick={cancelEdit} className="flex-1 py-2.5 rounded-xl border text-gray-600 font-bold hover:bg-gray-100">取消</button>
                <button onClick={saveEdit} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:from-indigo-700 hover:to-purple-700">儲存</button>
              </div>
            </div>
          </div>
        )}

        {/* Lyrics Modal */}
        {playingDay !== null && (() => {
          const song = DEFAULT_SONGS[playingDay] ?? DEFAULT_SONGS[1];
          const meta = DAY_META[playingDay] ?? DAY_META[1];
          const musicUrl = generatedMusic[playingDay];
          const isPlaying = currentlyPlaying === playingDay;
          return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div style={{ background: "linear-gradient(90deg,#f59e0b 0%,#f97316 50%,#ef4444 100%)", padding: "20px 24px" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{meta.date} · {meta.theme}</div>
                      <div style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: 2 }}>{song.title}</div>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>{song.mood}</div>
                    </div>
                    <button onClick={() => { setPlayingDay(null); setCurrentlyPlaying(null); if(audioRef.current){audioRef.current.pause();} }} className="text-white/70 hover:text-white text-3xl leading-none">×</button>
                  </div>
                </div>

                {/* Music controls */}
                <div style={{ padding: "20px 24px", display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
                  {musicUrl ? (
                    <>
                      <button
                        onClick={() => togglePlay(playingDay, musicUrl)}
                        style={{ padding: "12px 20px", background: isPlaying ? "#ef4444" : "#f59e0b", color: "white", borderRadius: 12, fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                      >
                        {isPlaying ? "⏸ 暫停" : "▶ 播放"}
                      </button>
                      <button
                        onClick={() => downloadSong(playingDay)}
                        style={{ padding: "12px 20px", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 12, fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        💾 下載歌曲
                      </button>
                      <button
                        onClick={() => generateDayMusic(playingDay)}
                        disabled={generatingMusic === playingDay}
                        style={{ padding: "12px 20px", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 12, fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.2)", cursor: generatingMusic === playingDay ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        {generatingMusic === playingDay ? "⏳ 生成中..." : "🔄 重新生成"}
                      </button>
                      {isPlaying && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
                            <div style={{ width: "60%", height: "100%", background: "#f59e0b", borderRadius: 2, animation: "pulse 1s infinite" }} />
                          </div>
                          <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>♪ playing</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => generateDayMusic(playingDay)}
                      disabled={generatingMusic === playingDay}
                      style={{ padding: "12px 24px", background: "#f59e0b", color: "white", borderRadius: 12, fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {generatingMusic === playingDay ? "⏳ AI 創作歌曲中..." : "🎵 為這天生成專屬歌曲"}
                    </button>
                  )}
                </div>

                {/* Description */}
                <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>旅程簡述</div>
                  <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.7 }}>{song.description}</p>
                </div>

                {/* Lyrics */}
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>歌詞</div>
                    <button
                      onClick={() => {
                        const full = song.lyrics.join("\n");
                        navigator.clipboard.writeText(full).then(() => toast.success("歌詞已複製！"));
                      }}
                      style={{ padding: "6px 14px", background: "rgba(245,158,11,0.2)", color: "#f59e0b", borderRadius: 20, border: "1px solid rgba(245,158,11,0.4)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      📋 一鍵複製歌詞
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {song.lyrics.map((line, i) => (
                      <div key={i} style={{
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.9)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        fontWeight: 500,
                      }}>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginRight: 8 }}>{String(i + 1).padStart(2, "0")}</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day selector */}
                <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6,7,8].map(d => (
                    <button
                      key={d}
                      onClick={() => setPlayingDay(d)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: d === playingDay ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.2)",
                        background: d === playingDay ? "rgba(245,158,11,0.2)" : "transparent",
                        color: d === playingDay ? "#f59e0b" : "rgba(255,255,255,0.6)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {DAY_META[d]?.label ?? `Day ${d}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Full Lyrics Page Modal */}
        {lyricsMode !== null && (() => {
          const song = DEFAULT_SONGS[lyricsMode] ?? DEFAULT_SONGS[1];
          const meta = DAY_META[lyricsMode] ?? DAY_META[1];
          const fullLyrics = song.lyrics.join("\n");
          return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-b from-slate-900 to-indigo-950 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div style={{ background: "linear-gradient(90deg,#06b6d4 0%,#8b5cf6 50%,#ec4899 100%)", padding: "20px 24px" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{meta.date} · {meta.theme}</div>
                      <div style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>{song.title}</div>
                      <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>{song.mood}</div>
                    </div>
                    <button onClick={() => setLyricsMode(null)} className="text-white/70 hover:text-white text-3xl leading-none">×</button>
                  </div>
                </div>
                <div style={{ padding: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(fullLyrics).then(() => toast.success("歌詞已複製到剪貼簿！"))}
                      style={{ padding: "10px 20px", background: "linear-gradient(135deg,#06b6d4,#8b5cf6)", color: "white", borderRadius: 12, fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      📋 一鍵複製歌詞
                    </button>
                  </div>
                  <pre style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, lineHeight: 2, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif" }}>
                    {fullLyrics}
                  </pre>
                  {/* Day selector */}
                  <div style={{ padding: "16px 0 0", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>
                    {[1,2,3,4,5,6,7,8].map(d => (
                      <button
                        key={d}
                        onClick={() => setLyricsMode(d)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: d === lyricsMode ? "2px solid #06b6d4" : "2px solid rgba(255,255,255,0.2)",
                          background: d === lyricsMode ? "rgba(6,182,212,0.2)" : "transparent",
                          color: d === lyricsMode ? "#06b6d4" : "rgba(255,255,255,0.6)",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {DAY_META[d]?.label ?? `Day ${d}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2026-06-14 聖上拍板 🆎: 8 天 prompt 編輯器 (留空=用 buildDayPrompt 自動模板) */}
        {showPromptModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="prompt-editor-modal">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-2xl flex-shrink-0">
                <div>
                  <h2 className="text-xl font-black text-gray-800">✏️ 編輯 8 天生圖 prompt</h2>
                  <p className="text-xs text-gray-500 mt-1">留空 = 用 buildDayPrompt() 自動模板 · 有內容 = 覆蓋該天生圖 prompt</p>
                </div>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
                  aria-label="關閉"
                >×</button>
              </div>
              {/* Body (scrollable) */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(day => {
                  const meta = DAY_META[day];
                  const dayEvents = itinerary.filter(e => e.day === day);
                  const defaultPrompt = buildDayPrompt(day, dayEvents, meta);
                  const currentValue = customPrompts[day] ?? "";
                  const isCustom = currentValue.trim().length > 0;
                  return (
                    <div key={day} className="rounded-xl border-2 border-gray-200 p-4 bg-gray-50" data-testid={`prompt-card-${day}`}>
                      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-800">{meta.label}</span>
                          <span className="text-xs text-gray-500">({meta.date})</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs font-bold text-indigo-700">{meta.theme}</span>
                          {isCustom && (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs font-black rounded" data-testid={`prompt-custom-badge-${day}`}>
                              ✏️ 自訂
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono">{currentValue.length} chars</span>
                          {isCustom && (
                            <button
                              onClick={() => {
                                const next = { ...customPrompts };
                                delete next[day];
                                setCustomPrompts(next);
                              }}
                              className="px-2 py-1 text-xs font-bold rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                              title="清除自訂, 改用自動模板"
                            >
                              ↺ 預設
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        data-testid={`prompt-textarea-${day}`}
                        value={currentValue}
                        onChange={e => {
                          const v = e.target.value;
                          setCustomPrompts(prev => {
                            const next = { ...prev };
                            if (v.trim()) next[day] = v;
                            else delete next[day];
                            return next;
                          });
                        }}
                        placeholder={defaultPrompt}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono focus:border-emerald-400 focus:outline-none resize-y"
                        style={{ minHeight: 96, lineHeight: 1.5 }}
                      />
                      {!isCustom && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">👁 預覽自動模板 ({defaultPrompt.length} chars)</summary>
                          <pre className="mt-2 p-2 bg-white border rounded text-xs text-gray-600 whitespace-pre-wrap break-words font-mono" style={{ maxHeight: 200, overflowY: "auto" }}>{defaultPrompt}</pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Footer */}
              <div className="flex gap-3 p-5 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                <button
                  onClick={() => {
                    if (confirm("確定清空所有 8 天自訂 prompt, 改用自動模板?")) {
                      setCustomPrompts({});
                      toast.success("已重置 8 天回自動模板");
                    }
                  }}
                  disabled={Object.keys(customPrompts).length === 0}
                  className="px-3 py-2 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 disabled:opacity-40 text-sm"
                >
                  ↺ 重置全部
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 rounded-xl border text-gray-600 font-bold hover:bg-gray-100 text-sm"
                >
                  關閉
                </button>
                <button
                  onClick={() => {
                    setShowPromptModal(false);
                    const customCount = Object.keys(customPrompts).filter(d => customPrompts[+d]?.trim()).length;
                    toast.success(
                      customCount > 0
                        ? `✅ 已儲存 ${customCount} 天自訂 prompt · 按 🎨 套用`
                        : "✅ 8 天都用自動模板"
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:from-emerald-600 hover:to-teal-600 text-sm"
                >
                  💾 完成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

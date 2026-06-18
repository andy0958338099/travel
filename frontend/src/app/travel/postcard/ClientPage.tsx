"use client";
import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import ShareButtons from "@/components/ShareButtons";
import { toast } from "@/components/GlobalToastHost";
import { createClient } from "@/utils/supabase/client";
// 2026-06-17 聖上拍板: 刪生圖模型庫 + 8 day cards 圖 (Target 1 + 🅐-4)
// 相關 imports 已移除 (POCKGO_IMAGE_MODELS, verified cache, PockgoImageModel type)

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "hangzhou-trip-postcard";
const IMG_STORAGE_KEY = "hangzhou-trip-postcard-img-";
const SONG_STORAGE_KEY = "hangzhou-trip-postcard-song-";
const PROMPT_STORAGE_KEY = "postcard_prompt_v1";  // 2026-06-12: 聖上拍板可改 prompt

// 2026-06-15 聖上怒「為何無法運用成正確生成的圖」, 中堂 root cause:
//   頁面名稱 =「卡通旅遊行程圖卡」, 但 buildDayPrompt 預設 prompt 還是 6-12 宋畫/水墨風, 名實不符
//   改成「卡通 Q版漫畫」風格, 跟頁面名稱一致
function buildDayPrompt(day: number, dayEvents: ItineraryEvent[], meta: DayData): string {
  // 2026-06-18 USER 拍板 Q8🅐: 擴展讀 location + description, 讓每張圖反映完整行程細節
  //   舊版只讀 title, 行程地點/描述細節丟失
  const fmt = (e: ItineraryEvent) => {
    const loc = e.location ? ` @ ${e.location}` : "";
    const desc = e.description ? ` (${e.description})` : "";
    return `${e.title}${loc}${desc}`;
  };
  const eventsByPeriod = {
    morning: dayEvents.filter(e => e.period === "morning").map(fmt).join(", ") || "(free time)",
    afternoon: dayEvents.filter(e => e.period === "afternoon").map(fmt).join(", ") || "(free time)",
    night: dayEvents.filter(e => e.period === "night").map(fmt).join(", ") || "(free time)",
  };
  return `Create a horizontal cartoon travel itinerary illustration for ${meta.label} (${meta.date}) in 16:9 ultra wide landscape format.

Day ${day} theme: ${meta.theme}

Itinerary:
- Morning: ${eventsByPeriod.morning}
- Afternoon: ${eventsByPeriod.afternoon}
- Night: ${eventsByPeriod.night}

Visual elements: ${meta.visual.join(", ")} (${meta.icons.join(" ")})

Style requirements:
- Cute Q-version (Q版) cartoon comic style, chibi kawaii aesthetic
- Big-headed small-body chibi characters, expressive cute faces with big sparkly eyes
- Cel-shaded vibrant colors, clean bold line art, flat illustration
- Anime/manga aesthetic with comic panel borders, cute speech bubbles, action lines
- Chinese cultural elements: lanterns, paper umbrellas, hanfu details, red envelopes, traditional snacks
- Studio Ghibli / modern Chinese animation inspired atmosphere
- Cute friendly playful mood, not realistic
- 16:9 ultra wide panoramic comic strip composition
- Timeline flows from left to right across the entire width
- Day evolves from morning (warm sunrise) to night (cool blue) with color palette shift

Typography (CRITICAL):
- LARGE Traditional Chinese (繁體中文) labels in cute rounded speech bubbles and banners
- Bold Traditional Chinese characters for section titles in playful comic font
- Perfect Traditional Chinese characters throughout
- NO spelling errors, NO garbled text, NO fake Chinese characters
- Looks like a cute Chinese travel comic book for young adults

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

// 2026-06-17 聖上拍板: MiniCard + MergedPoster + ModelLibrary 全部砍掉
// (Target 1 = ModelLibrary UI, 🅐-4 = 8 day cards section)
// ModelLibrary function (L352-L562) 已刪除

// ── 8 Day Cards Section (2026-06-18 USER 拍板 Q1-Q8) ─────────────────────
//   Q1🅐-A: gpt-image-2-2k 中文最強 + fallback gemini-2.5-flash-image (USER 6-15 distributor verified)
//   Q2🅑:   用戶手動一張一張點
//   Q3🅐:   共用 buildDayPrompt template (已擴展讀 location + description, Q8🅐)
//   Q4🅐:   ❌ badge + 一鍵 retry
//   Q5🅑:   Supabase user_state table (免建 schema, 沿用 navOrderService 模式)
//   Q6🅑:   8 張在全景圖下面共存 (在此 sub-component render)
//   Q7🅐:   接受 Netlify 30s 撞牆 retry (Q4🅐 retry 處理)
//   Q8🅐:   buildDayPrompt 已擴展讀 location + description (看上方函數)
type DayImageRecord = {
  dataUrl: string;
  generatedAt: string;
  prompt: string;
  modelUsed: string;
  isFallback: boolean;
};

const DAY_IMAGE_KEY = (d: number) => `postcard_day_image_${d}`;

function DayCardsSection({ itinerary }: { itinerary: ItineraryEvent[] }) {
  const [dayImages, setDayImages] = useState<Record<number, DayImageRecord>>({});
  const [generatingDay, setGeneratingDay] = useState<number | null>(null);
  const [dayImageErrors, setDayImageErrors] = useState<Record<number, string>>({});

  // Mount: load 8 張 from Supabase user_state
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sb = createClient();
        const { data, error } = await sb
          .from("user_state")
          .select("key, value")
          .in(
            "key",
            Array.from({ length: 8 }, (_, i) => DAY_IMAGE_KEY(i + 1))
          );
        if (error || !data) return;
        const map: Record<number, DayImageRecord> = {};
        for (const row of data) {
          const m = row.key.match(/^postcard_day_image_(\d+)$/);
          if (!m) continue;
          const day = parseInt(m[1], 10);
          if (day >= 1 && day <= 8 && row.value) {
            map[day] = row.value as DayImageRecord;
          }
        }
        if (mounted) setDayImages(map);
      } catch {
        // Supabase 失敗不影響 UI, 用戶之後生成會 save 上去
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function generateDayImage(day: number) {
    if (generatingDay !== null) return;
    setGeneratingDay(day);
    setDayImageErrors((prev) => {
      const { [day]: _omit, ...rest } = prev;
      return rest;
    });

    const dayEvents = itinerary.filter((e) => e.day === day);
    const meta = DAY_META[day];
    const prompt = buildDayPrompt(day, dayEvents, meta);

    try {
      const res = await fetch("/api/postcard/generate-pockgo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model: "gpt-image-2-2k", autoFallback: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const record: DayImageRecord = {
        dataUrl: `data:image/png;base64,${data.image}`,
        generatedAt: new Date().toISOString(),
        prompt,
        modelUsed: data.model,
        isFallback: !!data.isFallback,
      };
      setDayImages((prev) => ({ ...prev, [day]: record }));
      // Save to Supabase user_state (Q5🅑)
      try {
        const sb = createClient();
        await sb.from("user_state").upsert({
          key: DAY_IMAGE_KEY(day),
          value: record as unknown as object,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Save 失敗不影響本次生成 (用戶可重新生成重試 save)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "生成失敗";
      setDayImageErrors((prev) => ({ ...prev, [day]: msg }));
    } finally {
      setGeneratingDay(null);
    }
  }

  return (
    <div className="mb-6 bg-white rounded-2xl p-4 shadow-lg border-2 border-amber-200" data-testid="day-cards-section">
      <h2 className="text-lg font-black text-gray-800 mb-2">🎨 8 天每日獨立卡通 Q 版圖</h2>
      <p className="text-xs text-gray-500 mb-3">
        模型: <span className="font-mono text-pink-600">gpt-image-2-2k</span> (中文最強, fallback
        gemini-2.5-flash-image USER 6-15 distributor verified) · 每張用 <code className="font-mono">buildDayPrompt</code>
        自動帶入當天 itinerary 細節 (title + location + description, USER Q8🅐) · 同一畫風 (16:9 Q版
        comic strip) · 每張約 25-35s · Q4🅐 ❌ retry · 雲端存 Supabase
      </p>
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((day) => {
          const meta = DAY_META[day];
          const img = dayImages[day];
          const err = dayImageErrors[day];
          const isGen = generatingDay === day;
          const isOtherGen = generatingDay !== null && !isGen;
          return (
            <div
              key={day}
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200"
            >
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-800">
                    {meta.label} · {meta.theme}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {meta.date} · {meta.visual.slice(0, 3).join(" / ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {img && (
                    <span className="text-xs text-gray-500 font-mono">
                      {img.isFallback ? "🔁 " : ""}
                      {img.modelUsed} · {Math.round(img.dataUrl.length / 1024)}KB
                    </span>
                  )}
                  {!img && !isGen && !err && (
                    <button
                      onClick={() => generateDayImage(day)}
                      disabled={isOtherGen}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow hover:shadow-md transition-all disabled:opacity-50"
                      data-testid={`day-gen-${day}`}
                    >
                      🎨 生成 {meta.label}
                    </button>
                  )}
                  {isGen && (
                    <span className="text-xs text-amber-700 font-bold" data-testid={`day-loading-${day}`}>
                      ⏳ 生成中 (約 25-35s)
                    </span>
                  )}
                  {err && !isGen && !img && (
                    <button
                      onClick={() => generateDayImage(day)}
                      disabled={isOtherGen}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white shadow hover:shadow-md transition-all disabled:opacity-50"
                      data-testid={`day-retry-${day}`}
                    >
                      🔄 重試 {meta.label}
                    </button>
                  )}
                  {img && !isGen && (
                    <>
                      <button
                        onClick={() => generateDayImage(day)}
                        disabled={isOtherGen}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-violet-400 to-purple-400 text-white shadow hover:shadow-md transition-all disabled:opacity-50"
                        data-testid={`day-regen-${day}`}
                      >
                        🔄 重新生成
                      </button>
                      <a
                        href={img.dataUrl}
                        download={`postcard-day-${day}-${meta.label.replace(/\s+/g, "-").toLowerCase()}.png`}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow hover:shadow-md transition-all"
                        data-testid={`day-download-${day}`}
                      >
                        📥 下載
                      </a>
                    </>
                  )}
                </div>
              </div>

              {err && (
                <div
                  className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700"
                  data-testid={`day-err-${day}`}
                >
                  ❌ {err}
                </div>
              )}

              {img && (
                <details className="mb-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    📝 顯示 prompt (USER 6-12 拍板可改)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono">
                    {img.prompt}
                  </pre>
                </details>
              )}

              {img && (
                <div className="rounded-lg overflow-hidden border border-amber-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={`${meta.label} 卡通 Q 版圖`}
                    className="w-full h-auto"
                    loading="lazy"
                    data-testid={`day-img-${day}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function PostcardPage() {
  // 2026-06-17 聖上拍板 🅐-4 + Target 1: 生圖狀態全砍 (generatedImages/generatingAll/generatingDay/imageModel/googleApiKey/
  //   showGoogleKeyInput/providerSwitchToast/exportingMerged/enabledModels/selectedModel/showAllModels/autoFallback/
  //   verifiedCache/customPrompts/showPromptModal/imageErrors/mergedRef)
  // 全景圖 (gemini 預生成 8 天 jpg) 仍在 panorama-cartoon-section 顯示, 不依賴這些 state.
  const [itinerary, setItinerary] = useState<ItineraryEvent[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editEvents, setEditEvents] = useState<ItineraryEvent[]>([]);
  const [playingDay, setPlayingDay] = useState<number | null>(null);
  const [generatedMusic, setGeneratedMusic] = useState<Record<number, string>>({});   // day -> audio_url
  const [generatingMusic, setGeneratingMusic] = useState<number | null>(null);        // which day is generating
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);       // playing day
  const [lyricsMode, setLyricsMode] = useState<number | null>(null);                 // day for full lyrics page
  // 2026-06-14 聖上拍板 🅐: 中文 Overlay 開關 (gemini 繁中文字偶有錯字, HTML overlay 中文保證 100% 對)
  const [showOverlay, setShowOverlay] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load itinerary & music from localStorage
  // 2026-06-17 聖上拍板 🅐-4 + Target 1: 不再 load 圖片 (生圖邏輯已砍)
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItinerary(DEFAULT_ITINERARY);
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
            {/* 2026-06-17 聖上拍板 🅐-4 + Target 1: 生圖模型切換 / Google API key / provider toast / 強制重跑 / 合併 PNG /
                下載全部 PNG / 編輯 8 天 prompt 全砍. 生圖邏輯整塊刪, UI 入口一併移除. */}
            <button
              onClick={generateAllMusic}
              disabled={generatingMusic !== null}
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
          </div>
        </div>

        {/* 2026-06-15 22:12 聖上拍板 🅐: 升 2K gpt-image-2-2k 8 張卡通 Q 版全景 (442s 跑完, 2f33e3d)
            中文最強 (USER 6-15 distributor 6 model 實測), 出圖已含正確中文字, 不再需要 HTML Overlay 修法 */}
        <div className="mb-6 bg-white rounded-2xl p-4 shadow-lg border-2 border-pink-200" data-testid="panorama-cartoon-section">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <h2 className="text-lg font-black text-gray-800">🖼️ 8 天卡通 Q 版全景圖</h2>
            <a
              href="/postcard-panorama-cartoon-8day.jpg"
              download="postcard-panorama-cartoon-8day.jpg"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow hover:shadow-md transition-all"
              data-testid="panorama-cartoon-download"
            >
              📥 下載全景圖 (2.36MB)
            </a>
            <ShareButtons
              variant="compact"
              title="江南水鄉 8 天卡通 Q 版全景圖"
              text="🖼️ 江南水鄉 8 天卡通 Q 版全景圖"
            />
          </div>
          <p className="text-xs text-gray-500 mb-2">
            模型: <span className="font-mono text-pink-600">gpt-image-2-2k</span> · 8 張 1024×1024 卡通 Q版上下堆疊 · 實際尺寸 1024×7228 (JPEG 壓縮縮減, 原始 1:8 比例) ·
            <span className="text-emerald-600">中文最強 (USER 6-15 distributor 6 model 實測), 出圖已含正確中文字</span>
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/postcard-panorama-cartoon-8day.jpg"
            alt="8 天卡通 Q 版全景圖 (江南水鄉八日)"
            className="w-full h-auto rounded-xl shadow-md border border-gray-200"
            loading="lazy"
          />
        </div>

        {/* 2026-06-17 聖上拍板 🅐-4 + Target 1: ModelLibrary UI + 8 day cards 圖整段刪除
            (生圖模型庫 + 每張圖的卡片渲染 + ❌ 失敗 badge + generating overlay + 中文 overlay 全不需要)
            全景圖 (上方 gpt-image-2-2k 預生成 8 天 jpg, 2.36MB) 仍保留, 已是單一圖展示.

            2026-06-18 USER 反悔拍板: 重新加 8 day cards 圖, 每天獨立生圖, 用行程規劃器細節
            (Q1-Q8 拍板, 看 sub-component DayCardsSection 上方註解) */}

        <DayCardsSection itinerary={itinerary} />

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

        {/* 2026-06-17 聖上拍板 🅐-4 + Target 1: 8 天 prompt 編輯器 modal 全砍 (生圖邏輯已刪, prompt 編輯不需要) */}
      </div>
    </div>
  );
}

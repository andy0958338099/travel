// /vlog 劇本資料 — 3 個備選劇本
//
// 設計：聖上會在後續編輯 dayBlocks/storyArc 細節
// 本檔目前由臣根據聖上 2026-07-11 拍板內容填入
//
// 江楠 5 色對應：
//   vermilion = 朱紅 (印章/品牌色)
//   gold      = 帝王金 (高亮/CTA)
//   ink       = 墨黑 (標題/正文)
//   paper     = 宣紙白 (頁面背景)
//   blue      = 青花藍 (次要強調)
//
// globals.css 已註冊 --jn-vermilion / --jn-gold / --jn-ink / --jn-paper / --jn-blue

export type ScriptColorKey = "vermilion" | "gold" | "ink" | "paper" | "blue";

export interface DayBlock {
  date: string;
  label: string;
  theme: string;
  scenes: string;
  mainCharacters: string;
  dialogue: string;
  shots: string;
}

export interface ScriptMeta {
  id: string;
  name: string;
  tagline: string;
  color: ScriptColorKey;
  storyArc: string;
  dayBlocks: DayBlock[];
}

// ──────────────────────────────────────────────────────────────────────────────
// 角色表（13 人）— 聖上 2026-07-11 拍板
// 家別: 喜家 = 阿喜核心家 / 吳家 = 吳董家 / 同事 = 阿喜工作同事
// 跨家關係: 阿喜 ↔ 吳董 = 高中同學; 黃阿分 vs 黃倩 = 純同姓無親屬
// ──────────────────────────────────────────────────────────────────────────────
export interface Character {
  name: string;
  role: string;
  family: "喜家" | "吳家" | "同事";
}

export const CHARACTERS_13: Character[] = [
  { name: "阿喜",   role: "爸爸 / 主角",         family: "喜家" },   // m1
  { name: "黃阿分", role: "阿喜老婆",           family: "喜家" },   // m2
  { name: "阿美",   role: "奶奶 / 阿喜的媽 · 70 歲烏黑秀髮 · 腳力體健",     family: "喜家" },   // m3
  { name: "阿評",   role: "大伯 / 阿喜的哥哥",   family: "喜家" },   // m4
  { name: "宸瑋",   role: "阿喜大兒子",         family: "喜家" },   // m9
  { name: "恩齊",   role: "阿喜小兒子",         family: "喜家" },   // m10
  { name: "黃倩",   role: "吳董老婆",           family: "吳家" },   // m5
  { name: "吳董",   role: "爸爸 / 阿喜高中同學", family: "吳家" },   // m6
  { name: "大宇",   role: "吳董大兒子",         family: "吳家" },   // m7
  { name: "小宇",   role: "吳董小兒子",         family: "吳家" },   // m8
  { name: "阿橋",   role: "阿喜同事",           family: "同事" },   // m11
  { name: "阿茹",   role: "阿喜同事",           family: "同事" },   // m12
  { name: "阿伸",   role: "阿喜同事",           family: "同事" },   // m13
];

// ──────────────────────────────────────────────────────────────────────────────
// 8 日真實行程殼子（聖上 2026-07-11 給臣的詳細時間表）
// ──────────────────────────────────────────────────────────────────────────────

// Day 1 — 出發日 (7/17 五)
const D1: DayBlock = {
  date: "2026-07-17",
  label: "Day 1 · 7/17 (五)",
  theme: "出發 · 上海灘初見",
  scenes: "桃園 T1 集合 → 春秋航空 → 上海浦東 T2 → 磁浮 → 捷運 → 上海嘉廷酒店 Check in → 南京東路 / 外灘 / 豫園商城",
  mainCharacters: "全 13 人 + 阿美奶奶 + 阿評大伯（首次長輩同行）",
  dialogue: `（T1 集合 — 全 13 人在出境大廳混亂集合）
阿喜（舉手大喊）：『喜家在這裡！喜家在這裡！』
吳董（遠處回應）：『我們在這！帶著你們家兩個小鬼！』
阿美（牽著宸瑋）：『不要跑！不要跑！』
阿評（抱著弟弟恩齊）：『媽，恩齊我來抱。』
阿茹（拉住恩齊另一隻手）：『媽，恩齊很乖啦。』
阿美：『他很皮！上次去宜蘭就一直跑！』
黃阿分（拿飲料）：『媽，給你買了熱豆漿。』
阿美：『謝謝你。』
阿喜（轉頭）：『吳董！走！先去劃位！』
吳董：『等我拿行李！』
吳董（拿 3 個行李箱過來）：『阿喜！幫忙！』
阿喜（退後）：『自己拿！』
吳董：『你怎麼這樣！』
阿喜（抱胸）：『我有 3 個皮箱耶！』
（全場大笑）
（春秋航空 — 飛機上）
空姐：『請問要點什麼飲料？』
阿美：『我要溫水。』
阿評：『我也是溫水。』
阿喜（轉頭問）：『媽，你要不要看我帶的餅？』
阿美：『我有帶了。』
阿美（從包包拿出自己做的鳳梨酥）：『我帶了自己做的。』
黃阿分（驚）：『媽妳有帶這個！好貼心！』
吳董（轉頭）：『阿姨妳有多的嗎？』
阿美（給吳董一個）：『拿去吧。』
吳董：『謝謝阿姨！』
（恩齊第一次坐窗邊 — 看雲）
恩齊（趴窗邊）：『哇！好多雲！像棉花糖！』
阿喜：『要不要跟哥哥換位置？』
宸瑋（從走道搖頭）：『不要！我要靠走道！這樣可以看電影！』
恩齊：『可是你看不見雲雲。』
宸瑋：『雲雲有什麼好看的。』
黃阿分（拿手機錄）：『欸欸不要吵架。』
（大宇跟小宇在另一邊）
大宇（指窗外）：『你看那個！』
小宇：『那個是什麼？』
大宇：『那是飛機的影子！』
小宇（驚）：『影子在天上飛！』
大宇（得意）：『我早就知道！』
阿評（看到）：『你們兩個很可愛喔。』
（落地上海浦東機場 — 13 人一起出關）
阿喜（拿 3 個皮箱）：『走！跟著我！』
阿美：『阿喜！等等我！這個東西我想看。』
阿評（牽著阿美）：『媽，一起走。』
阿茹（拿行李）：『阿美媽，你還好嗎？』
阿美：『我沒事。』
（看到磁浮列車）
阿喜：『看！這就是磁浮！全世界最快！』
吳董：『時速 431 公里！』
大宇（驚）：『比高鐵快嗎？』
阿喜：『比高鐵快很多！』
宸瑋：『那我們 8 分鐘就到市區了！』
恩齊：『這麼快！』
（外灘夜景 — 終於到上海）
阿喜（指對岸）：『看！東方明珠！』
吳董：『上海地標！』
黃阿分（拉黃倩）：『我們去拍！』
黃倩（拉吳董）：『老公你也來！』
（全 13 人擠在外灘看夜景）
阿美（看江面）：『好漂亮喔。』
阿評：『媽，妳第一次來上海吧？』
阿美：『我年輕的時候來過一次。但這麼漂亮還是第一次。』
阿美（看阿喜）：『阿喜，謝謝你帶我來。』
阿喜（抱阿美）：『媽，我應該的。』
（南京東路步行街 — 吃晚餐）
阿喜：『我們去吃小籠包！』
吳董：『有名的店在哪？』
阿喜：『南翔饅頭店！120 年老店！』
阿美：『120 年！比我還老！』
（全桌大笑）
`,
  shots: `00:00-00:10  T1 出境大廳 13 人集合的全景，鏡頭從後方慢慢搖到前方 — 阿喜 + 吳董在人群裡互相揮手
00:10-00:20  阿美奶奶牽宸瑋 + 阿評抱恩齊的祖孫三人特寫，鏡頭從阿美蹲下幫宸瑋拉拉鍊拍起
00:20-00:30  阿美拿鳳梨酥分給吳董的全景 + 吳董感動的臉特寫
00:30-00:40  飛機內恩齊趴窗邊看雲的特寫 5 秒，窗外雲朵慢動作拉近
00:40-00:50  宸瑋搖頭「不要！我要看電影」的搞笑特寫
00:50-01:00  大宇指窗外「影子在天上飛」+ 小宇驚訝的兄弟剪接
01:00-01:10  浦東機場 13 人出關的全景，鏡頭從上方俯瞰整個隊伍
01:10-01:25  看到磁浮列車 13 人驚呼的全景，鏡頭推近車頭時速表「431 km/h」
01:25-01:35  外灘夜景的全景，鏡頭從東方明珠緩慢橫搖到萬國建築群
01:35-01:45  阿美站在外灘看江面的背影特寫，江面倒影
01:45-02:00  全 13 人擠在外灘剪影的合影全景，背景東方明珠

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-01-t1-airport.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Taiwan Taoyuan International Airport Terminal 1 departure hall morning sunlight through tall glass windows, a joyful Taiwanese Chinese family of 13 chibi characters with luggage and backpacks, kids running around, real airport architecture with high ceilings and shops in background, cinematic wide-angle shot, soft golden hour lighting"
00:10-00:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-02-grandma-kid.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, healthy 70-year-old Asian grandma holding hands with 8-year-old grandson at airport, warm tender moment, chibi healthy 70-year-old Asian grandma with jet-black silky hair and chibi grandson looking up at her with curious big eyes, soft golden backlight through terminal windows, real airport polished floor and other travelers in background, cinematic portrait shot"
00:20-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-03-pineapple-cake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, healthy 70-year-old Asian grandma with jet-black silky hair handing traditional Taiwanese pineapple cake to a middle-aged businessman friend at airport, both smiling warmly, chibi healthy 70-year-old Asian grandma in floral blouse and chibi businessman in casual jacket, real airport gate area with chairs and information boards in background, candid documentary style photograph"
00:30-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-04-clouds-window.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, inside airplane window view with fluffy white cumulus clouds like cotton candy at golden hour, chibi 5-year-old boy face pressed against window looking out with wonder, his breath fogging the glass, photorealistic sky and cloudscape, dreamy soft golden light filling cabin, cinematic composition"
00:50-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-06-brothers-plane.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, two young Asian brothers inside airplane pointing at airplane wing shadow on clouds, chibi older brother proudly explaining with raised finger, chibi younger brother looking amazed with wide eyes, photorealistic airplane window framing and cloud background, candid photo style"
01:00-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-07-pudong-arrival.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, bird's-eye aerial view of 13 chibi Asian tourist characters exiting Shanghai Pudong International Airport terminal, walking together as a large group with luggage, photorealistic modern bright architecture with geometric ceiling and glass walls, panoramic wide shot, natural daylight"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-08-maglev-431.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Shanghai Maglev train arriving at platform with sleek futuristic design, speedometer showing 431 km/h, 13 chibi excited tourists looking through windows with wonder, photorealistic train design and platform details, dramatic low-angle shot with motion blur"
01:25-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-09-bund-night.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Shanghai Bund night panorama, Oriental Pearl Tower glowing pink and purple in background, chibi tiny figures on Bund waterfront looking up at the skyline, photorealistic historic European architecture buildings lit golden, neon lights reflecting on Huangpu River, dramatic cinematic wide shot"
01:35-01:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-10-grandma-silhouette.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi healthy 70-year-old Asian grandma with jet-black silky hair from behind looking out at Shanghai night skyline, her elegant silhouette against the bright neon city lights, photorealistic skyscrapers and Oriental Pearl Tower, contemplative and proud mood, cinematic backlit portrait, depth of field"
01:45-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-11-group-silhouette.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, large group of 13 chibi Asian tourist characters as dark silhouettes on Shanghai Bund waterfront at night, Oriental Pearl Tower glowing in background, photorealistic historic buildings lit golden behind them, joyful group portrait moment, cinematic wide shot"
`,
};

// Day 2 — 特種兵日 (7/18 六) — 出發西塘前特種兵自由行
const D2: DayBlock = {
  date: "2026-07-18",
  label: "Day 2 · 7/18 (六)",
  theme: "特種兵自由行 · 蘇州河到西塘",
  scenes: "05:30 賽門泳渡蘇州河 → 07:00 check out 寄行李 → 小楊生煎 / 佳家湯包 / 王家沙 → 豫園 / 城隍廟 → 南翔饅頭店 → 15:30 包車出發西塘 → 古韻雅居客棧 → 椒釀釀火鍋 → 夜遊西塘煙雨長廊",
  mainCharacters: "賽門（單飛特種兵凌晨出門）/ 阿美奶奶（飯店休息，中午才集合）/ 13 人豫園 / 全 13 人西塘夜遊",
  dialogue: `（05:30 — 上海嘉廷飯店，賽門整裝出門，14 樓房間還暗著）
賽門（背背包輕聲走過走廊）：『我走了。蘇州河見。』
（停在阿美奶奶房門口，輕敲）
阿美奶奶（睡夢中翻個身，沒醒）
賽門（低聲自言自語）：『阿姨抱歉吵醒您，早點睡。』
（電梯下樓，大廳空無一人）
阿喜（房間裡被鬧鐘震醒）：『嗯……賽門走了喔。』
黃阿分（翻身）：『再睡一下。』
恩齊（翻身壓到阿喜肚子）：『嗚——爸爸擋住。』
阿喜（撥開恩齊小腳）：『去！你去跟你哥睡！』
（07:00 — 大廳集合，全 13 人 check out，寄行李）
吳董（拖 3 個行李箱）：『阿喜！我們走！』
阿喜（拖 4 個行李箱）：『等等！我家多一個！』
黃阿分（拿電子秤）：『阿喜那個皮箱 25 公斤耶，會不會超重？』
阿喜：『超重就現場拆！』
阿評（拿咖啡下樓）：『媽，我幫妳拿這個。』
阿美：『這個是我的外套！』
阿評：『我知道，我幫妳拿。』
（08:30 — 小楊生煎，復興路上排隊 30 分鐘）
阿喜（拿 4 鍋生煎上桌）：『來！爆汁的小楊生煎！』
恩齊（咬一口）：『啊！燙！』
阿喜（拿紙巾擦）：『我跟你說過先咬小洞！』
恩齊（小洞吸一口）：『嗚！湯！』
阿美（咬一口）：『這個好吃！』
黃阿分：『比鼎泰豐好吃！』
阿美：『不要亂講！鼎泰豐不一樣！』
（兩位太太笑場）
（10:30 — 豫園，13 人魚貫入園）
阿評（拿導覽機）：『媽，這個是明朝建的，已經 400 多年了。』
阿美（抬頭看）：『我知道！我年輕的時候就看過了。』
阿評：『媽妳以前來過喔？』
阿美：『你爸帶我來過一次。那時候你才五歲。』
阿評（沉默 3 秒）：『……爸如果還在，應該也會想來吧。』
阿喜（從後方插入，鏡頭晃了一下）：『哥，改天我們再去一次爸的老家。』
（阿評點頭，沒說話）
（13:00 — 城隍廟小吃街）
宸瑋（指糖葫蘆）：『爸爸！我要那個！』
黃倩（拉宸瑋）：『等一下！你剛剛已經吃了一串！』
恩齊（在旁邊附和）：『哥哥剛剛吃了一串！』
大宇（從後面跑來）：『我也要！』
吳董（趕緊）：『吳大宇！你給我回來！』
（南翔饅頭店 — 饅頭店裡擠了 30 分鐘）
小宇（指蒸籠）：『哇！好多！』
黃倩（抱小宇）：『小宇，燙，不要碰。』
阿美（從旁邊坐著）：『120 年的店啊。比我們家的老。』
阿喜：『媽妳也 90 了啦。』
阿美：『我沒那麼老！』
（全桌又笑場）
（15:30 — 包車出發西塘，車程 1.5 小時）
吳董（在前座）：『師傅，走高速！』
阿喜（在中排）：『吳董你怎麼跟師傅講話？』
吳董：『不然呢？』
阿評（最後一排陪阿美）：『媽，妳先睡一下。』
阿美（靠窗）：『我沒事。我看看風景。』
（黃阿分從鏡頭外遞來一瓶水給阿美）
阿美：『謝謝阿分。』
黃阿分（握阿美的手）：『媽，妳慢慢來，我們再逛一下。』
（17:00 — 抵達西塘古鎮，古韻雅居客棧門口）
賽門（已經先到 1 小時，滿頭汗）：『我先去逛了！西門見！』
阿喜：『你不要走丟！』
賽門：『我不會！我有 Google Map！』
吳董：『大陸 Google Map 不能用啦！』
賽門：『我有 VPN！』
（19:00 — 椒釀釀火鍋店）
阿喜（拿菜單）：『毛肚！黃喉！鵝腸！』
黃阿分：『你點這麼辣小朋友能吃嗎？』
阿美：『我要麻辣！』
（全場愣住）
阿喜：『媽妳能吃辣？！』
阿美：『我年輕的時候在四川吃過！忘不了！』
阿評（看著阿美笑）：『媽原來是辣妹子啊！』
（20:30 — 西塘煙雨長廊夜遊）
阿美（站著看水）：『這個水好清澈。』
阿喜（蹲下來拍水面倒影）：『媽，妳站在那邊不要動。』
阿美：『你拍什麼？』
阿喜：『我跟阿分結婚那年的合照就是在水鄉拍的。想再拍一張。』
（拍完合照）
阿美：『好，回去給你爸看。』
（22:00 — 客棧房間）
阿評（給阿美捶腿）：『媽，妳走太多了。明天我們坐船。』
阿美：『不用，我走得動。』
阿評：『走的時候說一聲，妳兒子我來安排。』`,
  shots: `00:00-00:08  05:30 嘉廷飯店走廊長鏡頭，鏡頭跟著賽門背影出門
00:08-00:18  賽門停在阿美房門口輕敲，鏡頭從門縫角度偷拍，柔光
00:18-00:28  房間內阿喜被鬧鐘震醒，鏡頭從枕頭側拍，半身景深
00:28-00:38  恩齊翻身壓到阿喜肚子，阿喜撥開小腳的搞笑慢動作
00:38-00:50  07:00 大廳 13 人集合，吳董拖 3 箱 vs 阿喜 4 箱對比剪接
00:50-01:05  小楊生煎排隊長鏡頭，鏡頭從街角緩慢推到店門口
01:05-01:15  恩齊咬第一口生煎燙到，湯汁飛出來慢動作
01:15-01:25  阿美奶奶咬一口讚歎「好吃」，cut 兩位太太反應
01:25-01:40  豫園入口 — 鏡頭從阿美視角抬頭看古建築，陽光從簷角灑下
01:40-01:50  阿評指明朝屋頂，鏡頭從阿評手指 lead 到屋簷結構
01:50-02:05  「你爸帶我來過一次」一句，鏡頭 zoom in 阿評眼眶 + 阿美表情
02:05-02:15  「改天再去爸的老家」，阿喜從後方插入，三人背影定格
02:15-02:30  城隍廟小吃街全景，鏡頭捕捉宸瑋指糖葫蘆，吳董急追大宇
02:30-02:45  南翔饅頭店 — 鏡頭從蒸籠往上拍，蒸汽瀰漫，景深虛化
02:45-02:55  阿美碎念「120 年的店」，cut 阿喜吐槽她年齡笑場
02:55-03:10  包車出發 — 鏡頭從前座拍吳董跟師傅對話，後視鏡構圖
03:10-03:25  車程 — 鏡頭從窗外風景慢慢回拍阿美靠窗，黃阿分遞水
03:25-03:40  西塘抵達，賽門已經先到，鏡頭從遠景拉到賽門汗水特寫
03:40-03:55  椒釀釀火鍋店 — 鏡頭從滾紅油的鍋子拍起，上搖到全桌
03:55-04:10  阿美點麻辣全場愣住，鏡頭捕捉阿美笑場表情
04:10-04:25  「我年輕在四川吃過」一句，鏡頭從阿美側面拍，景深虛化背景
04:25-04:45  西塘煙雨長廊夜遊全景，鏡頭從拱橋拍河面倒影，手持微晃
04:45-05:00  阿美站在河邊，阿喜蹲下拍倒影，鏡頭從兩人剪影
05:00-05:15  阿喜說「跟阿分結婚那年也拍過水鄉」，zoom in 合照構圖
05:15-05:30  「回去給你爸看」一句，鏡頭拍阿美眼眶 + 河水倒影重疊
05:30-05:45  客棧房間 — 阿評給阿美捶腿的全景，鏡頭從窗外偷拍
05:45-06:00  「走的時候說一聲」一句，鏡頭從窗內拍阿美看夜景

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-01-suzhou-river-dawn.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic low-angle shot of Shanghai Suzhou Creek at pre-dawn, a single chibi middle-aged Chinese man wearing swim trunks and goggles standing at the concrete riverbank beside iron railings, the city skyline still dark with just blue-hour tones, photorealistic early morning atmosphere with mist rising from the calm water, cinematic composition with deep blue sky and pale orange horizon"
00:10-00:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-02-hotel-corridor-dawn.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dim hotel corridor at 5:30 AM with one warm ceiling light casting long shadows, a chibi man in athletic backpack walking quietly past numbered doors 1401 to 1412, soft yellow incandescent glow, photorealistic hotel carpet and wooden doors, cinematic shallow depth of field with bokeh, melancholic quiet morning mood"
00:20-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-03-grandma-still-sleeping.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, close-up of an elderly healthy 70-year-old Asian grandma with jet-black silky hair chibi sleeping peacefully in hotel bed with white duvet, soft warm bedside lamp light illuminating her jet-black silky hair, peaceful breathing expression, photorealistic hotel room details with curtains drawn, cinematic shallow focus on the gentle face, tender intimate moment"
00:30-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-04-enqi-blocking-dad.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sweet morning scene of chibi Asian father sitting on edge of hotel bed with chibi little boy standing beside him in early blue-grey dawn light, child rubbing sleepy eyes, father gently patting his head, photorealistic hotel room interior with soft lamp light and rumpled white sheets in background, tender intimate family portrait, cinematic medium shot composition, naturalistic documentary style"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-05-soup-dumpling-juice.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, ultra slow-motion close-up of chibi boy's face biting into xiaolongbao at Xiao Yang Sheng Jian restaurant, hot broth squirting out dramatically, steam rising in golden backlight, photorealistic Chinese soup dumpling skin texture and pork filling visible, dramatic shallow depth of field, cinematic food photography moment, golden hour restaurant lighting"
00:55-01:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-06-yu-garden-rooftop.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic upward angle of Ming Dynasty traditional Chinese curved rooftop of Yu Garden with intricate dragon decorations against bright blue sky, a healthy 70-year-old Asian grandma with jet-black silky hair in floral blouse standing below looking up in wonder, photorealistic traditional Chinese architecture with red pillars and grey brick walls, cinematic golden hour sunlight casting shadows"
01:05-01:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-07-pine-river-night.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic night scene of Xitang water canal with stone bridges and traditional white-walled black-tiled Chinese houses reflecting perfectly in dark still water, chibi healthy 70-year-old Asian grandma with jet-black silky hair standing on stone bridge with family members capturing photos together, wearing floral blouse, photorealistic hanging red lanterns glowing warmly, cinematic long exposure shot with mirror-like reflection, joyful and beautiful mood"
01:20-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-08-grandma-spicy-reveal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, surprise moment in spicy Sichuan hotpot restaurant, 13 chibi Asian family members around red bubbling spicy hotpot, chibi healthy 70-year-old Asian grandma with jet-black silky hair in center proudly holding up a bowl with mischievous smile, everyone else's chibi faces showing shock with mouth open, photorealistic Sichuan restaurant interior with red wooden tables and traditional decorations, dramatic overhead shot, vibrant red oil and chili peppers floating"`,
};
// Day 3 — 西塘整天 (7/19 日)
const D3: DayBlock = {
  date: "2026-07-19",
  label: "Day 3 · 7/19 (日)",
  theme: "西塘整日遊 · 水巷慢時光",
  scenes: "05:00～15:00 西塘古鎮整日（晨霧 / 煙雨長廊 / 烏篷船 / 小吃街）→ 15:30 包車出發烏鎮西柵外 → 夏朵.悠舍悠得 check in → 水宴餐廳 → 景區外閒晃或足浴",
  mainCharacters: "全 13 人西塘整天 / 兩家人各自逛 / 同事 vs 家人分頭行動（足浴 vs 西塘小巷）",
  dialogue: `（05:00 — 西塘客棧窗邊，阿喜被雞叫醒）
阿喜（推開窗）：『嘩——晨霧。』
黃阿分（還沒醒）：『嗯？』
阿喜：『快起來看。河面都是霧。』
（鏡頭往外拍，西塘河道飄著白色晨霧）
（06:30 — 西塘小巷早茶客）
阿美（端豆漿）：『這個豆漿比台灣的甜。』
阿評：『加糖的啦。』
阿美：『難怪！我說怎麼味道怪怪的。』
宸瑋（咬包子）：『這個包子好軟。』
恩齊（咬一口）：『嗚！流出來了！』
阿喜：『那是湯！小心燙。』
（08:00 — 烏篷船碼頭，13 人擠上 2 條船）
船夫：『兩條船夠嗎？』
阿喜：『大人一條，小孩一條。』
吳董：『我們這邊 6 個（吳董+黃倩+大宇+小宇+阿伸+阿茹）。』
阿喜：『我們 7 個（阿喜+黃阿分+阿美+阿評+宸瑋+恩齊+阿橋）。』
賽門：『我單飛！自己租一台！』
黃倩：『賽門你不要走丟！』
賽門：『放心！我有 VPN！』
吳董：『大陸不需要 VPN 啦！』
（船行河中，恩齊摸水）
恩齊（伸手進水）：『水冰冰的！』
船夫：『小朋友不要亂摸。』
阿美（看河水）：『這個水好清澈。我小時候在新竹看到的溪水也這樣。』
阿評（聽到，沉默 3 秒沒接話）
阿喜（鏡頭對著阿美和河水）：『媽，新竹那條溪還在嗎？』
阿美：『已經被水泥化了。』
（10:30 — 西塘煙雨長廊，4 個小朋友跑前面）
宸瑋（指前面）：『那邊有賣糖葫蘆！』
大宇（也衝過去）：『我也要！』
小宇（追不上）：『哥哥等我！』
恩齊（也跑起來）：『我也要！』
（4 個小朋友擠在糖葫蘆攤前）
阿喜（後面追）：『等一下！你們有錢嗎？』
吳董（也跑來）：『我先付！』
阿美（慢慢走）：『你們年輕人跑那麼快幹嘛。』
阿評（牽著阿美）：『媽，等等小朋友。』
（中午 12:00 — 西塘小吃街午餐）
阿喜（指著一家店）：『這家有粉蒸肉！』
黃阿分：『阿喜你點菜囉！』
阿評（看菜單）：『這個粉蒸肉是 38 人民幣？』
阿喜：『便宜！』
吳董：『對台灣人來說便宜，對大陸人也是便宜！』
阿美（咬粉蒸肉）：『這個綿綿的。』
阿喜：『媽妳喜歡嗎？』
阿美：『喜歡。這跟小時候吃的不一樣，但是也好吃。』
（下午 14:00 — 阿評扛相機帶媽走慢的，其他人分線）
阿喜：『我跟同事去足浴，你們兩家人自己逛？』
黃阿分：『蛤？你們去洗腳我們逛街？』
阿喜：『兩個小時後西門見。』
吳董：『我跟你去！阿喜我們一起去！』
阿評（抱著相機）：『我帶媽跟四個小朋友走慢的，你們先去。』
阿美（碎念）：『你們年輕人去玩啦！我跟阿評慢慢走。』
（西塘小巷 — 阿美 + 阿評 + 4 個小朋友慢慢逛）
恩齊：『大伯公，那個是什麼？』
阿評：『那是烏篷船。我們剛剛坐過的。』
小宇：『可以再坐嗎？』
阿評：『可以啊，要跟爸爸媽媽說。』
大宇（拉阿評）：『大伯公，我可以跟你拍照嗎？』
阿評（蹲下）：『可以啊。』
（四個小朋友排隊跟阿評拍照，阿評一一配合）
（足浴店 — 阿喜 + 吳董 + 阿伸 + 阿茹 + 阿橋）
阿伸：『老闆，五位！』
阿茹（看菜單）：『399 一位，有點貴。』
阿喜（掏信用卡）：『我請！難得出來。』
吳董：『那我付按摩的錢！』
阿伸：『那我付小費。』
阿橋：『那我什麼都不用付了？爽！』
阿喜（鏡頭轉向窗外）：『我們五個這樣聚在一起，是公司成立以來第一次吧？』
吳董：『對啊！阿喜你們公司每年都虧，還能出國，我覺得很感人。』
阿喜：『吳董你閉嘴啦！』
（兩線合流 — 晚上在西塘西門口集合）
黃阿分：『你們洗了多久？兩個半小時！』
阿喜：『舒服嘛！』
黃倩（聞到）：『蛤，你們腳好臭！』
恩齊（捏鼻子）：『爸爸好臭！』
阿喜（作勢要抓恩齊）：『你這個小鬼！』
（恩齊跑開，阿喜追）
（19:00 — 烏鎮水宴餐廳）
阿美（夾魚）：『這個魚好嫩。』
吳董：『阿姨，這是烏鎮的魚。』
阿美：『我以前在新竹溪邊也有抓過魚。』
阿評：『媽，妳什麼都跟我們新竹比。』
阿美：『因為那是我年輕時候的事嘛！』
（22:00 — 烏鎮西柵外夏朵客棧）
阿評（拿枕頭）：『媽，妳要不要加枕頭？』
阿美：『不用，我睡得著。』
阿評：『媽，妳今天走太多了。』
阿美：『沒事。我高興。』`,
  shots: `00:00-00:10  05:00 西塘客棧窗邊 — 鏡頭從窗內往外拍，晨霧飄河面，柔光
00:10-00:25  阿喜推窗、阿分翻身睡眼惺忪的反應剪接，鏡頭從枕頭側拍
00:25-00:40  06:30 西塘小巷早茶客全景，鏡頭從石板路往前推
00:40-00:55  阿美咬豆漿「這個豆漿比台灣甜」的特寫，鏡頭慢動作
00:55-01:10  恩齊咬包子爆汁瞬間，特寫捕捉湯汁，慢動作
01:10-01:25  烏篷船碼頭 — 13 人擠 2 條船，鏡頭從船夫角度拍
01:25-01:40  船行河中航拍，鏡頭從船尾往後拍船行水面波紋
01:40-02:00  阿美伸手進水的特寫，鏡頭從水下往上拍
02:00-02:15  阿美回憶新竹溪水，鏡頭捕捉阿評聽到後沉默 3 秒
02:15-02:30  「已經被水泥化了」一句，鏡頭 zoom in 阿美遙遠表情
02:30-02:50  4 個小朋友擠糖葫蘆攤，鏡頭跟拍奔跑混亂
02:50-03:05  阿美慢慢走碎念，鏡頭從阿美視角仰拍阿評鼓勵
03:05-03:20  西塘小吃街粉蒸肉特寫，鏡頭從蒸籠往上拍
03:20-03:35  「比小時候吃的不一樣，但也好吃」一句，景深虛化背景
03:35-03:50  分線場景，鏡頭跟著阿喜 vs 阿評兩條路線剪接對比
03:50-04:10  阿美 + 阿評 + 4 個小朋友走慢路線長鏡頭，鏡頭從 3 米外
04:10-04:25  四個小朋友排隊跟阿評拍照，鏡頭從旁邊偷拍，自然光
04:25-04:45  足浴店內 5 個同事泡腳，鏡頭從腳盆往上拍到臉
04:45-05:00  阿喜一句「公司成立第一次吧」，吳董補刀剪接
05:00-05:15  西塘西門合流，鏡頭從遠景拉到恩齊捏鼻子搞笑
05:15-05:30  恩齊跑開、阿喜追的搞笑追逐，慢動作捕捉
05:30-05:50  烏鎮水宴餐廳吃魚，鏡頭從魚特寫往上拍到阿美
05:50-06:05  阿美懷念新竹抓魚，鏡頭從阿美側面拍，景深虛化
06:05-06:20  客棧房間阿評給阿美加枕頭，鏡頭從門外偷拍

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-01-xitang-dawn-mist.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic pre-dawn view of Xitang water canal with thick white morning mist hovering over still dark water, traditional Chinese white-walled black-tiled houses with red lanterns lining the banks barely visible through the fog, photorealistic atmospheric perspective with soft pink and blue gradient sky, cinematic wide shot with deep composition, ethereal and quiet mood"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-02-window-view-dawn.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, point-of-view shot from inside a Chinese wooden-framed guesthouse window looking out at misty water canal, chibi father's silhouette in foreground pushing open the lattice window frame, soft dawn light filtering through, photorealistic old wooden window frame details and misty view beyond, cinematic shallow depth of field, intimate quiet morning mood"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-03-morning-tea-buns.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, close-up of traditional Chinese breakfast scene with small bamboo steamers of xiaolongbao and small bowls of soy milk on a worn wooden table in Xitang stone-paved alley, chibi healthy 70-year-old Asian grandma with jet-black silky hair and 13 other chibi family members sitting around, photorealistic steam rising and golden morning sunlight cutting through, cinematic food documentary style, warm and cozy mood"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-04-gondola-scene.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic mid-shot of traditional Chinese black-canopied wooden gondola with chibi healthy 70-year-old Asian grandma with jet-black silky hair and chibi eldest son sitting inside gliding along narrow Xitang canal, photorealistic dark wooden boat texture and the boatman in traditional conical hat poling at the stern, water reflections and stone bridge overhead, cinematic horizontal composition with selective focus"
00:55-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-05-enqi-hand-in-water.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, cinematic above-water view looking down at chibi 5-year-old boy's small hand reaching down beside the clear canal water from the stone embankment, his curious big eyes peering from beside the canal, photorealistic soft surface ripples, photorealistic Chinese water town stone bridge and willow trees reflected in water surface, magical and dreamy mood"
01:15-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-06-grandma-foot-massage-group.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, fun group photo moment inside a Chinese foot-massage parlor, five chibi middle-aged colleagues (4 men 1 woman) sitting in adjacent massage chairs with feet in wooden buckets of herbal water, holding up peace signs with relaxed smiles, photorealistic Chinese massage parlor interior with warm yellow lighting and wooden decor, cinematic selfie angle taken from above"
01:35-01:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-07-xitang-west-gate-reunion.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic dusk shot of the group of 13 chibi Asian tourists meeting and hugging at the stone arch west gate of Xitang, two extended family groups and a colleague group reuniting, photorealistic ancient Chinese gate tower with red paint and traditional architecture against orange sunset sky, cinematic wide shot capturing joyful chaos and reunion hugs"
01:50-02:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-08-wuzhen-fish-dinner.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, intimate dinner scene at Wuzhen Shui Yan restaurant, large round table with traditional Chinese fresh-water fish dishes including steamed white fish and sweet-sour sauce, chibi healthy 70-year-old Asian grandma with jet-black silky hair trying to feed chibi 5-year-old grandson with chopsticks, photorealistic restaurant decor with wooden furniture and paper lanterns, cinematic overhead shot looking down at the family, warm golden interior lighting, tender family moment"`,
};
// Day 4 — 烏鎮西柵 (7/20 一)
const D4: DayBlock = {
  date: "2026-07-20",
  label: "Day 4 · 7/20 (一)",
  theme: "烏鎮西柵 · 水鄉精髓",
  scenes: "09:00 check in 烏鎮西柵 → 09:30～18:00 西柵內慢悠悠（染坊 / 水閣 / 老街）→ 18:00 後景區外大街或足浴",
  mainCharacters: "全 13 人 / 阿美奶奶從容逛景，大伯阿評扛相機拍全家",
  dialogue: `（09:00 — 烏鎮西柵大門口，13 人合照）
阿喜（舉手）：『來！13 個人！看鏡頭！』
吳董：『你拍得到嗎？自拍棒帶了嗎？』
阿喜：『帶了！賽門幫我拍！』
賽門（拿手機）：『3、2、1！』
（拍完看照片）
阿伸：『吳董眼睛閉了。』
吳董：『哪有！』
阿喜：『吳董你剛剛眨眼啦！』
吳董：『沒有！是你按太慢！』
（再拍一次）
賽門：『這次完美！』
（10:30 — 烏鎮染坊，藍布飄）
阿評（拿相機拍）：『媽，妳站在藍布下面。』
阿美：『這個布好漂亮。』
阿評（蹲下找角度）：『媽，妳不要動。』
阿美（站著不動）：『好。』
阿美（站了 3 分鐘）：『阿評，好了沒？』
阿評：『再 30 秒。』
阿美：『我腳痠。』
阿評（趕緊拍 3 張）：『好了好了！』
（阿美站在河邊看風景，阿評遞水）
阿美（微笑）：『這個地方，跟我小時候看到的江南一樣。』
（11:30 — 烏鎮水閣，老街吃午餐）
阿喜：『吳董你看，這個船跟我們西塘的不同。』
吳董：『對！這個比較大！』
大宇：『我們可以坐嗎？』
阿喜：『要排隊。排到我們就坐。』
恩齊：『我也要坐！』
宸瑋（拉阿喜）：『爸爸我要那個紅色衣服的船夫！』
阿喜（蹲下）：『好，紅色衣服的船夫，記住了。』
（中午 12:30 — 老街小吃）
阿喜（拿一根糖葫蘆）：『這個 10 塊錢。』
恩齊：『比西塘便宜！』
阿美（從後面追上來）：『你們走太快了！我要拍那個。』
阿評（牽阿美）：『媽，我們在這看風景。』
阿美：『不用，我走得動。』
（阿美停下腳步看水）
阿評（拿一瓶水遞給阿美）：『媽，水。』
（15:00 — 西柵水上集市）
吳董（指船）：『看！那個船上有賣東西！』
黃倩：『這叫水上集市嗎？』
阿喜：『對！以前水鄉的市場就是這樣！』
阿美（看著船經過）：『這個跟電視上一樣。』
（17:00 — 烏鎮夜景，燈籠亮起）
阿喜：『吳董你看，燈籠亮起來了！』
吳董：『我去拿相機！』
（全 13 人擠在橋上看夜景）
阿美（站著不動）：『好漂亮。』
阿喜：『媽，妳以前看過這種夜景嗎？』
阿美：『年輕的時候看過。那時候你爸帶我來。』
（鏡頭停在阿美側臉）
（19:00 — 景區外大街，選餐廳）
吳董：『去吃足浴啦！我昨天按得很爽！』
阿喜：『不要啦！今天吃晚餐就好，明天還要趕路。』
吳董：『可是我昨天沒按夠！』
阿美（突然插話）：『你們兩個去按！我跟阿評回飯店泡茶。』
阿喜：『媽妳今晚想吃什麼？』
阿美（碎念）：『你們年輕人腳太快了！』
吳董（馬上）：『阿姨想喝茶？那我們都回飯店！不要去足浴了！』
阿喜（看著吳董）：『你剛剛不是說要去？』
吳董（抓頭）：『啊就……阿姨想喝茶嘛。』
（全場笑場）
（22:00 — 客棧房間）
阿美（洗完澡）：『阿評，妳今天帶我看的東西，比電視上好看。』
阿評：『媽，妳喜歡嗎？』
阿美：『喜歡。我這輩子能再來一次就好了。』
阿評：『媽，妳還能再來。我陪妳。』
（客棧窗外烏鎮夜景，鏡頭定格 5 秒）`,
  shots: `00:00-00:10  09:00 烏鎮西柵大門口 13 人合照，鏡頭從賽門手機角度
00:10-00:25  拍完看照片，吳董眨眼爭議的搞笑剪接，鏡頭特寫臉部
00:25-00:40  10:30 烏鎮染坊藍布飄的全景，鏡頭從下往上仰拍藍布飄動
00:40-00:55  阿美站在藍布下，鏡頭從阿評取景角度偷拍（構圖示範）
00:55-01:10  阿美站 3 分鐘碎念腳痠，鏡頭捕捉阿評暴走拍攝節奏
01:10-01:25  阿美站在河邊看水，鏡頭從側面拍，背景河水模糊
01:25-01:40  「跟小時候看到的江南一樣」一句，鏡頭 zoom in 阿美微笑
01:40-02:00  西柵水閣全景，鏡頭從拱橋拍船行水面，景深虛化後景遊客
02:00-02:15  宸瑋搶紅色衣服船夫，鏡頭從阿喜蹲下特寫兒子眼神
02:15-02:30  12:30 老街小吃糖葫蘆特寫，鏡頭從糖葫蘆往上拍
02:30-02:45  阿美追上隊伍，鏡頭從阿美視角拍她看到隊伍
02:45-03:00  阿美站在石凳旁看風景 + 阿評遞水，鏡頭特寫阿評遞水動作
03:00-03:20  15:00 西柵水上集市，鏡頭從對岸拍船駛過，倒影
03:20-03:35  阿美看著船「跟電視上一樣」一句，鏡頭捕捉側臉
03:35-03:55  17:00 烏鎮夜景全景，鏡頭從橋上拍河面燈籠倒影
03:55-04:10  阿美站著不動看夜景，鏡頭從她背後拍攝景
04:10-04:25  「年輕時候你爸帶我來」一句，鏡頭 zoom in 阿美側臉淺景深
04:25-04:40  19:00 景區外選餐廳，吳董 vs 阿喜意見分歧剪接
04:40-04:55  阿美突然插話「你們去按我回飯店」，鏡頭捕捉全員愣住
04:55-05:10  吳董馬上改口「阿姨想喝茶嘛」，鏡頭捕抓頭笑場
05:10-05:25  阿喜看吳董吐槽的搞笑對視，鏡頭兩人剪影
05:25-05:45  22:00 客棧房間 — 阿評跟阿美對話，鏡頭從窗外偷拍
05:45-06:05  「我這輩子能再多來幾次就更好了」一句，鏡頭定格阿美側臉
06:05-06:15  客棧窗外烏鎮夜景，鏡頭定格 5 秒，背景音淡入古箏

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-01-wuzhen-main-gate.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic wide shot of traditional Chinese water-town stone gate tower of Wuzhen Xizha with horizontal wooden plaque, 13 chibi Asian tourists gathered below for a group photo with selfie sticks and cameras, photorealistic ancient weathered white walls and red wooden beams, bright morning sun, cinematic symmetrical composition"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-02-indigo-dye-house.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic vertical composition of long strips of natural indigo-dyed blue cloth hanging from wooden poles in traditional Chinese dye workshop, photorealistic deep cobalt blue fabric texture catching golden sunlight filtering through roof, soft shadows on stone floor, chibi healthy 70-year-old Asian grandma with jet-black silky hair in floral blouse looking up in wonder, cinematic low-angle shot emphasizing the height and dreamlike quality"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-03-grandma-rests-step.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, candid intimate close-up of chibi healthy 70-year-old Asian grandma with jet-black silky hair standing in traditional water town alley admiring the drifting indigo-dyed blue fabric, deep cobalt blue cloth billowing around her, soft diffused afternoon light filtering through, photorealistic ancient stone texture and faded indigo cloth hanging in background, cinematic shallow depth of field focusing on her curious and joyful expression, magical moment of discovery"
00:40-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-04-water-market-boat.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dynamic action shot of traditional Chinese wooden vendor boat moving through narrow Wuzhen canal with chibi customers on both stone banks reaching out to buy fresh produce, photorealistic wooden boat loaded with watermelons and vegetables, splashing water, cinematic horizontal composition with motion blur, vibrant sunny day atmosphere"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-05-lantern-night-canal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, breathtaking twilight view of Wuzhen canal with hundreds of glowing red Chinese lanterns hung along both banks reflected perfectly in dark still water, traditional Chinese architecture silhouettes against deep blue and orange dusk sky, chibi tiny figures on stone bridge as silhouettes, photorealistic mirror-like water reflections, cinematic symmetrical composition, magical atmospheric mood"
01:15-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-06-wu-dong-back-down.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, candid comedic moment outside Wuzhen restaurant, chibi businessman friend scratching his head with embarrassed smile after his groupmate chibi father called him out for contradicting himself about going for foot massage, chibi healthy 70-year-old Asian grandma with jet-black silky hair chibi standing firm in background, photorealistic nighttime street scene with neon signs and street food stalls, cinematic two-shot framing emphasizing the awkward friendship moment"
01:35-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-07-grandma-windowsill-talk.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, intimate warm close-up of chibi healthy 70-year-old Asian grandma with jet-black silky hair and chibi middle-aged son (her eldest) having a quiet heartfelt conversation in a Wuzhen wooden guesthouse room, soft yellow bedside lamp light illuminating both faces, photorealistic simple room with window showing distant lantern lights, cinematic shallow focus on grandma's satisfied and peaceful face, tender late-night family moment"
01:55-02:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-08-wuzhen-night-final.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, cinematic wide shot of the group of 13 chibi Asian tourists silhouetted against the magnificent Wuzhen night canal scene, hundreds of glowing red lanterns creating a kaleidoscope of light reflected in dark water, traditional Chinese stone bridges and architecture, photorealistic night photography with long exposure water reflections, deep purple-blue sky and warm lantern glow, magical farewell-to-the-day mood"`,
};
// Day 5 — 杭州西湖 (7/21 二)
const D5: DayBlock = {
  date: "2026-07-21",
  label: "Day 5 · 7/21 (二)",
  theme: "杭州西湖 · 從烏鎮到杭州特種兵",
  scenes: "07:00 烏鎮早茶客 → 10:00 包車出發杭州（2 小時）→ 杭州大酒店 check in → 蘇堤春曉 / 曲院風荷 → 武林夜市 / 銀泰 in 77",
  mainCharacters: "全 13 人 / 奶奶阿美跟黃阿分慢慢逛蘇堤，大伯阿評拍照，兩家人首次分頭行動",
  dialogue: `（07:00 — 烏鎮夏朵客棧餐廳，最後一頓早餐）
阿美（看著恩齊）：『恩齊，要好好吃飯才長得高。』
恩齊：『奶奶，妳為什麼講這個？』
阿美：『沒事。奶奶只是想到一些事。』
黃阿分（在旁邊聽到，看著阿喜）
阿喜（鏡頭轉過來）：『媽，妳想逛哪裡跟我們說。』
阿美：『我沒事。我走得動，慢慢看。』
（阿美夾了一塊紅燒肉，慢慢嚼）
阿評（拿相機過來）：『媽，最後一張烏鎮合照。』
阿美（配合）：『好。』
（08:30 — 客棧大廳 check out，13 人擠在大廳）
吳董（拖行李）：『阿喜，你家幾個皮箱？』
阿喜：『4 個！』
吳董：『我家 3 個。我比你們少。』
阿喜：『那是因為你沒帶媽！』
（全場又笑場）
（10:00 — 包車出發杭州，車程 2 小時）
阿喜（前座）：『師傅，走高速！』
吳董（旁邊）：『我要暈車，不要講太多話。』
黃倩：『吳董你每次坐車都暈。』
吳董：『人生嘛。』
（中排 — 阿美靠窗睡著）
阿評（陪在旁邊）：『媽，妳睡著了。』
阿美（眼睛半開）：『嗯。』
（12:00 — 抵達杭州，杭州大酒店 check in）
吳董（拿房卡）：『終於到了！』
阿喜：『杭州！我以前來過！』
黃倩：『阿喜你來過喔？』
阿喜：『20 年前出差來過。那時候西湖邊還沒有這麼多遊客。』
（14:00 — 西湖蘇堤春曉）
阿美（坐在石椅上慢慢看湖）：『你們先去，我慢慢看這湖。』
阿喜（蹲下）：『媽，妳要不要再拍幾張？』
阿美（推阿喜）：『去啦！我想在這多看一會兒。』
黃阿分（走過來）：『媽，我陪妳。』
阿美：『不用。我要在這多坐一會兒。』
（阿喜跟黃阿分對視，鏡頭捕捉）
阿喜（對鏡頭小聲）：『我們快去快回。不要讓她等太久。』
（蘇堤春曉 — 兩家人快速逛完）
吳董：『快點快點！阿姨還在等！』
阿喜（跑）：『攝影機都沒拿穩！』
吳董（邊跑邊拍）：『拍什麼拍！走啦！』
（回程 — 阿美一個人坐著看湖）
黃阿分（拿一杯水）：『媽，水。』
阿美（接過）：『謝謝。』
阿美（看著黃阿分）：『阿分，我跟你們的腳程差好多吧？』
黃阿分（蹲下）：『媽妳講什麼話！能跟妳一起逛我們很高興！』
阿美（微笑）：『我跟你們的腳程差好多。』
黃阿分（握住阿美的手）：『媽，下次我們再去別的地方。』
（17:00 — 曲院風荷拍荷花）
阿喜（蹲下拿相機）：『吳董你看！荷花！』
吳董：『這個季節剛好！』
（鏡頭拍荷花，背景虛化）
（19:00 — 武林夜市，吃吃喝喝）
吳董：『來！喝一杯！』
阿喜：『你喝！我顧小孩。』
恩齊：『我要吃糖葫蘆！』
大宇：『我也要！』
吳董：『一人一支！老闆！』
（22:00 — 杭州大酒店房間）
阿美（洗完澡）：『阿分，謝謝妳今天。』
黃阿分（握阿美的手）：『媽，妳客氣什麼。』
阿美：『我跟你們的腳程差好多。』
黃阿分：『媽，妳能來我們已經很開心了。』`,
  shots: `00:00-00:10  07:00 烏鎮夏朵餐廳全景，鏡頭拍桌上的小籠包 + 阿美
00:10-00:20  阿美看恩齊說「你要好好吃飯」，鏡頭 zoom in 表情
00:20-00:30  黃阿分旁聽，跟阿喜交換眼神的剪接
00:30-00:40  阿美夾紅燒肉慢慢嚼，鏡頭從筷子特寫往臉部
00:40-00:55  阿評說「最後一張烏鎮合照」，鏡頭從遠景拉到阿美配合
00:55-01:10  08:30 大廳 13 人 check out，行李箱堆積的混亂全景
01:10-01:25  吳董 vs 阿喜皮箱數量對比剪接，鏡頭滑到皮箱堆
01:25-01:40  10:00 包車出發 — 鏡頭從前座拍吳董跟師傅對話
01:40-02:00  車程中阿美靠窗睡著，鏡頭從中排側面拍，景深虛化
02:00-02:15  抵達杭州酒店，鏡頭從遠景拍杭州大廈全景
02:15-02:30  「20 年前出差來過」一句，鏡頭從阿喜側面拍
02:30-02:45  14:00 西湖蘇堤春曉長鏡頭，鏡頭跟阿美走在後面
02:45-03:00  阿美坐石椅，鏡頭從阿喜視角拍（手持微抖）
03:00-03:15  「我只想一個人坐一下」一句，鏡頭捕捉阿喜和黃阿分對視
03:15-03:30  蘇堤快逛，鏡頭晃動營造緊張感，阿喜 + 吳董跑
03:30-03:45  回程阿美一個人坐看湖，長鏡頭 5 秒靜默
03:45-04:00  黃阿分拿水回來，鏡頭從側面拍蹲下握手
04:00-04:15  「下次我們再帶妳來」一句，景深模糊背景湖水
04:15-04:30  17:00 曲院風荷拍荷花，鏡頭從荷花往上拍西湖全景
04:30-04:45  武林夜市招牌霓虹閃爍，鏡頭從遠景拉到近景
04:45-05:00  4 個小朋友擠糖葫蘆攤，鏡頭混亂中 capture 興奮表情
05:00-05:20  杭州大酒店房間，黃阿分和阿美手握手特寫，景深
05:20-05:35  「妳能來我們已經很開心」一句，鏡頭定格阿美臉

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-01-wuzhen-final-breakfast.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, intimate breakfast scene at Wuzhen guesthouse restaurant, chibi healthy 70-year-old Asian grandma with jet-black silky hair in floral blouse sitting at wooden table smiling warmly at chibi 5-year-old grandson eating steamed bun, soft morning window light illuminating the table, photorealistic simple white steam rising from bamboo steamer, cinematic shallow depth of field, joyful family moment"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-02-hangzhou-traffic-bus.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dynamic shot from inside a tour van looking out the windshield at a multi-lane Chinese expressway in summer with massive morning traffic, chibi dad driving with chibi colleague friend beside him chatting, photorealistic Chinese expressway with Chinese-character road signs and modern infrastructure, cinematic wide-angle through windshield, morning light"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-03-hangzhou-grand-hotel.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic wide shot of an imposing 1970s Chinese state-run style Hangzhou hotel tower with white facade and red characters, 13 chibi Asian tourists arriving with luggage outside the front entrance, photorealistic mid-century East Asian hotel architecture, bright afternoon sun casting long shadows, cinematic grand establishing shot, nostalgic mood"
00:40-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-04-west-lake-empty-bench.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, beautiful wide shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair walking arm-in-arm with chibi daughter-in-law along West Lake Su Causeway in Hangzhou, painted pavilions and willow trees framing the calm water behind them, photorealistic Su-style classical Chinese landscape with soft pastel afternoon light, cinematic composition showing both figures walking together, warm and joyful mood, willows swaying in gentle breeze"
01:00-01:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-05-daughter-in-law-water-return.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, intimate close-up of young chibi Asian daughter-in-law bending down to hand a small cup of jasmine tea to chibi healthy 70-year-old Asian grandma with jet-black silky hair strolling together beside West Lake, photorealistic Chinese garden landscape with willows in soft background, golden late-afternoon light catching the water surface, cinematic shallow focus on the warm mother-daughter smile between them, joyful family moment"
01:20-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-06-quyuan-fenghe-lotus.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, vivid close-up of pink lotus flowers in full bloom floating on West Lake surface, chibi two businessmen friends crouching with cameras in background completely out of focus, photorealistic lotus petals texture and water droplets and bright green leaves, cinematic shallow depth of field emphasizing the flowers, beautiful summer Hangzhou atmosphere"
01:35-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-07-wulin-night-market-candied.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, vibrant night market scene at Wulin Street food market in Hangzhou, chibi four small children all reaching excitedly at a candied hawthorn stick vendor, neon signs and string lights overhead, photorealistic Chinese street food stall with red lanterns and steam rising, cinematic wide angle with motion blur to capture chaos, joyful evening atmosphere"
01:55-02:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-08-hotel-room-handshake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply intimate scene of older chibi mother and chibi daughter-in-law sitting close together on hotel bed watching TV in the evening, soft warm yellow lamp light illuminating both their faces, photo of late husband visible on nightstand in background, photorealistic simple Chinese hotel room with cream curtains, cinematic shallow focus on the tender family bond moment, emotionally moving and serene"`,
};
// Day 6 — 宋城千古情 (7/22 三)
const D6: DayBlock = {
  date: "2026-07-22",
  label: "Day 6 · 7/22 (三)",
  theme: "宋城千古情 · 大型舞台秀",
  scenes: "07:00 飯店早餐 → 09:00 武林廣場東 1 搭 318 公車 → 宋城千古情（大型舞台秀）→ 17:00 318 公車回 → 馬鴻興川小館 → 閒晃西湖 / 銀泰 in 77",
  mainCharacters: "全 13 人 / 兩位太太（黃阿分 / 黃倩）聊天時間 / 小朋友看秀尖叫 vs 大人沉默",
  dialogue: `（07:00 — 杭州大酒店餐廳早餐）
阿美（拿饅頭）：『這個是雜糧饅頭？』
阿評：『對，加紅棗的。』
阿美：『好吃。比白饅頭有味道。』
（08:30 — 大廳集合，13 人準備出發）
吳董（拿一疊票）：『票在我這！大家跟著我！』
阿喜：『車在哪？』
吳董：『318 公車！武林廣場東 1！』
黃倩：『你查清楚了？』
吳董：『昨晚查了！』
（09:00 — 武林廣場公車站，13 人擠 3 台公車）
吳董：『我們五個一台！阿喜你們八個兩台！』
阿喜：『為什麼你們五個一台？』
吳董：『我們體重比較輕！』
阿評（從後面）：『吳董你這是在嘲笑我們嗎？』
吳董（趕緊）：『不是啦！我是說我們腳比較小！』
黃阿分：『不要吵了啦！隨便分！』
（最後 13 人分 3 台公車上路）
黃倩（公車上問黃阿分）：『宋城你有去過嗎？』
黃阿分：『沒有，第一次。』
黃倩：『我也是。聽說很壯觀。』
黃阿分：『阿美媽也沒去過。』
黃倩：『那老人家會不會覺得吵？』
黃阿分：『不知道。她可能會睡著。』
（10:30 — 宋城千古情開演前，觀眾席入座）
大宇（張大嘴）：『哇！好大的舞台！』
小宇（拉大宇）：『哥哥不要叫！』
恩齊：『那個是誰？為什麼穿那個？』
宸瑋：『那是皇帝吧？』
阿美（對黃倩）：『這種秀我在台灣沒看過。』
黃倩（對阿美）：『阿姨妳喜歡的話，下次我們再帶妳來。』
阿美（搖頭）：『不用啦！來一次就夠了！花這個錢！』
（演出中 — 大人沈默看，小朋友驚呼）
（幕間休息 5 分鐘）
阿美（揉眼睛）：『好多東西看。』
恩齊：『奶奶，剛剛那個會飛！』
阿美：『會飛？人怎麼會飛？』
恩齊：『他用繩子！』
（全場笑）
（12:30 — 宋城園區午餐）
阿喜（指一個攤）：『這家烤香腸！』
恩齊（湊過去）：『我要！』
吳董：『我也要！』
（15:00 — 劇終，公車站擠 3 台回去）
吳董：『回去的公車擠不擠？』
阿喜：『應該一樣擠！』
（17:00 — 馬鴻興川小館）
阿喜（拿菜單）：『這個毛血旺要！』
吳董：『太辣了吧？有小朋友！』
黃阿分（對吳董）：『我們家宸瑋可以吃辣。』
吳董（對黃倩）：『我們家大宇不行。』
阿評（打圓場）：『一份微辣一份不辣啦！』
阿美（突然）：『我想吃那個回鍋肉。』
阿喜（驚）：『媽妳也吃辣喔？』
阿美：『年輕的時候在四川吃過，忘不了。』
（全桌笑）
（19:30 — 西湖邊散步）
阿喜（指湖）：『傍晚的西湖不一樣。』
黃阿分：『對，日出跟日落不同。』
（20:30 — 銀泰 in 77 shopping）
黃倩（指櫥窗）：『阿分妳看這個！』
黃阿分（湊過去）：『好看！但太貴。』
（22:00 — 酒店房間）
阿評（陪阿美看電視）：『媽，今天的秀喜歡嗎？』
阿美：『喜歡。但是東西太多，看不完。』
阿評：『下次有更好的我們再看。』
阿美：『阿評，你有沒有想過帶你老婆來？』
阿評：『老婆在台灣帶小孩。』
阿美：『辛苦了。』
（阿美轉身看窗外西湖夜景）`,
  shots: `00:00-00:08  07:00 杭州大酒店早餐全景，鏡頭從遠景拉到阿美咬饅頭
00:08-00:20  阿美咬雜糧饅頭特寫，鏡頭從饅頭往上拍
00:20-00:35  08:30 大廳集合，吳董舉票大叫的全景
00:35-00:50  09:00 武林廣場公車站 13 人擠 3 台公車的混亂全景
00:50-01:05  吳董 vs 阿喜「我們體重比較輕」搞笑剪接
01:05-01:20  公車內擠沙丁魚的鏡頭，從車窗往內拍
01:20-01:35  兩位太太聊天剪接，鏡頭在兩人之間切
01:35-01:50  宋城舞台開演前觀眾席全景，13 人散落不同位置
01:50-02:05  大宇張大嘴 vs 小宇拉哥哥的對比剪接
02:05-02:20  恩齊 vs 宸瑋問「那是誰」童言對話
02:20-02:35  阿美 vs 黃倩對話特寫，背景舞台紅光
02:35-02:50  演出中，大人沈默 vs 小朋友驚呼剪接
02:50-03:05  幕間休息恩齊解釋「用繩子」特寫，全場笑場
03:05-03:20  12:30 宋城園區烤香腸，鏡頭從遠景拉到近景
03:20-03:35  17:00 馬鴻興菜單特寫，鏡頭從菜單拉遠到 13 人
03:35-03:50  吳董 vs 黃阿分爭論辣度，阿評打圓場剪接
03:50-04:05  阿美奶奶突然點回鍋肉，全場驚訝剪接
04:05-04:20  「年輕的時候在四川吃過」一句，zoom in 阿美回憶表情
04:20-04:35  19:30 西湖邊散步，鏡頭從長椅側拍
04:35-04:50  20:30 銀泰櫥窗兩位太太看，鏡頭從背後拍
04:50-05:05  22:00 酒店房間阿評陪阿美看電視，鏡頭從窗外偷拍
05:05-05:20  「你有沒有想過帶老婆來」一句，鏡頭 zoom in 阿美臉
05:20-05:35  阿美轉身看窗外西湖夜景，鏡頭拍她背影

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-01-hangzhou-318-bus-crowded.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dynamic documentary-style shot of chibi tourists crammed into a packed Chinese public bus (Route 318) with chibi businessman friend laughing with two friends while others squeeze in, photorealistic city bus interior with handrails and Chinese characters route sign, realistic Chinese commuter atmosphere, cinematic wide-angle lens distortion emphasizing the cramped space, comedic moment"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-02-songcheng-grand-stage.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, breathtaking dramatic wide shot of the massive Songcheng Grand Theatre auditorium with a high-tech spectacular stage show about ancient China happening, with costumed performers flying on wires, colorful projections and laser effects on giant LED screens, the chibi family of 13 visible as tiny silhouettes in the audience, photorealistic Chinese themed park performance venue with red and gold decor, cinematic scope and grandeur"
00:25-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-03-kids-amazed-vs-adults.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, fascinating close-up split composition of chibi four young children with wide amazed eyes and open mouths on left side vs chibi five adults staring in respectful silence on right side, all looking up at the magnificent stage show, photorealistic theatre seat backs in foreground, dramatic stage lighting in background, cinematic shallow depth of field on facial expressions, joyful vs contemplative mood contrast"
00:45-01:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-04-sichuan-restaurant-spicy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, mouth-watering extreme close-up of bubbling red Sichuan hotpot dish (maoxuewang) with floating chili peppers and duck blood curd, steam rising dramatically against dark restaurant background, chibi healthy 70-year-old Asian grandma's jet-black silky hair and her chopsticks reaching in carefully, photorealistic Chinese Sichuan restaurant table with red wooden decor and traditional oil-red lanterns, cinematic food photography with shallow focus, vibrant and exciting mood"
01:05-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-05-west-lake-blue-hour.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, serene atmospheric dusk shot of West Lake with traditional Chinese painting bridge (Su Causeway) silhouette against purple-blue twilight sky, a few chibi tiny figures strolling by the lake shore, photorealistic calm water reflecting deep blue colors, classical Chinese pavilions and willows visible, cinematic symmetrical composition with deep perspective, peaceful contemplative mood"
01:25-01:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-06-two-sisters-browse-shop.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, playful candid shot of two chibi Asian women (one mother of two chibi kids, one wife of businessman friend) standing close together looking into an expensive boutique storefront window in Yintai Mall, both pointing at the same item with excited chibi expressions, photorealistic modern Chinese shopping mall interior with warm yellow lighting and luxury brand shopfront, cinematic two-shot from behind emphasizing their bond"
01:45-02:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-07-son-grandma-bedroom-talk.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, heartwarming intimate scene of chibi middle-aged son sitting on hotel bed beside chibi healthy 70-year-old Asian mother with jet-black silky hair watching TV together and laughing, soft warm yellow bedside lamp light illuminating both faces, photo of late husband visible on nightstand, photorealistic Chinese hotel room with white quilt and cream curtains, cinematic shallow focus on the joyful mother-son bonding moment, emotionally tender"
02:05-02:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-08-grandma-window-west-lake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, beautiful final shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair standing gracefully at hotel window looking out at West Lake night view with a smile, distant lights and classical Chinese pagoda visible through the glass, photorealistic hotel room curtain framing the view, cinematic silhouette composition with warm interior light contrasting the cool night outside, contemplative and serene farewell mood"`,
};
// Day 7 — 杭州宮宴 (7/23 四) — 換裝高潮
const D7: DayBlock = {
  date: "2026-07-23",
  label: "Day 7 · 7/23 (四)",
  theme: "杭州宮宴 · 全員換裝高潮",
  scenes: "07:00 早餐 → 09:20 武林廣場地鐵 3 號線黃龍洞 → 10:00 杭州宮宴換裝 → 12:10 入座用餐看秀 → 14:30 結束 → 黃龍洞回武林廣場 → 15:30 續遊西湖 / 南宋御街 / 大運河 / 飯店休息",
  mainCharacters: "全 13 人全員換古裝 / 奶奶阿美穿唐裝驚豔 / 兩位太太比美 / 恩齊宸瑋萌扮相",
  dialogue: `（07:00 — 杭州大酒店餐廳早餐）
阿美（拿豆漿）：『今天要穿古裝喔。』
阿評：『對，宮宴換裝。』
阿美（看著自己）：『我這個身材穿古裝好看嗎？』
阿評（抬頭看）：『媽，妳穿什麼都好看。』
阿美（碎念）：『你亂講。』
（09:00 — 武林廣場地鐵站 13 人擠地鐵）
吳董（拿車票）：『3 號線！黃龍洞 D 出口！』
阿喜（後面）：『不要擠！不要擠！』
恩齊（被擠）：『爸爸！我被擠到了！』
黃阿分（拉恩齊上車）：『過來！』
（全 13 人擠進一節車廂）
（10:00 — 杭州宮宴換裝間）
黃阿分（拿一件紅色）：『這件好看。』
黃倩（拿一件藍色）：『這件也好看。』
黃阿分：『妳紅色我藍色？』
黃倩：『換過來？』
黃阿分（看著黃倩）：『妳身材比較好，紅色妳穿。』
黃倩：『哪有！妳氣質比較好，紅色妳穿！』
（最後兩人換回來：阿分紅、倩藍）
（恩齊 vs 宸瑋不肯穿古裝）
恩齊（坐在地上）：『我不要！好癢！』
宸瑋：『我也不穿！』
阿喜（蹲下）：『你們穿一下，拍完照就脫。』
恩齊：『我不喜歡拍照！』
阿美（已經換好走出來）：『你們看！』
（全場轉頭看）
（阿美換上唐代大紅宮裝，鳳冠，雍容華貴）
吳董（看呆了 3 秒）：『哇……阿姨妳好像武則天。』
阿美（笑出來）：『你這孩子亂講！』
阿評（拿手機狂拍）：『媽，妳也太美了吧！』
黃倩（也湊過來）：『阿姨，妳真的是太后。』
（4 個小朋友換裝完成 — 兩個皇帝、兩個小將軍）
阿喜（抱起恩齊）：『欸！你這小將軍好帥！』
恩齊：『我才不要當將軍！』
宸瑋（指恩齊）：『哈哈哈！你的衣服太大！』
（恩齊生氣打宸瑋）
（兩個太太也換好 — 阿分紅、倩藍）
吳董（看黃倩）：『老婆妳好漂亮。』
黃倩：『你第一次講。』
吳董：『我心裡都想。』
（全場又笑）
（12:10 — 宮宴入座，13 人一桌）
阿喜（舉杯）：『敬我們的家人！』
阿美（舉杯）：『敬我孫子！』
吳董：『敬杭州！』
黃阿分：『敬這 8 天！』
（背景古箏演奏）
（13:00 — 秀場開演）
阿美（輕聲對阿評）：『這個秀很有氣氛。』
阿評：『媽妳喜歡嗎？』
阿美：『比昨天的宋城更精緻。』
（14:30 — 結束，黃龍洞站上地鐵）
阿喜：『吳董，剛剛你說阿姨像武則天，我覺得不像。』
吳董：『那像什麼？』
阿喜：『像慈禧太后！』
吳董（趕緊）：『不要亂講！』
阿美（轉頭）：『你們兩個說什麼？』
吳董：『沒有！我們在稱讚妳！』
（15:30 — 西湖邊散步，穿古裝拍觀光客照）
大宇（指湖）：『你看！外國人！』
黃倩（拉大宇）：『大宇不要指！』
阿美（穿古裝走西湖邊）：『這個樣子走在外面，別人都在看。』
阿評：『媽，妳習慣嗎？』
阿美：『我年輕的時候穿過旗袍走過台北街頭，比這個還風光。』
（17:00 — 南宋御街）
阿喜（指一個牌坊）：『吳董你看，這是仿南宋的。』
吳董：『漂亮！』
（鏡頭從遠景拉到阿美 + 黃倩 + 黃阿分 3 人在御街合照）
（19:00 — 飯店休息）
阿美（脫下古裝）：『啊！好熱。』
阿評（幫阿美收古裝）：『媽，妳今天很漂亮。』
阿美：『都是你們兩個出的主意。』
（22:00 — 房間電視前）
阿美（看電視）：『今天這個秀很特別。』
阿評：『媽妳喜歡嗎？』
阿美：『喜歡。這輩子能穿這個衣服一次，值了。』
（鏡頭拍兩人看電視的背影）`,
  shots: `00:00-00:08  07:00 早餐全景，阿美看著自己的身材碎念
00:08-00:20  阿評說「妳穿什麼都好看」一句，鏡頭從阿美側面拍
00:20-00:35  09:00 武林廣場地鐵站 13 人擠地鐵的全景，手持晃動
00:35-00:50  恩齊被擠喊叫，鏡頭特寫阿分拉兒子上車
00:50-01:05  10:00 換裝間全景，13 人分散不同角落，鏡頭從遠景拉到近景
01:05-01:20  兩位太太挑衣服對話剪接，鏡頭在兩人之間切
01:20-01:35  阿美換好唐代宮裝 360 度展示，鏡頭環繞拍攝
01:35-01:50  「妳好像武則天」一句，鏡頭從吳董臉部表情 zoom in 阿美笑場
01:50-02:05  兩位太太最終換好的對比剪接，阿分紅倩藍
02:05-02:20  恩齊 vs 宸瑋地上打滾不肯穿的搞笑鏡頭
02:20-02:35  4 個小朋友換裝完成，鏡頭從遠景拉到近景
02:35-02:50  恩齊打宸瑋的搞笑慢動作
02:50-03:05  12:10 宮宴入座乾杯全景，鏡頭從遠景繞桌 360 度
03:05-03:20  13 人一桌的古裝大合照，鏡頭從阿喜自拍棒角度
03:20-03:35  「比昨天的宋城更精緻」一句，鏡頭從阿美側面
03:35-03:50  14:30 結束黃龍洞地鐵站，阿喜吐槽吳董剪接
03:50-04:05  「像慈禧太后」一句，鏡頭拍吳董慌張擋住
04:05-04:25  15:30 西湖邊古裝散步，鏡頭從遠景拍 13 人剪影
04:25-04:40  阿美說「比這個還風光」一句，鏡頭從阿美側面拍
04:40-05:00  17:00 南宋御街牌坊全景，鏡頭從遠景拉到 3 太太合照
05:00-05:15  19:00 飯店休息，阿美脫下古裝的特寫，鏡頭從遠景
05:15-05:30  「穿這個衣服一次，值了」一句，鏡頭定格阿美表情
05:30-05:45  22:00 房間電視前，鏡頭拍阿美 + 阿評看電視背影
05:45-06:00  背影定格 5 秒，背景音樂漸弱淡出

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-01-grandma-tang-costume-reveal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, breathtaking dramatic reveal shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair wearing magnificent bright red Tang Dynasty empress costume with elaborate phoenix coronet and golden embroidered silk robes, standing at the doorway of changing room with arms slightly spread, all 13 chibi family members' mouths visibly open in awe in foreground, photorealistic traditional Chinese royal costume details with shimmering gold thread, dramatic backlight from corridor lighting creating god rays, cinematic moment of awe"
00:10-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-02-emperor-grandma-with-kids.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, joyful family photo composition of chibi healthy 70-year-old Asian grandma with jet-black silky hair in red empress costume seated on decorated chair, with two chibi small boys dressed as Tang Dynasty little princes in yellow silk standing beside her, and chibi eldest son kneeling for a photo, photorealistic Chinese palace-themed banquet hall setting with red pillars and golden dragons, cinematic warm rim light, regal yet heartwarming moment"
00:30-00:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-03-two-daughters-in-law-comparison.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, beautiful split-composition fashion moment of chibi daughter-in-law in vibrant red silk Tang Dynasty gown on the left and chibi Wu-dong's wife in elegant blue silk gown on the right, both in different poses adjusting their ornate sleeves, photorealistic traditional Chinese banquet hall interior with red lanterns and golden lattice screens, cinematic warm symmetrical lighting from above, color-contrasting composition"
00:50-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-04-son-grandma-palace-reunion.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply emotional moment of chibi middle-aged son (eldest brother) bowing gently before chibi mother in red empress costume before their grand portrait, both with soft golden palace window light streaming from the side, photorealistic traditional Chinese palace hall with carved wood screens, cinematic shallow depth of field emphasizing their tender relationship, poignant and beautiful"
01:10-01:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-05-grandma-walk-west-lake-costume.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, cinematic wide shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair in Tang Dynasty royal costume walking along West Lake lakeshore path with willows and ancient broken bridge in background, traditional Chinese paintings framing her, photorealistic warm afternoon sunlight casting long elegant shadow, candid walking portrait composition, dignified and graceful mood"
01:30-01:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-06-song-empire-street-walk.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, atmospheric street photography shot of the entire group of 13 chibi Asian tourists all wearing elaborate Song Dynasty traditional costumes walking together down a reconstructed Song imperial street, ancient Chinese architecture with hanging lanterns and tea shop signs, photorealistic historical immersive setting with staff in period costume, cinematic wide shot with cultural pride mood, tourist photo moment"
01:50-02:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-07-grandma-hotel-return-tired.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, soft intimate moment of chibi healthy 70-year-old Asian grandma with jet-black silky hair in casual clothes after taking off her costume standing by the hotel window admiring the bright red Tang Dynasty empress costume hanging on the wardrobe, with a relaxed and pleased smile, chibi middle-aged son organizing the costume accessories beside her, photorealistic hotel room with white sheets and warm lamp light, cinematic shallow focus on grandma's graceful and joyful expression, graceful and joyful moment"
02:10-02:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-08-grandma-son-tv-back.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply poignant final shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair and chibi middle-aged son sitting shoulder to shoulder on hotel bed watching television with their backs to the camera, soft warm yellow light illuminating their silhouettes, late evening quiet mood, photorealistic simple hotel room setting, cinematic long-take composition focusing on their body language warmth, contemplative closure for a meaningful day"`,
};
// Day 8 — 返程 (7/24 五)
const D8: DayBlock = {
  date: "2026-07-24",
  label: "Day 8 · 7/24 (五)",
  theme: "回家 · 收心",
  scenes: "07:00 早餐 → 09:00 靈隱寺 / 大運河 / 西湖 / 綠茶餐廳 → 14:30 杭州大酒店離開 → 地鐵 1 號線 + 19 號線 → 蕭山 T4 → 19:35 起飛 → 21:30 抵桃園 T2 → 各自回家",
  mainCharacters: "全 13 人 / 最後一頓綠茶餐廳 / 機場告別 / 飛機上恩齊累到睡著",
  dialogue: `（07:00 — 杭州大酒店餐廳早餐）
阿美（看著窗外）：『今天是最後一天了。』
阿評：『對，下午要回家了。』
阿美：『我還想再玩幾天。』
阿評：『媽，妳下次還想來，我陪妳。』
（09:00 — 靈隱寺，13 人上香）
阿美（跪在佛前）：『保佑我們一家平安。』
阿評（跪在旁邊）：『也保佑爸在天上。』
（兩人靜默 5 秒）
（11:30 — 京杭大運河邊散步）
阿喜（指河）：『這個是京杭大運河。』
吳董：『世界最長的人工河！』
黃倩（對黃阿分）：『妳看那個船！』
黃阿分：『對！運河船。』
（13:00 — 綠茶餐廳，最後一頓午餐）
吳董（舉杯）：『來！敬這 8 天！』
阿喜：『敬我們的家人！』
黃阿分：『敬兩家的小朋友！』
黃倩：『敬吳董不要再虧阿喜公司！』
吳董：『喂！』
（全桌大笑）
恩齊（舉果汁）：『敬我！』
大宇：『敬我！』
小宇：『敬我！』
宸瑋：『敬我！』
（4 個小朋友亂講話）
阿美（看著孫子）：『這幾個皮蛋。』
（鏡頭從阿美視角拍 4 個小朋友）
阿美（轉頭對阿喜）：『阿喜，這 8 天很謝謝你。』
阿喜：『媽，妳客氣什麼。』
阿美：『我跟你們的腳程差好多，你們還願意帶我。』
阿喜（握阿美的手）：『媽，妳願意來我就很高興。』
（鏡頭拍兩人握手特寫）
（15:00 — 杭州大酒店大廳 check out）
吳董（拖行李）：『阿喜，我幫你叫車。』
阿喜：『謝謝。』
（黃阿分和黃倩站在一旁對看）
黃阿分（手比心）：『這 8 天很快。』
黃倩：『對。但很開心。』
（地鐵 1 號線到 19 號線，杭州火車東站換乘到機場）
（17:00 — 蕭山機場 T4，check in 行李）
賽門（拿著 boarding pass）：『我要先過海關了！台北見！』
阿喜：『賽門你小心！』
賽門：『放心！』
（18:00 — 候機室，13 人坐著）
吳董（握阿喜的手）：『阿喜，10 年後再約一次！』
阿喜（握手）：『一言為定！』
阿伸（抱阿喜）：『阿喜哥，下次再約！』
阿喜（拍背）：『好！你帶嫂子一起！』
阿橋：『阿喜哥，謝謝招待！』
阿茹：『下次換我們招待！』
（19:35 — 起飛）
恩齊（趴窗邊）：『爸爸，那邊有燈。』
阿喜：『那是杭州的夜景。』
恩齊（看了一下）：『比台北亮。』
阿喜：『對。』
恩齊（過 5 分鐘後睡著）：『嗯嗯……』
阿喜（輕聲）：『回家了。』
（鏡頭拍阿喜抱著恩齊睡著）
（21:30 — 抵達桃園 T2，13 人在入境大廳）
阿美（站在入境大廳）：『終於回來了。』
阿評（牽著阿美）：『媽，妳想逛哪裡？』
阿美：『沒有。我只是覺得這 8 天很快。』
（鏡頭拍 13 人入境大廳剪影）
阿美（轉頭看）：『下次想再去哪裡？』
（全場笑）
阿喜：『媽，下次回杭州。』
阿美：『好。』
（散場 — 鏡頭從遠景拉到 13 人散開的身影）`,
  shots: `00:00-00:10  07:00 早餐全景，阿美看窗外，鏡頭從遠景拉到近景
00:10-00:25  「我還想再玩幾天」一句，鏡頭捕捉阿評承諾「下次再來」
00:25-00:40  09:00 靈隱寺全景，13 人上香，鏡頭從門口推進
00:40-01:00  阿美跪佛前特寫「保佑我們一家平安」一句
01:00-01:15  阿評跪旁邊「也保佑爸在天上」，鏡頭捕捉兩人靜默
01:15-01:30  11:30 京杭大運河邊散步，鏡頭從河面拍到 13 人剪影
01:30-01:45  「世界最長的人工河」一句，鏡頭 zoom in 吳董科普
01:45-02:00  13:00 綠茶餐廳乾杯全景，鏡頭繞桌 360 度
02:00-02:15  吳董敬酒 vs 黃倩補刀剪接
02:15-02:30  4 個小朋友舉果汁亂講話的搞笑剪接
02:30-02:45  阿美奶奶看孫子「這幾個皮蛋」特寫
02:45-03:00  阿美對阿喜說「謝謝你帶我」一句，鏡頭從遠景拉到近景
03:00-03:15  阿喜握阿美的手特寫，景深虛化背景餐廳
03:15-03:30  15:00 大廳 check out，鏡頭從地板拍行李箱堆積
03:30-03:45  兩位太太互相比心剪接
03:45-04:00  蕭山機場 T4 全景，鏡頭從入口推進到登機口
04:00-04:15  賽門拿 boarding pass 跑過剪接
04:15-04:30  18:00 候機室 13 人坐著剪接
04:30-04:50  「10 年後再約一次」握手剪接
04:50-05:05  阿伸抱阿喜、吳董握手，多人告別剪接
05:05-05:20  19:35 起飛，鏡頭從機場塔台拍飛機離場
05:20-05:40  飛機內恩齊趴窗邊看夜景，鏡頭從座位側面
05:40-06:00  「回家了」一句，鏡頭拍阿喜抱恩齊睡著
06:00-06:20  21:30 桃園 T2 入境大廳 13 人剪影全景
06:20-06:40  「終於回來了」一句，鏡頭從遠景拉到阿美臉
06:40-07:00  阿美問「下次想去哪」全場笑，鏡頭從阿喜回應
07:00-07:20  散場 13 人分開，鏡頭從遠景拉到剪影，背景配樂「朋友」鋼琴版淡出

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-01-grandma-praying.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply reverent close-up of chibi healthy 70-year-old Asian grandma with jet-black silky hair kneeling on temple prayer cushion at Lingyin Temple with hands pressed together in prayer, soft golden incense smoke swirling around her, photorealistic traditional Buddhist temple interior with red wooden pillars and gold Buddha statues, cinematic shallow depth of field with warm candlelight from nearby candles, poignant moment of spiritual reflection"
00:10-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-02-grand-canal-walk.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, atmospheric wide shot of the entire group of 13 chibi Asian tourists walking along the Beijing-Hangzhou Grand Canal waterfront with traditional cargo boats slowly gliding by, photorealistic water reflections of ancient Chinese architecture, photorealistic hanging willow branches and stone pavilions, cinematic horizontal composition with deep perspective, peaceful late-morning walk mood"
00:30-00:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-03-green-tea-restaurant-toast.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, joyful group toast moment at Green Tea Restaurant Hangzhou, 13 chibi Asian family members raising glasses of various drinks (beer, juice, tea) around a round table full of Chinese dishes including Hangzhou specialties, photorealistic traditional Chinese restaurant interior with warm yellow lighting and Chinese calligraphy on walls, cinematic elevated angle looking down at the family table, celebratory farewell lunch atmosphere"
00:50-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-04-grandma-thank-you-moment.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply emotional close-up of chibi healthy 70-year-old Asian grandma with jet-black silky hair holding chibi middle-aged son's hand across the lunch table, both with soft smiles and moist eyes, photorealistic Chinese restaurant table setting with white steam from a teapot between them, cinematic shallow depth of field with focus on the joined hands, tender family bond moment, emotionally moving"
01:10-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-05-airport-farewell-shake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic farewell handshake shot between chibi businessman friend (Wu Dong) and chibi main father (Axi) at Hangzhou Xiaoshan International Airport terminal with glass walls showing planes outside, chibi eldest son and chibi wife standing behind looking emotional, photorealistic modern Chinese airport interior with departure boards in Chinese and English, cinematic double-portrait composition, bittersweet reunion-farewell mood"
01:35-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-06-enqi-night-view-from-plane.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, magical nighttime view from airplane window showing Hangzhou city glowing with golden lights below, chibi 5-year-old boy's small face pressed against the oval window glass breath fogging the glass, his reflection barely visible, photorealistic aerial view of Chinese coastal city at night with starry sky, cinematic intimate cabin + dramatic cityscape composition, dreamy childhood wonder mood"
01:55-02:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-07-home-sweet-home-taipei.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply moving warm return-home shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair and chibi middle-aged son (her eldest) walking out of Taoyuan Airport International Arrivals gate together, the chibi father carrying sleeping chibi 5-year-old son on his shoulder, photorealistic Taiwan Taoyuan T2 modern airport interior with familiar Mandarin signs, cinematic symmetrical composition with joyful group in background, emotional homecoming feeling"
02:15-02:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-08-family-dispersing-silhouette.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, poignant final silhouette shot of the entire group of 13 chibi Asian family members dispersing in different directions at Taoyuan Airport arrival hall, becoming separate chibi silhouettes against the bright airport lights, photorealistic airport floor with reflective tiles and overhead lighting, cinematic wide shot with deep perspective, bittersweet but hopeful farewell mood, leaving the story open"`,
};
// ──────────────────────────────────────────────────────────────────────────────
// 3 個劇本（臣起草，聖上看方向再選一個展開）
// ──────────────────────────────────────────────────────────────────────────────

const ALL_DAYS = [D1, D2, D3, D4, D5, D6, D7, D8];
// ──────────────────────────────────────────────────────────────────────────────
// 劇本 B — 兩家人的暑假 — 8 日獨立 dayBlocks（衝突三幕結構）
// ──────────────────────────────────────────────────────────────────────────────
const B_DAYS: DayBlock[] = [
  // Day 1 — 表面和平：兩家人第一次集合 + 高三同學重逢的尷尬回憶
  {
    ...D1,
    dialogue: `（T1 集合 — 阿喜 vs 吳董 高中同學 10 年後重逢）
吳董：『阿喜！這裡這裡！』
阿喜：『你怎麼變這麼胖啦！我差點認不出來。』
吳董：『你才瘦！聽說你公司倒啦？』
阿喜：『沒有啦！只是換工作！別亂講！』
黃阿分（拉阿喜衣角）：『你們兩個可以不要一見面就互酸嗎？』
黃倩（也拉吳董）：『就是說，相親相愛。』
阿美（看著吳董）：『阿董啊，你讀書的時候就圓圓的，現在還是一樣耶。』
吳董：『阿姨妳還記得我喔！』
恩齊（拉阿喜褲管）：『爸爸，那個叔叔是誰？』
阿喜：『叫吳叔叔。爸爸高中同學。』
恩齊：『他好高喔。比我高好多。』
大宇（在吳董背後）：『媽媽，那個阿伯好帥喔。』
黃倩：『那個是阿伯公。叫爺爺。』
大宇：『阿伯公好帥！』
阿評（在旁邊拿手機拍）：『我來幫你們拍一張，難得耶。』
阿伸（拿行李箱走過）：『阿喜哥，要不要我幫忙？』
阿喜：『你顧好你自己吧！我有三個皮箱耶！』
阿伸：『OK 那你自己來。』
（飛機上 — 恩齊第一次坐窗邊）
恩齊（趴窗邊）：『哇！好多雲！像棉花糖！』
阿喜：『要不要跟哥哥換位置？』
宸瑋（從走道那邊搖頭）：『不要！我要靠走道！這樣可以看電影！』
恩齊：『可是你看不見雲雲。』
宸瑋：『雲雲有什麼好看的。』
黃阿分（拿手機錄）：『欸欸不要吵架。』
（外灘夜景 — 兩家人各自看風景，沒交集）
吳董（指東方明珠）：『你看！電視上那個！』
黃倩：『你講幾次了？每個人看到都講。』
阿喜（對鏡頭自言自語）：『十年了。我跟吳董上次見面是他結婚。這次是我們第一次全家出來。』
（飯店房間 — 黃阿分 vs 黃倩第一次聊天）
黃阿分：『妳跟吳董結婚幾年了？』
黃倩：『十二年。你們呢？』
黃阿分：『八年。大宇跟小宇差幾歲？』
黃倩：『三歲。你們家恩齊跟宸瑋呢？』
黃阿分：『也是三歲。』
黃倩：『哇賽，好巧。』
黃阿分：『對啊。但我家恩齊比較皮。』
黃倩：『我們家大宇也是皮到不行。』
（兩人對看，異口同聲）：『男孩子真的都很皮。』
`,
    shots: `00:00-00:08  T1 出境大廳 13 人混亂集合，鏡頭跟著阿喜視角慌亂找人
00:08-00:15  阿喜 vs 吳董 高中同學重逢，互酸對話，鏡頭在兩人之間來回
00:15-00:22  黃阿分 vs 黃倩 各自出來拉住老公，第一場同框
00:22-00:30  阿美奶奶看到吳董的回憶特寫，背景配樂「那些年」輕聲版
00:30-00:38  恩齊蹲下問阿喜「那個叔叔是誰」，鏡頭從恩齊視角仰拍吳董
00:38-00:48  大宇一句「阿伯公好帥」，吳董笑場，鏡頭 zoom in 大宇表情
00:48-00:55  阿伸拿行李走過的全景 + 阿喜「你顧好你自己」爆點剪接
00:55-01:05  飛機內 — 恩齊趴窗邊的特寫 5 秒，背景引擎聲
01:05-01:12  兩兄弟爭窗邊位置，阿喜居中協調，鏡頭三點拍攝
01:12-01:25  浦東機場落地 + 磁浮時速 431km 拍攝 + 車內 13 人大合照
01:25-01:35  外灘夜景全景，鏡頭從東方明珠緩慢橫搖到萬國建築群
01:35-01:42  阿喜獨自拍鏡頭自言自語「十年了」，手持晃動感
01:42-01:55  嘉廷飯店房間兩位太太並肩坐床沿聊天，鏡頭從門外偷拍，景深模糊

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-01-t1-airport-reunion.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, bustling airport departure hall reunion of 13 chibi Asian travelers (mid-aged Taiwanese father hugging chibi businessman friend in a bear hug, surrounded by chibi wife, chibi mother, chibi boys ages 10 and 7, chibi boys ages 8 and 5, chibi colleague/同事, chibi eldest brother/uncle, and chibi second wife), photorealistic Taiwan Taoyuan Airport Terminal 1 with Mandarin and English signs, cinematic medium-wide shot with joyful chaos, warm fluorescent lighting, excited family reunion feeling"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-02-classmate-roast-banter.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, witty high-school classmate roast exchange between chibi middle-aged Taiwanese Chinese father and chibi businessman friend facing each other with mischievous smirks, both wives (chibi wife/mother and chibi second wife) yanking them by the sleeves from behind, photorealistic crowded airport hall with rolling suitcases scattered on tile floor, cinematic over-the-shoulder ping-pong composition, comedic banter energy with warm overhead lighting"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-03-grandma-remembers-wu-dong.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, warm nostalgic moment of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a floral blouse gently smiling and patting chibi businessman friend's round belly, recognizing him from high-school era, photorealistic airport check-in area with carousel luggage belt in background, cinematic two-shot with shallow depth of field, golden hour-like indoor lighting, tender intergenerational recognition"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-04-enqi-meets-wu-dong.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, adorable low-angle hug moment where chibi 5-year-old boy tugs at chibi businessman friend's pant leg looking up wide-eyed, photorealistic Taoyuan airport Terminal 1 polished floor with reflective tiles, cinematic worm's-eye view shot looking up at the towering businessman friend, soft diffused natural light from glass wall, cute child-vs-giant perspective"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-05-dayu-grandpa-flattery.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, hilarious flattery moment with chibi 10-year-old boy giving thumbs-up to chibi middle-aged Taiwanese Chinese father while shouting 'Grandpa is so handsome', chibi businessman friend bursting into laughter behind, photorealistic airport lounge with seating in background, cinematic freeze-frame comedic composition, bright fluorescent lighting with warm color temperature, family comedy gold"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-06-airplane-clouds-cotton-candy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, magical first-flight cloud-gazing moment with chibi 5-year-old boy pressing his face against the airplane window, mouth wide-open in wonder, photorealistic airplane cabin interior with overhead bins and the oval window showing fluffy white clouds at golden hour, cinematic close-up with bokeh cloud background, dreamy childhood wonder mood"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-07-bund-night-skyline.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, cinematic Bund night skyline moment with chibi middle-aged Taiwanese Chinese father holding camera at the Huangpu riverside promenade, behind him the iconic Oriental Pearl Tower glowing in pink-purple, photorealistic Shanghai Bund waterfront with historic European-style buildings on the opposite bank, cinematic over-the-shoulder vlogger composition, warm sodium-vapor street-lamp lighting, awe-struck tourist energy"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-08-two-wives-bedside-chat.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sweet bonding moment of two chibi Asian mothers sitting together in a Shanghai Jiading Hotel room discussing family topics and comparing notes about their chibi boys, chibi wife/mother and chibi second wife laughing and chatting on chairs, photorealistic hotel room interior with king bed and city night view through window, cinematic warm soft-light family comedy portrait, gentle motherly sisterhood mood"





Is Oriental Pearl hiding treasure inside?", photorealistic Shanghai night skyline with warm street lamp light, cinematic close-up father-son intimate moment"

`,
  },

  // Day 2 — 衝突醞釀：特種兵 vs 慢遊
  {
    ...D2,
    dialogue: `（05:30 飯店大廳 — 賽門要出門晨泳，其他人被吵醒）
賽門：『我走啦！四行倉庫見！』
阿美（從房間探頭）：『這麼早！你不睡覺喔！』
阿喜（揉眼睛）：『媽，妳也醒了？』
阿美：『被這個孩子吵醒的啦！』
阿評（推著行李下樓）：『媽，妳回去睡。我跟著賽門去。』
阿喜：『哥，你顧媽。我去拍其他人吃早餐。』
（小楊生煎 — 阿美奶奶 vs 兩位太太吃早餐）
阿美：『這個生煎比我們台北的好吃耶！』
黃阿分：『對啊！我上次來上海也是吃這個。』
黃倩（第一次跟阿美對話）：『阿姨妳吃慢一點，燙喔。』
阿美：『我吃很快的啦！』
恩齊（咬一口）：『嗚！爆汁！』
阿喜（鏡頭轉向）：『恩齊你嘴巴！』
（豫園 — 阿評當導遊，阿美聽得入神）
阿評：『媽，妳看這個屋頂，是明朝的。』
阿美：『我知道！我年輕的時候就看過了。』
阿評：『媽妳以前來過喔？』
阿美：『你爸帶我來過一次。那時候你才五歲。』
阿評（沉默）：『……爸如果還在，應該也會想來吧。』
阿喜（從後面鏡頭轉過來）：『哥，改天我們再去一次爸的老家。』
（西塘夜遊 — 兩家小孩搶糖葫蘆）
宸瑋：『我要那個！大的！』
大宇：『我先看到的！』
小宇（拉大宇）：『哥哥不要吵架。』
恩齊（在旁邊起鬨）：『打架！打架！』
阿喜（趕緊蹲下）：『欸欸欸！不要打架！一人一支好不好？』
吳董（也跑來）：『吳大宇你給我放手！』
大宇（哭）：『可是是我先看到的！』
阿喜（掏錢買了兩支）：『來，一人一支。不要哭不要哭。』
阿伸（在旁邊偷偷錄）：『我全部都錄下來了。回台北剪。』
`,
    shots: `00:00-00:08  05:30 飯店走廊長鏡頭，鏡頭跟著賽門出門
00:08-00:15  阿美奶奶被吵醒探頭出房門，鏡頭從下往上仰拍
00:15-00:25  小楊生煎店 — 阿美奶奶吃的特寫，鏡頭慢動作
00:25-00:32  阿美奶奶爆「我吃很快的啦」，cut 兩位太太笑場
00:32-00:40  恩齊咬爆生煎的瞬間特寫（捕捉湯汁飛出來）
00:40-00:55  豫園 — 阿評指屋頂特寫，配樂二胡「春江花月夜」
00:55-01:05  阿美奶奶回憶片段：「你爸帶我來過」一句，鏡頭 zoom in 阿評眼眶
01:05-01:12  阿喜從後方插入「改天再去爸的老家」，三人背影定格
01:12-01:25  西塘夜遊煙雨長廊全景，運河倒影，背景古箏
01:25-01:35  兩家小孩搶糖葫蘆，鏡頭跟拍，混亂中阿喜蹲下協調
01:35-01:42  吳董跑來鏡頭急推入，一把抓大宇的手
01:42-01:50  大宇哭的特寫，阿喜買兩支糖葫蘆的慢動作
01:50-02:00  阿伸在旁邊偷錄的笑場彩蛋，鏡頭捕捉

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-01-grandma-peeking-from-room.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sleepy 05:30 hotel hallway moment with chibi healthy 70-year-old Asian grandma with jet-black silky hair in a floral pajama set peeking her head out of a hotel-room door while chibi youngest brother/uncle pushes a luggage cart down the corridor, photorealistic Shanghai Jiading Hotel hallway with warm sconce lighting at 05:30 AM, cinematic low-angle fish-eye view, intimate comedic wake-up call"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-02-xiaoyang-shengjian-burst-juice.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, explosive breakfast close-up with chibi 5-year-old boy biting into a Xiao Yang Sheng Jian pan-fried bun as hot soup splashes out, his cheeks puffing comically, chibi healthy 70-year-old Asian grandma with jet-black silky hair in a magenta silk blouse across the table laughing with mouth wide open, photorealistic Shanghai Xiao Yang Sheng Jian storefront with iron griddle and bun steamers, cinematic slow-motion splash capture, warm tungsten lighting"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-03-yuyuan-ming-rooftop-tour.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, gentle moment in Yuyuan Garden where chibi eldest brother/uncle points up at a Ming-dynasty upturned eaves rooftop, beside him chibi healthy 70-year-old Asian grandma with jet-black silky hair in a grey silk qipao smiling with closed eyes and remembering her youth, photorealistic traditional Jiangnan garden with white-washed walls and black-tile roofs, cinematic upward tilt with curved red lanterns framing the shot, soft morning-overcast lighting, intimate mother-son bonding"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-04-grandma-remembers-deceased-father.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply moving Yuyuan Garden moment where chibi eldest brother/uncle and chibi healthy 70-year-old Asian grandma with jet-black silky hair in a grey silk qipao stand in front of a Ming-era pavilion, both looking downcast in shared memory of her late husband, photorealistic classical Chinese garden corridor with red pillars and stone lion statues, cinematic symmetrical two-shot with shallow DOF, melancholic but hopeful mood, restrained color palette of muted reds and greys"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-05-xitang-candy-apple-squabble.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chaotic sweet-tooth squabble in Xitang Night Rain Corridor with chibi boys ages 8 and 5 vs chibi boys ages 10 and 7 all reaching for tanghulu candy apples, chibi middle-aged Taiwanese Chinese father kneeling down with arms wide trying to broker peace, photorealistic Xitang water-town covered corridor with hanging red lanterns and canal reflections, cinematic wide-shot with deep perspective leading the eye to the arguing kids, warm lantern-glow lighting, comedic family chaos"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-06-wu-dong-grabs-dayu.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, urgent dad-moment shot where chibi businessman friend rushes in from the right side, swooping down to grab chibi 10-year-old boy by the shoulders mid-tantrum over a tanghulu, photorealistic ancient Xitang water-town stone street under warm red lanterns, cinematic dramatic dolly-zoom with motion blur edges, dynamic action comedy composition"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-07-axi-buys-two-tanghulu.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sweet resolution shot of chibi middle-aged Taiwanese Chinese father handing two bright-red tanghulu sticks to two teary chibi boys with the other families watching in approval, photorealistic Xitang vendor stall with sugar-coated hawthorn berries glistening, cinematic center-symmetric composition with father at the heart of the frame, warm tungsten market lighting, peace-brokered family mood"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-08-ashen-secretly-recording-easter-egg.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sneaky behind-the-scenes easter-egg shot of chibi colleague/同事 crouched behind a stone pillar with phone held high recording the whole candy-apple chaos with a mischievous grin, photorealistic Xitang corridor edge with carved wooden lattice detail, cinematic over-the-pillar spy-shot with shallow foreground blur, low-key lighting with a single warm rim light, playful hidden-camera vibe"

I saw this when young, your grandpa brought me here", chibi little boy listening with curious big eyes, photorealistic Yu Garden rooftop with soft afternoon light, cinematic documentary tender moment"



If you love what you do, you do not get tired" with serious expression, photorealistic Xitang night canal background, cinematic warm child philosophy moment"

`,
  },

  // Day 3 — 第一幕衝突：西塘整日 + 兩條線開始衝突
  {
    ...D3,
    dialogue: `（西塘早茶客 — 阿美奶奶跟黃倩意外投緣）
阿美：『這個茶不錯。』
黃倩（給阿美倒茶）：『阿姨妳喜歡的話，回台北我寄給妳。』
阿美：『不用啦！我又不會泡！』
黃倩：『我跟阿董學了一招，超簡單的。』
阿美（看著黃倩）：『妳這個媳婦真乖。』
黃倩（害羞）：『哪有啦。』
（西塘煙雨長廊 — 同事 vs 家人路線分裂）
阿喜：『我跟同事先去足浴，你們兩家人自己逛？』
黃阿分：『蛤？你們去洗腳我們逛街？』
阿喜：『兩個小時後西門見。』
吳董：『我跟你去！阿喜我們一起去！』
阿評（抱著相機）：『我帶媽跟兩個小朋友走慢的，你們先去。』
阿美（碎念）：『你們年輕人去玩啦！我跟阿評慢慢走。』
（西塘小巷 — 阿美 + 阿評 + 4 個小朋友慢慢逛）
恩齊：『大伯公，那個是什麼？』
阿評：『那是烏篷船。』
小宇：『可以坐嗎？』
阿評：『可以啊。』
大宇（拉阿評）：『我要坐前面！』
小宇：『我也要前面！』
阿評（蹲下）：『你們猜拳啦。猜贏的坐前面。』
恩齊（跟宸瑋）：『我們也猜。』
（足浴店 — 阿喜 + 吳董 + 阿伸 + 阿橋 + 阿茹）
阿伸：『老闆，五位！』
阿茹（看菜單）：『399 一位，有點貴。』
阿喜（掏信用卡）：『我請！難得出來。』
吳董：『那我付按摩的錢！』
阿伸：『那我付小費。』
阿橋：『那我什麼都不用付了？爽！』
阿喜（鏡頭轉向）：『我們五個這樣聚在一起，是公司成立以來第一次吧？』
吳董：『對啊！阿喜你們公司每年都虧，還能出國，我覺得很感人。』
阿喜：『吳董你閉嘴啦！』
（兩線合流 — 晚上在西門口集合）
黃阿分：『你們洗了多久？兩個半小時！』
阿喜：『舒服嘛！』
黃倩（聞到）：『蛤，你們腳好臭！』
恩齊（捏鼻子）：『爸爸好臭！』
阿喜（作勢要抓恩齊）：『你這個小鬼！』
`,
    shots: `00:00-00:10  西塘早茶客全景，運河煙雨，阿美跟黃倩面對面坐著
00:10-00:20  阿美奶奶跟黃倩意外投緣對話，鏡頭雙人中景
00:20-00:25  「妳這個媳婦真乖」一句 cut 黃倩害羞反應
00:25-00:35  分線前 — 阿喜提議「兩個小時後見」的全景，鏡頭橫搖兩條路線
00:35-00:50  西塘小巷 — 阿美 + 阿評 + 4 個小朋友走慢路線的長鏡頭
00:50-01:00  阿評教小朋友猜拳決定船位的搞笑片段
01:00-01:10  足浴店門口招牌特寫，鏡頭推進店內
01:10-01:25  阿喜掏信用卡「我請」vs 吳董「我付按摩」對比剪接
01:25-01:35  阿喜一句「公司成立以來第一次吧」，吳董馬上補刀
01:35-01:45  晚上西門口集合，黃倩聞到「你們腳好臭」爆點剪接
01:45-01:55  恩齊捏鼻子 vs 阿喜追兒子的搞笑追逐

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-01-grandma-xitang-tea-bonding.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, warm morning tea-bonding scene of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-blue silk blouse sitting across the table from chibi second wife, both holding small white porcelain teacups with steam swirling, photorealistic Xitang riverside teahouse with misty canal and weathered wooden beams in soft-focus background, cinematic over-the-table medium shot, gentle dawn light filtering through paper screens, intergenerational female-bonding mood"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-02-grandma-praises-daughter-in-law.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, tender filial-praise moment where chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-blue silk blouse reaches over to pat chibi second wife's hand with the words 'you're such a good daughter-in-law', chibi second wife blushing with shy smile, photorealistic Xitang traditional teahouse with moon-shaped window frame, cinematic two-shot close-up with shallow DOF, soft diffused morning light, heartwarming cross-family bonding"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-03-group-splits-into-two-factions.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dynamic split-up moment at a Xitang canal intersection where five chibi colleagues/同事 wave goodbye walking one direction toward foot-massage sign while the rest of the family including chibi healthy 70-year-old Asian grandma with jet-black silky hair and chibi eldest brother/uncle drift the opposite way toward the slow walking route, photorealistic Xitang stone bridge with arched reflection in green canal water, cinematic high-angle wide shot looking down the canal forks, bright midday sunlight with dramatic shadows"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-04-grandma-kids-upeng-boat.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, cheerful slow-walk scene of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a jade-green silk blouse and chibi eldest brother/uncle leading four chibi boys (ages 8, 5, 10, 7) onto a black-canvas upeng boat with a little wooden dock, photorealistic Xitang narrow canal with mossy stone walls and drizzling mist, cinematic lazy panning shot following the procession, soft overcast romantic mood, generational multicolor vibes"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-05-foot-massage-squad-celebrate.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, lively foot-massage celebration with five chibi colleagues and chibi businessman friend lounging in plush massage chairs raising glasses to chibi middle-aged Taiwanese Chinese father who quips about being the first company outing in history, photorealistic Chinese-style foot-massage parlor with wooden buckets and dim warm lighting and Mandarin spa music ambience, cinematic center group-shot with circular composition, amber low-key lighting, bro-bonding hangout atmosphere"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-06-axi-vs-wu-dong-business-jab.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, comedy ping-pong shot where chibi businessman friend leans in conspiratorially to whisper 'your company loses money every year' while chibi middle-aged Taiwanese Chinese father's cheeks turn pink with mock anger and a steamed bun in his hand, photorealistic Xitang foot-massage parlor with dim amber light, cinematic over-the-shoulder exchange composition, warm tungsten side lighting, jokey bro-comedy energy"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-07-two-wives-vs-smelly-feet.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, prime comedy moment at the Xitang West Gate evening pickup where chibi second wife plugs her nose while chibi wife/mother glares at the just-finished-foot-massage husbands and chibi 5-year-old boy mimics the nose-plug gesture, photorealistic Xitang West Gate ancient stone archway illuminated with red lanterns at nightfall, cinematic medium group shot with depth, warm lantern-amber lighting, hilarious family-tease energy"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-08-father-chases-enqi-funny.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, slapstick chase scene in Xitang cobbled alley where chibi middle-aged Taiwanese Chinese father pretends to lunge at running chibi 5-year-old boy who clutches his nose with both hands while chibi wife/mother pretends to scold from the side, photorealistic Xitang ancient stone-paved alley with warm lantern reflections on wet stones, cinematic side-tracking chase shot, dynamic warm-cool light contrast, playful family-comedy mood"







I want to be someone who writes articles" with determined face, Maodun (茅盾) birthplace in Wuzhen background, photorealistic old photograph aesthetic blended with chibi cuteness, cinematic inspirational moment"
`,
  },

  // Day 4 — 第二幕衝突：烏鎮染坊 + 奶奶極限
  {
    ...D4,
    dialogue: `（烏鎮西柵大門口 — 13 人合照）
阿喜（舉手）：『來！13 個人！看鏡頭！』
吳董：『你拍得到嗎？自拍棒帶了嗎？』
阿喜：『帶了！賽門幫我拍！』
賽門（拿手機）：『3、2、1！』
（拍完看照片）
阿伸：『阿喜哥，吳董眼睛閉了。』
吳董：『哪有！』
阿喜：『吳董你剛剛眨眼啦！』
吳董：『沒有！是你按太慢！』
（染坊 — 阿美奶奶慢慢挑布料）
阿美（喘）：『阿評，這個染布好漂亮。』
阿評：『媽，妳要不要坐一下？』
阿美：『不用！我還走得動。』
（十分鐘後）
阿美（微笑）：『阿評，這個跟小時候看到的江南一樣。』
阿評（拉著她）：『媽，那邊有位置，我們去坐坐看風景。』
阿美（看著河邊）：『這個地方，跟我小時候看到的江南一樣。』
（西柵水閣 — 兩家人看船）
阿喜：『吳董你看，這個船跟我們西塘的不同。』
吳董：『對！這個比較大！』
大宇：『我們可以坐嗎？』
阿喜：『要排隊。排到我們就坐。』
恩齊：『我也要坐！』
宸瑋（拉阿喜）：『爸爸我要那個紅色衣服的船夫！』
阿喜（蹲下）：『好，紅色衣服的船夫，記住了。』
（夜市外 — 吳董 vs 阿喜意見分歧）
吳董：『去吃足浴啦！我昨天按得很爽！』
阿喜：『不要啦！今天吃晚餐就好，明天還要趕路。』
吳董：『可是我昨天沒按夠！』
阿美（突然插話）：『你們兩個去按！我跟阿評回飯店休息。』
阿喜（驚）：『媽妳累了？』
阿美（碎念）：『你們年輕人腳太快了！』
吳董（馬上）：『阿姨妳累了？那我們都回飯店！不要去足浴了！』
阿喜（看著吳董）：『你剛剛不是說要去？』
吳董（抓頭）：『啊就……阿姨想喝茶嘛。』
`,
    shots: `00:00-00:10  烏鎮西柵大門 13 人合照，鏡頭從賽門手機角度拍
00:10-00:20  拍完看照片，吳董眨眼爭議的搞笑剪接
00:20-00:35  染坊藍布飄的全景，背景音樂「烏鎮故事」鋼琴版
00:35-00:45  阿美奶奶慢慢走在染坊巷子，阿評跟在後面拍的長鏡頭
00:45-00:55  阿美站著看藍布飄的特寫，鏡頭捕捉阿美入神的臉
00:55-01:05  「跟小時候看到的江南一樣」一句，鏡頭 zoom in 阿美眼眶 + 河水
01:05-01:20  西柵水閣船景全景，鏡頭跟拍小朋友搶船位
01:20-01:35  吳董 vs 阿喜足浴意見分歧，鏡頭在兩人之間來回切
01:35-01:45  阿美奶奶突然插話「你們去按我回飯店」，鏡頭捕捉轉折
01:45-01:55  吳董馬上改口「阿姨想喝茶嘛」，鏡頭捕捉抓頭笑場
01:55-02:05  阿喜 vs 吳董對視笑場，兩人互相吐槽的搞笑剪接

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-01-wuzhen-13-group-photo.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, joyful 13-person group photo at Wuzhen Xizha main gate with a selfie stick held high by chibi colleague/同事, chibi healthy 70-year-old Asian grandma with jet-black silky hair in a turquoise silk blouse smiling gently in the middle row, photorealistic Wuzhen Xizha historical entrance with carved black-wood gate and red lanterns, cinematic low upward angle from selfie-stick perspective, dappled morning sunlight, happy whole-family-companies-friends portrait"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-02-wu-dong-eyes-closed-debate.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, comic squabble shot where chibi middle-aged Taiwanese Chinese father jabs finger at chibi businessman friend claiming he blinked during the photo while chibi businessman friend waves both hands protesting innocence, chibi colleague/同事 holding up the phone showing the photo, photorealistic Wuzhen Xizha stone entrance with ancient wooden doors, cinematic three-way composition pointing at the phone, bright midday sunlight, hilarious comedic debate"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-03-grandma-blue-dye-workshop-walk.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply atmospheric indigo-dye workshop scene where rows of long indigo-blue cloth strips flutter in the breeze and chibi healthy 70-year-old Asian grandma with jet-black silky hair in a turquoise silk blouse walks slowly down the cloth alley with her palm touching the fabric, photorealistic traditional Wuzhen blue-print fabric workshop with weathered brick walls and hanging dyed cotton, cinematic wide shot with rows of cloth framing grandma, dramatic cyan-and-rust color contrast, quiet reflective mood"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-04-grandma-stares-indigo-cloth.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply contemplative portrait of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a turquoise silk blouse standing still amid fluttering indigo-dyed cotton strips that frame her weathered face, photorealistic Wuzhen indigo dye workshop at golden hour with dust motes catching the light, cinematic centered close-up of grandma with butterfly DOF on the cloth edges, indigo-and-saffron color palette, melancholic nostalgia and tender memories of childhood Jiangnan"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-05-grandma-childhood-jiangnan.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, emotionally charged moment of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a turquoise silk blouse sitting on an old wooden bench by the Wuzhen canal murmuring 'this place looks just like the Jiangnan of my childhood', glisten in her eyes catches reflection of the canal, photorealistic old Wuzhen stone bench beside still water with willow shadows, cinematic extreme close-up of face with full DOF softness, soft warm late-afternoon light, deeply intimate and bittersweet"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-06-xizha-water-pavilion-boat.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, scenic Wuzhen Xizha water-pavilion boat dock shot where chibi middle-aged Taiwanese Chinese father kneels down pointing at a red-clothed gondolier to excited chibi 8-year-old boy and chibi 5-year-old boy bouncing up and down, photorealistic Xizha stilted wooden houses over green canal water with arched white stone bridge, cinematic horizontal panning composition, vibrant midday color palette of jade green and brick red, eager father-child outing moment"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-07-grandma-puts-foot-down-on-foot-massage.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sudden authoritative moment where chibi healthy 70-year-old Asian grandma with jet-black silky hair in a turquoise silk blouse firmly interrupts chibi businessman friend mid-sentence to say 'you kids go get the foot-massage, I'll head back with your brother to rest', the two dads shocked with open mouths, photorealistic Wuzhen evening stone street with red lanterns turning on, cinematic dramatic reverse-shot on grandma with backlit rim light, decisive maternal authority mood"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-08-wu-dong-rationalizes-helpfully.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, hilarious flip-flop moment where chibi businessman friend scratches his head trying to rationalize his sudden change of plans after grandma's interruption while chibi middle-aged Taiwanese Chinese father glares suspiciously at him, photorealistic Wuzhen night market entrance with red lanterns casting warm light on weathered stone wall, cinematic medium two-shot at street-eye level, warm tungsten lighting with cool ambient sky, comedic backpedaling energy"


Grandma is weird, she likes weird cloth" and then smiling sheepishly, chibi healthy 70-year-old Asian grandma with jet-black silky hair laughing, photorealistic Wuzhen water town stone alley, cinematic comedic family moment"
Why are houses built on water?", chibi middle-aged Taiwanese Chinese father explaining, photorealistic Wuzhen water-house architecture built over canal, cinematic educational moment"




Am I the next generation?" with thoughtful face, chibi middle-aged Taiwanese Chinese father A-xi hugging him in close-up, photorealistic soft warm Wuzhen night lantern light, cinematic emotional father-son moment"
`,
  },

  // Day 5 — 第三幕前：杭州西湖 + 奶奶真正極限
  {
    ...D5,
    dialogue: `（烏鎮早茶客 — 最後一頓早餐）
阿美（看著恩齊）：『恩齊，你要好好吃飯。』
恩齊：『奶奶，妳為什麼講這個？』
阿美：『沒事。奶奶只是想到一些事。』
黃阿分（在旁邊聽到，看著阿喜）
阿喜（鏡頭轉過來）：『媽，妳累了跟我們說。』
阿美：『我沒事。我走得動。』
（西湖蘇堤 — 阿美慢慢逛）
阿美（坐石椅）：『你們先去。我坐這等你們。』
阿喜（蹲下）：『媽，妳不要勉強。』
阿美（推阿喜）：『去啦！我想一個人坐一下。』
黃阿分（走過來）：『媽，我陪妳。』
阿美：『不用。我只想一個人。』
（阿喜跟黃阿分對視，鏡頭捕捉）
阿喜（對鏡頭小聲）：『我們快去快回。不要讓她等太久。』
（蘇堤春曉 — 兩家人快速逛完）
吳董：『快點快點！阿姨還在等！』
阿喜（跑）：『攝影機都沒拿穩！』
吳董（邊跑邊拍）：『拍什麼拍！走啦！』
（回程 — 阿美一個人坐著看湖）
黃阿分（拿一杯水）：『媽，水。』
阿美（接過）：『謝謝。』
阿美（看著黃阿分）：『阿分，我跟你們的腳程差好多吧？』
黃阿分（蹲下）：『媽妳講什麼話！妳能來我們很高興！』
阿美（眼眶紅）：『我跟你們的腳程差好多。』
黃阿分（握住阿美的手）：『媽，下次我們再帶妳來。』
（武林夜市 — 兩家人吃吃喝喝）
吳董：『來！喝一杯！』
阿喜：『你喝！我顧小孩。』
恩齊：『我要吃糖葫蘆！』
大宇：『我也要！』
吳董：『一人一支！老闆！』
`,
    shots: `00:00-00:10  烏鎮早茶客全景，鏡頭拍桌上的小籠包 + 阿美
00:10-00:20  阿美奶奶看著恩齊說「你要好好吃飯」，鏡頭 zoom in 表情
00:20-00:30  黃阿分在旁邊聽到，跟阿喜交換眼神的剪接
00:30-00:40  西湖蘇堤長鏡頭，阿美慢慢走在後面，掉隊
00:40-00:50  阿美坐石椅特寫，鏡頭從阿喜視角拍（手持微抖）
00:50-01:00  「我只想一個人坐一下」，鏡頭捕捉阿喜跟黃阿分對視
01:00-01:10  兩家人快速逛蘇堤的快剪，鏡頭晃動營造緊張感
01:10-01:20  阿美一個人坐著看湖的長鏡頭，5 秒靜默，背景湖聲
01:20-01:35  黃阿分拿水回來，蹲下握手的特寫
01:35-01:45  「下次我們再帶妳來」，鏡頭從側面拍兩人，景深模糊
01:45-02:00  武林夜市全景，兩家小孩搶糖葫蘆，阿喜 vs 吳董一人買一支

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-01-grandma-last-breakfast.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, bittersweet Wuzhen last-breakfast tableau of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-pink silk blouse gently wiping chibi 5-year-old boy's mouth with a handkerchief while the table is set with xiaolongbao and congee, photorealistic Wuzhen morning teahouse with classic lattice windows overlooking misty canal, cinematic over-table medium shot with grandmother's hands framing the scene, soft hazy morning-backlight, tender farewell-vibe atmosphere"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-02-grandma-tells-enqi-to-eat-well.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply moving tight close-up of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-pink silk blouse staring intently at chibi 5-year-old boy chewing his xiaolongbao with the words 'Enqi, you must always eat well', photorealistic Wuzhen wood-table close-up with steam from xiaolongbao curling up between them, cinematic dual-subject macro shot with shallow DOF, intimate dining-room warm light, generational tenderness mood"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-03-axi-and-wife-exchange-look.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, anxious silent moment as chibi wife/mother and chibi middle-aged Taiwanese Chinese father lock eyes in private worry across the breakfast table after hearing grandma's strange request, photorealistic Wuzhen morning teahouse with carved wooden chairs and canal view in bokeh, cinematic over-the-shoulder shot looking at the wife, cool ambient teahouse lighting mixed with warm table light, unspoken concern vibe"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-04-grandma-sitting-alone-on-stone-bench.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, lonely and beautiful wide shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-pink silk blouse sitting alone on a lakeside stone bench on the Su Causeway of West Lake as the family group walks away out of frame, photorealistic Hangzhou West Lake Su Causeway stone bench with weeping willow drapes and distant Leifeng Pagoda silhouette, cinematic centered long shot with foreground willows framing grandma, muted sage-green and soft golden hour light, contemplative solitude mood"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-05-grandma-says-i-just-want-alone-time.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, gently firming scene where chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-pink silk blouse pushes chibi middle-aged Taiwanese Chinese father away with both palms saying 'I just want to sit by myself for a bit', photorealistic West Lake Su Causeway stone bench up close with pebbles beneath feet, cinematic medium shot with lake reflection in lower frame, soft natural afternoon light, emotionally layered mother-son mood"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-06-axi-and-aphen-anxious-eye-exchange.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, anxious couple-exchange shot at the Su Causeway stone bench where chibi middle-aged Taiwanese Chinese father and chibi wife/mother share a worried glance after grandma insists on being alone, photorealistic West Lake with hazy distant boats and willow trees softening the horizon, cinematic two-shot from behind catching their furrowed brows in side profile, cool overcast natural light, family worry mood"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-07-aphen-hands-grandma-water.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply tender moment where chibi wife/mother squats down and hands a bottle of water to chibi healthy 70-year-old Asian grandma with jet-black silky hair in a pale-pink silk blouse, who responds with a tiny 'thank you' while looking out at West Lake, photorealistic West lakeside stone bench with bumpy gravel path, cinematic side-profile medium close-up with both subjects in same focal plane, golden hour backlighting, intimate generational-care mood"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-08-wulin-night-market-candy-apples.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, festive Wulin Night Market candy-apple moment where chibi businessman friend and chibi middle-aged Taiwanese Chinese father each buy a tanghulu and present them to chibi boys ages 8, 5, 10 and 7 lined up eagerly with mouths open, photorealistic Hangzhou Wulin Night Market bustling food street with neon signs and steam rising from stalls, cinematic low-angle shot looking up at the candied fruits like Christmas lights, vibrant pink-orange neon-tinted lighting, joyful cross-family celebration"




Do not run!", photorealistic West Lake sunset backdrop, cinematic comedic mother-and-4-kids chase scene"


I want to be someone who solves problems with wisdom" with serious expression, photorealistic West Lake classical architecture background, cinematic inspirational moment"
`,
  },

  // Day 6 — 暫時和平：宋城千古情
  {
    ...D6,
    dialogue: `（318 公車上 — 13 人擠 3 台）
吳董：『我們五個一台！阿喜你們八個兩台！』
阿喜：『為什麼你們五個一台？』
吳董：『我們體重比較輕！』
阿評（從後面）：『吳董你這是在嘲笑我們嗎？』
吳董（趕緊）：『不是啦！我是說我們腳比較小！』
黃阿分：『不要吵了啦！隨便分！』
（最後 13 人分 3 台公車）
（宋城千古情 — 開演前小朋友 vs 大人反應）
大宇（張大嘴）：『哇！好大的舞台！』
小宇（拉大宇）：『哥哥不要叫！』
恩齊：『那個是誰？為什麼穿那個？』
宸瑋：『那是皇帝吧？』
阿美（對黃倩）：『這種秀我在台灣沒看過。』
黃倩（對阿美）：『阿姨妳喜歡的話，下次我們再帶妳來。』
阿美（搖頭）：『不用啦！來一次就夠了！花這個錢！』
（馬鴻興川小館 — 點菜衝突）
阿喜（拿菜單）：『這個毛血旺要！』
吳董：『太辣了吧？有小朋友！』
黃阿分（對吳董）：『我們家宸瑋可以吃辣。』
吳董（對黃倩）：『我們家大宇不行。』
阿評（打圓場）：『一份微辣一份不辣啦！』
阿美（突然）：『我想吃那個回鍋肉。』
阿喜（驚）：『媽妳也吃辣喔？』
阿美：『年輕的時候在四川吃過，忘不了。』
`,
    shots: `00:00-00:10  318 公車站 13 人擠 3 台的混亂全景
00:10-00:20  吳董 vs 阿喜「我們體重比較輕」vs「腳比較小」搞笑剪接
00:20-00:35  公車內擠沙丁魚的鏡頭，從車窗往內拍
00:35-00:50  宋城舞台開演前觀眾席全景，13 人散落不同位置
00:50-01:00  大宇張大嘴 vs 小宇拉哥哥的對比剪接
01:00-01:10  恩齊 vs 宸瑋問「那是誰」/「那是皇帝吧」童言對話
01:10-01:20  阿美 vs 黃倩對話特寫，背景舞台光
01:20-01:35  馬鴻興菜單特寫，鏡頭從菜單拉遠到 13 人
01:35-01:45  吳董 vs 黃阿分爭論辣度，阿評打圓場的剪接
01:45-01:55  阿美奶奶突然點回鍋肉，全場驚訝的剪接
01:55-02:05  「年輕的時候在四川吃過」一句，鏡頭 zoom in 阿美回憶表情

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-01-bus-318-sardines.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, hilariously cramped 318-bus boarding moment with 13 chibi Asian travelers splitting into three groups, chibi businessman friend and four others piling onto one bus while the remaining families squeeze into the other two, photorealistic Hangzhou public bus 318 stop with yellow bus livery and roadside modern street, cinematic wide shot from across the street with bus doors open, harsh midday sunlight, comedic sardine-can mood"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-02-bus-weight-vs-feet-size.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, comic back-and-forth bus division shot where chibi businessman friend pats his round belly claiming 'we are lighter' while chibi middle-aged Taiwanese Chinese father shoots back 'the bus ride will be the toughest part', chibi wife/mother and chibi second wife standing by with folded arms, photorealistic Hangzhou bus stop curb with bicycle rack in background, cinematic medium shot of the four bickering adults, sunny afternoon side-lighting, family-banter vibe"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-03-dayu-mouth-wide-open-awe.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, magical-child-awe moment of chibi 10-year-old boy with chibi 7-year-old brother clutching his arm in Song Cheng Qian Gu Qing theater auditorium as spectacular stage lights blaze on ancient-costumed performers, mouth wide open in awe, photorealistic Song City grand theater with massive LED stage screen showing imperial palace, cinematic low audience-level shot looking toward the stage with dramatic backlighting from the show, vivid hot-pink-and-gold theatrical lighting, child-wonder mood"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-04-children-asking-emperor-questions.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, adorable duet moment where chibi 8-year-old boy and chibi 5-year-old boy lean toward each other whispering 'who is that?' and 'that's the emperor right?', their small chibi silhouettes framed by the colorful Song dynasty stage, photorealistic Song Cheng Qian Gu Qing theater interior with red velvet seats and imperial-themed stage backdrop, cinematic split-level shot of the boys from behind, glowing warm stage lighting as warm rim light on their hair, innocent-child-imagination mood"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-05-grandma-and-second-wife-at-show.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sweet cross-family moment where chibi healthy 70-year-old Asian grandma with jet-black silky hair in a deep-magenta silk qipao leans over to chibi second wife saying 'I have never seen a show like this in Taiwan', photorealistic Song Cheng Qian Gu Qing theater with stage light spilling across their faces, cinematic dual-portrait close-up with the colorful show blurred behind, warm tungsten spot light on faces, intimate grandmother-daughter-in-law bond"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-06-mahongxing-menu-table.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, full-table menu squabble at Mahongxing Sichuan restaurant with the colorful menu fanned out on the round table, chibi middle-aged Taiwanese Chinese father and chibi businessman friend pointing at different spicy levels, chibi wife/mother and chibi second wife glaring at each other across the table, photorealistic busy Sichuan restaurant interior with hanging red lanterns and chili-pepper motif walls, cinematic top-down table shot zooming out to reveal 13 heads, warm spicy-red-and-amber lighting, fiery family debate atmosphere"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-07-grandma-orders-twice-cooked-pork.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, surprise moment where chibi healthy 70-year-old Asian grandma with jet-black silky hair in a deep-magenta silk qipao confidently points to the menu saying 'I want the twice-cooked pork', all other 12 chibi characters around the table freeze with mouths open in shock, photorealistic Mahongxing Sichuan restaurant with vivid red decor and chili-pepper string banners, cinematic front-and-center reverse angle on grandma with the startled group blurred behind, dramatic warm red spot lighting, head-of-table authority mood"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-08-grandma-sichuan-nostalgia-memory.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply nostalgic moment where chibi healthy 70-year-old Asian grandma with jet-black silky hair in a deep-magenta silk qipao closes her eyes and reminisces 'I tasted it in Sichuan when I was young — I never forgot', photorealistic Mahongxing Sichuan restaurant with a wood-fired glowing stove behind her and steam from the cooking pot, cinematic extreme close-up of her eyelids with golden bokeh from the kitchen flames, warm amber rim light, time-travel memory mood"


But it is so good to eat", photorealistic red-oil Ma-la sauce glistening in dish, cinematic tear-and-laugh food moment"



I have been eating Sichuan food every day!" with realization face, photorealistic Sichuan restaurant steam and chili peppers in background, cinematic child revelation moment"
`,
  },

  // Day 7 — 視覺高潮 + 和解：杭州宮宴換裝
  {
    ...D7,
    dialogue: `（杭州宮宴換裝間 — 兩位太太互相幫忙選衣）
黃阿分（拿一件紅色）：『這件好看。』
黃倩（拿一件藍色）：『這件也好看。』
黃阿分：『妳紅色我藍色？』
黃倩：『換過來？』
黃阿分（看著黃倩）：『妳身材比較好，紅色妳穿。』
黃倩：『哪有！妳氣質比較好，紅色妳穿！』
（最後兩人換回來：阿分紅、倩藍）
（恩齊 vs 宸瑋不肯穿古裝）
恩齊（坐在地上）：『我不要！好癢！』
宸瑋：『我也不穿！』
阿喜（蹲下）：『你們穿一下，拍完照就脫。』
恩齊：『我不喜歡拍照！』
阿喜（轉向阿美）：『媽，妳呢？妳穿什麼？』
阿美（已經換好）：『我穿這個。唐代的。』
阿評（拿手機拍）：『媽，妳也太美了吧！』
吳董（也換好走出來）：『哇！阿姨妳好像武則天！』
阿美（笑了）：『你這孩子亂講！』
（宮宴大合照 — 13 人穿古裝）
阿喜（舉自拍棒）：『來！13 個人！看鏡頭！』
吳董：『等一下！大宇你的帽子歪了！』
黃倩（趕緊整理）：『還有大宇的衣服！』
恩齊（一直動）：『爸爸！我可以脫了嗎？』
阿喜（忍住）：『再 10 秒！』
（拍完看照片）
阿伸：『完美！13 個都入鏡了！』
阿評（看著照片）：『我媽最好看。』
阿美（碎念）：『什麼最好看！老了！』
（西湖夕陽 — 兩家人並肩走）
阿喜（對吳董）：『謝謝你陪我走 8 天。』
吳董（看著湖）：『客氣什麼！高中同學嘛！』
阿喜：『10 年了。下次不知道什麼時候。』
吳董：『不會啦！你下次有什麼行程都找我！』
阿喜（笑了）：『你不要又虧我公司虧錢。』
吳董（也笑了）：『我不會啦！我只是關心！』
`,
    shots: `00:00-00:10  杭州宮宴換裝間全景，13 人在不同角落換衣
00:10-00:20  兩位太太選衣對話特寫，鏡頭在兩人之間來回
00:20-00:30  換裝完成對比剪接：阿分紅 / 倩藍 / 阿美唐裝
00:30-00:40  恩齊 vs 宸瑋地上打滾不肯穿的搞笑鏡頭
00:40-00:50  阿美奶奶換裝完成的 360 度展示，阿評「妳也太美了吧」
00:50-01:05  吳董「妳好像武則天」一句，cut 阿美笑場
01:05-01:20  13 人古裝大合照自拍過程，吳董整理大宇帽子
01:20-01:35  合照完成看照片，阿伸「完美」，阿評「我媽最好看」
01:35-01:45  阿美碎念「什麼最好看！老了！」的特寫
01:45-02:00  西湖夕陽，兩家人並肩走的長鏡頭，背景配樂「茉莉花」古箏版
02:00-02:15  阿喜 vs 吳董夕陽對話，鏡頭從側面拍兩人剪影
02:15-02:25  「下次有什麼行程都找我」一句，鏡頭 zoom in 兩人笑

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-01-banquet-dressing-room.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chaotic-buzzing Hangzhou palace-banquet dressing room shot showing 13 chibi characters in various states of costume trying on Tang dynasty robes, chibi wife/mother holding up a red robe while chibi second wife holds up a blue one, photorealistic Chinese palace-themed dressing room with carved wooden wardrobes and rosewood mirrors, cinematic wide group shot with all subjects visible across multiple mirrors, warm tungsten-and-paper-lantern lighting, festive costume-up energy"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-02-two-wives-trade-dress-colors.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sweet sisterly negotiation moment where chibi wife/mother and chibi second wife swap red and blue Tang gowns back and forth while complimenting each other 'you wear the red better', photorealistic palace dressing room with two parallel mirrors reflecting both women, cinematic parallel-side-by-side shot showing mirrored reflections, soft silk-sash lighting in warm candlelight, intimate cross-family friendship mood"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-03-grandma-in-tang-dynasty-costume.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, regal moment of chibi healthy 70-year-old Asian grandma with jet-black silky hair in an imperial gold-and-vermilion Tang-dynasty gown emerging from the costume fitting with both hands modestly clasped, looking every bit the Tang empress, photorealistic palace-banquet dressing area with floor-length mirrors and embroidered silk screens, cinematic heroic low-angle full-body portrait with candles flanking her, deep red-and-gold imperial color palette, queenly aura mood"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-04-enchi-chenwei-cosplay-tantrum.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, hilarious child-tantrum moment where chibi 8-year-old boy and chibi 5-year-old boy roll around on the dressing-room floor refusing to wear itchy ancient costumes, chibi middle-aged Taiwanese Chinese father kneeling exhausted beside them, photorealistic palace-banquet dressing room with scattered silk robes and props, cinematic dutch-angle from floor level showing the chaos, warm tungsten side lighting with high-contrast shadows, slapstick family-comedy mood"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-05-wu-dong-grandma-wu-zetian-comparison.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, comedic flattery moment where chibi businessman friend steps back and theatrically proclaims chibi healthy 70-year-old Asian grandma with jet-black silky hair in an imperial Tang-dynasty robe looks just like Empress Wu Zetian, grandma's face reddening with laughter and mock embarrassment, photorealistic palace-banquet dressing room with carved rosewood screen, cinematic duo shot with businessman on one side and grandma on the other, warm candlelight glow, hilarious bro-bond humor"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-06-13-person-tang-costume-group-photo.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, grand 13-person Tang-dynasty-costume group photo at the Hangzhou palace banquet hall with a selfie stick held high, all 13 chibi characters wearing matching imperial Tang robes in coordinated red and gold, chibi healthy 70-year-old Asian grandma with jet-black silky hair in the imperial Tang gown at the center looking regal, photorealistic ornate Hangzhou palace-banquet hall with carved wooden pillars and red silk banners, cinematic high-angle hero shot looking down at the assembled group, dramatic warm spotlights with rich vermilion-and-gold color palette, celebratory clan portrait mood"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-07-apin-says-grandma-is-most-beautiful.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sweet family-reaction moment where chibi eldest brother/uncle looks at the just-taken photo and declares 'my mom is the most beautiful', chibi healthy 70-year-old Asian grandma with jet-black silky hair in an imperial Tang-dynasty gown waving her hand shyly and muttering 'I'm old!', photorealistic palace-banquet interior with red silk wallpaper and carved wooden throne in background, cinematic dual-subject close-up with crisp focus on grandma's embarrassed smile, soft amber interior lighting, heartwarming mother-pride moment"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-08-west-lake-sunset-axi-vs-wu-dong-silhouette.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply cinematic West Lake sunset moment where chibi middle-aged Taiwanese Chinese father and chibi businessman friend walk side by side in profile as the sun sets behind them casting their chibi silhouettes onto the warm orange water, photorealistic Hangzhou West Lakeside with distant Leifeng Pagoda silhouette and lotus leaves in the lake, cinematic extreme horizontal panning silhouette shot, warm saturated orange-and-purple sunset palette with golden rim light, twenty-year-brotherhood-friendship mood"



Why do fairies fly?" with curious eyes, chibi middle-aged Taiwanese Chinese father A-xi explaining with hand gesture, photorealistic palace performance backdrop, cinematic educational father-son moment"
I also want to look like flying" then jumping into the air with two feet off ground, photorealistic palace banquet hall floor, cinematic comedic child attempt to fly"


Grandma looks perfect in her costume" with appreciative expression, chibi healthy 70-year-old Asian grandma with jet-black silky hair in red empress costume feeling emotional, photorealistic palace banquet hall warm light, cinematic touching family moment"
`,
  },

  // Day 8 — 收心 + 真正和解：返程
  {
    ...D8,
    dialogue: `（靈隱寺 — 13 人上香）
阿美（跪在佛前）：『保佑我們一家平安。』
阿評（跪在旁邊）：『也保佑爸在天上。』
（兩人靜默 5 秒）
（綠茶餐廳 — 最後一頓午餐）
吳董（舉杯）：『來！敬這 8 天！』
阿喜：『敬我們的家人！』
黃阿分：『敬兩家的小朋友！』
黃倩：『敬吳董不要再虧阿喜公司！』
吳董：『喂！』
（全桌大笑）
恩齊（舉果汁）：『敬我！』
大宇：『敬我！』
小宇：『敬我！』
宸瑋：『敬我！』
（4 個小朋友亂講話）
阿美（看著孫子）：『這幾個皮蛋。』
（蕭山機場 — 告別）
阿伸（抱阿喜）：『阿喜哥，下次再約！』
阿喜（拍背）：『好！你帶嫂子一起！』
阿橋：『阿喜哥，謝謝招待！』
阿茹：『下次換我們招待！』
吳董（握手）：『阿喜，10 年後再約一次！』
阿喜（握手）：『一言為定！』
（飛機上 — 恩齊累到睡著）
恩齊（趴在阿喜肩上）：『嗯嗯……』
阿喜（輕聲）：『回家了。』
（鏡頭轉向外灘 / 西塘 / 烏鎮 / 西湖的回憶剪接）
（最後定格在 13 人合照）
`,
    shots: `00:00-00:10  靈隱寺全景，13 人上香，鏡頭從門口推進
00:10-00:25  阿美跪佛前特寫，「保佑我們一家平安」
00:25-00:35  阿評跪旁邊「也保佑爸在天上」，鏡頭捕捉兩人靜默
00:35-00:50  綠茶餐廳乾杯全景，鏡頭繞桌 360 度
00:50-01:05  吳董敬酒 vs 黃倩補刀「不要再虧阿喜公司」笑場
01:05-01:15  4 個小朋友舉果汁亂講話的搞笑剪接
01:15-01:25  阿美奶奶看孫子「這幾個皮蛋」特寫
01:25-01:40  蕭山機場告別全景，阿伸抱阿喜、吳董握手
01:40-01:50  「10 年後再約一次」握手剪接，鏡頭從兩人剪影
01:50-02:05  飛機上恩齊累到趴在阿喜肩上，鏡頭從座位側面拍
02:05-02:15  「回家了」一句，鏡頭 zoom in 阿喜表情
02:15-02:35  回憶剪接 — 外灘 / 西塘 / 烏鎮 / 西湖，每個景點 3 秒
02:35-02:45  最後定格在 13 人合照，背景配樂「朋友」鋼琴版

00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-01-grandma-praying-lingyin-temple.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply reverent close-up of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a black silk qipao kneeling on the prayer cushion at Lingyin Buddhist Temple in Hangzhou with hands pressed together in prayer, soft incense smoke curling around her silhouette, photorealistic traditional Chinese Buddhist temple interior with red lacquered wooden pillars and gold-leaf Buddha statues, cinematic tight portrait with shallow DOF, warm morning candlelight filtering through temple haze, poignant spiritual-reflection mood"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-02-apin-praying-for-deceased-father.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, profoundly moving Lingyin Temple moment where chibi eldest brother/uncle kneels beside chibi healthy 70-year-old Asian grandma with jet-black silky hair in a black silk qipao, both with closed eyes murmuring a prayer for their late husband and father, photorealistic Lingyin Temple main hall with massive golden Buddha statue and burning red candles in foreground, cinematic side-by-side kneeling shot with equal weight, warm amber temple interior lighting with incense haze, deeply intimate sibling-and-mother unity moment"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-03-green-tea-restaurant-farewell-toast.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, joyful celebratory farewell toast at the Green Tea Hangzhou restaurant with 13 chibi characters raising glasses of juice, beer, and tea around a round table full of Hangzhou specialties (Dongpo pork, West Lake Vinegar Fish, Longjing Shrimp), chibi healthy 70-year-old Asian grandma with jet-black silky hair in a black silk qipao smiling with both hands wrapped around her teacup, photorealistic Green Tea restaurant interior with red lanterns and bamboo-decor walls, cinematic 360-degree group toast shot from above the round table, warm tungsten amber lighting, bittersweet farewell-lunch mood"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-04-huang-qian-roasts-about-company.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, hilarious roast moment where chibi second wife raises her glass in a mock toast and adds 'here's to Mr. Wu not making fun of Axi's company losing money anymore!', chibi businessman friend's jaw drops open and chibi middle-aged Taiwanese Chinese father bursts into laughter, photorealistic Green Tea restaurant long banquet table with hanging calligraphy banners, cinematic side-composition capturing all three speakers in one frame, warm restaurant tungsten glow with soft overhead spot, priceless family-comedy climax"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-05-four-kids-cheers-toast-chaos.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chaotic four-kids-toasting moment where chibi boys ages 8, 5, 10 and 7 stand on their chairs each shouting 'cheers to me!' in turn with juice glasses clinking wildly, chibi healthy 70-year-old Asian grandma with jet-black silky hair in a black silk qipao watching them with an indulgent grandma-smile, photorealistic Green Tea restaurant main hall with red lanterns and dangling calligraphy, cinematic low-angle shot looking up at the four children, warm restaurant tungsten side-lighting, hilarious brat-pack energy"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-06-grandma-watches-grandkids-with-love.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, warmly affectionate grandma-monitor shot of chibi healthy 70-year-old Asian grandma with jet-black silky hair in a black silk qipao leaning on the back of a chair watching her four chibi grandsons (ages 8, 5, 10, 7) misbehave and calling them 'these little rascals', photorealistic Green Tea restaurant ambiance with steam rising from a teapot and warm lantern bokeh in background, cinematic side-portrait close-up with soft contemplative mood, warm amber bokeh and gentle rim light, doting-grandma-love atmosphere"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-07-xiaoshan-airport-farewell-hands-shake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic Xiaoshan Airport farewell shot where chibi businessman friend and chibi middle-aged Taiwanese Chinese father grip each other's hands in a manly handshake with chibi wife/mother and chibi second wife standing behind dabbing their eyes, chibi colleague/同事 hugging chibi middle-aged father from the side, photorealistic modern Hangzhou Xiaoshan International Airport terminal with floor-to-ceiling glass walls and a plane visible outside, cinematic two-layer composition with foreground handshake and background departures board, even cool airport LED lighting with hints of warm afternoon sun, bittersweet 10-year-brotherhood-reunion-farewell mood"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-08-enqi-sleeps-on-axi-shoulder.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, deeply moving cabin-interior shot of chibi 5-year-old boy fast asleep on chibi middle-aged Taiwanese Chinese father's shoulder with a thin saliva thread at his lip, the father's eyes moistening as the airplane reads 'we are home', photorealistic airplane cabin at night with overhead reading-light casting warm cone onto the sleeping child, the cabin aisle lights dimmed blue, cinematic intimate side-profile shot with shallow DOF and soft cabin warm light, tender end-of-journey father-son moment"





Will we come back next time?" with reflection face, the same face reflected in airplane window glass, photorealistic airplane window and city lights, cinematic emotional child farewell"

`,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 劇本 C — 宸瑋的江南 — 8 日獨立 dayBlocks（小朋友視角 + 地理歷史小教室）
// 每個小地點結尾都有「📚 宸瑋小教室」：宸瑋用小朋友口吻講一段地理歷史，
// 阿喜補充細節，宸瑋結尾「好酷喔！」。教育橋段藏在可愛互動裡。
// ──────────────────────────────────────────────────────────────────────────────
const C_DAYS: DayBlock[] = [
  // Day 1 — 出發：上海從小漁村變大都會 + 外灘萬國建築群
  {
    ...D1,
    dialogue: `（宸瑋旁白）
宸瑋（畫外音）：『今天要跟爸爸媽媽弟弟，還有爺爺奶奶一起出門。』
宸瑋：『我們要去很遠的地方。坐飛機！』
（T1 集合 — 宸瑋視角看大人都很忙）
宸瑋：『爸爸在找東西。』
宸瑋：『媽媽在跟那個阿姨講話。』
宸瑋：『爺爺——喔不對，是大伯公——他在拍照。』
宸瑋：『奶奶在跟吳叔叔講話。』
宸瑋：『吳叔叔好高喔。』
恩齊（拉宸瑋）：『哥哥你看！飛機！』
宸瑋（抬頭）：『好大喔。我們要坐那個嗎？』
（飛機起飛 — 宸瑋第一次的體驗）
宸瑋：『耳朵好痛！』
黃阿分：『要吞口水。』
宸瑋（吞口水）：『還是好痛。』
恩齊（在旁邊嚼口香糖）：『我有口香糖！要嗎？』
宸瑋：『弟弟你為什麼有口香糖？』
恩齊：『媽媽給我的！』
宸瑋（對媽媽）：『為什麼只有弟弟有？』
黃阿分（尷尬）：『啊……媽媽忘記了。』
（飛機上 — 看到雲）
宸瑋（趴窗邊）：『爸爸，那個白白的是什麼？』
阿喜：『那是雲。你看，形狀像什麼？』
宸瑋：『像……棉花糖！』
阿喜（笑了）：『對。下面是台灣海峽，等一下就到中國了。』
宸瑋：『中國很遠嗎？』
阿喜：『從台北飛過去差不多兩個小時。』
宸瑋：『那跟我去奶奶家一樣遠？』
阿喜：『差不多。』
（落地上海浦東機場）
宸瑋（看到磁浮列車）：『哇！爸爸那個是什麼？沒有輪子！』
阿喜：『那是磁浮列車。全世界最快的。時速 431 公里。』
宸瑋：『431？比高鐵還快嗎？』
阿喜：『比高鐵快很多。從機場到市區只要 8 分鐘。』
宸瑋（張大嘴）：『8 分鐘！我們在台北塞車就不只了。』
阿喜（笑了）：『對。所以上海很厲害。』
（外灘夜景 — 兩家人各自看風景）
宸瑋：『爸爸，那個亮亮的球是什麼？』
阿喜：『那是東方明珠塔。上海的地標。』
宸瑋：『為什麼叫明珠？是有寶藏嗎？』
阿喜（笑了）：『不是寶藏。是電視塔。』
宸瑋：『電視塔？那我們家的電是從這邊來的嗎？』
阿喜：『不是，這是電視的電。』
宸瑋（困惑）：『電視的電？電不是都一樣嗎？』

📚 宸瑋小教室 — 上海浦東
宸瑋（畫外音）：『上海以前是一個小漁村。後來 1990 年代開始發展，現在變成全世界最大的城市之一。浦東這個區，30 年前還都是農田。』
阿喜：『對。所以你現在看到的東方明珠塔是 1994 年蓋的，比爸爸年紀還小。』
宸瑋（驚）：『比爸爸小？』
阿喜：『爸爸小時候還沒有這棟樓。』
宸瑋：『那時候上海長什麼樣子？』
阿喜：『很多矮房子跟田。現在變成大樓跟高鐵。』
宸瑋（認真）：『哇……30 年就變這樣。好酷喔。』

📚 宸瑋小教室 — 外灘萬國建築群
宸瑋（畫外音）：『外灘這邊的房子是 1930 年代蓋的。當時上海有很多外國人，所以房子長得像歐洲的建築。』
阿喜：『這些叫「萬國建築博覽群」。英國、法國、美國的風格都有。』
宸瑋：『為什麼外國人在上海蓋房子？』
阿喜：『因為以前上海是外國的租界。外國人在這邊做生意。』
宸瑋：『租界？像我們租房子那樣嗎？』
阿喜：『有點像。但以前是不公平的。』
宸瑋（想了想）：『那現在呢？』
阿喜：『現在中國拿回來了。所以這些房子是中國的歷史古蹟。』
宸瑋：『喔……原來房子也有歷史。好酷喔。』
`,
    shots: `00:00-00:05  宸瑋畫外音開場，鏡頭從小朋友視角仰拍家裡天花板
00:05-00:15  T1 機場大廳 — 宸瑋視角走在大人中間，鏡頭搖晃
00:15-00:25  宸瑋一一介紹每個大人（旁白配合），鏡頭快速剪接每個親友
00:25-00:35  恩齊拉宸瑋看飛機，兩個小朋友仰頭特寫
00:35-00:50  飛機起飛 — 宸瑋靠窗看窗外，窗外雲朵特寫 5 秒
00:50-01:00  宸瑋耳朵痛，鏡頭從宸瑋視角拍黃阿分遞水
01:00-01:10  恩齊得意秀口香糖，宸瑋搶，鏡頭捕捉兄弟互動
01:10-01:25  浦東機場落地，宸瑋看到磁浮列車驚呼的特寫
01:25-01:40  磁浮列車車內 8 分鐘體驗 + 時速表特寫
01:40-01:55  外灘夜景全景，宸瑋小小身影在前景剪影
01:55-02:10  宸瑋問「東方明珠是有寶藏嗎」阿喜笑場的對話剪接
02:10-02:30  📚 小教室 1 — 上海浦東 30 年發展，配航拍夜景
02:30-02:50  📚 小教室 2 — 外灘萬國建築群，配老照片 vs 現在對比
02:50-03:00  宸瑋「好酷喔」一句定格，鏡頭從下往上拍小朋友表情
00:00-00:08  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-01-changhua-airport-perspective.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Taoyuan International Airport Terminal 1 departure hall with chibi little boy Chenwei looking up at the ceiling and an airplane through tall glass windows, chibi elderly Asian grandmother with jet-black hair walking beside with chibi middle-aged Taiwanese Chinese father A-xi, real airport architecture with morning sunlight, cinematic low-angle shot"
00:08-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-02-cloud-window-wonder.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, inside airplane economy cabin with chibi little boy Chenwei pressing face against window looking at clouds outside, photorealistic airplane window framing cotton-candy clouds and golden hour sky, soft cabin lighting, cinematic close-up"
00:30-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-03-maglev-431km-awe.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Shanghai Pudong Maglev train arriving at platform with sleek futuristic design showing 431 km/h on display board, chibi little boy Chenwei and chibi father A-xi standing behind glass watching, photorealistic Maglev details with motion blur, cinematic low-angle shot"
00:55-01:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-04-bund-night-panorama.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Shanghai Bund night panorama with Oriental Pearl Tower glowing pink and purple in distance, chibi little boy Chenwei as small silhouette on Bund waterfront looking up at the skyline, photorealistic historic European architecture lit golden, neon lights reflecting on Huangpu River, cinematic wide-angle shot"
01:05-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-05-pointing-at-oriental-pearl.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Bund waterfront at night with chibi little boy Chenwei and chibi businessman friend Wu-dong both pointing at Oriental Pearl Tower glowing in background, chibi elderly Asian grandmother with jet-black hair smiling behind them, photorealistic Bund railing and skyline, cinematic medium shot"
01:15-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-06-grandpa-brought-grandma.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi little boy Chenwei holding chibi father A-xi hand at the Bund, chibi elderly Asian grandmother with jet-black hair standing beside pointing at Bund historic buildings, photorealistic night waterfront with golden colonial architecture, cinematic three-shot composition"Did grandpa bring you here when young?", chibi healthy 70-year-old Asian grandma with jet-black silky hair smiling with nostalgic memory, photorealistic Shanghai night skyline behind, cinematic intimate family moment"
02:55-03:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-07-pudong-30-year-aerial.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Shanghai Pudong skyline modern skyscrapers at sunset, foreground chibi little boy Chenwei standing at Bund railing looking across the river at the modern skyline, photorealistic dramatic sunset reflecting on Huangpu River, cinematic wide-angle shot"
03:10-03:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-08-bund-foreign-buildings.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi little boy Chenwei standing in front of Bund historic European-style buildings at night, chibi elderly Asian grandmother with jet-black hair beside, photorealistic colonial-era 1930s architecture lit golden with full moon above, cinematic low-angle shot"`,
  },

  // Day 2 — 特種兵日：豫園 400 年 + 城隍廟 + 生煎由來 + 西塘春秋戰國
  {
    ...D2,
    dialogue: `（小楊生煎 — 宸瑋第一次吃上海早餐）
宸瑋（看著生煎）：『這個為什麼下面有白白的？』
阿喜：『那是芝麻。你吃吃看。』
宸瑋（咬一口）：『嗚！爆汁了！嘴巴好燙！』
恩齊（已經吃完兩個）：『哥哥你好慢！』
（宸瑋被燙到喝水）
宸瑋：『這個東西叫什麼？』
阿喜：『生煎包。又叫「生煎饅頭」。上海最有名的早餐。』
宸瑋：『為什麼叫「生煎」？』
阿喜：『因為是用平底鍋「煎」出來的，下面脆脆的。』
宸瑋（指）：『那為什麼上面沒有煎？白白軟軟的？』
阿喜：『因為上面是用「發酵」的麵團，要蒸才會膨。』
宸瑋：『所以一半煎一半蒸？』
阿喜（驚）：『你觀察得很仔細耶！』
（豫園 — 宸瑋眼中的中國古建築）
宸瑋：『爸爸，那個屋頂為什麼翹起來？』
阿喜：『那是中國古代的建築風格。為了讓雨水流下來。』
宸瑋：『為什麼雨水要流下來？』
阿喜：『因為……這樣屋頂不會壞。』
宸瑋：『可是台北都沒有這種屋頂。』
阿喜：『台北沒有。中國才有。』
宸瑋（想了想）：『那中國比較厲害？』
阿喜：『不是比較厲害，是不一樣。』
（豫園裡面 — 宸瑋發現奇怪的石頭）
宸瑋（指一塊石頭）：『爸爸，那個石頭怎麼長這樣？像被咬一口。』
阿喜：『那叫「玉玲瓏」。是豫園的鎮園之寶。』
宸瑋：『玉？是玉石嗎？』
阿喜：『據說是北宋花崗岩。已經 400 多年了。』
宸瑋（摸了）：『400 多年？比爺爺還老？』
阿喜（笑了）：『比爺爺老 100 倍。』
宸瑋（驚）：『那這顆石頭比我們全家加起來還老！』
（城隍廟 — 宸瑋對香的疑問）
宸瑋（捏鼻子）：『這個味道好臭！』
黃阿分：『那是香。你要尊重。』
宸瑋：『為什麼要燒這個？』
阿美（剛好經過）：『那是要拜拜的。跟神明講話。』
宸瑋：『神明聽得到嗎？』
阿美：『聽得到。』
宸瑋（對香講）：『神明你好，我叫宸瑋。』
（南翔饅頭店 — 排隊買小籠包）
宸瑋：『爸爸為什麼要排隊？』
阿喜：『因為這家的小籠包很有名。120 年老店。』
宸瑋：『120 年！比阿嬤還老！』
阿喜：『對。創始人是南翔鎮的人，所以叫南翔小籠包。』
宸瑋（指招牌）：『那個字我看不懂。』
阿喜：『那是繁體字。「饅頭」就是我們說的包子。』
（西塘夜遊 — 宸瑋眼中的夜景）
宸瑋：『爸爸，那個船為什麼會自己走？』
阿喜：『下面有人在划槳。』
宸瑋（趴欄杆看）：『可是我看不到。』
阿喜：『因為在船裡面。』
宸瑋：『那他們不會累嗎？』
阿喜（想了很久）：『會啊。但他們很喜歡划。』
宸瑋：『喜歡的事情就不會累嗎？』
阿喜（看著宸瑋）：『對。喜歡的事情就不會累。』

📚 宸瑋小教室 — 豫園 400 年歷史
宸瑋（畫外音）：『豫園是 1559 年蓋的。是一位官員為了他爸爸蓋的。叫「豫」是因為爸爸很「安逸」。』
阿喜：『對。豫園有 400 多年歷史。現在是中國國家重點保護的歷史古蹟。』
宸瑋：『那個時候還沒有台北嗎？』
阿喜：『台北那時候還沒有人來開墾。台北府是 1887 年才有的。』
宸瑋（驚）：『豫園比台北府早了 300 多年！』
阿喜：『對。所以豫園是中國的寶。』
宸瑋：『那我們要好好保護它？』
阿喜（點頭）：『對。不能亂摸亂畫。』
宸瑋（認真）：『好。我知道了。玉玲瓏我剛剛只有輕輕摸。』

📚 宸瑋小教室 — 西塘「吳根越角」
宸瑋（畫外音）：『西塘古鎮有 1000 多年歷史。古代是吳國跟越國的邊界，所以叫「吳根越角」。』
阿喜：『對。吳國在蘇州，越國在浙江。西塘剛好在兩國中間。』
宸瑋：『吳國跟越國打架過嗎？』
阿喜：『打過。西元前 496 年。』
宸瑋（驚）：『西元前？那不是比耶穌還早？』
阿喜（笑了）：『對。那時候還沒有耶穌呢。』
宸瑋：『哇……那這裡看過很多人喔。』
阿喜：『對。每塊石頭都看過 1000 年的故事。』
宸瑋（想了想）：『那我們踩的時候要小心一點。』
阿喜（抱宸瑋）：『你這個孩子好溫柔。』
`,
    shots: `00:00-00:10  小楊生煎店 — 宸瑋視角看著盤子裡的生煎特寫
00:10-00:20  宸瑋咬爆生煎的瞬間特寫（捕捉湯汁飛出來）
00:20-00:30  恩齊吃完第二個得意的特寫，宸瑋還在第一個
00:30-00:45  豫園 — 宸瑋抬頭看屋頂的仰角鏡頭
00:45-01:00  宸瑋問屋頂問題，阿喜解釋的剪接
01:00-01:15  宸瑋問「中國比較厲害嗎」，阿喜「是不一樣」的教育橋段
01:15-01:30  玉玲瓏特寫，宸瑋摸石頭的剪接
01:30-01:45  「比我們全家還老」一句，鏡頭 zoom in 小朋友表情
01:45-02:00  城隍廟 — 宸瑋捏鼻子的特寫
02:00-02:15  宸瑋對香自我介紹的搞笑片段
02:15-02:30  南翔饅頭店排隊，宸瑋指招牌問字
02:30-02:45  西塘夜遊 — 宸瑋趴欄杆看船的剪影
02:45-03:00  「喜歡的事情就不會累」一句，鏡頭從宸瑋視角看阿喜
03:00-03:25  📚 小教室 1 — 豫園，配老照片 vs 現在對比，鏡頭緩慢推拉
03:25-03:50  📚 小教室 2 — 西塘，配春秋吳越地圖動畫
03:50-04:00  宸瑋「我們踩的時候要小心」一句定格，阿喜抱他特寫
00:30-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-01-yu-garden-ming-rooftop.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Yu Garden entrance with chibi little boy Chenwei and chibi eldest brother uncle A-ping looking up at Ming Dynasty curved rooftop with dragon decorations, photorealistic traditional Chinese architecture 400 years old, golden hour sunlight, cinematic low-angle shot"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-02-grandma-recalls-yu-garden.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Yu Garden rooftop scene with chibi elderly Asian grandmother with jet-black hair standing beside chibi little boy Chenwei, both looking at the curved rooftop with pagoda in distance, photorealistic Yu Garden stone courtyard, cinematic medium shot"I saw this when young, your grandpa brought me here", chibi little boy Chenwei listening with curious big eyes, photorealistic Yu Garden rooftop with soft afternoon light, cinematic documentary tender moment"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-03-yu-garden-jade-linglong.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Yu Garden Jade Linglong decorative Ming stone with chibi little boy Chenwei pointing at it, photorealistic intricate jade carving detail with soft museum lighting, cinematic close-up"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-04-shengjian-explode-juice.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Xiao Yang Sheng Jian stall with chibi little boy Chenwei crouching watching soup dumpling bite explode with juice, chibi 5-year-old brother Enqi laughing beside, photorealistic Shanghai street food stall with steam rising, cinematic close-up"
02:30-02:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-05-xitang-rail-watching-boat.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Xitang ancient water town at night with chibi little boy Chenwei leaning on stone railing watching black-canopied wooden gondola pass by, photorealistic Xitang night canal with red lanterns glowing reflected on water, cinematic backlit wide shot"
02:45-03:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-06-chenwei-philosophy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Xitang water town night with chibi little boy Chenwei leaning on stone railing looking at gondola lights reflected on water, chibi father A-xi standing beside, photorealistic Xitang canal with red lanterns, cinematic medium shot"If you love what you do, you do not get tired" with serious philosophical expression, photorealistic Xitang night canal background, cinematic warm child philosophy moment"
03:00-03:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-07-yu-garden-400-year-history.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Yu Garden Ming Dynasty rooftop with old stone texture, foreground chibi little boy Chenwei and chibi father A-xi standing at rooftop edge looking out over the garden, photorealistic Yu Garden stone architecture details, cinematic wide-angle shot"
03:25-03:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-08-spring-autumn-wu-yue-map.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Xitang ancient water town stone bridge with chibi little boy Chenwei and chibi father A-xi standing on bridge looking down at canal, photorealistic Xitang stone arch bridge and old white-walled houses, cinematic wide-angle shot"`,
  },

  // Day 3 — 西塘整天 + 京杭大運河 + 烏鎮茅盾故鄉
  {
    ...D3,
    dialogue: `（西塘早茶 — 宸瑋發現大人分兩群）
宸瑋：『為什麼爸爸跟叔叔們要出去？』
黃阿分：『爸爸去按摩。』
宸瑋：『按摩是什麼？』
黃阿分：『就是按腳。』
宸瑋：『為什麼要按腳？』
黃阿分：『因為走路走得很累。』
宸瑋：『那我們不累嗎？』
黃阿分：『你們是小朋友。小朋友不會累。』
恩齊（馬上舉手）：『我會累！』
（西塘小巷 — 宸瑋跟大伯公、阿評爺爺走慢路線）
宸瑋（拉阿評）：『大伯公，那個是什麼？』
阿評：『那個是烏篷船。』
宸瑋：『可以坐嗎？』
阿評：『可以啊。要不要？』
宸瑋（眼睛亮）：『要！』
（坐船時 — 宸瑋眼中的水鄉）
宸瑋：『哇！水好綠！』
恩齊（把手伸出去）：『水涼涼的！』
宸瑋：『弟弟你不要把手伸出去！會掉下去！』
恩齊：『可是我想摸水。』
阿評（趕緊抓住恩齊）：『大伯公抓著你。』
宸瑋（看著水）：『大伯公，為什麼這裡的房子都在水上面？』
阿評：『這樣可以坐船出門。』
宸瑋：『坐船出門？好酷喔！台北可以嗎？』
阿評（笑了）：『台北沒有水可以坐船。』
宸瑋：『那我們可以搬來這裡嗎？』
阿評：『不行啊。我們要回台北上班上學。』
宸瑋（想了想）：『那我們下次再來坐船。』
（西塘古橋 — 宸瑋數橋）
宸瑋：『爸爸，西塘有幾座橋？』
阿喜：『有名的有 11 座。最老的是「環秀橋」，400 多年了。』
宸瑋：『400 多年！又是 400 多年！』
阿喜（笑了）：『中國的東西都很老。』
宸瑋：『那這裡最老的東西是什麼？』
阿喜：『除了橋，還有煙雨長廊。那個屋頂的瓦片。』
宸瑋（抬頭看）：『哇……那個瓦片是古代人燒的？』
阿喜：『對。明清時代燒的。』
（京杭大運河 — 高速路上經過）
宸瑋（從車窗看）：『爸爸，那個河好寬！』
阿喜：『那是京杭大運河。從北京到杭州。』
宸瑋：『多遠？』
阿喜：『1700 多公里。是世界最長的人工河。』
宸瑋：『比我們台灣到日本還遠嗎？』
阿喜：『比台灣到日本遠很多。』
宸瑋（驚）：『那條河蓋了多久？』
阿喜：『從春秋時代開始挖，挖了 2000 年。』
宸瑋：『2000 年？我們家才多久？』
阿喜（笑了）：『我們家才幾十年。跟大運河比是剛出生。』
（烏鎮入夜 — 宸瑋看夜景）
宸瑋：『爸爸，這個鎮跟西塘長不一樣。』
阿喜：『對。這個叫烏鎮。是茅盾的故鄉。』
宸瑋：『茅盾是誰？』
阿喜：『他是中國很有名的作家。寫過一本小說叫《子夜》。』
宸瑋：『他住這裡嗎？』
阿喜：『對。他的老房子現在變成博物館了。我們明天去看。』
宸瑋（眼睛亮）：『我可以看到他寫字的桌子嗎？』

📚 宸瑋小教室 — 京杭大運河世界遺產
宸瑋（畫外音）：『京杭大運河是中國古代最大的工程。比中國的萬里長城還早 1000 多年。』
阿喜：『對。隋朝時候挖的。2014 年被聯合國列為世界文化遺產。』
宸瑋：『世界遺產是什麼意思？』
阿喜：『就是全世界都覺得很重要，要好好保護的東西。』
宸瑋：『那我們台灣有嗎？』
阿喜：『台灣還沒有。但台灣有很多很美的地方，未來也可以申請。』
宸瑋（想了想）：『那我們要好好愛護台灣。』
阿喜（摸宸瑋頭）：『對。從小就要愛護。』
宸瑋：『好。我知道了。』

📚 宸瑋小教室 — 烏鎮茅盾
宸瑋（畫外音）：『茅盾本名叫沈雁冰。他是浙江烏鎮人。他寫的小說在中國很有名，連外國人也都讀過。』
阿喜：『茅盾是他的筆名。真正的名字叫沈雁冰。』
宸瑋：『為什麼要用筆名？』
阿喜：『以前寫作的人怕被政府抓。所以用假名。』
宸瑋：『抓？為什麼？』
阿喜：『因為他寫的東西批評當時的社會。』
宸瑋（想了想）：『所以寫文章也會危險喔？』
阿喜：『以前會。現在中國可以自由寫作了。茅盾是個勇敢的人。』
宸瑋（認真）：『那我要當一個會寫文章的人。』
阿喜（笑了）：『好啊。你先把日記寫好。』
`,
    shots: `00:00-00:10  西塘早茶客 — 宸瑋視角看大人分兩群
00:10-00:25  宸瑋問「為什麼要按腳」黃阿分解釋的剪接
00:25-00:35  恩齊「我也會累」搞笑特寫
00:35-00:50  西塘小巷長鏡頭，宸瑋走在 4 個小朋友最前面
00:50-01:05  阿評解釋烏篷船，鏡頭拍船在水上
01:05-01:20  坐船時 — 宸瑋看水的特寫，水面倒影
01:20-01:35  恩齊伸手摸水被阿評抓，鏡頭捕捉緊張瞬間
01:35-01:50  宸瑋問「為什麼房子在水上面」，阿評解釋的剪接
01:50-02:05  宸瑋「那我們可以搬來這裡嗎」，阿評笑場的剪接
02:05-02:20  西塘古橋，宸瑋抬頭看瓦片
02:20-02:35  高速路上，宸瑋從車窗看大運河
02:35-02:50  烏鎮夜景 — 宸瑋跟阿喜對話
02:50-03:15  📚 小教室 1 — 京杭大運河，配地圖動畫 + 老照片
03:15-03:40  📚 小教室 2 — 茅盾，配烏鎮老照片 + 茅盾故居照片
03:40-03:50  宸瑋「我要當會寫文章的人」一句定格
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-01-xitang-gondola-perspective.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi little boy Chenwei on Xitang gondola with chibi eldest brother uncle A-ping, water reflections of ancient white-walled Chinese houses, photorealistic late morning soft light on canal, cinematic wide-angle shot from boat level"
01:40-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-02-underwater-hand-reach.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Xitang canal with chibi little boy Chenwei standing on stone bank reaching hand toward the water surface, ripples with willow tree shadows reflected, photorealistic water texture with old stone houses behind, cinematic medium shot"
02:05-02:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-03-grand-canal-highway.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi little boy Chenwei on tour bus looking out window at Grand Canal stretching into distance, photorealistic highway landscape with flat Chinese farmland and ancient canal bridges, cinematic wide shot through bus window"
02:20-02:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-04-grand-canal-window.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi little boy Chenwei on tour bus looking out window at Grand Canal in autumn afternoon light, photorealistic long-stretching Chinese canal with stone bridges, cinematic wide shot through bus window"
02:35-02:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-05-wuzhen-night-father-son.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen water town at night with chibi little boy Chenwei and chibi father A-xi sitting on stone bench by canal, lanterns reflecting on calm water, photorealistic Wuzhen night canal, cinematic medium shot"
02:50-03:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-06-grand-canal-unesco.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Beijing-Hangzhou Grand Canal stretching through Chinese landscape with ancient stone bridges and traditional boats, chibi little boy Chenwei standing on a bridge looking down at the canal, photorealistic grand canal scenery, cinematic wide-angle shot"
03:15-03:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-07-maodun-former-residence.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen Maodun former residence with chibi little boy Chenwei peering into a traditional wooden study with old writing desk, photorealistic traditional Chinese scholar room with wooden furniture, cinematic over-the-shoulder shot"
03:40-03:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-08-chenwei-wants-to-write.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen Maodun former residence wooden desk with old brush and ink, chibi little boy Chenwei standing at the desk looking at the writing tools, photorealistic traditional Chinese scholar room, cinematic close-up"I want to be someone who writes articles" with determined face, Maodun birthplace Wuzhen background, photorealistic old photograph aesthetic blended with chibi cuteness, cinematic inspirational child moment"`,
  },

  // Day 4 — 烏鎮西柵：藍染工藝 + 水閣建築 + 茅盾故居
  {
    ...D4,
    dialogue: `（烏鎮染坊 — 宸瑋看到藍布）
宸瑋：『爸爸！那個是什麼？好大一片！』
阿喜：『那是染布。用藍色的染料染出來的。』
宸瑋：『為什麼是藍色？』
阿喜：『因為藍色代表這邊的傳統。』
宸瑋（跑過去）：『我可以摸嗎？』
工作人員（搖頭）：『小朋友不行。會弄髒。』
宸瑋（失望）：『蛤。』
阿喜（蹲下）：『我們在外面看就好。你看那個布飄起來像不像海浪？』
宸瑋（看著）：『像！』
恩齊：『像雲！』
大宇：『像媽媽的裙子！』
（染坊裡面 — 宸瑋問染料）
宸瑋：『爸爸，藍色從哪裡來？』
阿喜：『從一種植物叫「藍草」。江南地區以前種很多。』
宸瑋：『植物可以變成染料？』
阿喜：『對。要先把葉子發酵，加石灰，才能染出顏色。』
宸瑋：『哇……好複雜。』
阿喜：『這個工藝有 1000 多年了。』
宸瑋（驚）：『1000 多年？那比明朝還早？』
阿喜（驚）：『你記得明朝？對，明朝之前。』
（西柵水閣 — 宸瑋看到船）
宸瑋：『爸爸！這個船跟我們昨天坐的不一樣！』
阿喜：『對。這個是烏鎮的船。』
宸瑋：『哪裡不一樣？』
阿喜：『船頂是篷子。下面有窗戶。』
宸瑋：『可以坐嗎？』
阿喜：『要排隊。排到我們就坐。』
恩齊（拉阿喜）：『爸爸我要坐！』
宸瑋：『我也要坐！』
（排隊時 — 宸瑋跟奶奶的對話）
宸瑋（看到阿美坐下）：『奶奶妳為什麼坐著？』
阿美：『奶奶累了。』
宸瑋：『奶奶累了為什麼不回家？』
阿美：『因為奶奶想看你們玩。』
宸瑋：『那奶奶不要看我們玩。奶奶回去休息。』
阿美（笑了）：『傻瓜。看你們玩奶奶就不累。』
宸瑋（想了想）：『奶奶好奇怪。』
（西柵水上房子 — 宸瑋看建築）
宸瑋：『爸爸，為什麼這個房子一半在水裡？』
阿喜：『這個叫「水閣」。下面用木頭插在水裡。』
宸瑋：『為什麼要這樣蓋？』
阿喜：『因為水太多。地不夠。所以房子就蓋到水上面去了。』
宸瑋：『哇……像高腳屋？』
阿喜：『對。在泰國也有這種房子。』
宸瑋：『那不會被水沖走嗎？』
阿喜：『不會。木頭插得很深。颱風也吹不動。』
（茅盾故居 — 宸瑋看作家老房子）
宸瑋：『爸爸，這個就是茅盾住的地方嗎？』
阿喜：『對。他小時候在這裡長大。』
宸瑋（看書桌）：『這個桌子是茅盾寫字用的嗎？』
阿喜：『據說是。這是他的書房。』
宸瑋（指牆上的字）：『那個字是什麼？』
阿喜：『那是他的筆名「茅盾」兩個字。他自己寫的。』
宸瑋（想了想）：『我以後也要寫文章。寫我們家的故事。』

📚 宸瑋小教室 — 藍染工藝 1000 年
宸瑋（畫外音）：『烏鎮的藍染工藝是中國非物質文化遺產。從南宋開始，到現在 1000 多年。』
阿喜：『藍染要經過 7 個步驟：採藍、發酵、打靛、沉澱、調色、上染、晾曬。』
宸瑋（驚）：『7 個步驟！好多！』
阿喜：『對。所以一塊布要花好幾天才能染好。』
宸瑋：『那現在還有人做嗎？』
阿喜：『有。烏鎮還有師傅在做。但越來越少了。』
宸瑋（想了想）：『那我們要支持他們。』
阿喜（點頭）：『對。這就是文化傳承。』
宸瑋：『文化傳承是什麼意思？』
阿喜：『就是把我們的傳統教給下一代。』
宸瑋（指自己）：『我是下一代嗎？』
阿喜（抱宸瑋）：『對。你就是我們的下一代。』

📚 宸瑋小教室 — 水閣建築智慧
宸瑋（畫外音）：『烏鎮水閣的設計很聰明。石頭地基在水下，木頭柱子在水面。洪水來了，房子會跟著浮起來一點。』
阿喜：『這個是江南人的智慧。因為江南常常下雨，河水會漲。』
宸瑋：『那我們台北的房子不會浮起來嗎？』
阿喜：『台北是地震比較多。所以台北的房子要蓋得硬，不讓它搖。』
宸瑋：『喔……每個地方蓋房子都不一樣。』
阿喜：『對。因為環境不同。』
宸瑋（認真）：『所以我要去看看很多地方，這樣才會知道很多。』
`,
    shots: `00:00-00:10  烏鎮染坊 — 宸瑋視角看到大片藍布的仰角鏡頭
00:10-00:25  宸瑋問「為什麼是藍色」，阿喜解釋的剪接
00:25-00:40  宸瑋想摸被工作人員拒絕，鏡頭捕捉失望表情
00:40-00:55  阿喜蹲下解釋「像不像海浪」，三個小朋友搶答的搞笑剪接
00:55-01:10  染坊內部，宸瑋看染料過程
01:10-01:25  西柵水閣 — 宸瑋看到船興奮跑的跟拍
01:25-01:40  宸瑋問船「哪裡不一樣」，阿喜解釋的剪接
01:40-01:55  排隊時宸瑋看到阿美坐下，主動關心的特寫
01:55-02:10  阿美奶奶「看你們玩奶奶就不累」，鏡頭 zoom in 兩人
02:10-02:25  宸瑋「奶奶好奇怪」一句 cut 阿美笑場
02:25-02:40  水上房子 — 宸瑋問「為什麼蓋在水裡」，阿喜解釋
02:40-02:55  茅盾故居 — 宸瑋看書桌特寫
02:55-03:20  📚 小教室 1 — 藍染工藝 7 步驟，配工作流程動畫
03:20-03:45  📚 小教室 2 — 水閣建築智慧，配水閣剖面圖
03:45-04:00  宸瑋「我是下一代嗎」一句定格，阿喜抱他特寫
00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-01-grandma-reaches-blue-cloth.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen dye workshop with chibi elderly Asian grandmother with jet-black hair reaching up to touch deep cobalt blue indigo-dyed cloth hanging from rafters, photorealistic tall strips of blue fabric billowing, cinematic vertical composition"
00:20-00:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-02-grandma-said-this-place.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen dye workshop with chibi elderly Asian grandmother with jet-black hair standing amid hanging blue cloth strips, chibi little boy Chenwei beside looking up at the cloth, photorealistic traditional indigo dye workshop, cinematic medium shot"This place looks like the Jiangnan I saw when young", chibi little boy Chenwei standing beside listening with curiosity, photorealistic Wuzhen water town stone alley, cinematic tender reflective moment"
00:45-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-03-chenwei-grandma-weird-cloth.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen dye workshop with chibi little boy Chenwei holding up a small piece of blue cloth, chibi elderly Asian grandmother with jet-black hair beside laughing, photorealistic indigo dye workshop with hanging blue fabric, cinematic medium shot"Grandma is weird, she likes weird cloth" then smiling sheepishly as grandma laughs, photorealistic Wuzhen water town stone alley with blue cloth strands, cinematic comedic family moment"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-04-houses-on-water-why.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen water town canal with chibi little boy Chenwei standing on stone embankment looking at the wooden water houses built over the canal, photorealistic traditional water house architecture, cinematic wide-angle shot"Why are houses built on water?" with curious expression, chibi middle-aged Taiwanese Chinese father A-xi explaining with hand gesture, photorealistic Wuzhen water-house architecture built over canal, cinematic educational father-son moment"
01:40-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-05-chenwei-walking-grandma-arm.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen water town stone lane with chibi little boy Chenwei and chibi elderly Asian grandmother with jet-black hair walking arm-in-arm, photorealistic ancient stone-paved alley with hanging laundry, golden late afternoon light, cinematic wide-angle shot"
02:25-02:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-06-water-house-cross-section.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen water town with chibi little boy Chenwei and chibi father A-xi standing on stone embankment looking at the wooden water houses built over the canal, photorealistic water house architecture details, cinematic medium shot"
02:55-03:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-07-indigo-dyeing-7-steps.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen dye workshop with chibi little boy Chenwei and chibi elderly Asian grandmother with jet-black hair watching dye vats and blue cloth hanging, photorealistic traditional indigo dye vats and wooden workshop, cinematic wide-angle shot"
03:45-04:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-08-am-i-next-generation.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen water town stone lane with chibi little boy Chenwei walking toward the camera, chibi elderly Asian grandmother with jet-black hair in the background, photorealistic stone-paved alley with old wooden houses, cinematic medium shot"Am I the next generation?" with thoughtful philosophical face, chibi middle-aged Taiwanese Chinese father A-xi hugging him in close-up warmth, photorealistic soft warm Wuzhen night lantern light, cinematic emotional father-son moment"`,
  },

  // Day 5 — 西湖：蘇東坡修蘇堤 + 白蛇傳 + 雷峰塔
  {
    ...D5,
    dialogue: `（西湖邊 — 宸瑋看到湖）
宸瑋：『哇！這個水比昨天的還大！』
阿喜：『對。這是西湖。杭州最有名的湖。』
宸瑋：『為什麼叫西湖？』
阿喜：『因為它在杭州的西邊。』
宸瑋：『那有東湖嗎？』
阿喜：『有。但是西湖比較有名。』
宸瑋：『為什麼比較有名？』
阿喜：『因為……古代的詩人都寫過它。』
宸瑋：『詩人是什麼？』
阿喜：『就是寫詩的人。』
宸瑋（想了想）：『像我們學校老師那種嗎？』
阿喜（笑了）：『不一樣。詩人是寫很美很美的句子的人。』
（蘇堤春曉 — 宸瑋眼中的美景）
宸瑋：『爸爸，那個樹好漂亮。』
阿喜：『那是柳樹。』
宸瑋：『為什麼樹要種在水邊？』
阿喜：『因為柳樹喜歡水。』
宸瑋：『那台北的樹為什麼不種在水邊？』
阿喜：『台北也有種啊。你沒注意。』
宸瑋：『我要回去找！』
（蘇堤上 — 宸瑋發現奇怪的雕像）
宸瑋：『爸爸！那是什麼人？』
阿喜：『那是蘇東坡。他是 900 多年前的詩人，也是杭州市長。』
宸瑋：『市長？他當市長嗎？』
阿喜：『對。古代叫「太守」或「知州」。他當了杭州市長。』
宸瑋：『他做了什麼？』
阿喜：『他修了一條堤防。就是我們走的這條「蘇堤」。』
宸瑋（看腳下）：『哇……所以我們現在走的是他蓋的？』
阿喜：『對。900 年了。』
宸瑋（驚）：『那比我爺爺的爺爺還老！』
（曲院風荷 — 宸瑋看荷花）
宸瑋：『爸爸！荷花！好多荷花！』
阿喜：『對。曲院風荷是西湖十景之一。』
宸瑋：『十景是什麼？』
阿喜：『西湖最有名的 10 個風景。古人選出來的。』
宸瑋：『那蘇堤也是十景之一嗎？』
阿喜（驚）：『對！蘇堤春曉也是十景之首！』
宸瑋：『第一名喔！』
（雷峰塔 — 宸瑋看塔）
宸瑋：『爸爸，那個塔為什麼歪歪的？』
阿喜：『那是雷峰塔。它本來倒了，2002 年重新蓋的。』
宸瑋：『為什麼會倒？』
阿喜：『因為年代太久。而且有人偷磚塊。』
宸瑋：『偷磚塊？為什麼？』
阿喜：『民間傳說雷峰塔的磚可以保平安。所以大家偷。』
宸瑋（想了想）：『那大家把塔偷倒了就沒有磚了。』
阿喜（笑了）：『對。所以政府要保護。』
（武林夜市 — 宸瑋眼花）
宸瑋：『哇！好多東西！』
恩齊：『我要吃那個！』
大宇：『我要吃這個！』
小宇：『我要吃那個那個！』
（宸瑋被三個小朋友拉著跑）
宸瑋（尖叫）：『不要拉我！』
黃阿分（後面追）：『小朋友不要跑！』
阿喜（邊追邊拍）：『小心車！小心車！』

📚 宸瑋小教室 — 蘇東坡修蘇堤
宸瑋（畫外音）：『蘇東坡是北宋的大詩人。他在杭州當市長的時候，發現西湖淤積嚴重，湖水變少。』
阿喜：『所以他招募工人，把湖底的淤泥挖起來，堆成一條堤防。這就是蘇堤。』
宸瑋：『挖淤泥？那不是很臭？』
阿喜（笑了）：『對。但是他想出了一個辦法。用淤泥種荷花。這樣淤泥變成了風景。』
宸瑋（驚）：『哇……好聰明。』
阿喜：『他還在堤上種柳樹。所以我們今天看到的「蘇堤春曉」就是他設計的。』
宸瑋：『那他算不算發明家？』
阿喜：『他算是。用智慧解決問題的人。』
宸瑋（認真）：『我以後也要當用智慧解決問題的人。』

📚 宸瑋小教室 — 西湖十景
宸瑋（畫外音）：『西湖十景是南宋時候選出來的。蘇堤春曉、曲院風荷、平湖秋月、斷橋殘雪⋯⋯等。』
阿喜：『這些名字都很美。因為是古人寫詩的句子。』
宸瑋：『為什麼要選十景？』
阿喜：『因為南宋的皇帝喜歡西湖。他們覺得西湖是全國最美的地方。』
宸瑋：『那現在的杭州人覺得呢？』
阿喜：『現在的杭州人也覺得很美。所以西湖是世界文化遺產。』
宸瑋：『又是世界遺產？跟大運河一樣嗎？』
阿喜：『對。西湖 2011 年也被聯合國列入世界遺產。』
宸瑋（想了想）：『哇……杭州有兩個世界遺產。』
阿喜：『對。西湖跟大運河。杭州很厲害。』
宸瑋：『那我以後還要來杭州。』
`,
    shots: `00:00-00:10  西湖邊 — 宸瑋視角看湖面，仰角拍湖光
00:10-00:25  宸瑋問「為什麼叫西湖」，阿喜解釋的剪接
00:25-00:40  宸瑋問「詩人是什麼」，阿喜解釋的搞笑剪接
00:40-00:55  蘇堤春曉 — 宸瑋看柳樹的特寫，柳枝飄動
00:55-01:10  宸瑋問「樹為什麼種在水邊」，鏡頭捕捉祖孫對話
01:10-01:25  蘇東坡雕像特寫，宸瑋仰望剪接
01:25-01:40  「蘇堤是 900 年前蓋的」一句，鏡頭拍腳下蘇堤
01:40-01:55  曲院風荷 — 宸瑋看到荷花的特寫
01:55-02:10  「十景之首」一句，宸瑋高興的剪接
02:10-02:25  雷峰塔，宸瑋問為什麼歪的對話剪接
02:25-02:40  武林夜市 — 宸瑋視角看眼花繚亂的招牌，鏡頭快搖
02:40-02:55  三個小朋友拉宸瑋跑的混亂剪接
02:55-03:10  黃阿分後面追「不要跑」的搞笑長鏡頭
03:10-03:35  📚 小教室 1 — 蘇東坡修蘇堤，配堤防剖面圖 + 淤泥變荷花動畫
03:35-04:00  📚 小教室 2 — 西湖十景，配南宋古畫風格動畫
04:00-04:15  宸瑋「我要當用智慧解決問題的人」一句定格
00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-01-su-causeway-morning-light.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Su Causeway stretching across misty West Lake Hangzhou in morning light with willows lining both sides, chibi little boy Chenwei walking ahead with chibi father A-xi, photorealistic classical Chinese landscape, cinematic wide-angle shot"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-02-grandma-stroll-west-lake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Su Causeway with chibi elderly Asian grandmother with jet-black hair walking arm-in-arm with chibi wife/mother Huang-A-Fen, chibi little boy Chenwei ahead, photorealistic West Lake with willows and lotus pond, cinematic wide-angle shot"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-03-chenwei-lake-grass-looking-sky.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, West Lake grass area with chibi little boy Chenwei lying on grass looking up at blue sky, photorealistic classical Hangzhou West Lake scenery, cinematic low-angle shot from grass level"
02:40-02:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-04-3-kids-pulling-chenwei.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Su Causeway with chibi little boy Chenwei being pulled by 3 other chibi kids (brother Enqi, Wu brothers Dayu and Xiaoyu) running playfully, photorealistic West Lake willows and lake view, cinematic wide-angle shot"
02:55-03:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-05-mom-chasing-4-kids.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Su Causeway with chibi wife/mother Huang-A-Fen running behind 4 chibi kids on the path, photorealistic West Lake willows lining both sides, cinematic wide-angle shot"Do not run!" with mother panic, photorealistic West Lake sunset backdrop, cinematic comedic mother-and-4-kids chase scene"
03:10-03:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-06-su-dongpo-causeway-history.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Su Causeway stone embankment with willows along the lake, chibi little boy Chenwei and chibi father A-xi walking along the embankment, photorealistic West Lake Su Causeway scenery, cinematic wide-angle shot"
03:35-04:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-07-west-lake-ten-views-painting.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, West Lake water surface with willows and stone pagoda in distance, chibi little boy Chenwei and chibi father A-xi standing at the lakeshore looking out, photorealistic classical Hangzhou West Lake scenery, cinematic wide-angle shot"
04:00-04:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-08-solve-problems-with-wisdom.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Su Causeway with chibi little boy Chenwei walking along the stone path with lotus pond on one side, photorealistic West Lake summer scenery, cinematic medium shot"I want to be someone who solves problems with wisdom" with serious philosophical expression, photorealistic West Lake classical architecture background, cinematic inspirational child moment"`,
  },

  // Day 6 — 宋城千古情：南宋遷都 + 杭州國都史
  {
    ...D6,
    dialogue: `（宋城千古情 — 開演前）
宸瑋：『那個舞台為什麼這麼大？』
阿喜：『因為秀很厲害。』
宸瑋：『什麼秀？』
阿喜：『看就知道了。』
（開演 — 宸瑋驚呼連連）
宸瑋：『哇！』
恩齊：『啊！』
大宇：『哇！』
（三個小朋友異口同聲）
（舞台上皇帝出場）
宸瑋（拉阿喜）：『爸爸那個是皇帝嗎？』
阿喜：『對。』
宸瑋：『為什麼皇帝穿那麼多？』
阿喜：『因為皇帝很尊貴。』
宸瑋：『尊貴是什麼意思？』
阿喜：『就是很重要。』
宸瑋：『那我可以當皇帝嗎？』
阿喜（笑了）：『不行。台灣沒有皇帝了。』
宸瑋：『為什麼台灣沒有？』
阿喜：『因為……台灣是民主的。』
宸瑋：『什麼是民主？』
阿喜（想了很久）：『就是大家一起決定事情。』
宸瑋（想了想）：『那我們家誰是皇帝？』
阿喜：『你家是……媽媽。』
黃阿分（從後面）：『聽到了喔。』
（演出中途 — 宸瑋看到戰爭場面）
宸瑋（驚）：『爸爸！他們在打架！』
阿喜：『那是打仗。古代常常打仗。』
宸瑋：『為什麼要打仗？』
阿喜：『因為一個國家被另一個國家欺負。所以他們要保衛自己的家。』
宸瑋（認真）：『那個被欺負的國家好可憐。』
阿喜：『對。所以後來他們贏了。』
宸瑋：『贏了就和平了嗎？』
阿喜：『不一定。但至少他們的家保住了。』
（演出結束 — 宸瑋感動）
宸瑋（擦眼睛）：『爸爸，那個秀好好看。我哭了。』
阿喜（抱宸瑋）：『你沒有哭。你只是眼睛紅紅的。』
宸瑋：『那個國家保衛自己的家好好看。』
阿喜（想了想）：『對。保衛家園是最勇敢的事。』
（馬鴻興川小館 — 宸瑋第一次吃川菜）
宸瑋（咬一口毛血旺）：『嗚！辣！』
阿喜（趕緊遞水）：『快喝水！』
恩齊（也咬一口）：『我也要水！』
大宇（在旁邊）：『我不敢吃。』
小宇：『我也不吃。』
宸瑋（擦眼淚）：『可是好好吃。』
阿美（從旁邊遞一塊肉）：『宸瑋，吃這個。不辣。』
（菜單上 — 宸瑋指一個菜名）
宸瑋：『爸爸，那個字是什麼？』
阿喜：『那是「回鍋肉」。四川最有名的菜。』
宸瑋：『四川在哪裡？』
阿喜：『在中國的西邊。很遠。』
宸瑋（指另一個）：『那這個呢？』
阿喜：『那是「水煮魚」。也是四川菜。』
宸瑋：『為什麼四川菜都辣？』
阿喜：『因為四川很潮濕。吃辣可以幫助身體排出濕氣。』
宸瑋（想了想）：『原來辣是藥。』
阿喜（笑了）：『也算吧。適量的辣對身體好。』

📚 宸瑋小教室 — 南宋遷都杭州
宸瑋（畫外音）：『中國古代有兩個宋。北宋的首都開封，被金國攻佔後，宋朝搬到杭州。這就是「南宋」。』
阿喜：『對。南宋 1127 年到 1279 年。150 多年。』
宸瑋：『為什麼要搬？』
阿喜：『因為敵人太強。原來的首都保不住。所以他們選了杭州這個有山有水的地方。』
宸瑋：『杭州有山有水，所以比較安全嗎？』
阿喜：『對。杭州西邊有山。敵人從北邊來，山可以擋住。』
宸瑋（想了想）：『所以古人選首都也是要動腦筋的。』
阿喜（笑了）：『對。而且他們選的地方都很美。』
宸瑋：『那為什麼南宋後來又沒了？』
阿喜：『後來蒙古人建立了元朝。把南宋滅了。』
宸瑋（驚）：『蒙古人？那成吉思汗？』
阿喜（驚）：『你怎麼知道成吉思汗？』
宸瑋：『我看過一本書。』
阿喜（點頭）：『對。就是他的孫輩滅了南宋。』

📚 宸瑋小教室 — 川菜辣的文化
宸瑋（畫外音）：『川菜是中國八大菜系之一。四川因為潮濕，所以吃辣。辣其實是一種智慧。』
阿喜：『對。不只是因為喜歡。是因為身體需要。』
宸瑋：『那我們台灣需要吃辣嗎？』
阿喜：『台灣也很潮濕。所以我們也吃辣。』
宸瑋（驚）：『真的嗎？』
阿喜：『你看你們學校營養午餐有宮保雞丁。那就是川菜。』
宸瑋：『哇……原來我每天都在吃川菜！』
阿喜（笑了）：『對。宮保雞丁就是四川來的。』
`,
    shots: `00:00-00:10  宋城舞台開演前 — 宸瑋視角看舞台的仰角鏡頭
00:10-00:25  開演 — 三個小朋友異口同聲「哇」的剪接
00:25-00:40  皇帝出場 — 宸瑋拉阿喜問問題的剪接
00:40-01:00  「我可以當皇帝嗎」一句，鏡頭捕捉父子對視
01:00-01:15  「台灣是民主的」解釋，鏡頭 zoom in 宸瑋困惑表情
01:15-01:30  「你家是媽媽」一句，黃阿分從後面插話的搞笑剪接
01:30-01:45  戰爭場面，宸瑋驚呼的特寫
01:45-02:00  「保衛家園最勇敢」一句，宸瑋擦眼睛的特寫
02:00-02:15  馬鴻興 — 宸瑋咬毛血旺被辣到的特寫
02:15-02:30  恩齊也要水的跟拍
02:30-02:45  宸瑋擦眼淚「可是好好吃」一句，鏡頭從側面拍
02:45-03:00  阿美奶奶遞肉的特寫，祖孫互動剪接
03:00-03:25  📚 小教室 1 — 南宋遷都杭州，配遷都地圖動畫
03:25-03:50  📚 小教室 2 — 川菜辣的文化，配八大菜系地圖
03:50-04:00  宸瑋「原來我每天都在吃川菜」一句定格，鏡頭從小朋友表情
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-01-songcheng-bus-window.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi little boy Chenwei on tour bus 318 looking at Songcheng Performance venue through bus window, photorealistic tour bus interior with Hangzhou highway outside, cinematic medium shot through bus window"
01:05-01:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-02-spicy-sichuan-boys-happy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Ma Hongxing Sichuan restaurant with chibi little boys Chenwei and Enqi both holding bowls of spicy Ma-la dish with red oil steam rising, photorealistic Sichuan restaurant with red lanterns and chili pepper decorations, cinematic medium shot"
01:20-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-03-chenwei-tears-from-spicy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Sichuan restaurant table with chibi little boy Chenwei wiping face from spicy food, chibi father A-xi handing him a glass of water, photorealistic Sichuan restaurant with red oil dishes, cinematic medium shot"But it is so good to eat" with conflicted cute face, photorealistic red-oil Ma-la sauce glistening in dish, cinematic tear-and-laugh food moment"
01:35-01:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-04-grandma-hands-pork-to-chenwei.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Sichuan restaurant with chibi elderly Asian grandmother with jet-black hair handing chibi little boy Chenwei a piece of twice-cooked pork, photorealistic Sichuan restaurant table setting with steaming dishes, cinematic medium shot"
01:50-02:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-05-twice-cooked-pork-grandma.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Sichuan restaurant with chibi elderly Asian grandmother with jet-black hair sitting at table with steaming twice-cooked pork in front, chibi little boy Chenwei beside, photorealistic Sichuan restaurant setting, cinematic medium shot"When I was young I ate in Sichuan, never forgot", photorealistic Sichuan restaurant with old photograph of 1970s Sichuan street food blended with chibi scene, cinematic nostalgic food memory"
03:00-03:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-06-southern-song-migration-map.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Songcheng Performance venue exterior with traditional Song Dynasty architecture, chibi little boy Chenwei and chibi father A-xi standing at the entrance looking at the buildings, photorealistic Song Dynasty architectural details, cinematic wide-angle shot"
03:25-03:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-07-8-great-cuisines-map.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Songcheng Performance venue with traditional Song Dynasty buildings and red lanterns, chibi little boy Chenwei walking toward the entrance with family, photorealistic Song Dynasty architectural complex, cinematic wide-angle shot"
03:50-04:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-08-i-eat-sichuan-every-day.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Sichuan restaurant table with red oil dishes and rice bowls, chibi little boy Chenwei sitting at table holding chopsticks ready to eat, photorealistic Sichuan restaurant setting, cinematic close-up"I have been eating Sichuan food every day!" with funny realization face, photorealistic Sichuan restaurant steam and chili peppers in background, cinematic child revelation moment"`,
  },

  // Day 7 — 杭州宮宴：唐代服飾 + 漢服文化 + 宮廷宴席
  {
    ...D7,
    dialogue: `（宮宴換裝間 — 宸瑋被逼穿古裝）
宸瑋：『我不要穿！』
阿喜：『穿一下就好。拍完照就脫。』
宸瑋：『我會癢！』
恩齊（已經穿好）：『哥哥你看！我很帥！』
宸瑋（看了看弟弟）：『你不帥。你很醜。』
恩齊（哭）：『嗚……』
阿喜（趕緊安撫）：『弟弟很帥！哥哥也很帥！』
（換裝完 — 宸瑋照鏡子）
宸瑋（看鏡子）：『爸爸，這是我嗎？』
阿喜：『是你。』
宸瑋：『可是我不認識他。』
阿喜（笑了）：『你本來就長這樣啊。』
宸瑋：『可是我覺得他不是我。』
阿喜：『那他是你小時候的樣子。』
宸瑋（想了很久）：『那我可以叫他小宸瑋嗎？』
阿喜（抱宸瑋）：『當然可以。』
（換裝間 — 宸瑋看牆上的衣服）
宸瑋：『爸爸，為什麼這個衣服這麼大？』
阿喜：『這是漢服。中國古代的衣服。』
宸瑋：『古代人為什麼穿這麼大？』
阿喜：『因為他們喜歡飄逸的感覺。走路的時候衣服會飄起來。』
宸瑋（看自己）：『我穿的這個是哪個朝代？』
阿喜（看衣服）：『這個是宋代的。宋朝的衣服比較素雅。』
宸瑋：『宋朝？是寫蘇東坡的宋朝嗎？』
阿喜（驚）：『對！你記得！』
宸瑋（得意）：『我記得。蘇東坡是 900 年前的詩人。』
阿喜（抱宸瑋）：『你最棒了。』
（換裝間 — 看到阿美的衣服）
宸瑋：『奶奶！妳的衣服好漂亮！像皇后！』
阿美（笑了）：『我這是唐代的衣服。武則天時代。』
宸瑋：『武則天是誰？』
阿美：『她是中國唯一的女皇帝。1300 多年前。』
宸瑋（驚）：『女皇帝！女生也可以當皇帝嗎？』
阿美：『對。武則天很厲害。她打破了男尊女卑的規矩。』
宸瑋（想了想）：『那我要當第二個武則天！』
阿美（笑了）：『傻瓜，男生不能當武則天。』
宸瑋：『那當什麼？』
阿美：『當武則天的兒子。當一個勇敢的人。』
（宮宴大合照 — 宸瑋看 13 個古裝的人）
宸瑋：『爸爸，為什麼大家都穿這個？』
阿喜：『因為這裡是古代的餐廳。』
宸瑋：『古代的人為什麼要穿這個？』
阿喜：『因為他們覺得很漂亮。』
宸瑋：『我覺得我們家的人比較漂亮。』
阿美（從後面聽到）：『宸瑋！奶奶好感動！』
（宮宴秀場 — 宸瑋看秀）
宸瑋：『爸爸那個是仙女嗎？』
阿喜：『對。』
宸瑋：『為什麼仙女會飛？』
阿喜：『那是燈光的效果。』
宸瑋：『燈光可以讓人飛嗎？』
阿喜（笑了）：『不是真的飛。是看起來像飛。』
宸瑋（想了想）：『那我也想看起來像飛。』
阿喜：『你跳起來就會像飛。』
（宸瑋真的跳了起來）
（宮宴吃飯 — 宸瑋看桌上的菜）
宸瑋：『爸爸，這個菜好奇怪。』
阿喜：『那是「宮廷點心」。古代皇帝吃的。』
宸瑋：『皇帝吃這個不會飽嗎？』
阿喜：『皇帝吃很多。這個只是其中一道。』
宸瑋（指另一個菜）：『那這個呢？』
阿喜：『那是「桂花糕」。唐朝就有了。』
宸瑋：『唐朝？我穿的衣服是宋朝？』
阿喜（驚）：『對。菜是唐朝的，衣服是宋朝的。』
宸瑋（想了想）：『所以唐朝跟宋朝不一樣？』
阿喜：『對。每個朝代都有自己的特色。』
宸瑋（認真）：『那我學到好多喔。』

📚 宸瑋小教室 — 漢服文化
宸瑋（畫外音）：『漢服是中國古代的傳統服飾。已經有 3000 多年歷史。每個朝代的衣服都不一樣。』
阿喜：『唐朝的衣服比較華麗，宋朝比較素雅，明朝比較莊重。』
宸瑋：『那現在的中國人為什麼不穿？』
阿喜：『因為 100 多年前發生革命，大家都改穿西式的衣服。』
宸瑋：『那現在有人穿嗎？』
阿喜：『有。最近很多人開始復興漢服文化。叫「漢服運動」。』
宸瑋（驚）：『漢服運動？像跳舞那種？』
阿喜（笑了）：『不是。是大家穿漢服出門、上學、約會。』
宸瑋：『那我可以穿嗎？』
阿喜（點頭）：『當然可以。你今天就穿了。』
宸瑋：『我覺得很漂亮。我下次還想穿。』

📚 宸瑋小教室 — 武則天女皇帝
宸瑋（畫外音）：『武則天是中國歷史上唯一的女皇帝。她當了 15 年皇帝，是唐朝的「武周」時代。』
阿喜：『她本來是唐太宗的妃子，後來自己當皇帝。很多男生反對她，但她用能力讓大家服氣。』
宸瑋：『為什麼男生反對？』
阿喜：『因為古代的人認為女生不能當領導者。』
宸瑋：『那她怎麼辦？』
阿喜：『她努力工作，證明女生也可以做得很好。』
宸瑋（想了想）：『所以她很勇敢。』
阿喜：『對。她打破了很多規矩。是女生的榜樣。』
宸瑋（認真）：『那奶奶穿她的衣服很適合。』
阿美（從旁邊聽到）：『宸瑋！你最懂奶奶了！』
`,
    shots: `00:00-00:10  換裝間 — 宸瑋不肯穿的搞笑鏡頭
00:10-00:25  恩齊穿好得意 vs 宸瑋「你不帥」剪接
00:25-00:40  恩齊哭的特寫，黃阿分趕緊安撫
00:40-00:55  換裝完宸瑋照鏡子的特寫，鏡頭從鏡子反射拍
00:55-01:10  宸瑋問「我可以叫他小宸瑋嗎」，阿喜抱他的剪接
01:10-01:25  換裝間牆上漢服展示，宸瑋問為什麼衣服這麼大
01:25-01:40  「宋代 vs 唐代」對比，鏡頭剪接兩件衣服
01:40-01:55  阿美唐裝亮相，宸瑋「像皇后」一句，cut 阿美笑場
01:55-02:10  「武則天是女皇帝」一句，宸瑋驚訝的特寫
02:10-02:25  宮宴大合照 — 宸瑋看 13 個古裝的人的剪影鏡頭
02:25-02:40  宸瑋「我覺得我們家的人比較漂亮」一句，cut 阿美奶奶感動
02:40-02:55  宮宴秀場 — 宸瑋看仙女飛的特寫
02:55-03:10  宸瑋問「為什麼仙女會飛」，阿喜解釋的剪接
03:10-03:25  宸瑋「我也想看起來像飛」然後真的跳起來的搞笑剪接
03:25-03:50  📚 小教室 1 — 漢服文化，配歷代服飾演變圖
03:50-04:15  📚 小教室 2 — 武則天，配唐朝宮廷畫風格動畫
04:15-04:30  宸瑋「奶奶穿她的衣服很適合」一句定格，阿美從旁邊感動
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-01-grandma-tang-reveal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Chinese palace corridor with chibi elderly Asian grandmother with jet-black hair wearing bright red Tang Dynasty empress costume with phoenix coronet standing at doorway, chibi little boy Chenwei watching from the side, photorealistic traditional Chinese royal costume with gold thread, dramatic backlit god rays from corridor, cinematic wide-angle shot"
00:55-01:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-02-grandma-tang-kids-princes.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Chinese palace banquet hall with chibi elderly Asian grandmother with jet-black hair in red Tang empress costume seated on decorated chair, chibi boys Chenwei and Enqi dressed as Tang Dynasty little princes in yellow silk standing beside, photorealistic palace hall with red pillars and golden dragons, cinematic wide-angle shot"
02:30-02:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-03-chenwei-stunned-by-tang-show.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Tang Dynasty palace banquet with luminous flying fairy dancers suspended in air above stage, chibi little boy Chenwei sitting in audience looking up, photorealistic Song Dynasty theater with colored lights and suspended performers, cinematic wide-angle shot"
02:55-03:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-04-chenwei-asks-fairy-fly.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Tang Dynasty palace stage with chibi little boy Chenwei standing at edge of stage reaching up toward aerial fairy dancer suspended above, photorealistic palace stage with colored silk ribbons, cinematic low-angle shot"Why do fairies fly?" with curious eyes, chibi middle-aged Taiwanese Chinese father A-xi explaining with hand gesture, photorealistic palace performance backdrop, cinematic educational father-son moment"
03:10-03:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-05-chenwei-jumps-like-fairy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Tang Dynasty palace stage with chibi little boy Chenwei and chibi 5-year-old brother Enqi both attempting to jump up, photorealistic palace banquet hall with red silk decorations, cinematic wide-angle shot"I also want to look like flying" then jumping into the air with two feet off ground in attempt, photorealistic palace banquet hall floor, cinematic comedic child attempt to fly"
03:25-03:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-06-hanfu-history-3000-year.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Tang Dynasty palace banquet hall interior with chibi little boy Chenwei and chibi father A-xi standing beside a row of traditional Han Dynasty to Tang Dynasty costumes displayed on mannequins, photorealistic palace hall with ancient costume displays, cinematic wide-angle shot"
03:50-04:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-07-wu-zetian-female-emperor.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Tang Dynasty palace throne room with red pillars and golden throne, chibi elderly Asian grandmother with jet-black hair in red Tang empress costume standing at throne, chibi little boy Chenwei watching from the steps, photorealistic Tang Dynasty throne room with gold dragons, cinematic wide-angle shot"
04:15-04:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-08-grandma-perfect-in-costume.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Tang Dynasty palace banquet hall with chibi elderly Asian grandmother with jet-black hair in red Tang empress costume posing, chibi little boy Chenwei beside giving thumbs up, photorealistic palace hall with red pillars and golden decorations, cinematic medium shot"Grandma looks perfect in her costume" with appreciative expression, chibi healthy 70-year-old Asian grandma with jet-black silky hair in red empress costume feeling emotional with moist eyes, photorealistic palace banquet hall warm golden light, cinematic touching family moment"`,
  },

  // Day 8 — 返程：靈隱寺 1700 年 + 京杭大運河 + 綠茶餐廳
  {
    ...D8,
    dialogue: `（靈隱寺 — 宸瑋眼中的寺廟）
宸瑋：『爸爸這裡為什麼這麼多神？』
阿喜：『這是佛教的寺廟。』
宸瑋：『佛教是什麼？』
阿喜：『是一種宗教。信佛的人會來這裡拜拜。』
宸瑋：『我們家信什麼？』
阿喜：『我們家……什麼都信一點。』
宸瑋（想了想）：『那我們可以跟佛祖許願嗎？』
阿喜：『可以啊。妳想許什麼願？』
宸瑋：『我希望下次還可以來。』
（靈隱寺入口 — 宸瑋看「靈隱」兩個字）
宸瑋：『爸爸，那個字是什麼意思？』
阿喜：『「靈」是神靈，「隱」是隱藏。「靈隱」就是「神靈隱藏的地方」。』
宸瑋：『神靈會隱藏嗎？』
阿喜：『據說東印度僧人慧理覺得這裡有仙氣，所以建了寺廟。』
宸瑋：『慧理是誰？』
阿喜：『他是 1700 多年前的和尚。從印度來中國的。』
宸瑋（驚）：『印度？那他走了多遠？』
阿喜：『從印度走過來要走好幾年。經過喜馬拉雅山。』
宸瑋（想了想）：『那他好辛苦。』
阿喜：『對。所以寺廟是為了紀念他。』
（靈隱寺裡面 — 看到濟公雕像）
宸瑋：『爸爸！那是什麼人？穿得很破。』
阿喜：『那是濟公。800 多年前的和尚。』
宸瑋：『為什麼他那麼破？』
阿喜：『他不愛乾淨。專門幫窮人。』
宸瑋：『幫窮人？怎麼幫？』
阿喜：『他有法力。可以變出東西給窮人。』
宸瑋（驚）：『變魔術嗎？』
阿喜（笑了）：『不是真的魔術。是說他很有智慧，幫窮人解決問題。』
宸瑋（想了想）：『那他是好人。』
阿喜：『對。他是中國最受歡迎的和尚之一。』
（綠茶餐廳 — 宸瑋的最後一頓飯）
宸瑋：『這是最後一餐嗎？』
阿喜：『對。今天晚上要回家了。』
宸瑋（低頭）：『蛤。』
阿喜：『怎麼了？』
宸瑋：『我不想回家。』
阿喜：『為什麼？』
宸瑋：『因為這裡很好玩。大家都在一起。』
阿喜（沉默）：『……我們回家也可以在一起啊。』
宸瑋：『可是不一樣。』
阿喜（想了很久）：『嗯。是不一樣。』
（綠茶餐廳 — 看菜單）
宸瑋：『爸爸，「綠茶」是什麼？』
阿喜：『綠茶是中國最有名的茶。』
宸瑋：『中國茶跟台灣茶不一樣嗎？』
阿喜：『不一樣。綠茶沒有發酵。台灣茶大多有發酵。』
宸瑋：『為什麼綠茶不發酵？』
阿喜：『因為綠茶要保持原本的綠色。所以採下來就烘乾。』
宸瑋：『那綠茶好喝嗎？』
阿喜（點頭）：『好喝。而且對身體好。有很多營養。』
宸瑋（想了想）：『那我要學泡茶。』
阿喜（笑了）：『好啊。回家我教你。』
（蕭山機場 — 宸瑋跟叔叔們告別）
阿伸（抱宸瑋）：『宸瑋再見！下次叔叔再帶你來！』
宸瑋（抱回去）：『好！』
阿橋：『宸瑋記得阿姨喔！』
宸瑋：『阿橋阿姨下次帶我去吃冰淇淋！』
（飛機上 — 宸瑋看窗外）
宸瑋：『爸爸，那些雲好漂亮。』
阿喜：『對啊。』
宸瑋：『我們下次還會來嗎？』
阿喜：『會的。我們會再來。』
宸瑋（笑了）：『好。』

📚 宸瑋小教室 — 靈隱寺 1700 年
宸瑋（畫外音）：『靈隱寺是 326 年蓋的。已經有 1700 年歷史。是中國最早的佛教寺廟之一。』
阿喜：『對。當時還沒有杭州城。靈隱寺比杭州還老。』
宸瑋：『杭州不是 2200 年嗎？』
阿喜（驚）：『你怎麼知道杭州 2200 年？』
宸瑋：『我昨天在書上看到的。』
阿喜（抱宸瑋）：『你真的是我的驕傲。』
宸瑋：『那靈隱寺是杭州最老的寺廟嗎？』
阿喜：『是最老的之一。還有淨慈寺、鳳凰寺等。』
宸瑋（想了想）：『寺廟好幾百年的石頭都好厲害。』
阿喜：『對。古代人蓋房子蓋得很用心。』
宸瑋（認真）：『我以後也要蓋一棟很厲害的房子。』

📚 宸瑋小教室 — 濟公和尚文化
宸瑋（畫外音）：『濟公是南宋時候的和尚。他不守規矩，吃肉喝酒，但是專門幫窮人。所以大家叫他「濟公活佛」。』
阿喜：『他的故事被寫成小說，被拍成電視劇。中國人都知道他。』
宸瑋：『為什麼他這麼受歡迎？』
阿喜：『因為窮人喜歡他。古代窮人很多，他們希望有人幫他們。』
宸瑋（想了想）：『那我們家要當濟公嗎？』
阿喜（笑了）：『不用當濟公。但是要當一個善良的人。幫助需要幫助的人。』
宸瑋（認真）：『好。我知道了。』
阿喜（抱宸瑋）：『你最棒。』
`,
    shots: `00:00-00:10  靈隱寺 — 宸瑋視角看佛像的仰角鏡頭
00:10-00:25  宸瑋問「我們家信什麼」，阿喜尷尬回答的剪接
00:25-00:40  宸瑋問「靈隱是什麼意思」，阿喜解釋的剪接
00:40-00:55  「慧理從印度走過來」一句，鏡頭拍靈隱寺古建築
00:55-01:10  濟公雕像特寫，宸瑋「他穿得很破」剪接
01:10-01:25  「濟公是好人」一句，鏡頭 zoom in 小朋友表情
01:25-01:40  綠茶餐廳 — 宸瑋低頭「我不想回家」的特寫
01:40-01:55  宸瑋問「綠茶是什麼」，阿喜解釋的剪接
01:55-02:10  「回家教你泡茶」一句，鏡頭捕捉父子溫馨
02:10-02:25  蕭山機場告別 — 宸瑋跟阿伸擁抱的特寫
02:25-02:40  宸瑋跟阿橋討冰淇淋的搞笑剪接
02:40-02:55  飛機上 — 宸瑋看窗外的特寫
02:55-03:10  「我們下次還會來嗎」一句，鏡頭從窗外反射拍宸瑋臉
03:10-03:35  📚 小教室 1 — 靈隱寺 1700 年，配寺廟歷史年表
03:35-04:00  📚 小教室 2 — 濟公和尚，配濟公畫像 + 電視劇畫面
04:00-04:15  宸瑋笑了「好」，鏡頭 zoom in 小朋友笑容，定格
00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-01-lingyin-temple-steps.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Lingyin Temple stone steps with chibi little boy Chenwei walking up with chibi elderly Asian grandmother with jet-black hair and chibi middle-aged son uncle A-ping, photorealistic ancient Buddhist temple with stone lions and incense smoke, golden morning light, cinematic wide-angle shot"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-02-grandma-praying-buddha.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Lingyin Temple Buddha hall interior with chibi elderly Asian grandmother with jet-black hair and chibi middle-aged son uncle A-ping kneeling and praying with hands pressed together, chibi little boy Chenwei standing respectfully behind, photorealistic temple interior with incense smoke and golden Buddha statues, cinematic medium shot"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-03-green-tea-restaurant-toast.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Hangzhou green tea restaurant with all 13 chibi family members gathered around large round table for farewell lunch, chibi elderly Asian grandmother with jet-black hair toasting across table, photorealistic Hangzhou green tea restaurant with classical Chinese wooden interior and traditional dishes, cinematic wide-angle shot"
02:25-02:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-04-4-kids-ice-cream.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Hangzhou West Lake tourist street with chibi little boy Chenwei and 3 other chibi kids (brother Enqi, Wu brothers Dayu and Xiaoyu) all holding ice cream cones running, chibi elderly Asian grandmother with jet-black hair chasing them, photorealistic bustling lakeside area with tourist crowds, cinematic wide-angle shot"
02:40-02:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-05-chenwei-plane-window.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, airplane window with chibi little boy Chenwei looking out at Hangzhou city lights fading below in evening, photorealistic airplane window framing Chinese coastal city lights at night with starry sky, cinematic close-up"
02:55-03:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-06-chenwei-reflection-window.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, airplane window with chibi little boy Chenwei face reflected in the glass with faint Hangzhou city lights behind, photorealistic airplane cabin dim lighting with window reflection, cinematic close-up"Will we come back next time?" with reflective philosophical face, the same face reflected in airplane window glass merging with city lights, photorealistic airplane window and city lights, cinematic emotional child farewell"
03:10-03:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-07-lingyin-temple-1700-year-timeline.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Lingyin Temple ancient stone archway with chibi little boy Chenwei and chibi elderly Asian grandmother with jet-black hair walking through, photorealistic ancient Buddhist temple stone arch with moss and carvings, cinematic wide-angle shot"
03:35-04:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-08-ji-gong-wandering-monk.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Lingyin Temple courtyard with chibi little boy Chenwei and chibi elderly Asian grandmother with jet-black hair looking at a stone statue of Ji Gong wandering monk in tattered robes, photorealistic temple courtyard with ancient trees, cinematic medium shot"`,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 劇本 D — 阿伸阿茹夫妻 + 女生朋友阿橋（美食博主小組 · 8 日吃吃喝喝）
// 三人化身美食博主，走到哪吃到哪評到哪，給分、推薦、CP 值分析
// 禁：愛情/對象/前男/前女/夫妻放閃等感情議題
// ──────────────────────────────────────────────────────────────────────────────
const D_DAYS: DayBlock[] = [
  // Day 1 — 出發：上海灘初見 + 外灘小吃
  {
    ...D1,
    dialogue: `（T1 集合 — 三人組湊齊）
阿橋（拿飲料）：『我要去上海吃小籠包！』
阿茹（看阿橋）：『妳還沒上飛機就開始講吃的。』
阿伸（掏手機）：『我先 Google 上海必吃。』
阿橋：『不用 Google！我早就查好了！小籠包、生煎、蟹粉小籠、鮮肉月餅。』
阿茹：『妳這個是出發前一個禮拜就查的吧。』
阿橋：『當然。美食博主不能臨陣磨槍。』
（飛機上 — 阿伸開餐車）
空姐：『請問要點什麼？』
阿橋（舉手）：『我要牛肉麵！』
阿茹：『飛機餐還有什麼好期待的。』
阿伸（已經在吃了）：『其實還行。牛肉是真的。』
阿茹（湊過去）：『真的嗎？』
阿伸（遞筷子）：『妳試試。』
阿茹（咬一口）：『嗯。還可以。7 分。』
阿橋（搶著吃）：『7 分太低了！我給 7.5！牛肉有嚼勁。』
阿伸：『那妳多吃一碗。』
阿橋：『我本來就要！』
（外灘夜景 — 三人路邊攤吃生煎）
阿茹（指）：『那邊有生煎！』
阿橋（眼睛亮）：『走走走！』
阿伸（看菜單）：『一份 8 個 35 人民幣。約 160 台幣。』
阿茹：『CP 值很高。來一份！』
（生煎上桌）
阿橋（拍照）：『等一下！我要先拍！這個皮好漂亮！』
阿茹（也拍）：『對對對！這個脆皮光澤超好！』
阿伸（已經在吃）：『妳們可以不要拍完再吃嗎？都冷了。』
阿橋（咬一口）：『噢——爆汁了！』
阿茹（也咬）：『湯好多！小心！』
阿伸（擦嘴）：『我跟妳們說，這個生煎 8.5 分。值得點。』
阿橋：『我給 9 分！這個是我吃過最好吃的生煎！』
阿茹：『你吃過幾家？』
阿橋：『在台灣吃過一家。但這個完勝！9 分！』
阿伸（看著兩位女生）：『妳們兩個在美食面前完全變了一個人。』
阿茹（吃第三個）：『閉嘴。』
阿橋（吃第四個）：『別說話。』
`,
    shots: `00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-01-trio-t1-bubble-tea.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Taiwan Taoyuan International Airport Terminal 1 departure hall morning sunlight through tall glass windows, chibi middle-aged male food reviewer + chibi middle-aged female food blogger + chibi young female foodie trio excitedly huddling together holding bubble tea and phone, real airport architecture with high ceilings and shops in background, cinematic wide-angle shot, soft golden hour lighting"
00:10-00:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-02-airplane-beef-noodles.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, inside airplane economy cabin with chibi middle-aged male food reviewer already biting into steaming airplane beef noodle bowl with plastic chopsticks, chibi young female foodie reaching across to steal a bite, chibi middle-aged female food blogger looking on skeptically, photorealistic economy class seats and overhead bins in background, soft cabin LED lighting, candid documentary close-up"
00:20-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-03-airplane-food-rating.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi characters sitting in airplane seats showing score cards — chibi middle-aged female food blogger holds up card reading '7' and chibi young female foodie holds up '7.5' for airplane beef noodles, chibi middle-aged male food reviewer between them shrugs with raised eyebrows, photorealistic airplane window with cotton candy clouds visible, fun competitive mood, cinematic medium shot"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-04-bund-night-silhouette.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters as joyful silhouettes walking along Shanghai Bund waterfront promenade at night, Oriental Pearl Tower glowing pink and purple in background, photorealistic historic European architecture buildings lit golden, neon lights reflecting on Huangpu River, cinematic backlit wide shot, three friends mood"
00:45-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-05-shengjian-arrive-plate.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, sizzling pan-fried Shanghai shengjian bao on a white ceramic plate arriving at a Bund night market stall, eight golden-bottom dumplings with sesame seeds on top, steam rising in night air, photorealistic Chinese street food stall with paper lanterns and menu boards in background, mouth-watering food photography close-up, dramatic shallow depth of field"
00:55-01:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-06-shengjian-photo-frenzy.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, two chibi female foodies (chibi middle-aged female food blogger + chibi young female foodie) frantically photographing a plate of shengjian bao with smartphones before eating, both leaning in close with camera flash, chibi middle-aged male food reviewer in background already biting into one dumpling with raised eyebrows, photorealistic night market stall setting, chaotic fun mood, cinematic three-shot composition"
01:05-01:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-07-shengjian-juice-splash.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, ultra slow-motion close-up of chibi young female foodie biting into a shengjian bao, hot broth squirting out in dramatic golden backlight splash, steam rising, photorealistic Chinese pan-fried dumpling crispy bottom and pork filling visible, dramatic shallow depth of field, cinematic food photography slow-motion moment"
01:20-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day1/img-08-bund-thumbs-up-9pt.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters standing on Shanghai Bund waterfront at night with Oriental Pearl Tower behind, chibi young female foodie triumphantly giving two thumbs up with mouth wide open in joy after rating shengjian 9 points, chibi middle-aged female food blogger holding a half-eaten shengjian and smiling, chibi middle-aged male food reviewer pointing at the girls with amused smile, photorealistic glowing skyline, joyful cinematic group portrait"`,
  },

  // Day 2 — 特種兵日：上海早餐三連發
  {
    ...D2,
    dialogue: `（05:30 飯店大廳）
阿伸（看手機）：『飯店早餐 7 點開始。我們早點下去。』
阿茹（半夢半醒）：『早餐而已。不用這麼早起吧。』
阿橋（已經下床）：『我已經準備好了。』
阿茹（驚）：『阿橋你什麼時候換好衣服的？』
阿橋：『你們還在睡的時候。我 5 點就起來準備吃早餐了。』
阿茹（佩服）：『美食博主。』
（小楊生煎 — 三人早餐第一站）
阿伸（看菜單）：『這裡有小籠包、生煎、燒賣、蟹粉小籠。』
阿橋（指）：『我要生煎！然後小籠包！然後蟹粉小籠！』
阿茹：『你吃得完嗎？』
阿橋：『我來上海就是為了吃。』
阿茹（也點）：『我要跟你一樣。』
阿伸（驚）：『你們兩個要點三份？』
阿橋：『對。』
阿茹：『對。』
阿伸（投降）：『我也一樣吧。』
（小籠包上桌）
阿茹（拍）：『這個皮好薄！看得到裡面的湯！』
阿橋（已經吃了）：『噢——這個湯是鮮的！』
阿伸（吃）：『皮很薄但不會破。功夫。』
阿茹：『我給 8.5 分。』
阿橋：『我給 9 分！這個完勝剛才的生煎！』
阿伸：『那妳到底要幾分？剛才生煎 9 分。』
阿橋（想了想）：『那小籠包 9.5 分。生煎還是 9 分。』
阿茹（搖頭）：『我們的計分系統是隨妳心情。』
（豫園 — 阿茹阿橋發現小吃攤）
阿茹（指）：『那邊有蟹粉灌湯包！』
阿橋：『還吃？』
阿茹：『剛剛是早午餐。現在是下午茶。』
阿橋：『說得也是。』
（兩人點一份灌湯包）
阿茹（喝湯）：『這個湯超鮮！有蟹味！』
阿橋：『但是有點鹹。』
阿伸（沒吃）：『我跟妳們說，剛吃完不要馬上吃鹹的。會更鹹。』
阿茹：『你這個美食評論家。』
阿橋：『阿伸你說的對。我給 7.5 分。』
（南翔饅頭店排隊）
阿伸（看招牌）：『這家 120 年老店。』
阿橋（拍）：『我一定要吃到。』
（排隊 30 分鐘終於入座）
阿橋（第一口）：『這個——值！這個值得排隊！』
阿茹（吃）：『皮 Q 餡鮮。我給 9 分。』
阿伸：『我跟妳們兩個的評分標準已經搞不清楚了。』
阿橋：『你慢慢搞。我先吃完。』
`,
    shots: `00:00-00:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-01-hotel-corridor-dawn.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dim Shanghai hotel corridor at 5:30 AM with one warm ceiling light casting long shadows, chibi young female foodie in full outfit skipping past numbered doors 1401 to 1412 leaving chibi middle-aged female food blogger half-asleep peeking out from a doorway with messy hair, photorealistic hotel carpet and wooden doors, cinematic shallow depth of field with bokeh, comedic morning mood"
00:10-00:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-02-xiaoyang-shengjian-trio.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters sitting at Xiao Yang Sheng Jian breakfast shop counter, chibi young female foodie confidently ordering three dishes pointing at menu, chibi middle-aged male food reviewer wide-eyed with shock, chibi middle-aged female food blogger nodding in agreement, photorealistic Chinese breakfast shop with steam and staff in white uniforms, warm morning fluorescent light, cinematic three-shot"
00:25-00:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-03-xiaolongbao-juice-slowmo.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, ultra slow-motion close-up of chibi middle-aged female food blogger biting into a xiaolongbao soup dumpling at Xiao Yang restaurant, hot broth squirting out in golden backlight, steam rising, photorealistic delicate Chinese soup dumpling paper-thin skin and pork filling visible, dramatic shallow depth of field, cinematic food photography moment, golden morning light"
00:40-00:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-04-rating-chaos-cards.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi characters at Xiao Yang Sheng Jian table each holding up score cards with wildly different numbers for xiaolongbao, chibi middle-aged female food blogger '8.5', chibi young female foodie '9.5' raised highest, chibi middle-aged male food reviewer pointing at the conflicting numbers with amused exasperation, photorealistic restaurant table with bamboo steamers and teacups, comedic rating chaos mood, cinematic medium shot"
00:55-01:10  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-05-yu-garden-guantang-bao.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi middle-aged female food blogger sipping broth from a crab-roe guantang bao soup dumpling at Yu Garden street stall with a spoon, steam rising from the bamboo steamer, chibi young female foodie watching eagerly beside her, photorealistic traditional Ming Dynasty Yu Garden architecture with curved rooftop and red pillars in background, soft afternoon sunlight, cinematic close-up food moment"
01:10-01:25  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-06-yu-guan-7pt5-debate.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters in Yu Garden stone-paved alley having a debate, chibi middle-aged male food reviewer gesturing with chopsticks pointing at the food saying 'too salty after soy', chibi young female foodie reluctantly agreeing to give 7.5 points, chibi middle-aged female food blogger nodding with hands on hips, photorealistic traditional Chinese garden architecture and stone lion in background, soft dappled afternoon light, cinematic medium three-shot"
01:25-01:40  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-07-nanxiang-queue-30min.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie standing in a long queue outside the historic Nanxiang Mantou Dian 120-year-old soup dumpling shop in Yu Garden, checking phone with impatient expression, photorealistic traditional Chinese shop facade with red lanterns and gold calligraphy sign, hot summer sun creating harsh shadows, cinematic medium shot capturing the wait and determination, comic mood"
01:40-01:55  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day2/img-08-nanxiang-worth-it.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Nanxiang table with empty bamboo steamer baskets stacked high, chibi young female foodie triumphant with both thumbs up after rating 'worth the queue 9 points', chibi middle-aged female food blogger smiling '9 points' chopsticks in mouth, chibi middle-aged male food reviewer giving up trying to understand their scoring, photorealistic old Shanghai shop interior with wooden tables, warm incandescent lighting, joyful cinematic group portrait"`,
  },

  // Day 3 — 西塘整天：水鄉小吃一條街
  {
    ...D3,
    dialogue: `（西塘早茶 — 阿橋已經研究好菜單）
阿橋（拿菜單）：『我昨晚查了，西塘必吃：粉蒸肉、芡實糕、麥芽糖、桂花酒。』
阿茹（驚）：『你連菜單都背了。』
阿橋：『美食博主基本功。』
阿伸（看菜單）：『粉蒸肉一份 38 人民幣。』
阿茹：『來三份。』
阿橋：『不。每個人一份試試。』
阿茹：『為什麼？』
阿橋：『因為這樣可以點更多不同的。』
阿茹（點頭）：『專業。』
阿伸：『我以為你只是想多吃。』
阿橋：『我是想吃。但也要有策略地吃。』
（粉蒸肉上桌）
阿茹（拍）：『這個肉下面是荷葉。好香。』
阿橋（吃）：『噢——入口即化！五花肉的油都化了！』
阿伸（吃）：『不錯。調味鹹甜鹹甜。』
阿橋：『我給 9 分！這個是上海必吃！』
阿茹：『我給 8.5 分。肉有點肥。』
阿伸：『我給 8 分。整體很棒但不到 9 分的驚艷。』
阿橋：『你們兩個太嚴格了。9 分！不接受反駁！』
（西塘運河旁邊 — 芡實糕）
阿茹（看攤）：『這是什麼？』
老闆：『芡實糕。我們這邊的特產。』
阿橋（試吃一小塊）：『噢——QQ 軟軟的！不會太甜！』
阿茹（也吃）：『這個當伴手禮可以。』
阿伸（吃）：『價格？』
老闆：『一盒 25 人民幣。10 塊裝。』
阿伸：『CP 值高。可以買。』
阿橋：『我買 5 盒！』
阿茹（驚）：『你買這麼多幹嘛？』
阿橋：『一盒自己吃。一盒給我爸媽。一盒給我朋友。兩盒備用。』
阿茹：『你連買芡實糕都有備用方案。』
阿伸（掏錢）：『我請。這是今天的點心。』
阿橋：『阿伸你是我的好朋友！』
阿茹：『阿伸你也是我的好朋友！』
阿伸：『你們兩個好朋友不要同時叫我。會害羞。』
（西塘運河 — 三人吃麥芽糖）
阿橋（買一串）：『這是手工做的！』
阿茹（看）：『師傅在拉糖！』
阿伸（拍師傅）：『這個畫面太療癒了。』
阿橋（吃）：『甜！但是不膩。我給 8 分。』
阿茹：『我給 7.5 分。太甜了。』
阿伸：『我同意阿茹。太甜。』
阿橋：『你們兩個不懂。甜才是王道！』
`,
    shots: `00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-01-xitang-menu-recite.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie enthusiastically reciting a memorized Xitang menu to her two friends, holding phone with one hand and gesturing with chopsticks in the other, chibi middle-aged female food blogger impressed with hands together, chibi middle-aged male food reviewer amused with tea cup raised, photorealistic Xitang water canal breakfast shop with stone bridges and willow trees behind, soft morning light, cinematic medium shot"
00:15-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-02-fenzheng-rou-reveal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic slow-motion shot of Xitang fen zheng rou (steamed pork with rice flour wrapped in lotus leaf) being opened, fragrant steam rising dramatically in golden backlight, three chibi foodie characters leaning in awe, photorealistic traditional Chinese restaurant table with wooden chairs, lotus leaf unfurling revealing succulent pork belly layers, mouth-watering food photography, dramatic shallow depth of field"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-03-9pt-no-appeal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie standing at Xitang restaurant holding up '9 points' score card with both hands and stubborn expression, refusing to back down, while chibi middle-aged female food blogger and chibi middle-aged male food reviewer behind her shake their heads with '8.5' and '8' cards, photorealistic water canal and stone alley visible through window, comic standoff mood, cinematic medium shot"
00:45-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-04-scoring-table-three-way.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic overhead shot looking down at three chibi foodie characters at a Xitang round wooden table each holding score cards visible — '9 / 8.5 / 8' — for fen zheng rou, with three plates of half-eaten pork belly around them, photorealistic table with bamboo steamers and tea cups, competitive scoring mood, cinematic top-down food photography"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-05-qianshi-gao-buy-5.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie holding up five boxes of qianshi gao fox-nut cake at a Xitang canal vendor stall, both arms spread wide with proud expression, chibi middle-aged female food blogger laughing in disbelief behind her, chibi middle-aged male food reviewer reaching for wallet to pay, photorealistic stone canal-side vendor with traditional Chinese goods and wooden display, sunny afternoon light, comedic buying-spree mood, cinematic medium shot"
01:15-01:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-06-spare-box-line.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters standing at Xitang canal vendor stall laughing after chibi young female foodie explains her 'one for me one for parents one for friends two as spares' logic for buying qianshi gao, photorealistic Xitang water canal with stone bridge and willow trees in background, joyful mood, cinematic group portrait capturing laughter"
01:30-01:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-07-maltose-pull-craftsman.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, mesmerizing close-up of an old Xitang craftsman pulling traditional Chinese maltose syrup (mai ya tang) into golden thin strands by hand, three chibi foodie characters watching in awe behind him with phones out, photorealistic traditional candy stall with wooden tools and warm afternoon sunlight catching the golden sugar strands, dreamy cinematic shallow focus on the artisan's hands"
01:50-02:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day3/img-08-sweet-is-king.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie biting into a freshly pulled maltose candy on a stick by Xitang canal, declaring 'sweet is king' with defiant closed-eye expression, chibi middle-aged female food blogger and chibi middle-aged male food reviewer in background shake their heads in disagreement holding '7.5' and '8' score cards, photorealistic stone canal bridge with hanging lanterns, warm dusk light, comedic scoring-debate mood"`,
  },

  // Day 4 — 烏鎮：江南水鄉料理
  {
    ...D4,
    dialogue: `（烏鎮西柵大門 — 阿橋已經查好美食地圖）
阿橋（拿手機）：『今天目標：烏鎮醬鴨、定勝糕、姑嫂餅、烏鎮三珍。』
阿茹（看）：『你連路線都規劃好了。』
阿伸（看地圖）：『帶路吧。美食博主。』
阿橋（領頭）：『跟我走！』
（烏鎮運河邊 — 醬鴨）
阿茹（看）：『這個鴨子顏色好深。』
老闆：『我們這邊的特色。醬醃 24 小時。』
阿橋（試吃）：『噢——這個肉 Q！醬香很濃！』
阿茹（吃）：『鹹度剛剛好。但是皮有點硬。』
阿伸（吃）：『整體 8 分。』
阿橋：『我給 8.5！這個鴨的香氣是別地方吃不到的！』
阿茹：『美食博主加分數永遠比別人高。』
阿伸：『這就叫品牌溢價。』
（染坊附近 — 定勝糕）
阿茹（看攤）：『這個糕上面寫字？』
老闆：『寫「定勝」。考試的時候吃的。』
阿橋（試吃）：『這個米香！鬆軟！』
阿茹（吃）：『淡淡的甜。配茶很好。』
阿伸（吃）：『我給 8 分。』
阿橋：『8 分太低了！這種古早味應該 9 分！』
阿茹（指定勝糕）：『老闆我要 5 個！帶回去給家人！』
阿橋：『我也要！』
（兩人買了 10 個定勝糕）
阿伸（看）：『你們兩個女生買這個是要幹嘛？』
阿茹：『考試的時候吃啊！定勝！』
阿橋（看阿茹）：『妳考什麼試？』
阿茹（臉紅）：『我考駕照。』
阿橋：『駕照也算考試！準！』
（中午 — 水宴餐廳）
阿橋（看菜單）：『水宴是烏鎮最有名的餐廳！』
阿茹：『有什麼必點？』
阿橋：『醬鴨、紅燒肉、白水魚。』
阿伸：『那就三個都點。』
（水宴菜上桌）
阿茹（拍）：『這個紅燒肉！這個顏色！這個光澤！』
阿橋（吃）：『入口即化！醬香濃！』
阿伸（吃）：『白水魚新鮮。肉細。』
阿橋：『我給 9 分！這個紅燒肉是江南必吃！』
阿茹：『我給 8.5 分。』
阿伸：『我也 8.5 分。難得我們三個同意。』
阿橋：『難得我同意別人。我通常比較大方。』
阿茹：『你自己承認。』
`,
    shots: `00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-01-wuzhen-food-map-leader.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie leading the way at Wuzhen Xizha west gate, holding up phone with Wuzhen food map and calling 'follow me!' with confident expression, chibi middle-aged female food blogger and chibi middle-aged male food reviewer following behind with amused smiles, photorealistic ancient Wuzhen gate tower with red paint against blue sky, bright morning sunlight, cinematic wide-angle leader shot"
00:15-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-02-wuzhen-jiangya-tasting.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters tasting traditional Wuzhen jiang ya (sauce-marinated duck) at a canal-side stall, vendor holding the dark soy-glazed duck, chibi young female foodie reaching for '8.5 points', chibi middle-aged female food blogger hesitating 'skin is tough', chibi middle-aged male food reviewer writing notes, photorealistic Wuzhen canal with stone bridge and white-walled houses in background, warm afternoon light, cinematic three-shot"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-03-dingsheng-gao-explanation.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, Wuzhen street vendor pointing at traditional Chinese dingsheng gao victory rice cakes stamped with '定勝' characters, explaining to three chibi foodie characters leaning in curiously, photorealistic vendor stall with stacked wooden steamer baskets and red calligraphy signs, soft Wuzhen canal light, cinematic close-up food vendor shot"
00:45-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-04-drivers-license-laugh.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Wuzhen stone bridge laughing out loud after chibi middle-aged female food blogger shyly reveals she is studying for her driver's license and buying dingsheng gao for luck, chibi young female foodie leaning over shoulder teasing her, chibi middle-aged male food reviewer chuckling with hands on knees, photorealistic Wuzhen water canal and white-walled houses with hanging lanterns in background, bright midday light, comedic laugh-out-loud mood, cinematic group portrait"
01:00-01:20  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-05-shuiyan-hongshao-rou.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic slow-motion close-up of Wuzhen Shuiyan restaurant signature hong shao rou red-braised pork belly glistening with caramelized soy glaze, three chibi foodie characters visible at table edge reaching for it with chopsticks, photorealistic Chinese restaurant interior with wooden furniture and paper lanterns, warm golden interior lighting, cinematic food photography moment, mouth-watering texture detail"
01:20-01:35  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-06-rare-agreement.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Shuiyan restaurant table all smiling with their '8.5 points' score cards raised in rare unanimous agreement on the hong shao rou, plates empty except for sauce, photorealistic restaurant interior with bamboo steamers and Chinese tea pots, warm indoor lighting, celebratory rare-agreement mood, cinematic group portrait"
01:35-01:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-07-im-generous-confession.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie sheepishly admitting 'I'm usually more generous with scores' at Wuzhen Shuiyan restaurant with embarrassed shrug, while chibi middle-aged female food blogger points at her laughing 'you finally admit it', chibi middle-aged male food reviewer nods knowingly at the camera, photorealistic restaurant interior, warm indoor lighting, comedic confession moment, cinematic three-shot"
01:50-02:05  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day4/img-08-wuzhen-night-canal-finale.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters silhouetted walking along Wuzhen night canal with hundreds of glowing red lanterns reflecting perfectly in dark still water, traditional Chinese stone bridges and white-walled architecture, photorealistic magical night scene with mirror-like reflections, cinematic wide shot, warm lantern glow against deep blue dusk sky, three friends ending a perfect food day"`,
  },

  // Day 5 — 杭州西湖：杭幫菜評比
  {
    ...D5,
    dialogue: `（西湖邊 — 阿橋已經在想午餐）
阿橋（看手機）：『杭州必吃：西湖醋魚、東坡肉、龍井蝦仁、宋嫂魚羹。』
阿茹（看）：『又是 4 道菜？』
阿橋：『這是杭幫菜四大天王。』
阿伸（看）：『西湖醋魚聽說有人不喜歡。』
阿橋：『那是因為他們沒吃到好吃的。我們去吃最有名的樓外樓。』
（西湖邊 — 樓外樓）
阿茹（看菜單）：『西湖醋魚 168 人民幣。』
阿橋（驚）：『一條魚 700 多台幣？』
阿茹：『有名的餐廳價格就是這樣。』
阿伸：『那要看值不值得。』
（西湖醋魚上桌）
阿橋（拍）：『這個擺盤很美。』
阿茹（吃）：『噢——這個醋味！很特別！』
阿伸（吃）：『肉很嫩。但是刺有點多。』
阿橋：『我給 7.5 分。』
阿茹：『我也 7.5 分。』
阿伸：『我也 7.5 分。難得我們三個又同意。』
阿茹：『價格扣分。700 多台幣吃刺多的魚。』
阿橋：『但這個醋味真的很特別。別地方吃不到。』
（東坡肉上桌）
阿茹（拍）：『這個方方正正！好可愛！』
阿橋（喝湯汁）：『這個醬汁！配飯可以吃 3 碗！』
阿伸（吃）：『肉燉得很軟。肥而不膩。』
阿橋：『我給 9 分！』
阿茹：『9 分！這個我同意！』
阿伸：『我也 9 分。這個是江南第一名菜。』
阿橋：『三個 9 分！這個要記下來！』
（武林夜市 — 三人街頭小吃）
阿茹（指）：『那邊有蔥包檜！』
阿橋（已經跑去）：『走走走！』
阿伸（跟上）：『你們兩個看到吃的就跑得比我快。』
阿橋（咬）：『這個外脆內軟！』
阿茹（吃）：『蔥香好濃。』
阿伸：『8 分。』
阿橋：『我給 8.5。』
阿茹：『我給 8。我喜歡但不會特別推薦。』
阿橋：『妳都喝醉了還這麼冷靜。』
阿茹：『我才沒喝醉。』
`,
    shots: `00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-01-hangzhou-four-kings.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie standing by West Lake declaring the 'Hangzhou Four Kings' — West Lake vinegar fish, Dongpo pork, Longjing shrimp, Song Sao fish soup — holding up four fingers enthusiastically, chibi middle-aged female food blogger and chibi middle-aged male food reviewer nodding along, photorealistic West Lake with willow trees and Su Causeway, soft misty morning light, cinematic medium shot, three foodie friends mood"
00:15-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-02-louwailou-7pt5-three-way.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at the famous Lou Wai Lou restaurant overlooking West Lake all holding '7.5 points' score cards in rare unanimous agreement for West Lake vinegar fish, photorealistic historic Hangzhou restaurant interior with wooden furniture and lake view window, soft afternoon lake light, celebratory rare-agreement mood, cinematic group portrait"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-03-dongpo-rou-cute-square.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, perfect cube-shaped Dongpo pork belly glistening in dark caramelized soy sauce on a white plate at Lou Wai Lou, chibi middle-aged female food blogger holding it up with both hands exclaiming 'so cute!' with delighted expression, photorealistic traditional Hangzhou restaurant with lake view and white tablecloth, soft golden afternoon light, cinematic close-up food photography moment"
00:45-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-04-three-9pt-cheer.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Lou Wai Lou cheering and raising three '9 points' score cards in unanimous agreement for the Dongpo pork, chopsticks waving, mouths open in joy, photorealistic Hangzhou restaurant with West Lake view through window, warm golden indoor lighting, celebratory foodie mood, cinematic group portrait capturing high score energy"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-05-wulin-congbagui.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Wulin night market stall biting into Hangzhou congbagui crispy scallion pancake wrap, steam rising, neon stall lights, chibi young female foodie already running ahead to the next stall, photorealistic bustling Chinese night market with red lanterns and food stalls, warm evening light, chaotic fun mood, cinematic three-shot"
01:15-01:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-06-cold-as-ever-line.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie teasing chibi middle-aged female food blogger 'you are so calm even after drinking' at Wulin night market, the blogger with playful annoyed expression pointing at the foodie, chibi middle-aged male food reviewer laughing in background, photorealistic night market street with neon lights and crowds, warm evening mood, comedic banter shot, cinematic three-shot"
01:30-01:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-07-wulin-night-stroll.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters as joyful silhouettes strolling through Wulin night market with neon food stall signs glowing red yellow and green all around, hanging lanterns, photorealistic bustling night market atmosphere, cinematic wide-angle backlit shot, three friends mood"
01:45-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day5/img-08-hangzhou-hotel-window.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters relaxing at a Hangzhou hotel window at night reflecting on the day's Hangzhou food journey, chibi middle-aged male food reviewer holding his score notebook, chibi young female foodie with phone scrolling tomorrow's plan, chibi middle-aged female food blogger sipping tea, photorealistic hotel window showing West Lake night skyline with lights, warm room interior lighting, contemplative cinematic medium shot"`,
  },

  // Day 6 — 宋城千古情：宋城主題餐廳
  {
    ...D6,
    dialogue: `（318 公車上 — 阿橋研究宋城美食）
阿橋（看手機）：『宋城裡面有「南宋御街」。可以吃到宋朝小吃。』
阿茹：『宋朝小吃？什麼樣？』
阿橋：『定勝糕、叫化雞、東坡肉、宋代點心。』
阿伸：『聽起來跟昨天差不多。』
阿橋：『不一樣！宋城的版本比較古早！』
（宋城內 — 叫化雞）
阿茹（看）：『這個雞用泥巴包起來烤？』
老闆：『對。傳統做法。』
阿橋（拍）：『這個泥巴要敲開！』
（泥巴敲開，雞香撲出來）
阿橋：『噢——這個香氣！』
阿茹：『好香！』
阿伸：『聞起來比昨天的東坡肉還要香。』
（雞肉入口）
阿茹（驚）：『這個肉超嫩！入口即化！』
阿橋：『而且雞汁都鎖在裡面！』
阿伸：『這個 9 分。』
阿橋：『我給 9.5 分！江南第一名雞！』
阿茹：『我也 9.5 分！』
阿伸：『難得我們都給 9.5。』
阿橋：『三個 9.5 分！這個要記下來！』
（馬鴻興川小館 — 點菜）
阿茹（看菜單）：『川菜！我最愛！』
阿橋：『我有過敏不吃辣。』
阿茹：『川菜可以有不辣的。』
阿伸：『水煮魚可以不辣。回鍋肉可以小辣。』
阿橋：『那就麻婆豆腐小辣。水煮魚不辣。回鍋肉小辣。』
阿茹：『你是美食博主。點菜都好專業。』
阿橋：『基本功。』
（水煮魚上桌）
阿茹（拍）：『這個油！這個辣椒！這個花椒！』
阿橋（喝湯）：『噢——這個麻！這個辣！舒服！』
阿伸（吃魚）：『肉細。湯鮮。』
阿茹：『我給 9 分！』
阿橋：『9.5 分！』
阿伸：『我也 9.5 分。』
阿橋：『今天三個都是高分！江南真的太好吃了！』
`,
    shots: `00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-01-songcheng-bus-research.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie researching Song Dynasty snacks on phone inside a 318 Chinese public bus, leaning toward her two friends excitedly, chibi middle-aged female food blogger and chibi middle-aged male food reviewer listening with interest, photorealistic Chinese tour bus interior with colorful plastic seats and highway view through window, midday sun, cinematic medium shot, foodie planning mood"
00:15-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-02-jiaohuaji-mud-crack.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic slow-motion shot of a hammer cracking open the dried mud shell of a traditional Chinese jiaohua ji beggar's chicken at Song Dynasty theme park, fragrant steam and herb scent bursting out, three chibi foodie characters leaning in awe, photorealistic Song-style architecture and traditional cooking setup, warm afternoon light, dramatic shallow depth of field, mouth-watering food reveal moment"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-03-9pt5-three-cheer.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Songcheng cheering and raising three '9.5 points' score cards in rare unanimous agreement for the jiaohua ji beggar's chicken, mouths open shouting in joy, photorealistic Song Dynasty themed village architecture in background, warm celebratory mood, cinematic group portrait capturing the high-score excitement"
00:45-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-04-mahongxing-menu.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at Ma Hong Xing Sichuan restaurant counter studying the menu, chibi middle-aged female food blogger pointing excitedly at 'water-boiled fish', chibi young female foodie raising hand ordering 'not too spicy please', chibi middle-aged male food reviewer nodding approvingly, photorealistic Sichuan restaurant interior with red wooden tables and Sichuan decorations, warm indoor lighting, cinematic three-shot"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-05-shuizhuyu-photographer.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic close-up of Sichuan water-boiled fish (shui zhu yu) bubbling in chili oil at Ma Hong Xing restaurant, chibi middle-aged female food blogger in background holding phone taking photo with focused expression, photorealistic Sichuan restaurant with red lanterns and chili decorations, vibrant red oil and floating Sichuan peppercorns, dramatic cinematic shallow focus on the bubbling fish"
01:15-01:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-06-9pt5-shout.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie shouting '9.5 points!' with both arms raised triumphantly after tasting the water-boiled fish at Ma Hong Xing, chibi middle-aged female food blogger beside her also holding up '9.5 points' card smiling, chibi middle-aged male food reviewer nodding approval at camera, photorealistic Sichuan restaurant with empty plates and chili oil bowl, warm celebratory mood, cinematic medium shot"
01:30-01:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-07-sichuan-lively-meal.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters enjoying a lively Sichuan meal at Ma Hong Xing with multiple dishes spread on red table — water-boiled fish, mapo tofu, twice-cooked pork, all half-eaten, chopsticks moving, mouths full, photorealistic Sichuan restaurant with red wooden decor and Sichuan cultural wall art, warm red indoor lighting, chaotic happy foodie mood, cinematic group shot"
01:45-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day6/img-08-songcheng-farewell-night.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters walking out of Songcheng Song Dynasty theme park at night, lantern-lit Song-era street behind them, all three smiling with full bellies, chibi young female foodie holding up tomorrow's food plan phone, photorealistic historic themed park with glowing traditional lanterns and architecture, warm dusk-to-night cinematic wide shot, three friends ending a perfect Sichuan day"`,
  },

  // Day 7 — 杭州宮宴：宮廷料理
  {
    ...D7,
    dialogue: `（宮宴換裝前 — 阿橋已經在研究宮宴菜單）
阿橋（看手機）：『杭州宮宴是宋宴的復刻！宋朝皇帝吃的！』
阿茹：『皇帝吃的！一定很貴！』
阿伸：『應該 2000-3000 台幣一位。』
阿橋：『但是阿喜請客。所以我們要認真吃！』
阿茹（握拳）：『認真吃！』
阿伸（也握拳）：『認真吃！』
（換裝間 — 三人穿好古裝準備吃）
阿伸（看）：『我們穿古裝吃宋宴。』
阿橋（轉圈）：『這個就是穿越！』
阿茹（轉圈）：『我要當楊貴妃！』
阿橋：『那我當西施！』
阿伸：『我當蘇東坡。寫詩吃東坡肉。』
（宮宴上菜 — 御膳）
阿茹（看）：『這個擺盤好美！像畫！』
阿橋（拍）：『這個是宋代宮廷菜！』
阿伸：『先看菜的樣子。再聞。最後吃。三步。』
阿茹（吃）：『噢——這個入口即化！』
阿橋：『御膳真的不一樣。每一道都精緻。』
阿伸（吃）：『這個值 9 分。』
阿茹：『我給 9 分！』
阿橋：『我給 9.5 分！宮廷料理果然不一樣！』
阿茹：『楊貴妃覺得滿意。』
阿橋：『西施也覺得。』
阿伸（看兩位女生）：『你們兩個今天很配合。』
阿茹（推阿伸）：『閉嘴吃你的。』
（宮宴中段 — 點心）
阿茹（看點心）：『這個桂花糕！』
阿橋（吃）：『桂花香！QQ 軟軟！』
阿伸（吃）：『宋朝就有的點心。千年傳承。』
阿茹：『我給 8.5 分。』
阿橋：『我給 9 分！』
阿伸：『我也 9 分。這個不甜不膩剛剛好。』
阿橋（看兩位）：『我們今天很和諧。』
阿茹：『因為東西太好吃。沒時間吵架。』
阿伸：『美食博主說得對。』
（宮宴結束 — 三人拍照）
阿橋（拿手機）：『這 8 道菜的紀錄我都要拍。』
阿茹：『拍回去給你的粉絲看？』
阿橋：『對啊！我是美食博主。我有責任紀錄！』
阿伸：『那我也算美食博主吧？』
阿茹（看阿伸）：『你是美食評審。』
阿橋：『你是美食評審。』
阿伸：『為什麼不是博主？』
阿茹：『因為你不拍照。』
`,
    shots: `00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-01-palace-banquet-plating.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic close-up of imperial Hangzhou palace banquet dish meticulously plated like Song Dynasty court art, jade-colored porcelain plate with delicate sauce painting, three chibi foodie characters leaning in awe with chopsticks ready, photorealistic grand palace interior with red pillars and golden decorations, warm royal lighting, cinematic food photography moment, mouth-watering detail"
00:15-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-02-imperial-three-shots.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at the imperial palace banquet each tasting Song Dynasty imperial dish with reverent expressions, chibi middle-aged male food reviewer declaring 'this is worth 9 points', chibi young female foodie and chibi middle-aged female food blogger nodding seriously, photorealistic Song-style palace interior with red lanterns and imperial yellow decorations, warm royal lighting, cinematic three-shot capturing imperial dining mood"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-03-costume-roles-funny.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters posing in Song Dynasty imperial costumes before palace banquet, chibi middle-aged female food blogger dressed as Yang Guifei with elaborate hair, chibi young female foodie as Xi Shi spinning with skirt flowing, chibi middle-aged male food reviewer as Su Dongpo the poet stroking imaginary beard, photorealistic Song-style costume changing room with mirrors and silk robes, bright daylight, comedic costume-posing mood, cinematic group portrait"
00:45-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-04-guihua-gao-thousand-year.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters tasting Song Dynasty guihua gao osmanthus cake at imperial banquet, chibi middle-aged male food reviewer explaining 'this pastry has thousand years of history', chibi middle-aged female food blogger taking a delighted bite, chibi young female foodie holding cake up to camera, photorealistic palace banquet table with imperial dishes, warm royal golden lighting, cinematic close-up food-and-friends moment"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-05-very-harmonious-line.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters at imperial palace banquet raising three '9 points' score cards in harmony for guihua gao, all three smiling at each other, plates of imperial dishes around them, photorealistic Song-style palace interior with red pillars and imperial decorations, warm royal lighting, rare-harmony mood, cinematic group portrait capturing peaceful three-way agreement"
01:15-01:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-06-no-time-to-fight.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi middle-aged female food blogger explaining 'no time to fight when food is this good' with playful smile, pointing at the imperial dishes on table, chibi middle-aged male food reviewer nodding in agreement, chibi young female foodie already biting into next dish, photorealistic imperial palace banquet setting with multiple half-eaten dishes, warm royal lighting, comedic friendship mood, cinematic medium three-shot"
01:30-01:50  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-07-costume-group-photo.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters in full Song Dynasty imperial costumes posing together for a group photo inside the palace banquet hall, all holding chopsticks, chibi young female foodie holding up smartphone taking selfie of all three with imperial background, photorealistic Song-style palace interior with red lanterns and imperial decorations, warm royal lighting, celebratory group portrait mood, cinematic wide shot"
01:50-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day7/img-08-not-blogger-line.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters laughing after chibi middle-aged female food blogger and chibi young female foodie tease chibi middle-aged male food reviewer 'you're not a blogger because you never take photos', chibi middle-aged male food reviewer defending himself with open arms, photorealistic imperial palace banquet setting with empty imperial dishes, warm royal lighting, comedic banter mood, cinematic three-shot capturing laugh-out-loud moment"`,
  },

  // Day 8 — 最後一天：江南美食總回顧
  {
    ...D8,
    dialogue: `（靈隱寺 — 早餐前先總結）
阿橋（拿手機）：『我來總結 8 天的美食榜！』
阿茹（鼓掌）：『好啊！』
阿伸（鼓掌）：『期待。』
阿橋：『第三名——宋城叫化雞！9.5 分！』
阿茹（驚）：『喔喔喔！』
阿伸（驚）：『我也愛叫化雞！』
阿橋：『第二名——南宋宮宴御膳！9.5 分！』
阿茹：『這個也實至名歸！』
阿伸：『這個是最高級的料理。』
阿橋：『第一名——』
阿橋（停頓）：『馬鴻興水煮魚！9.5 分！』
阿茹：『這個我同意！』
阿伸：『這個我同意！』
阿橋：『8 天裡面吃了 24 道菜。我給了 4 個 9 分、6 個 8 分以上。沒有低於 7 分的。』
阿茹（驚）：『妳真的都記得？』
阿橋（指阿茹）：『因為我是美食博主！這是基本功！』
阿茹（指阿伸）：『那你呢？你都給幾分？』
阿伸：『我給的都比較保守。但平均 8 分。』
阿橋：『那你的榜單呢？』
阿伸：『我的榜單：樓外樓東坡肉第一。馬鴻興水煮魚第二。宋城叫化雞第三。』
阿茹：『我們三個的榜單都好不一樣。』
阿橋：『這就是美食的奧妙。每個人喜歡的不一樣。』
（綠茶餐廳 — 最後一頓）
阿橋（看菜單）：『綠茶是杭州有名的連鎖餐廳！』
阿茹：『招牌是綠茶烤魚。』
阿伸：『那就點綠茶烤魚。』
（綠茶烤魚上桌）
阿橋（拍）：『這個跟馬鴻興的不一樣。這個有茶香。』
阿茹（吃）：『噢——茶味跟魚融合！』
阿伸（吃）：『這個創意。』
阿橋：『我給 8 分。創意有但魚肉沒有馬鴻興的細。』
阿茹：『我也 8 分。』
阿伸：『我也 8 分。這個是好的但不到必吃。』
阿橋（指菜單）：『那這個綠茶餅呢？』
阿茹：『一定要點！』
（綠茶餅上桌）
阿橋（吃）：『噢——這個外脆內軟！花生香！』
阿茹：『這個我可以吃 3 個！』
阿伸（吃）：『簡單但好吃。8.5 分。』
阿橋：『8 分！我給！這個是平凡中的美味！』
（蕭山機場 — 告別）
阿茹（看阿喜）：『阿喜哥！這 8 天謝謝你請客！』
阿喜：『應該的！你們吃得開心嗎？』
阿橋：『開心！我吃了 24 道菜！我都記得！』
阿喜（驚）：『妳都記得？』
阿橋：『當然！我是美食博主！』
阿伸：『她這 8 天每天吃。她最開心。』
阿茹：『我也是。阿喜哥謝謝你！』
阿喜：『不客氣！下次再來！』
（飛機上 — 三人回顧）
阿茹：『這 8 天最棒的是什麼？』
阿伸：『最棒的是每天都有好吃的。』
阿橋：『最棒的是跟妳們一起吃。』
阿茹：『對！吃什麼不重要。一起吃才重要。』
阿橋（握兩人的手）：『我們三個以後也要常常一起吃！』
阿伸（握回去）：『好！』
阿茹（握回去）：『好！』
`,
    shots: `00:00-00:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-01-food-ranking-opening.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie standing at Lingyin Temple with phone held up like a microphone announcing 'the 8-day food ranking begins now!' with confident pose, chibi middle-aged female food blogger clapping in anticipation, chibi middle-aged male food reviewer applauding with amused smile, photorealistic Hangzhou Lingyin Temple entrance with incense smoke and ancient Buddhist architecture, soft morning light, cinematic medium three-shot, foodie finale mood"
00:15-00:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-02-third-place-beggars-chicken.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters cheering 'third place — Songcheng beggar's chicken!' with mouths open and arms raised, imaginary score card '9.5 points' visible above, photorealistic Hangzhou Lingyin Temple courtyard with ancient stonework and incense smoke, soft morning sunlight, celebratory mood, cinematic group shot capturing the joy of food ranking"
00:30-00:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-03-first-place-shuizhuyu.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters shouting in unison 'first place — Ma Hong Xing water-boiled fish!' with both arms raised high and mouths wide open, photorealistic Lingyin Temple courtyard with incense smoke and ancient architecture, bright celebratory mood, cinematic group portrait capturing first-place energy"
00:45-01:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-04-24-dishes-recall.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, chibi young female foodie proudly listing 'I gave 4 dishes 9 points, 6 dishes above 8 points, none below 7' while counting on fingers, chibi middle-aged female food blogger shocked with hands on cheeks 'you remember all?', chibi middle-aged male food reviewer impressed with thumb up, photorealistic Lingyin Temple courtyard, soft morning light, foodie-recall mood, cinematic medium three-shot"
01:00-01:15  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-05-three-different-rankings.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters comparing three wildly different personal food rankings written on napkins at Lingyin Temple bench, all three pointing at their own napkins with confused laughter, photorealistic stone bench in temple courtyard with incense smoke, midday light, comedic disagreement mood, cinematic three-shot"
01:15-01:30  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-06-green-tea-grilled-fish.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic close-up of Hangzhou Green Tea restaurant signature lü cha kao yu green tea grilled fish with aromatic green tea leaves sizzling on top, steam rising, three chibi foodie characters at table edge nodding '8 points — creative but fish not as fine as Ma Hong Xing', photorealistic Green Tea restaurant interior with modern Chinese decor, warm afternoon light, cinematic food photography moment"
01:30-01:45  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-07-green-tea-cake-simple-delicious.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, three chibi foodie characters biting into Hangzhou Green Tea restaurant lü cha bing green tea pastry with crispy outside and soft inside, chibi middle-aged male food reviewer declaring 'simple but delicious 8.5 points', chibi young female foodie giving '8 points — flavor in simplicity', photorealistic Green Tea restaurant table with modern Chinese decor, warm indoor lighting, cinematic close-up food-and-friends moment"
01:45-02:00  🖼 gpt-image-2-2k 1:1 src=https://bphhksbzedadaoscjctz.supabase.co/storage/v1/object/public/user-attraction-photos/vlog/day8/img-08-airport-farewell-handshake.jpg — "Chibi cartoon characters with big heads, small bodies, and cute anime proportions, placed in a photorealistic environment with cinematic lighting, hyperdetailed real-world background, dramatic shot at Xiaoshan International Airport departure hall, three chibi foodie characters holding hands together in a three-way handshake promising 'we'll keep eating together', chibi middle-aged male food reviewer 阿喜 in background with shocked expression asking 'you remember all 24 dishes?', photorealistic modern Chinese airport interior with flight information boards and warm terminal lighting, cinematic medium group shot capturing farewell-foodie-friends mood"`,
  },
];

export const SCRIPTS: Record<string, ScriptMeta> = {
  // 🅰️ 劇本 A — 阿喜的一天（主角視角 · 第一人稱 · 家庭喜劇）
  A: {
    id: "A",
    name: "阿喜的一天",
    tagline: "阿喜一人扛攝影機 8 天 · 全片重視場景拍攝角度（鏡位/構圖/光影/運鏡） · 30-45 分鐘",
    color: "vermilion",
    storyArc:
      "主角阿喜全程手持鏡頭，觀眾透過他的眼睛看 13 人親友的江南之旅。劇本最重視**場景拍攝角度**：每個景點都有具體的鏡頭設計（特寫/全景/航拍/縮時/長鏡頭/手持晃動），用鏡頭語言說故事（不用旁白解釋，靠畫面）。Day 1 出發慌張用手持晃動、Day 4 烏鎮染坊用長鏡頭慢拍、Day 7 宮宴換裝用多機位剪接、Day 8 回家用逆光剪影。溫馨好笑的家庭錄影帶，靠畫面取勝。",
    dayBlocks: ALL_DAYS,
  },

  // 🅱️ 劇本 B — 兩家人的暑假（雙男主 · 公路喜劇 · 衝突 + 和解）
  B: {
    id: "B",
    name: "兩家人的趣事",
    tagline: "喜家 6 人 vs 吳董家 4 人 vs 阿喜同事 3 人 = 13 人 8 日 4 城趣事大合集 · 60-90 分鐘",
    color: "gold",
    storyArc:
      "喜家 6 人 + 吳董家 4 人 + 阿喜同事 3 人 = 13 人 8 日江南之旅的**兩家人趣事大合集**。劇本以「趣事」為核心：Day 1 互酸重逢（阿喜 vs 吳董）、Day 2 小孩搶糖葫蘆、Day 3 西塘兩家人分頭逛 + 同事被拖去足浴、Day 4 烏鎮阿美奶奶跟家人一起逛染坊、Day 5 西湖奶奶一個人坐、Day 6 宋城兒童 vs 大人反應差、Day 7 宮宴小朋友不肯穿古裝 + 全家被阿美奶奶唐裝驚豔、Day 8 靈隱寺 + 機場告別。每一天都有一個家庭/家族層級的笑點或溫馨點，靠兩家人的化學反應產生喜劇與溫情。",
    dayBlocks: B_DAYS,
  },

  // 🅲️ 劇本 C — 宸瑋的江南（小朋友視角 · 教育 + 文化 · 慢綜藝）
  C: {
    id: "C",
    name: "宸瑋愛講歷史地理的故事",
    tagline: "鏡頭是小兒子宸瑋的內心世界 · 8 歲第一次江南 + 走到哪都愛講歷史地理 · 40-50 分鐘",
    color: "blue",
    storyArc:
      "宸瑋（小兒子，m9）的視角，旁白是小朋友的童言童語。13 位大人都是「宸瑋眼中的大人」：爸爸最會拍、奶奶會講古、同事叔叔會搞笑。**宸瑋愛講歷史地理** — 走到哪都要專業地把地理歷史講一小段，由爸爸阿喜補充細節：Day 1 上海浦東 30 年變大都會 + 外灘萬國建築群 + 租界、Day 2 豫園 400 年 + 西塘春秋吳越 + 玉玲瓏、Day 3 京杭大運河世界遺產 + 烏鎮茅盾、Day 4 藍染 1000 年 + 水閣建築、Day 5 蘇東坡修蘇堤 + 西湖十景、Day 6 南宋遷都杭州 + 川菜文化、Day 7 漢服 3000 年 + 武則天女皇帝、Day 8 靈隱寺 1700 年 + 濟公活佛。每個景點都有「📚 宸瑋小教室」段落。童趣治癒慢綜藝。",
    dayBlocks: C_DAYS,
  },

  // 🅳 劇本 D — 阿伸阿茹夫妻 + 好朋友阿橋（夫妻 + 好友出遊喜劇）
  D: {
    id: "D",
    name: "愛美食的同事",
    tagline: "阿伸 + 阿茹夫妻 + 女生朋友阿橋 · 美食博主小組 8 日 4 城吃吃喝喝 · 35-45 分鐘",
    color: "blue",
    storyArc:
      "阿伸 + 阿茹夫妻帶女生朋友阿橋一起加入喜家 13 人江南之旅。三人化身美食博主小組，8 日 4 城吃吃喝喝：Day 1 上海生煎、Day 2 小楊生煎 + 南翔、Day 3 西塘粉蒸肉 + 芡實糕、Day 4 烏鎮醬鴨 + 水宴、Day 5 樓外樓東坡肉、Day 6 宋城叫化雞 + 馬鴻興、Day 7 杭州宮宴御膳、Day 8 綠茶餐廳。Day 8 阿橋總結美食榜 + 三人分享「吃什麼不重要一起吃才重要」。",
    dayBlocks: D_DAYS,
  },

};

export const SCRIPT_ORDER: Array<keyof typeof SCRIPTS> = ["A", "B", "C", "D"];

// ──────────────────────────────────────────────────────────────────────────────
// Color key → CSS class lookup
// ──────────────────────────────────────────────────────────────────────────────
export const COLOR_VAR: Record<ScriptColorKey, string> = {
  vermilion: "var(--jn-vermilion)",
  gold: "var(--jn-gold)",
  ink: "var(--jn-ink)",
  paper: "var(--jn-paper)",
  blue: "var(--jn-blue)",
};

export const COLOR_BG_CLASS: Record<ScriptColorKey, string> = {
  vermilion: "bg-[var(--jn-vermilion)]",
  gold: "bg-[var(--jn-gold)]",
  ink: "bg-[var(--jn-ink)]",
  paper: "bg-[var(--jn-paper)]",
  blue: "bg-[var(--jn-blue)]",
};

export const COLOR_TEXT_CLASS: Record<ScriptColorKey, string> = {
  vermilion: "text-[var(--jn-vermilion)]",
  gold: "text-[var(--jn-gold)]",
  ink: "text-[var(--jn-ink)]",
  paper: "text-[var(--jn-paper)]",
  blue: "text-[var(--jn-blue)]",
};

export const COLOR_BORDER_CLASS: Record<ScriptColorKey, string> = {
  vermilion: "border-[var(--jn-vermilion)]",
  gold: "border-[var(--jn-gold)]",
  ink: "border-[var(--jn-ink)]",
  paper: "border-[var(--jn-paper)]",
  blue: "border-[var(--jn-blue)]",
};
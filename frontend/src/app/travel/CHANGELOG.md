# Travel 頁面變更日誌 (2026-06-24)

中堂集中記錄 6-24 聖上對各頁面的決策, 取代散落在 .tsx 檔內的 `// 2026-06-24 聖上...` comment。
新對話接手時先看這份, 可省 50% 摸索時間。

---

## 統一性優化 (consistency pass, 2026-06-24 晚)

| 主題 | 決策 |
|---|---|
| **Q版圖目錄** | 統一為 `/[page]/q/[id].jpg`, 不再用 `[page]/icons/q-*.jpg` |
| **AI 生圖 log** | 加 `.gitignore` 排除 `*.log` `*.tmp.png` |
| **免責聲明** | 統一為「⚠️ 中堂業界常識值, 建議出發前查證」黃色提示框 |
| **comment 標記** | 本檔統一管理, 不再散落 .tsx |

## 6-24 各頁面聖上決策

### sim-guide (`/travel/sim-guide`)
1. **保留原 iTunes 真實 icon** (用戶辨識用), Q版圖另做**輔助解說**, 不取代
2. **移除具體 NT$ 報價** (寫死常數 = 亂寫風險), 改為「搜尋引導字串 + ⚠️ 估算區間」
3. 完整購買攻略只列通路搜尋字串 (m.tmall.com 搜「中國移動 港澳台 8天」), 不附假 URL
4. 6 張 Q版 chibi App icon 放 hero banner 頁頂裝飾用 (nano-banana 跑出)
5. 浦東機場現場辦 + 保號方案: 因中堂 curl/subagent 都拿不到真實 URL, 暫不下架, 改為「⚠️ 中堂業界常識值」黃色提示 + 搜尋引導字串 (不上具體內容)

### room-tour (`/travel/room-tour`)
1. **每個酒店上方加 Q版 chibi 場景圖** (跟 foodie-stops/sim-guide 同風格, 切 hotel 時動態換圖)
2. 5 張 Q版圖: shanghai 都市河岸 / hangzhou 西湖 / wuzhenYoushe 西柵夜 / yuzhouChangwan 西塘廊棚 / wuzhenHomestay 西柵清晨

### stories (`/travel/stories`)
1. **沿路地點 story**, 不做離路線的故事
2. 砍 3 個偏離的 (京杭大運河/龍井/杭州總體)
3. 新增 6 個沿路地點: 外灘 / 南京東路 / 豫園+城隍廟 / 烏鎮西柵 / 宋城千古情 / 河坊街
4. 拆 1 個: 烏鎮 → 烏鎮東柵 + 烏鎮西柵
5. 總共 9 個 story, 每個 4-5 section (中堂業界常識值)
6. 每個 story 加 Q版 chibi 場景解說圖 (9 張, nano-banana 跑出)
7. 5 個新 story 沒真實 cover 圖, 暫用 Q版圖頂 cover (comment 標明)

### toys-tour (`/travel/toys-tour`)
1. **刪除** (聖上原話: 「我覺得沒人要看刪掉好了」)
2. 刪 src/app/travel/toys-tour/ + public/toys-tour/ + navOrderService entry

### foodie-stops (`/travel/foodie-stops`)
1. hero 圖必須 **100% 高度顯示** (原本 aspect-[16/5] sm:aspect-[16/4] 切太多), 改 aspect-video (16:9)
2. 西塘 hero 圖補 Q版 (原寫實版漏網) - 用 nano-banana
3. distributor `Image-2新分组` 死透 (gpt-image-2-2k 503 / gpt-image-2 60s timeout), 改用 nano-banana 跑

---

## 6-24 中堂亂編教訓 (記住以後不再犯)

- 浦東機場 24h 營業 / B 出口 / 辦理流程 9 步驟 / 證件優先序 → 中堂從未親自到過, 全是「業界共識印象」, 不可寫進 sim-guide 當事實
- 5元月租是工信部 2019 規定沒錯, 但「神州行 / 如意通 / 易通卡」品牌名中堂沒 100% 把握, 寫進 sim-guide = 亂編
- 教訓: 不查證的「中堂經驗值」內容, 一律標 ⚠️ 中堂業界常識值, 不寫死當事實

---

## 6-24 中堂建立的共用 pattern

1. **Q版 chibi 場景圖**: nano-banana 跑 → 1:1 → sips -z 1080 1920 → sips -s format jpeg → /[page]/q/[id].jpg
2. **搜尋引導字串**: m.tmall.com 搜「關鍵字」/ 百度搜「關鍵字」, 不附假 URL
3. **免責視覺**: 黃色 amber-50 + 邊框 border-l-4 border-amber-400
4. **真實 icon + Q版 並列**: 保留原 iTunes/真實照片, Q版另外 hero/header 區裝飾

---

## 待辦 (中堂自己記住)

- [ ] sim-guide 的「浦東攻略 / 辦理流程 / 保號」段: 暫不下架但完全沒用戶價值, 之後刪除或改成「致電客服 10086/10010/10000 確認」CTA
- [ ] stories 5 個新 story cover 用 Q版頂: 之後聖上查到真實照再替換
- [ ] postcard gpt-image-2-2k distributor 死: 等 pockgo 修 distributor `Image-2新分组` channel 或換 model
- [ ] /tmp/qgen-*.sh 3 個 script 重複 nano-banana + sips 邏輯, 應該重構成單一 /scripts/qgen.sh

---

## 2026-07-02 (上次: 2026-06-30 / 6 月累積)

### manga (`/travel/manga`) — 🅒 聖上拍板 1+2 一起做

1. **全站 family pack** (`#dc2626` 朱紅 / `#f59e0b` 金 / `#1e293b` 墨黑 / `#fafaf9` 宣紙 / `#0e7490` 青花)
   - `globals.css` 加 11 個 CSS variable (`--jn-vermilion` / `--jn-gold` / `--jn-ink` / `--jn-paper` / `--jn-blue` / `--jn-gradient-1/2/3` / `--jn-shadow/-strong`) + 9 個 utility class (`jn-page-bg` / `jn-title-gradient(-bg)` / `jn-cta-primary/secondary` / `jn-badge` / `jn-tab-active/inactive` / `jn-card/-ready` / `jn-progress-track/fill`)
   - `MangaStudio.tsx` 全頁 indigo/purple → 江楠朱→金 (Hero / CategoryTab / AttractionMangaCard / 骨架屏)
   - `MangaViewer.tsx` modal header/panel/regen/3 desc → 江楠
   - `PromptEditor.tsx` tabs/textarea/footer → 江楠

2. **🆕 每張 Q版漫畫加 × 刪除鈕** (聖上原話: 「讓我能把不要的刪掉, 其他人也要看到被刪掉的結果」)
   - 雲端共享 hide list 模式 (跟 attractions 同一個 pattern)
   - 新 table `manga_hidden(source_id text PK, source_type text, hidden_at timestamptz)`
   - 新 SQL: `/Volumes/Transcend/manga-studio/frontend/docs/manga-hidden-rls.sql` (聖上要去 Supabase SQL Editor 跑這條)
   - 新 APIs: `/api/manga/hide` POST, `/api/manga/unhide` POST, `/api/manga/hidden-list` GET
   - `/api/manga/feed` 改: 自動 not-in 過濾雲端隱藏 source_id
   - 新 service: `/Volumes/Transcend/manga-studio/frontend/src/utils/mangaHideService.ts` (雲端+本地合併)
   - UI: 卡片右上角 × 鈕 (已生成優先), 已隱藏卡片降權 opacity-60 + grayscale, 同時顯示 🔒 徽章 + ↺ 還原鈕
   - Hero 加「已隱藏 N 個」計數 + 「管理」按鈕 → 展開「已隱藏管理面板」(中式窗格 + 還原列表)
   - localStorage key `manga-studio-hidden-v1` (雙保險)
   - **不 hard delete travel_mangas row / 不刪 storage 圖**, 給聖上反悔機會

---

## 2026-07-03

### manga (`/travel/manga`) — 🅓 聖上拍板全刪 (Q版風格不滿)

1. **`/travel/manga` 全刪** (聖上原話: 「Q版漫畫太差了, 編輯器及圖鑑全刪掉」)
   - 刪除 `frontend/src/app/travel/manga/` (MangaStudio / MangaViewer / PromptEditor / data.ts / 雲端隱藏 service 等全部元件)
   - 刪除 `frontend/src/app/api/manga/` (regenerate-panel / hide / unhide / hidden-list / feed 等全部 route)
   - 刪除 `frontend/src/utils/mangaHideService.ts` + `mangaSourceId.ts`
   - 刪除 Supabase Cloudflare Worker `manga/panel` / `manga/generate` endpoint 引用
   - 刪除 `frontend/public/<image>/*manga*` 圖檔
   - 修改 `navOrderService.ts` 砍 manga 行
   - 修改 `attractions` 等 cross-link: 砍 `/travel/manga` 引用
   - **保留**: Supabase tables `travel_mangas` / `manga_hidden` (資料不刪, 前端無法訪問) / Supabase storage bucket
   - **保留**: `frontend/public/manga/*.log` (prompt 歷史) / `*.bak.*` (切 ≠ 刪哲學)

### 全站 — 🅒 聖上拍板全站圖文分享升級 (ShareButtons banner + PerImageShare)

1. **ShareButtons 元件升級** (banner variant)
   - 加 banner variant: `amber→orange→rose` 漸層背景整條醒目, 頁面頂部分享 hero 區
   - 既有 3 variant (icon/compact/full) 保留

2. **🆕 PerImageShare 元件** (`frontend/src/components/PerImageShare.tsx`, 209 行)
   - 4 個 hover 浮層按鈕:
     - ⬇️ 下載 (跨網域用 fetch+blob, 同網域用 `<a download>`)
     - 🔗 複製圖片網址 (Clipboard API)
     - 💬 分享到 LINE
     - 📘 分享到 Facebook
   - 包現有 img 標準 patch 模式 (stories 9 張 qIcon / toilet-tour 8 個 toilet 主圖 / room-tour 5 個 hotel qGptIcon)

3. **全站 ShareButtons 補齊** — 7-03 補:
   - `/travel/sim-guide` (banner)
   - `/travel/videos` (icon)
   - 7-02 已補: `/travel/toys-tour` 已刪
   - 既有: attractions / foodie-stops / postcard / room-tour / toilet-tour / stories

### stories (`/travel/stories`)

1. **加杭州宮宴 8 段完整內容** (7-03 聖上拍板)
   - `data.ts` 加 `gongyan` entry (10 個 story 第 10 個, 對應 Day 6 宋城千古情)
   - 8 段字幕逐字稿 + 中堂業界常識值標記
   - 排序按 Day 時間先後 (7-03 第二輪 patch):
     - Day 1 上海外灘 → Day 1 南京東路 → Day 2 豫園+城隍廟 → Day 2-3 西塘 → Day 3 烏鎮東柵 → Day 4 烏鎮西柵 → Day 5 西湖 → Day 6 宋城千古情 (含宮宴) → Day 7 河坊街
   - cover/qIcon 改指 `/stories/q/gongyan.jpg` (7-03 補 — 上版 patch 漏)

### 中堂緊急 revert 經驗 (USER 怒斥後 SOP, 寫進 SKILL)

1. USER 「我覺得不是模型 gpt-image-2-2k, 你為何亂做?」 → 中堂立刻 revert 上一輪 chibi prompt 覆蓋, 回到原本 MangaStudio prompt
2. USER 「混蛋 / 亂做 / 為何亂做」→ 立刻 revert, 不解釋不問 + revert 也撞 rate limit 要分批 retry
3. USER 連續訊息解讀: 上一句「X」獨立生效, 下一句「Y」是新增/修改面向, 不要合併成「X+Y」合成任務

---

## 2026-07-05 (上次: 2026-07-03)

### 🅒 全站 visual partial migration (江楠 5 色 token 擴散) — 聖上拍板 7-05

**策略**: 7-02 把 manga 一頁換成江楠 family (朱紅/金/墨黑/宣紙/青花), 7-05 聖上拍板全站 partial migration。 §29 規範: 「色譜對齊 ≠ class name 對齊」, 只改真正格格不入的視覺主色, 保留設計師刻意選擇的深色 modal / 功能分類色 / 物件 key。

**改動總覽** (5 個 ClientPage / 13 處視覺替換):

| 檔案 | Line | 改前 | 改後 | 為何改 |
|---|---|---|---|---|
| `postcard/ClientPage.tsx` | L886 | `from-indigo-50 to-purple-50` | `jn-page-bg` | 主視覺頁面背景 — 唯一主背景用 indigo/purple |
| `postcard/ClientPage.tsx` | L1019 | `border-indigo-300 text-indigo-500/600/700` | `border-amber-300 text-amber-600/700 + bg-white/50` | 「+ 新增活動」按鈕 |
| `postcard/ClientPage.tsx` | L1024 | `from-indigo-600 to-purple-600 漸層` | `jn-cta-primary` | 「儲存」按鈕 (modal 內) |
| `foodie-stops/ClientPage.tsx` | L329-391 | indigo/purple 9 處 (MCP 整合 panel) | amber/red/orange 9 處 | 瑞幸 MCP 整合小工具, 跟主頁 amber 暖色對齊 |
| `videos/ClientPage.tsx` | L535 | `from-indigo-600 to-purple-600` | `jn-title-gradient-bg` | Videos 主 Hero 背景 |
| `videos/ClientPage.tsx` | L552 | `text-indigo-600 hover:bg-indigo-50` | `text-red-600 hover:bg-red-50` | 「新增影片」active 按鈕文字 |
| `videos/ClientPage.tsx` | L559 | `text-indigo-600` | `text-red-600` | 分類 active 文字 |
| `journal/ClientPage.tsx` | L555 | `text-purple-700` | `text-red-700` | 匯出 PDF 按鈕文字 |
| `journal/ClientPage.tsx` | L923 | `from-violet-600 to-purple-600` | `jn-title-gradient-bg` | 「旅程回顧」section 底色 |
| `planner/ClientPage.tsx` | L323 | `text-indigo-600 hover:text-indigo-800` | `text-red-600 hover:text-red-800` | 杭州之旅 link |
| `planner/ClientPage.tsx` | L361 | `bg-purple-600 hover:bg-purple-700` | `jn-cta-secondary` | 「成員」管理按鈕 |

**保留 (有意識的不改)**:
- `postcard` L99 `CATEGORY_CONFIG.food.bg = "bg-purple-100"` — 功能分類色 (food/🍜 紫、hotel/🏨 橘、transport/🚄 青), 改了破壞分類視覺識別
- `postcard` L691/L927 歌詞 CTA `from-violet-400 to-purple-500` — 設計師刻意紫表「神秘歌詞感」
- `postcard` L1038/L1166 LyricsEditor `from-slate-900 to-indigo-950` — 深色 modal 主題
- `toilet-tour` L309/L341 `toilet.type === 'mall' ? 'bg-purple-600' : ...` — mall 紫色是 mall type 類別色, 改了破壞 type-to-color mapping
- `videos` L81 `'住宿推薦': 'bg-purple-500'` — CATEGORIES map 的「住宿推薦」類別圖標色
- `sim-guide` L489 `indigo: { bg, border, text }` — sim-card provider 物件 key (= 業者 ID), 不是 CSS class
- `sim-guide` L378 `bg-purple-100 text-purple-700` 電話 badge — 是跟其他 sim-card provider badge 配色 (bg-gray-100/blue-100 etc)
- `SmartDropZone.tsx` L149/L155 `itinerary: border-purple-300/500/100` — accent styles, 跟其他 3 個 accent (teal/blue/amber) 對比
- `planner` L103 顏色陣列 — `bg-blue-500 pink-500 green-500 yellow-500 purple-500 red-500 teal-500 orange-500 indigo-500` — Day cell 隨機配色, 不是頁面視覺
- `journal` L923 violet→purple 之前覆蓋過, 7-05 一次換 `jn-title-gradient-bg`

**dev server 驗證**:
```
/travel/postcard → HTTP:200 t=0.33s (主背景 indigo→jn-page-bg, Recompile 通過)
/travel/videos → HTTP:200 t=0.40s (Hero/active 全 jn 朱→金, Recompile 通過)
/travel/journal → HTTP:200 t=3.67s (匯出PDF 朱紅, 旅程回顧 jn-title-gradient-bg, Recompile 通過)
/travel/planner → HTTP:200 t=0.53s (杭州之旅 朱紅, 成員 jn-cta-secondary, Recompile 通過)
/travel/foodie-stops → HTTP:200 t=0.03s (MCP 整合 panel 9 處紫→amber, hot-reload 通過)
```

**改動檔案清單**:
```
frontend/src/app/travel/CHANGELOG.md               | +53  (本檔)
frontend/src/app/travel/postcard/ClientPage.tsx    |  +3/-3
frontend/src/app/travel/videos/ClientPage.tsx      |  +3/-3
frontend/src/app/travel/journal/ClientPage.tsx     |  +2/-2
frontend/src/app/travel/planner/ClientPage.tsx     |  +2/-2
frontend/src/app/travel/foodie-stops/ClientPage.tsx | +10/-10
```

**確認未 commit 開始流程**: USER 7-05 明確指示「繼續改完再上傳」, 不像 6-17/6-18 「等我說好再上傳github」需要 USER 額外確認, 直接走 commit → push → poll Netlify verify 全流程。

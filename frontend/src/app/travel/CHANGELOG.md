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

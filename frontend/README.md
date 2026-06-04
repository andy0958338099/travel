# 江南水鄉八日之旅

2026 夏季杭州水鄉深度旅遊網站。

## 概述

這是 2026 年 7 月 17-24 日「江南水鄉八日之旅」的個人旅遊網站，整合了行程規劃、景點漫畫、明信片圖卡、AI 影音日記、即時天氣、預算追蹤、行李清單、互動地圖、PDF 匯出、團員影片牆等多元功能。

## 技術棧

- **前端**：Next.js 14 (App Router) + React 18 + TypeScript
- **後端 API**：Next.js Route Handlers (serverless on Netlify)
- **資料庫 / Auth / Storage / Realtime**：Supabase (Postgres + Storage + Auth + Realtime)
- **AI 圖像生成**：Cloudflare Worker proxy → MiniMax API
- **AI 文字生成**：Cloudflare Worker proxy → MiniMax Chat
- **部署**：
  - 靜態 + Serverless：Netlify (`travel-china.netlify.app`)
  - Worker proxy：Cloudflare Workers (`jiangnan-trip.andy0958338099.workers.dev`)

## 本地開發

```bash
cd frontend
npm install
cp .env.local.example .env.local   # 填入 Supabase + MiniMax keys
npm run dev                         # http://localhost:3000
```

## 部署

```bash
git push origin main
# Netlify auto-rebuild (約 2-3 分)
```

Worker 重新部署：

```bash
cd cloudflare-worker/jiangnan-trip
npx wrangler deploy
```

## 環境變數（Netlify dashboard）

| Key | 用途 |
|---|---|
| `CLOUDFLARE_WORKER_URL` | Worker proxy URL（含 hardcoded fallback，不一定需要設） |
| `MINIMAX_API_KEY` | 直接打 MiniMax 用（Worker 已有、不需要） |
| `SUPABASE_URL` | （Worker 已有） |
| `SUPABASE_ANON_KEY` | （Worker 已有） |

## 目錄結構

```
frontend/
├── src/app/
│   ├── page.tsx                 # 首頁（Landing + Hero + Timeline）
│   ├── layout.tsx               # 全站 metadata
│   ├── travel/                  # 旅遊主軸（planner / manga / postcard / journal / dining / videos / ...）
│   ├── dashboard/               # 舊 Manga Studio dashboard（保留）
│   ├── generate/                # 舊 generate（保留）
│   ├── characters/              # 舊角色管理（保留）
│   ├── automation/              # 舊自動化（保留）
│   ├── episodes/                # 舊 episodes（保留）
│   ├── scenes/                  # 舊 scenes（保留）
│   └── story-bible/             # 舊 story bible（保留）
│   └── api/manga/               # 漫畫相關 API（feed / generate / regenerate-panel / list）
├── src/lib/ai/                  # AI 工具（minimax client + manga prompts）
├── src/utils/                   # 共用工具（supabase、cloud state、nav order）
├── src/components/              # 共用元件
├── public/                      # 靜態資源（景點照片、角色 ref、hero 圖）
└── scripts/                     # 維運 / debug 工具
    ├── repair-desc.mjs          # 補 manga 描述
    ├── regen-failed.mjs         # 重跑 failed row
    └── fix-zhaoming.mjs         # 修單一 row
```

```
cloudflare-worker/jiangnan-trip/  # Worker proxy
└── src/index.js                   # 5 個 endpoint：image_generation / chat / music / manga/panel / manga/generate
```

## 維運指令

```bash
# 補 13 個缺 desc 的 manga
node scripts/repair-desc.mjs

# 重跑所有 failed row
node scripts/regen-failed.mjs

# 修某個卡 generating 的 row
node scripts/fix-zhaoming.mjs

# 查 Supabase 狀態
node scripts/list-mangas.mjs
```

## 監控

- **Production site**：`https://travel-china.netlify.app`
- **Worker**：`https://jiangnan-trip.andy0958338099.workers.dev`
- **Netlify deploys**：`https://app.netlify.com/sites/travel-china/deploys`
- **Supabase**：`https://bphhksbzedadaoscjctz.supabase.co`
- **wrangler tail**：`npx wrangler tail`（看 Worker log）

## 專案歷程

- **2026-06-04**：Netlify 30s timeout 救活（fire-and-forget + Cloudflare Worker）+ 文字移出 panel 圖 + 分享按鍵
- **2026-06-05**：補 13 個缺 desc + 1 個卡 generating + 重跑 26 個 failed + 專案改名「江南水鄉八日之旅」

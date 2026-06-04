# Cloudflare Worker: jiangnan-trip

把 MiniMax API 呼叫代理出去，繞過 Netlify free plan 的 26-30s function timeout。

## 為什麼需要

Netlify free plan function timeout 最多 30s，但 MiniMax 圖片生成穩定 25-30s。cold start + Supabase 操作後會超過 30s 被打斷。

Cloudflare Workers free tier：
- 每天 100,000 requests
- 每 request 10ms CPU（I/O 等待不算 CPU）
- 每 request 30s wall time

→ MiniMax 25s I/O 等的時候 CPU 幾乎為 0，免費方案就夠用。

## 部署步驟

### 1. 第一次部署（一次性）

```bash
cd cloudflare-worker/jiangnan-trip
npm install                 # 裝 wrangler
npx wrangler login          # 開瀏覽器登入 Cloudflare

# 設定 3 個 secrets（每個貼一次、按 Ctrl-D）
npx wrangler secret put MINIMAX_API_KEY
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY

npm run deploy
```

部署成功會得到 URL：
```
Published jiangnan-trip (X.XX sec)
  https://jiangnan-trip.YOUR-SUBDOMAIN.workers.dev
```

### 2. 在 Netlify 設定 worker URL（可選）

`frontend/netlify.toml` 內 `[build.environment]` 已經 hardcode 預設值、build 時會 inject。dashboard env 是雙保險（建議也設）：
- 新增 `CLOUDFLARE_WORKER_URL` = `https://jiangnan-trip.andy0958338099.workers.dev`

### 3. 觸發 Netlify redeploy

到 https://app.netlify.com/sites/travel-china/deploys → "Trigger deploy" → "Clear cache and deploy site"

## Worker 怎麼呼叫

```bash
curl -X POST https://jiangnan-trip.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "image_generation",
    "payload": {
      "model": "image-01",
      "prompt": "...",
      "aspect_ratio": "3:4",
      "n": 1,
      "response_format": "base64"
    }
  }'
```

5 個允許的 endpoint：
- `image_generation`：同步 → 200 + JSON
- `chat/completions`：同步 → 200 + JSON
- `music_generation`：同步 → 200 + JSON
- `manga/panel`：fire-and-forget → 202 + 背景 1 panel pipeline
- `manga/generate`：fire-and-forget → 202 + 背景 4 panel pipeline

## 安全性

- Worker 對外公開，但只接受白名單內的 5 個 endpoints
- API key 跟 Supabase keys 存在 Cloudflare secret，不在 source code 也不在 env 檔
- CORS 設為 `*`（純 proxy 性質，呼叫端驗證交給 Netlify 那層處理）

## 更新 / 維護

- 改 code → `npm run deploy`
- 看 log → `npm run tail`
- 重設任一 secret → `npx wrangler secret put <KEY>`

## 為什麼叫 jiangnan-trip

原本叫 minimax-proxy（MiniMax 純 proxy 性質），但 2026-06-05 江南水鄉八日之旅專案 rename 後改成 jiangnan-trip，呼應主專案（江南 = 長江以南水鄉地區 = 杭州/西塘/烏鎮/上海）。

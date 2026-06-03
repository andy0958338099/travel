# Cloudflare Worker: MiniMax Proxy

這個 worker 把 MiniMax API 呼叫代理出去，繞過 Netlify free plan 的 26-30s function timeout。

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
cd cloudflare-worker/minimax-proxy
npm install                 # 裝 wrangler
npx wrangler login          # 開瀏覽器登入 Cloudflare
npx wrangler secret put MINIMAX_API_KEY
# 貼上 key: sk-cp-yJacPqIIDoMTnasMWsTIohn5W_9rVXQoJ9jgr4nD3lVs3o6jLHCDa0gGZOPeAybSH3S_bk0YXYjJSamL-INbz7XlYI2WVUBW7IIeZsgj9gf1DEC_v8N5tEU
# （按 Enter 兩次）
npm run deploy
```

部署成功會得到 URL，例如：
```
Published minimax-proxy (X.XX sec)
  https://minimax-proxy.YOUR-SUBDOMAIN.workers.dev
```

### 2. 在 Netlify 設定 worker URL

到 https://app.netlify.com/sites/travel-china/configuration/env：
- 新增 `CLOUDFLARE_WORKER_URL` = `https://minimax-proxy.YOUR-SUBDOMAIN.workers.dev`

### 3. 觸發 Netlify redeploy

到 https://app.netlify.com/sites/travel-china/deploys → "Trigger deploy" → "Clear cache and deploy site"

## Worker 怎麼呼叫

```bash
curl -X POST https://minimax-proxy.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "v1/image_generation",
    "payload": {
      "model": "image-01",
      "prompt": "...",
      "aspect_ratio": "3:4",
      "n": 1,
      "response_format": "base64"
    }
  }'
```

## 安全性

- Worker 對外公開，但只接受白名單內的 3 個 endpoints
- API key 存在 Cloudflare secret，不在 source code 也不在 env 檔
- CORS 設為 `*`（純 proxy 性質，呼叫端驗證交給 Netlify 那層處理）

## 更新 / 維護

- 改 code → `npm run deploy`
- 看 log → `npm run tail`
- 重設 key → `npx wrangler secret put MINIMAX_API_KEY`

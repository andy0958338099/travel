# Supabase Cached Egress 優化 SOP

**🆕 2026-08-20 聖上拍板 🅐** (Free 方案優化,動最少工)

---

## 🎯 目標

把 Supabase Storage 的 Cache-Control 從預設 **1 小時** 拉到 **30 天**,讓 30 天內重訪走 Cloudflare CDN cache,**0 egress**。

## 📊 現況 (8-20 實測)

```
$ node scripts/verify-cache-headers.mjs

🔍 https://wydftkqwhebwlmdbosap.supabase.co/storage/v1/object/public/travel-photos/story-uploads/...
  HTTP 200  |  3.84 MB  |  image/png
  Cache-Control: public, max-age=3600     ← 只有 1 小時
  ⚠️ 期望 max-age=2592000 (30天) FAIL
  cf-cache:   HIT                          ← Cloudflare 有 cache
```

**問題**:
- `max-age=3600` → 訪客瀏覽期間第一張圖就打回 Supabase 計 egress
- `cf-cache-status: HIT` 但 1 小時後會回源驗證 (revalidation) → 還是吃 egress
- 每張圖 3-5 MB,8 天行程 200+ 張 → 首頁可能 500MB-1GB egress

---

## 🚀 動工步驟 (3 步,10 分鐘)

### 步驟 1: Supabase Dashboard 改 bucket 設定

1. 打開 https://supabase.com/dashboard/project/wydftkqwhebwlmdbosap/storage/buckets
2. 點 `travel-photos` bucket → **Settings** tab
3. 找到 **Cache-Control** 欄位,改成:
   ```
   public, max-age=2592000
   ```
   (2592000 秒 = 30 天)
4. **同樣**對 `user-attraction-photos` bucket 做一次
5. 儲存

> ⚠️ **設定影響範圍**: Supabase Storage 的 bucket-level Cache-Control 只影響**之後上傳的新檔案**。
> 已存在的 200+ 張圖,要嘛(2a)重洗、要嘛(2b)加 query string。

### 步驟 2 (選配): 讓現有 200+ 張舊圖也吃到 30 天 cache

**🛑 聖上 8-20 拍板:不要重洗檔案,不能破壞現況。**

#### 選項 A (推薦):用 Supabase SQL Function 批次更新 metadata

> 這條路需要 Supabase Pro 才能用 `update_storage_object`,**Free 不可行**。跳過。

#### 選項 B (Free 可行,推薦):在現有 URL 後加 `?v=hash` query string

瀏覽器/Cloudflare 看到 query string 不同會視為新 URL → 重新 cache。

但這需要前端改 code 加 hash,**違反聖上「不能破壞現況」**。跳過。

#### 選項 C (Free 可行,推薦):**接受現狀**

新上傳的圖生效,舊圖慢慢輪換(30 天內有新圖就會自然覆蓋)。

如果首頁主要圖都是新近上傳(8 月行程照片),**效果 80%+ 立刻見效**。

### 步驟 3: 驗證生效

```bash
cd /Volumes/Transcend/manga-studio/frontend
node scripts/verify-cache-headers.mjs
```

**期望結果**:
```
✅ 期望 max-age=2592000 (30天) PASS
cf-cache:   HIT
age:        1234        ← CDN 命中, 有 age
```

---

## 📈 預估節省

| 指標 | Before | After |
|---|---|---|
| `cache-control` | `max-age=3600` (1h) | `max-age=2592000` (30d) |
| 重訪 (30 天內) | 每次 egress | **0 egress** |
| 訪客瀏覽 8 天頁 | 8 × 5MB = 40MB egress/visitor | **首次後 0 egress** |
| Cloudflare cache hit rate | ~50% (1h 太短) | **~95%** |

---

## ❌ 為什麼不選其他方案 (動工前已分析)

| 方案 | 為什麼不做 |
|---|---|
| 🅒 Supabase Image Transformation | **需 Pro plan**,Free 會 402 |
| 🅑 Next.js `<Image>` + WebP | 動到 PhotoFrame + 拖下載,風險高 |
| 🅓 IndexedDB 前端 cache | 對陌生訪客首訪無效 (Free 最痛的就是這群) |

---

## 🛡️ 注意事項

1. **Free 方案不計 Cached Egress** = CDN hit 不算錢,所以拉到 30 天對 Free 方案特別划算
2. **30 天後會 revalidate** = Cloudflare 會回 Supabase 確認檔案沒變,沒變就 refresh cache,吃 1 次 egress
3. **若圖片內容變了但檔名沒變** = 30 天內使用者看到舊圖。**未來上傳新圖用新檔名即可** (e.g. 加 timestamp)
4. **已有連結不會失效** = URL 不變,Cache-Control 是 response header,跟分享 URL 無關

---

## 🔗 相關檔案

- `scripts/verify-cache-headers.mjs` — 驗證 cache header 是否生效
- 聖上 USER 偏好 §commit gate:動完 → 停下問「要 commit 嗎?」

---

**📜 8-20 拍板**:Free 方案,選 🅐,Cache-Control 拉 30 天,舊圖不重洗,動最少工。
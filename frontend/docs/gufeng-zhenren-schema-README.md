# 古風寫真 (Gufeng Zhenren) DB 建表 SOP

**狀態**: SQL 已備好, 但 service_role key 找不到, 無法自動跑 (見下)

## Blocked
- 專案內**找不到** `SUPABASE_SERVICE_ROLE_KEY` (已查 frontend/.env.local / backend/.env / backend/.env.example / 源碼 / docs / netlify.toml / cloudflare-worker)
- 整個專案 (Next.js frontend + Cloudflare Worker) 都用 **anon key + 寬鬆 RLS** 跑
- anon key 無法 DDL (CREATE TABLE), 也無法寫入 `storage.buckets`
- 結論: SQL 必須**手動在 Supabase Dashboard 跑**, bucket 必須**手動在 Dashboard 建**

## 手動 SOP

### Step 1: 跑 SQL 建 2 個 table + index + RLS + storage policies
打開 [Supabase SQL Editor](https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/sql/new)
貼上 `gufeng-zhenren-schema.sql` 整段 → Run

### Step 2: 建 Storage bucket (Dashboard, 不能用 SQL)
打開 [Storage](https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/storage/buckets)
→ **New bucket** → 填:
- Name: `user-attraction-photos`
- Public bucket: **打勾** (✓)
- File size limit: 50 MB (或更大, 古風寫真圖通常 5-15 MB)
- Allowed MIME types: 留空 (或填 `image/png, image/jpeg, image/webp`)

### Step 3: 驗證
回到 SQL Editor 跑:
```sql
select count(*) as photos_policies from pg_policies
  where schemaname='public' and tablename='user_attraction_photos';
select count(*) as ratings_policies from pg_policies
  where schemaname='public' and tablename='user_attraction_ratings';
select id, public from storage.buckets where id='user-attraction-photos';
```
預期:
- photos_policies: 4
- ratings_policies: 4
- bucket row: 1 row, public=t

## 跟現有 pattern 的差異
- 原本的 RLS 用 `current_setting('request.jwt.claims')` 區分 owner, 但 anon 沒 fingerprint 在 JWT
- 改用「全寬鬆 anon + DB 層 unique 約束」(跟 manga_likes 一致)
- 唯一性靠 `user_attraction_ratings.unique(photo_id, user_fingerprint)` 防重複按讚
- 防偽造靠 fingerprint 一致 (前端 hash user agent + IP)

## 之後要加 service_role
若以後想用 service_role 走 server-side 寫入 (避開寬鬆 anon 寫入), 把 key 加到:
1. `frontend/.env.local`: `SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx`
2. `frontend/src/utils/supabase/server-admin.ts`: 新檔, 用 `createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })`
3. API routes (`/api/gufeng-zhenren/*`) 改用 admin client

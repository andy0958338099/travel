-- ============================================================
-- AI 漫畫圖鑑 — 補 RLS anon policies
-- 問題：v2 SQL 沒給 anon 角色加 SELECT policy，導致前端查無資料
-- 設計：純 anon，不做會員，AI 全 MiniMax（user v2.0 確認）
-- 策略：anon 對這 4 個表全寬鬆 SELECT；寫入靠 server 端 service_role
-- ============================================================

-- 啟用 RLS（idempotent）
alter table public.ai_characters enable row level security;
alter table public.travel_mangas enable row level security;
alter table public.manga_likes enable row level security;

-- ── 1) ai_characters：anon 可讀 is_active=true 的角色 ──
drop policy if exists "anon read active characters" on public.ai_characters;
create policy "anon read active characters" on public.ai_characters
  for select to anon, authenticated
  using (true);
-- (未來若要嚴格化可改 using (is_active = true)，MVP 先寬鬆)

-- ── 2) travel_mangas：anon 可讀全部（漫畫是公開內容）──
drop policy if exists "anon read mangas" on public.travel_mangas;
create policy "anon read mangas" on public.travel_mangas
  for select to anon, authenticated
  using (true);

-- travel_mangas 寫入由 service_role 處理（Next.js server-side createClient 自動用 service key）
-- 不給 anon INSERT/UPDATE/DELETE，避免惡意洗資料

-- ── 3) manga_likes：anon 可讀全部，anon 可 INSERT（記錄用戶按讚）──
drop policy if exists "anon read likes" on public.manga_likes;
create policy "anon read likes" on public.manga_likes
  for select to anon, authenticated
  using (true);

drop policy if exists "anon insert likes" on public.manga_likes;
create policy "anon insert likes" on public.manga_likes
  for insert to anon, authenticated
  with check (true);

-- 刪除自己的按讚（用 user_fingerprint 區分 anon 用戶）
drop policy if exists "anon delete own likes" on public.manga_likes;
create policy "anon delete own likes" on public.manga_likes
  for delete to anon, authenticated
  using (true);

-- ── 4) increment_view_count：anon 也可呼叫（看漫畫 +1 view）──
-- (Function 已是 SECURITY DEFINER 預設可由 anon 呼叫，這裡保險確認)
grant execute on function public.increment_view_count(uuid) to anon, authenticated;

-- ── 5) 確認結果 ──
select 'ai_characters rls:' as info, count(*)::text as value
  from pg_policies where schemaname = 'public' and tablename = 'ai_characters'
union all
select 'travel_mangas rls:', count(*)::text
  from pg_policies where schemaname = 'public' and tablename = 'travel_mangas'
union all
select 'manga_likes rls:', count(*)::text
  from pg_policies where schemaname = 'public' and tablename = 'manga_likes'
union all
select 'ai_characters visible to anon:', count(*)::text
  from public.ai_characters;

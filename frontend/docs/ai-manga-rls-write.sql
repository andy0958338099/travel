-- ============================================================
-- AI 漫畫圖鑑 — 補 RLS write policies
-- 問題：v2 SQL + rls-fix SQL 沒給 anon 寫入權限
-- 設計：純 anon（user v2.0 確認），server-side 用同一把 key
-- 策略：給 anon 寬鬆寫入（公開內容，沒有個資風險）
-- ============================================================

-- ── 1) travel_mangas：anon 可 INSERT + UPDATE（server 端寫入 manga row）──
drop policy if exists "anon write mangas" on public.travel_mangas;
create policy "anon write mangas" on public.travel_mangas
  for insert to anon, authenticated
  with check (true);

drop policy if exists "anon update mangas" on public.travel_mangas;
create policy "anon update mangas" on public.travel_mangas
  for update to anon, authenticated
  using (true)
  with check (true);

-- 不給 anon DELETE（避免惡意刪漫畫）

-- ── 2) storage.objects：anon 可上傳到 travel-manga bucket（漫畫圖）──
drop policy if exists "anon upload travel-manga" on storage.objects;
create policy "anon upload travel-manga" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'travel-manga');

-- 也補 update（upsert: true 需要）
drop policy if exists "anon update travel-manga" on storage.objects;
create policy "anon update travel-manga" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'travel-manga')
  with check (bucket_id = 'travel-manga');

-- 也補 delete（regenerate 時清掉舊圖）
drop policy if exists "anon delete travel-manga" on storage.objects;
create policy "anon delete travel-manga" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'travel-manga');

-- ── 3) 確認結果 ──
select 'travel_mangas policies:' as info, count(*)::text as value
  from pg_policies where schemaname = 'public' and tablename = 'travel_mangas'
union all
select 'storage.objects travel-manga policies:', count(*)::text
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname like '%travel-manga%';

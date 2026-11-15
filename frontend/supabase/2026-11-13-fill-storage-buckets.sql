-- ============================================================
-- 江南部落格 — 補齊 Storage buckets + policies
-- 2026-11-13
--
-- DB 現有 bucket: travel-photos (public)
-- 程式碼/Worker/SQL 檔引用但缺少:
--   - travel-manga            (cloudflare-worker: manga/panel, manga/generate, image/i2i 上傳)
--   - user-attraction-photos  (frontend/docs/gufeng-zhenren-schema.sql 的 storage policies)
--   - music-mp3               (frontend/src/utils/supabase/schema.sql 註解提及)
--
-- 策略: public bucket + anon 可讀/可寫（與現有 travel-photos 一致）
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('travel-manga',           'travel-manga',           true),
  ('user-attraction-photos', 'user-attraction-photos', true),
  ('music-mp3',              'music-mp3',              true)
on conflict (id) do update set public = excluded.public;

-- ── travel-manga ─────────────────────────────────────────────
drop policy if exists "anon read travel-manga" on storage.objects;
create policy "anon read travel-manga" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'travel-manga');

drop policy if exists "anon upload travel-manga" on storage.objects;
create policy "anon upload travel-manga" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'travel-manga');

drop policy if exists "anon update travel-manga" on storage.objects;
create policy "anon update travel-manga" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'travel-manga');

drop policy if exists "anon delete travel-manga" on storage.objects;
create policy "anon delete travel-manga" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'travel-manga');

-- ── user-attraction-photos ───────────────────────────────────
drop policy if exists "anon read user-attraction-photos" on storage.objects;
create policy "anon read user-attraction-photos" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'user-attraction-photos');

drop policy if exists "anon insert user-attraction-photos" on storage.objects;
create policy "anon insert user-attraction-photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'user-attraction-photos');

drop policy if exists "anon update user-attraction-photos" on storage.objects;
create policy "anon update user-attraction-photos" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'user-attraction-photos');

drop policy if exists "anon delete user-attraction-photos" on storage.objects;
create policy "anon delete user-attraction-photos" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'user-attraction-photos');

-- ── music-mp3 ─────────────────────────────────────────────────
drop policy if exists "anon read music-mp3" on storage.objects;
create policy "anon read music-mp3" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'music-mp3');

drop policy if exists "anon upload music-mp3" on storage.objects;
create policy "anon upload music-mp3" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'music-mp3');

-- ── 確認 ─────────────────────────────────────────────────────
select id, public from storage.buckets order by id;

select policyname, cmd, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname in (
    'anon read travel-manga', 'anon upload travel-manga',
    'anon read user-attraction-photos', 'anon insert user-attraction-photos',
    'anon read music-mp3', 'anon upload music-mp3'
  )
order by policyname;

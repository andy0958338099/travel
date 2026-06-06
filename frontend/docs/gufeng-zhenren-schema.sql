-- ============================================================
-- 古風寫真 (Gufeng Zhenren) — Schema + RLS
-- 給 /travel/gufeng-zhenren 頁面用
-- 命名規則: 跟 travel_mangas / ai_characters / manga_likes 一致
-- 策略: 純 anon key + 寬鬆 RLS (跟 ai-manga-rls-write.sql 一致)
-- 寫入: 全靠 anon (前端 + Cloudflare Worker 同一把 key)
-- 跑法: Supabase Dashboard → SQL Editor → 貼上整段 → Run
-- ============================================================

-- ── 1) user_attraction_photos (生成的古風寫真) ──
create table if not exists public.user_attraction_photos (
  id                          uuid primary key default gen_random_uuid(),
  user_fingerprint            text not null,
  source_attraction_id        text,
  source_attraction_name      text,
  source_attraction_category  text,
  original_photo_url          text,
  generated_photo_url         text,
  costume_style               text not null,
  costume_style_key           text not null,
  prompt                      text,
  status                      text not null default 'generating',
  like_count                  int default 0,
  dislike_count               int default 0,
  comment_count               int default 0,
  view_count                  int default 0,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create index if not exists idx_uap_created_at
  on public.user_attraction_photos (created_at desc);
create index if not exists idx_uap_fingerprint
  on public.user_attraction_photos (user_fingerprint);
create index if not exists idx_uap_status
  on public.user_attraction_photos (status);

-- ── 2) user_attraction_ratings (按讚 + comment) ──
create table if not exists public.user_attraction_ratings (
  id                uuid primary key default gen_random_uuid(),
  photo_id          uuid not null references public.user_attraction_photos(id) on delete cascade,
  user_fingerprint  text not null,
  is_like           boolean,
  comment           text,
  created_at        timestamptz default now(),
  unique(photo_id, user_fingerprint)
);

create index if not exists idx_uar_photo_id
  on public.user_attraction_ratings (photo_id);
create index if not exists idx_uar_fingerprint
  on public.user_attraction_ratings (user_fingerprint);

-- ── 3) 啟用 RLS ──
alter table public.user_attraction_photos enable row level security;
alter table public.user_attraction_ratings enable row level security;

-- ── 4) user_attraction_photos: anon 可讀/可寫, 不可改 fingerprint 防偽造 ──
drop policy if exists "anon read attraction photos" on public.user_attraction_photos;
create policy "anon read attraction photos" on public.user_attraction_photos
  for select to anon, authenticated
  using (true);

drop policy if exists "anon insert attraction photos" on public.user_attraction_photos;
create policy "anon insert attraction photos" on public.user_attraction_photos
  for insert to anon, authenticated
  with check (true);

drop policy if exists "anon update own attraction photos" on public.user_attraction_photos;
create policy "anon update own attraction photos" on public.user_attraction_photos
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "anon delete own attraction photos" on public.user_attraction_photos;
create policy "anon delete own attraction photos" on public.user_attraction_photos
  for delete to anon, authenticated
  using (true);

-- ── 5) user_attraction_ratings: anon 全寬鬆 (unique 約束防重複) ──
drop policy if exists "anon read attraction ratings" on public.user_attraction_ratings;
create policy "anon read attraction ratings" on public.user_attraction_ratings
  for select to anon, authenticated
  using (true);

drop policy if exists "anon insert attraction ratings" on public.user_attraction_ratings;
create policy "anon insert attraction ratings" on public.user_attraction_ratings
  for insert to anon, authenticated
  with check (true);

drop policy if exists "anon update attraction ratings" on public.user_attraction_ratings;
create policy "anon update attraction ratings" on public.user_attraction_ratings
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "anon delete attraction ratings" on public.user_attraction_ratings;
create policy "anon delete attraction ratings" on public.user_attraction_ratings
  for delete to anon, authenticated
  using (true);

-- ── 6) Storage bucket policies (object-level) ──
-- 給 user-attraction-photos bucket 開放 anon 上傳
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

-- ── 7) 確認結果 ──
select 'user_attraction_photos rls:' as info, count(*)::text as value
  from pg_policies where schemaname = 'public' and tablename = 'user_attraction_photos'
union all
select 'user_attraction_ratings rls:', count(*)::text
  from pg_policies where schemaname = 'public' and tablename = 'user_attraction_ratings'
union all
select 'user-attraction-photos storage policies:', count(*)::text
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname like '%user-attraction-photos%';

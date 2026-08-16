#!/usr/bin/env bash
# 🆕 2026-08-14 聖上拍板 Level 1 schema setup
# 在 Supabase Dashboard SQL Editor 跑這份 (貼整段)
# 或: psql "$DATABASE_URL" -f setup-story-blog-schema.sql
#
# 內容: trips + posts + travel-photos bucket policy
# 注意: 跳過 music / travel_photo_meta / planner / room_tour / attraction 等
#       (Level 2 才加)

set -e
echo "==== Level 1: Story Blog Schema Setup ===="
echo ""
echo "📋 在新的 Supabase project 跑這份 SQL:"
echo "   Dashboard: https://supabase.com/dashboard/project/wydftkqwhebwlmdbosap/sql/new"
echo ""

cat <<'EOF'
-- =====================================================================
-- 🆕 2026-08-14 聖上拍板 Level 1: Story Blog (江南 8 天 7 夜)
-- 來源: src/utils/supabase/schema.sql (line 170-310)
-- =====================================================================

-- ========== trips ==========
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  days        integer not null default 8,
  hero_image  text,
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_trips_start_date on public.trips (start_date desc);

-- ========== posts ==========
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  day_number  integer not null check (day_number between 0 and 9),
  sort_order  double precision not null default 1000,
  title       text,
  content     text not null default '',
  image_url   text,
  layout_type text not null default 'left-image'
                check (layout_type in ('left-image','right-image','top-image')),
  frame_style text not null default 'vermilion'
                check (frame_style in ('vermilion','polaroid','ink','wash')),  -- 🆕 8-16 聖上拍板
  author_name text default '匿名',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_posts_trip_day_sort
  on public.posts (trip_id, day_number, sort_order);
create index if not exists idx_posts_trip_sort
  on public.posts (trip_id, sort_order);

-- ========== RLS ==========
alter table public.trips enable row level security;
alter table public.posts enable row level security;

drop policy if exists "anon_all_trips" on public.trips;
drop policy if exists "anon_all_posts" on public.posts;

create policy "anon_all_trips" on public.trips for all to anon using (true) with check (true);
create policy "anon_all_posts" on public.posts for all to anon using (true) with check (true);

-- ========== RPC: rebalance ==========
create or replace function public.rebalance_post_sort_order(p_trip_id uuid)
returns void
language plpgsql
as $$
declare
  rec record;
  new_ord double precision := 1000;
  step   double precision := 1000;
begin
  for rec in
    select id from public.posts
    where trip_id = p_trip_id
    order by sort_order, created_at
  loop
    update public.posts set sort_order = new_ord where id = rec.id;
    new_ord := new_ord + step;
  end loop;
end;
$$;

-- ========== Seed: 1 個 trip ==========
insert into public.trips (id, title, start_date, end_date, days, description)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '2026 江南 8 天 7 夜遊記',
  '2026-07-17',
  '2026-07-24',
  8,
  '上海 → 西塘 → 烏鎮 → 杭州, 十三位親友的江南水鄉之旅。'
)
on conflict (id) do nothing;

-- ========== Storage: travel-photos bucket + RLS ==========
-- 🆕 8-14: 全新專案, 需先建 bucket 才能加 policy
insert into storage.buckets (id, name, public)
values ('travel-photos', 'travel-photos', true)
on conflict (id) do nothing;

drop policy if exists "anon_upload_travel_photos" on storage.objects;
drop policy if exists "anon_update_travel_photos" on storage.objects;

create policy "anon_upload_travel_photos"
  on storage.objects for insert to anon
  with check (bucket_id = 'travel-photos');

create policy "anon_update_travel_photos"
  on storage.objects for update to anon
  using (bucket_id = 'travel-photos');

create policy "anon_select_travel_photos"
  on storage.objects for select to anon
  using (bucket_id = 'travel-photos');
EOF

echo ""
echo "==== 完成 ===="
echo ""
echo "🧪 跑完後驗證 (用 anon key):"
echo "   curl -s "https://wydftkqwhebwlmdbosap.supabase.co/rest/v1/trips?select=id,title" \\"
echo "     -H "apikey: \$ANON""
echo "   → 應有 1 筆: 2026 江南 8 天 7 夜遊記"
echo ""
echo "   curl -s "https://wydftkqwhebwlmdbosap.supabase.co/rest/v1/posts?select=count" \\"
echo "     -H "apikey: \$ANON""
echo "   → 應為 0 筆 (全新)"

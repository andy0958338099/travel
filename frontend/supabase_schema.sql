-- ============================================================
-- Supabase Schema for Travel App Sync
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Planner: Activities ────────────────────────────────────────
create table if not exists public.planner_activities (
  id          text primary key,
  title       text not null,
  day         integer not null check (day between 1 and 8),
  start_hour  integer not null check (start_hour between 0 and 24),
  duration    integer not null default 1 check (duration between 1 and 12),
  color       text not null default 'bg-blue-400',
  cost        integer not null default 0,
  cost_type   text default 'ticket',
  notes       text,
  tickets     jsonb default '[]',
  sort_order  integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Planner: Members ───────────────────────────────────────────
create table if not exists public.planner_members (
  id         text primary key,
  name       text not null,
  color      text not null default 'bg-blue-500',
  created_at timestamptz default now()
);

-- ── Planner: Ticket Assignments ────────────────────────────────
-- Per activity ticket purchase records
create table if not exists public.planner_tickets (
  id           text primary key,
  activity_id  text not null references public.planner_activities(id) on delete cascade,
  ticket_name  text not null,
  ticket_price integer not null default 0,
  purchased_by text[] default '{}',
  created_at   timestamptz default now()
);

-- ── Planner: Cost Target ────────────────────────────────────────
create table if not exists public.planner_settings (
  key   text primary key,
  value text not null default ''
);

-- ── Room Tour: Customizations (optional per-device overrides) ──
-- If no row exists for a hotel, use the hardcoded defaults
create table if not exists public.room_tour_photos (
  id          text primary key,
  hotel_key   text not null,
  src         text not null,
  caption     text,
  category    text default 'room',
  location    text,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ── Indexes ────────────────────────────────────────────────────
create index if not exists idx_activities_day     on public.planner_activities(day);
create index if not exists idx_tickets_activity  on public.planner_tickets(activity_id);
create index if not exists idx_room_tour_hotel   on public.room_tour_photos(hotel_key);

-- ── Row Level Security ─────────────────────────────────────────
-- For a public travel app, we use anon key for reads and writes
alter table public.planner_activities   enable row level security;
alter table public.planner_members      enable row level security;
alter table public.planner_tickets     enable row level security;
alter table public.planner_settings    enable row level security;
alter table public.room_tour_photos    enable row level security;

-- Allow anonymous reads and inserts
create policy "Allow anon read planner_activities"  on public.planner_activities  for select using (true);
create policy "Allow anon insert planner_activities" on public.planner_activities  for insert with check (true);
create policy "Allow anon update planner_activities" on public.planner_activities  for update using (true);
create policy "Allow anon delete planner_activities" on public.planner_activities  for delete using (true);

create policy "Allow anon read planner_members"     on public.planner_members       for select using (true);
create policy "Allow anon insert planner_members"   on public.planner_members       for insert with check (true);
create policy "Allow anon update planner_members"   on public.planner_members       for update using (true);
create policy "Allow anon delete planner_members"   on public.planner_members       for delete using (true);

create policy "Allow anon read planner_tickets"     on public.planner_tickets       for select using (true);
create policy "Allow anon insert planner_tickets"   on public.planner_tickets       for insert with check (true);
create policy "Allow anon update planner_tickets"   on public.planner_tickets       for update using (true);
create policy "Allow anon delete planner_tickets"   on public.planner_tickets       for delete using (true);

create policy "Allow anon read planner_settings"    on public.planner_settings      for select using (true);
create policy "Allow anon upsert planner_settings"  on public.planner_settings      for insert with check (true);
create policy "Allow anon update planner_settings"  on public.planner_settings      for update using (true);

create policy "Allow anon read room_tour_photos"   on public.room_tour_photos     for select using (true);
create policy "Allow anon insert room_tour_photos"  on public.room_tour_photos     for insert with check (true);
create policy "Allow anon update room_tour_photos"  on public.room_tour_photos     for update using (true);
create policy "Allow anon delete room_tour_photos"  on public.room_tour_photos     for delete using (true);

-- ── Seed Default Activities ─────────────────────────────────────
insert into public.planner_activities (id, title, day, start_hour, duration, color, cost, cost_type, sort_order) values
  ('act-1',  '外灘夜景',        1, 17, 3, 'bg-blue-400',   0,   'spot',       1),
  ('act-2',  '南京東路步行街',  1, 20, 2, 'bg-orange-400', 0,   'spot',       2),
  ('act-3',  '海底撈火鍋',      1, 22, 2, 'bg-red-400',   500, 'food',       3),
  ('act-4',  '小楊生煎',        2, 8,  1, 'bg-yellow-400', 100, 'food',       4),
  ('act-5',  '豫園',           2, 9,  2, 'bg-green-400',   80,  'ticket',     5),
  ('act-6',  '城隍廟',         2, 12, 2, 'bg-green-400',   0,   'spot',       6),
  ('act-7',  '南翔饅頭',        2, 14, 1, 'bg-orange-400', 120, 'food',       7),
  ('act-8',  '西塘古鎮',        2, 16, 3, 'bg-cyan-400',   190, 'ticket',     8),
  ('act-9',  '江南戲曲服飾',    3, 8,  3, 'bg-purple-400', 150, 'ticket',     9),
  ('act-10', '水宴餐廳',        3, 12, 2, 'bg-orange-400', 200, 'food',       10),
  ('act-11', '烏鎮東柵',        3, 15, 4, 'bg-cyan-400',   110, 'ticket',     11),
  ('act-12', '烏鎮西柵',        4, 8,  5, 'bg-green-400',   150, 'ticket',     12),
  ('act-13', '白蓮塔',          4, 14, 2, 'bg-red-400',     0,  'spot',       13),
  ('act-14', '木心美術館',      4, 16, 2, 'bg-purple-400',  20, 'ticket',     14),
  ('act-15', '搖櫓船',          4, 18, 1, 'bg-cyan-400',   150, 'ticket',     15),
  ('act-16', '西湖（主湖區）',  5, 8,  3, 'bg-green-400',    0, 'spot',       16),
  ('act-17', '斷橋殘雪',        5, 11, 1, 'bg-blue-400',    0, 'spot',       17),
  ('act-18', '蘇堤',            5, 13, 2, 'bg-green-400',    0, 'spot',       18),
  ('act-19', '武林夜市',        5, 18, 3, 'bg-orange-400', 200, 'food',      19),
  ('act-20', '河坊街',          5, 21, 1, 'bg-orange-400', 300, 'shopping',   20),
  ('act-21', '游埠豆漿',        6, 6,  1, 'bg-yellow-400',  60, 'food',      21),
  ('act-22', '宋城千古情',      6, 10, 5, 'bg-purple-400', 1600,'ticket',     22),
  ('act-23', '馬驚興餐廳',      6, 17, 2, 'bg-orange-400', 200, 'food',      23),
  ('act-24', '大馬弄',          7, 6,  2, 'bg-yellow-400',   80, 'food',      24),
  ('act-25', '京杭大運河遊船',  7, 10, 3, 'bg-cyan-400',   267, 'ticket',    25),
  ('act-26', '宮宴',            7, 18, 3, 'bg-red-400',    2500, 'food',      26),
  ('act-27', '西湖（主湖區）',  8, 8,  2, 'bg-green-400',    0, 'spot',       27),
  ('act-28', '龍井茶園',        8, 11, 2, 'bg-green-400',  300, 'ticket',     28)
on conflict (id) do nothing;

-- Seed default members
insert into public.planner_members (id, name, color) values
  ('m1', '阿國',   'bg-blue-500'),
  ('m2', '小珍',   'bg-pink-500'),
  ('m3', '大雄',   'bg-green-500'),
  ('m4', '阿美',   'bg-yellow-500'),
  ('m5', '老王',   'bg-purple-500'),
  ('m6', '小李',   'bg-red-500'),
  ('m7', '阿婷',   'bg-teal-500')
on conflict (id) do nothing;

-- Seed default cost target
insert into public.planner_settings (key, value) values
  ('cost_target', '20000')
on conflict (key) do nothing;

-- ── Attraction Gallery: Hidden Images ───────────────────────────
-- Tracks deleted images so all users see them hidden
create table if not exists public.attraction_gallery_hidden (
  image_url   text primary key,
  hidden_at   timestamptz default now()
);

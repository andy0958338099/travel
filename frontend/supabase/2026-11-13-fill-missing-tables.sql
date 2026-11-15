-- ============================================================
-- 江南部落格 — 補齊程式碼引用但 DB 缺失的 18 張表
-- 2026-11-13  執行於 Supabase 專案 wydftkqwhebwlmdbosap
--
-- 來源:
--   - frontend/supabase_schema.sql            (planner / room_tour / gallery / user_state)
--   - frontend/src/utils/supabase/schema.sql   (music_songs / music_votes)
--   - frontend/docs/gufeng-zhenren-schema.sql (user_attraction_*)
--   - 其餘 (travel_photo_* / travel_video_* / story_blog_drafts)
--     由前端 TS 型別 + 實際呼叫反推欄位
--
-- 策略: 與現有表一致 — anon key 可讀可寫（寬鬆 RLS），service_role bypass RLS
-- ============================================================

create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. user_state — 一般 key-value 雲端同步
-- ────────────────────────────────────────────────────────────
create table if not exists public.user_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. planner_* — 行程規劃
-- ────────────────────────────────────────────────────────────
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

create table if not exists public.planner_members (
  id         text primary key,
  name       text not null,
  color      text not null default 'bg-blue-500',
  created_at timestamptz default now()
);

create table if not exists public.planner_tickets (
  id           text primary key,
  activity_id  text not null references public.planner_activities(id) on delete cascade,
  ticket_name  text not null,
  ticket_price integer not null default 0,
  purchased_by text[] default '{}',
  created_at   timestamptz default now()
);

create table if not exists public.planner_settings (
  key   text primary key,
  value text not null default ''
);

-- ────────────────────────────────────────────────────────────
-- 3. room_tour_photos — 房間tour 照片客製
-- ────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────
-- 4. attraction_gallery_* — 景點圖庫隱藏狀態
-- ────────────────────────────────────────────────────────────
create table if not exists public.attraction_gallery_hidden (
  image_url   text primary key,
  hidden_at   timestamptz default now()
);

create table if not exists public.attraction_gallery_attractions (
  attraction_name text primary key,
  hidden_at        timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 5. travel_photo_meta — 旅行照片主表 (EXIF + 互動數)
--    欄位來源: src/utils/travelPhotos.ts TravelPhoto interface
-- ────────────────────────────────────────────────────────────
create table if not exists public.travel_photo_meta (
  id                      uuid primary key default gen_random_uuid(),
  filename                text not null,
  google_drive_url        text,
  google_photos_thumb_url text,
  day                     integer,
  hour                    integer,
  datetime_original       timestamptz,
  lat                     double precision,
  lng                     double precision,
  location_name           text,
  uploader_id             text,
  uploader_name           text,
  caption                 text,
  likes_count             integer not null default 0,
  views_count             integer not null default 0,
  rank_score              double precision generated always as
                            (likes_count * 0.7 + views_count * 0.3) stored,
  created_at              timestamptz default now()
);

create index if not exists idx_tpm_day      on public.travel_photo_meta (day);
create index if not exists idx_tpm_created  on public.travel_photo_meta (created_at desc);
create index if not exists idx_tpm_rank     on public.travel_photo_meta (rank_score desc);

-- ────────────────────────────────────────────────────────────
-- 6. travel_photo_likes / travel_photo_views
-- ────────────────────────────────────────────────────────────
create table if not exists public.travel_photo_likes (
  id                uuid primary key default gen_random_uuid(),
  photo_id          uuid not null references public.travel_photo_meta(id) on delete cascade,
  user_fingerprint  text not null,
  created_at        timestamptz default now()
);

create index if not exists idx_tpl_photo on public.travel_photo_likes (photo_id);
create index if not exists idx_tpl_fp    on public.travel_photo_likes (user_fingerprint);

create table if not exists public.travel_photo_views (
  id                uuid primary key default gen_random_uuid(),
  photo_id          uuid not null references public.travel_photo_meta(id) on delete cascade,
  user_fingerprint  text not null,
  viewed_at         timestamptz default now()
);

create index if not exists idx_tpv_photo on public.travel_photo_views (photo_id);
create index if not exists idx_tpv_fp    on public.travel_photo_views (user_fingerprint);

-- ────────────────────────────────────────────────────────────
-- 7. travel_videos / travel_video_comments / travel_video_likes
--    欄位來源: src/app/travel/videos/ClientPage.tsx Video / Comment type
-- ────────────────────────────────────────────────────────────
create table if not exists public.travel_videos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  embed_url   text not null default '',
  platform    text not null default 'youtube',
  title       text not null default '',
  category    text not null default '',
  like_count  integer not null default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_tv_likes   on public.travel_videos (like_count desc);
create index if not exists idx_tv_created on public.travel_videos (created_at desc);

create table if not exists public.travel_video_comments (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.travel_videos(id) on delete cascade,
  author      text not null default '',
  text        text not null default '',
  created_at  timestamptz default now()
);

create index if not exists idx_tvc_video on public.travel_video_comments (video_id);

create table if not exists public.travel_video_likes (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.travel_videos(id) on delete cascade,
  visitor_id  text not null,
  created_at  timestamptz default now()
);

create index if not exists idx_tvl_video on public.travel_video_likes (video_id);
create index if not exists idx_tvl_visitor on public.travel_video_likes (visitor_id);

-- ────────────────────────────────────────────────────────────
-- 8. story_blog_drafts — 部落格草稿 (單筆 id='d1')
-- ────────────────────────────────────────────────────────────
create table if not exists public.story_blog_drafts (
  id          text primary key,
  text        text not null default '',
  updated_at  timestamptz default now(),
  updated_by  text
);

-- ────────────────────────────────────────────────────────────
-- 9. user_attraction_photos / user_attraction_ratings — 古風寫真
--    來源: frontend/docs/gufeng-zhenren-schema.sql
-- ────────────────────────────────────────────────────────────
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
  error_message               text,
  like_count                  int default 0,
  dislike_count               int default 0,
  comment_count               int default 0,
  view_count                  int default 0,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create index if not exists idx_uap_created_at on public.user_attraction_photos (created_at desc);
create index if not exists idx_uap_fingerprint on public.user_attraction_photos (user_fingerprint);
create index if not exists idx_uap_status     on public.user_attraction_photos (status);

create table if not exists public.user_attraction_ratings (
  id                uuid primary key default gen_random_uuid(),
  photo_id          uuid not null references public.user_attraction_photos(id) on delete cascade,
  user_fingerprint  text not null,
  is_like           boolean,
  comment           text,
  created_at        timestamptz default now(),
  unique(photo_id, user_fingerprint)
);

create index if not exists idx_uar_photo_id    on public.user_attraction_ratings (photo_id);
create index if not exists idx_uar_fingerprint on public.user_attraction_ratings (user_fingerprint);

-- ────────────────────────────────────────────────────────────
-- 10. music_songs / music_votes — 背景音樂投票
--     來源: frontend/src/utils/supabase/schema.sql
-- ────────────────────────────────────────────────────────────
create table if not exists public.music_songs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  youtube_url text not null,
  youtube_id  text generated always as (
                substring(youtube_url from 'youtu\.be/([^?&]+)')
              ) stored,
  category    text not null default '古鎮',
  cover_url   text,
  mp3_url     text,
  description text,
  votes       integer not null default 0,
  play_count  integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_music_songs_votes_desc  on public.music_songs (votes desc);
create index if not exists idx_music_songs_created_at  on public.music_songs (created_at desc);
create index if not exists idx_music_songs_youtube_id  on public.music_songs (youtube_id);
create index if not exists idx_music_songs_category   on public.music_songs (category);

create table if not exists public.music_votes (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.music_songs(id) on delete cascade,
  user_id    text not null,
  vote       smallint not null check (vote in (1, -1)),
  created_at timestamptz default now(),
  unique (song_id, user_id)
);

create index if not exists idx_music_votes_song_id on public.music_votes (song_id);
create index if not exists idx_music_votes_user_id on public.music_votes (user_id);

-- 觸發器: 自動 sum votes 回寫 music_songs.votes
create or replace function public.update_song_votes_count()
returns trigger
language plpgsql
as $$
begin
  update public.music_songs
  set votes = coalesce(
    (select sum(vote) from public.music_votes where song_id = coalesce(new.song_id, old.song_id)),
    0
  ),
  updated_at = now()
  where id = coalesce(new.song_id, old.song_id);
  return null;
end;
$$;

drop trigger if exists trg_update_song_votes_count on public.music_votes;
create trigger trg_update_song_votes_count
after insert or update or delete on public.music_votes
for each row execute function public.update_song_votes_count();

-- ────────────────────────────────────────────────────────────
-- 11. RLS — 全部寬鬆 anon 存取（與現有 trips/posts 一致）
-- ────────────────────────────────────────────────────────────
-- 注意: user_state.value 改為 nullable。
--   useCloudState(key, null) 在雲端無值時會 upsert value=null，
--   若為 NOT NULL 會得到 23502 not-null violation (前端報 400)。
alter table public.user_state alter column value drop not null;

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_state',
    'planner_activities','planner_members','planner_tickets','planner_settings',
    'room_tour_photos',
    'attraction_gallery_hidden','attraction_gallery_attractions',
    'travel_photo_meta','travel_photo_likes','travel_photo_views',
    'travel_videos','travel_video_comments','travel_video_likes',
    'story_blog_drafts',
    'user_attraction_photos','user_attraction_ratings',
    'music_songs','music_votes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    -- 刪掉可能重複的同名 policy 後重建
    execute format('drop policy if exists %I on public.%I', 'Allow anon all ' || t, t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true)',
      'Allow anon all ' || t, t
    );
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- 12. Realtime: user_state / posts / trips 進 publication
-- ────────────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['user_state','travel_photo_meta','travel_videos']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when others then
        null; -- publication 不存在則略過
      end;
    end if;
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- 13. Seed: 預設行程活動 + 團員 + 成本目標
--     來源: frontend/supabase_schema.sql
-- ────────────────────────────────────────────────────────────
insert into public.planner_activities (id, title, day, start_hour, duration, color, cost, cost_type, sort_order) values
  ('act-1',  '外灘夜景',        1, 17, 3, 'bg-blue-400',   0,   'spot',       1),
  ('act-2',  '南京東路步行街',  1, 20, 2, 'bg-orange-400', 0,   'spot',       2),
  ('act-3',  '海底撈火鍋',      1, 22, 2, 'bg-red-400',     500, 'food',       3),
  ('act-4',  '小楊生煎',        2, 8,  1, 'bg-yellow-400',  100, 'food',       4),
  ('act-5',  '豫園',           2, 9,  2, 'bg-green-400',   80,  'ticket',     5),
  ('act-6',  '城隍廟',         2, 12, 2, 'bg-green-400',   0,   'spot',       6),
  ('act-7',  '南翔饅頭',        2, 14, 1, 'bg-orange-400',  120, 'food',       7),
  ('act-8',  '西塘古鎮',        2, 16, 3, 'bg-cyan-400',    190, 'ticket',     8),
  ('act-9',  '江南戲曲服飾',    3, 8,  3, 'bg-purple-400',  150, 'ticket',     9),
  ('act-10', '水宴餐廳',        3, 12, 2, 'bg-orange-400',  200, 'food',       10),
  ('act-11', '烏鎮東柵',        3, 15, 4, 'bg-cyan-400',    110, 'ticket',     11),
  ('act-12', '烏鎮西柵',        4, 8,  5, 'bg-green-400',   150, 'ticket',     12),
  ('act-13', '白蓮塔',          4, 14, 2, 'bg-red-400',     0,   'spot',       13),
  ('act-14', '木心美術館',      4, 16, 2, 'bg-purple-400',  20,  'ticket',     14),
  ('act-15', '搖櫓船',          4, 18, 1, 'bg-cyan-400',    150, 'ticket',     15),
  ('act-16', '西湖（主湖區）',  5, 8,  3, 'bg-green-400',    0,   'spot',       16),
  ('act-17', '斷橋殘雪',        5, 11, 1, 'bg-blue-400',     0,   'spot',       17),
  ('act-18', '蘇堤',           5, 13, 2, 'bg-green-400',    0,   'spot',       18),
  ('act-19', '武林夜市',        5, 18, 3, 'bg-orange-400',  200, 'food',       19),
  ('act-20', '河坊街',          5, 21, 1, 'bg-orange-400',  300, 'shopping',   20),
  ('act-21', '游埠豆漿',        6, 6,  1, 'bg-yellow-400',  60,  'food',       21),
  ('act-22', '宋城千古情',      6, 10, 5, 'bg-purple-400',  1600,'ticket',     22),
  ('act-23', '馬驚興餐廳',      6, 17, 2, 'bg-orange-400',  200, 'food',       23),
  ('act-24', '大馬弄',          7, 6,  2, 'bg-yellow-400',  80,  'food',       24),
  ('act-25', '京杭大運河遊船',  7, 10, 3, 'bg-cyan-400',    267, 'ticket',     25),
  ('act-26', '宮宴',            7, 18, 3, 'bg-red-400',     2500,'food',       26),
  ('act-27', '西湖（主湖區）',  8, 8,  2, 'bg-green-400',    0,   'spot',       27),
  ('act-28', '龍井茶園',        8, 11, 2, 'bg-green-400',   300, 'ticket',     28)
on conflict (id) do nothing;

insert into public.planner_members (id, name, color) values
  ('m1', '阿國',   'bg-blue-500'),
  ('m2', '小珍',   'bg-pink-500'),
  ('m3', '大雄',   'bg-green-500'),
  ('m4', '阿美',   'bg-yellow-500'),
  ('m5', '老王',   'bg-purple-500'),
  ('m6', '小李',   'bg-red-500'),
  ('m7', '阿婷',   'bg-teal-500')
on conflict (id) do nothing;

insert into public.planner_settings (key, value) values
  ('cost_target', '20000')
on conflict (key) do nothing;

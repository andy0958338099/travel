-- 🅒 2026-08-09 聖上拍板: Music 系統 Supabase schema
--   - music_songs: 19 首古鎮歌曲 (+ 未來新增)
--   - music_votes: 每用戶每首歌限 1 票 (+1 / -1)
--   - Storage bucket: music-mp3/ (待聖上提供 MP3 文件)
--
-- 執行方式:
--   1. 進 Supabase Dashboard > SQL Editor
--   2. 貼上這整段 SQL
--   3. 跑一次 (冇問題再跑 seed script)

-- ========== music_songs ==========
create table if not exists public.music_songs (
  id uuid primary key default gen_random_uuid(),
  -- 基本資訊
  title text not null,                   -- 歌名
  youtube_url text not null,             -- YouTube 連結 (聖上 paste 的 19 首)
  youtube_id text generated always as (
    substring(youtube_url from 'youtu\.be/([^?&]+)')  -- youtu.be/<id>
  ) stored,
  -- 分類 (古鎮 / 抒情 / 輕快 / 流行...)
  category text not null default '古鎮',
  -- 封面 (可選, 暫用 YouTube maxresdefault.jpg)
  cover_url text,
  -- MP3 下載 (聖上之後提供 → 上傳到 Storage music-mp3/ → 更新此欄位)
  mp3_url text,
  -- 描述 / 聖上寫的話
  description text,
  -- 投票分數 (music_votes 觸發器自動算)
  votes integer not null default 0,
  -- 播放次數 (可選, 統計)
  play_count integer not null default 0,
  -- 時間戳
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 索引: by votes desc (預設排序), by created_at desc (新增排序)
create index if not exists idx_music_songs_votes_desc on public.music_songs (votes desc);
create index if not exists idx_music_songs_created_at on public.music_songs (created_at desc);
create index if not exists idx_music_songs_youtube_id on public.music_songs (youtube_id);
create index if not exists idx_music_songs_category on public.music_songs (category);

-- 註解
comment on table public.music_songs is '🅒 8-9 聖上拍板: 江南水鄉背景音樂 + 投票排序';
comment on column public.music_songs.votes is 'music_votes 觸發器自動 sum 計算';
comment on column public.music_songs.youtube_id is '從 youtube_url extract 的影片 id';
comment on column public.music_songs.mp3_url is '待聖上提供 MP3 文件 + 上傳到 music-mp3/ bucket';

-- ========== music_votes ==========
create table if not exists public.music_votes (
  id uuid primary key default gen_random_uuid(),
  -- 關聯
  song_id uuid not null references public.music_songs(id) on delete cascade,
  -- 用戶識別 (lightweight 名字 + localStorage; 不需 Supabase Auth)
  -- 聖上 USER 偏好「不強調 AI 字眼」+ 之前 story-blog 一樣 anonymous voting
  user_id text not null,
  -- 投票值 +1 / -1
  vote smallint not null check (vote in (1, -1)),
  -- 時間戳
  created_at timestamp with time zone default now(),
  -- 一個 user 對同一首歌只能有一票 (後投的覆蓋先投的)
  unique (song_id, user_id)
);

create index if not exists idx_music_votes_song_id on public.music_votes (song_id);
create index if not exists idx_music_votes_user_id on public.music_votes (user_id);

comment on table public.music_votes is '🅒 8-9 聖上拍板: 每 user 每 song 限一票, vote +/-1';

-- ========== 觸發器: 自動算 songs.votes ==========
-- 當 user 投新票 (insert/update/delete), 自動 sum 該 song 的所有 vote 寫回 songs.votes
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

-- ========== RLS (Row Level Security) ==========
-- 聖上 USER 偏好「lightweight 匿名投票」, 任何 anon key 都能讀 + 投票
-- 寫入需要 service_role key (管理後台)
alter table public.music_songs enable row level security;
alter table public.music_votes enable row level security;

-- music_songs: anon 可以讀, 不能寫
drop policy if exists "anon_read_music_songs" on public.music_songs;
create policy "anon_read_music_songs"
on public.music_songs
for select
to anon, authenticated
using (true);

-- music_votes: anon 可以讀 + 寫入 (因為是 lightweight 投票)
-- 但寫入需要 service_role (避免亂投票) — 改寫: 允許 anon insert 但 unique 約束防濫用
drop policy if exists "anon_read_music_votes" on public.music_votes;
create policy "anon_read_music_votes"
on public.music_votes
for select
to anon, authenticated
using (true);

drop policy if exists "anon_insert_music_votes" on public.music_votes;
create policy "anon_insert_music_votes"
on public.music_votes
for insert
to anon, authenticated
with check (true);

drop policy if exists "anon_update_music_votes" on public.music_votes;
create policy "anon_update_music_votes"
on public.music_votes
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "anon_delete_music_votes" on public.music_votes;
create policy "anon_delete_music_votes"
on public.music_votes
for delete
to anon, authenticated
using (true);

-- ========== Storage bucket: music-mp3 ==========
-- 待聖上提供 MP3 文件時, 創建 bucket
-- insert into storage.buckets (id, name, public)
-- values ('music-mp3', 'music-mp3', true)
-- on conflict (id) do nothing;

-- music-mp3 bucket RLS: anon 可以讀 (下載 MP3)
-- create policy "anon_read_music_mp3"
-- on storage.objects
-- for select
-- to anon, authenticated
-- using (bucket_id = 'music-mp3');

-- ========== 預期狀態 (執行後檢查) ==========
-- 跑完 SQL 應該看到:
--   ✅ table public.music_songs created
--   ✅ table public.music_votes created
--   ✅ trigger trg_update_song_votes_count on music_votes
--   ✅ 4 個 RLS policies on music_votes
--   ✅ 1 個 RLS policy on music_songs
--
-- Storage bucket music-mp3 暫不創建 (待聖上提供 MP3)

-- ========== next step: seed 19 首 ==========
-- 跑完 SQL 後, 執行 scripts/seed-music-songs.mjs
-- 會把 19 首 YouTube URL + title 自動 PATCH 到 music_songs table

-- =====================================================================
-- 🆕 2026-08-10 聖上拍板: 江南 8 天 7 夜故事部落格 (rebuild 2nd time)
--   - trips: 旅程主體 (目前只 1 條: 2026 江南 8 天 7 夜遊記)
--   - posts: 每一筆相片+文章動態 (含 sort_order 動態插隊)
--   - layout_type: 'left-image' / 'right-image' / 'top-image'
--   - day_number: 1-8 (含 day 0 前言 / day 9 後記)
--   - image_url: 對應 travel-photos bucket 公開 URL
--
-- 設計重點:
--   1. sort_order 用 float — 支援「在兩筆中間插入」 (取前後平均)
--      偶爾插入太多次需要 rebalance — 由前端偵測太擠時呼叫 RPC
--   2. RLS 全開 (跟 photo_meta / planner 一樣: anonymous 公開協作)
--   3. bucket 沿用既有 'travel-photos' — 不新建 bucket
-- =====================================================================

-- ========== trips ==========
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                        -- '2026 江南 8 天 7 夜遊記'
  start_date  date not null,                        -- '2026-07-17'
  end_date    date not null,                        -- '2026-07-24'
  days        integer not null default 8,            -- 天數
  hero_image  text,                                 -- 封面 (travel-photos bucket URL)
  description text,                                 -- 旅程簡介
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_trips_start_date on public.trips (start_date desc);

comment on table public.trips is '🆕 8-10 聖上拍板: 江南水鄉 8 天 7 夜旅遊部落格 — 旅程主體';

-- ========== posts ==========
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  day_number  integer not null check (day_number between 0 and 9),  -- 0 前言 / 1-8 主行程 / 9 後記
  sort_order  double precision not null default 1000,  -- 同 day 內排序 + 跨 day 全域排序
  title       text,                                     -- 小標題
  content     text not null default '',                 -- 文字敘述
  image_url   text,                                     -- 照片 URL (travel-photos bucket 或外部)
  layout_type text not null default 'left-image'
                check (layout_type in ('left-image','right-image','top-image')),
  author_name text default '匿名',                       -- 誰寫的
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 索引: by trip + day + sort_order (主畫面時間軸查詢)
create index if not exists idx_posts_trip_day_sort
  on public.posts (trip_id, day_number, sort_order);
create index if not exists idx_posts_trip_sort
  on public.posts (trip_id, sort_order);
create index if not exists idx_posts_author
  on public.posts (author_name);

comment on table public.posts is '🆕 8-10 聖上拍板: 動態插隊照片+文章, sort_order 用 float 支援中段插入';
comment on column public.posts.sort_order is 'float: 預設 1000 為基底, 在 [a,b] 中間插入 = (a+b)/2';
comment on column public.posts.layout_type is 'left-image / right-image / top-image — 3 種排版';

-- ========== RLS: 全公開協作 (跟 photo_meta / planner_activities 一致) ==========
alter table public.trips  enable row level security;
alter table public.posts  enable row level security;

drop policy if exists "anon_all_trips"  on public.trips;
drop policy if exists "anon_all_posts"  on public.posts;
drop policy if exists "anon_read_trips" on public.trips;
drop policy if exists "anon_read_posts" on public.posts;
drop policy if exists "anon_write_posts" on public.posts;

create policy "anon_all_trips" on public.trips for all to anon using (true) with check (true);
create policy "anon_all_posts" on public.posts for all to anon using (true) with check (true);

-- ========== RPC: 動態插隊 (rebalance 過度插入) ==========
-- 當 (a+b)/2 差距 < 0.001 時, 重新均勻分佈整個 trip 的 sort_order
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

comment on function public.rebalance_post_sort_order is '🆕 8-10: 動態插隊太擠時, 重新均勻分佈 sort_order (1000, 2000, 3000...)';

-- ========== 種子: 1 個 trip (2026 江南 8 天 7 夜) ==========
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

-- ========== Storage: travel-photos bucket 沿用, 補 anon upload policy ==========
-- (bucket 已存在 day1/ day2/ ... 子目錄有 171 張 D1 + 其他 day 照片)
-- 確保 anon 可上傳 (聖上朋友可從外部補上傳)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'anon_upload_travel_photos'
  ) THEN
    EXECUTE $SQL$
      create policy "anon_upload_travel_photos"
      on storage.objects for insert to anon
      with check (bucket_id = 'travel-photos')
    $SQL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'anon_update_travel_photos'
  ) THEN
    EXECUTE $SQL$
      create policy "anon_update_travel_photos"
      on storage.objects for update to anon
      using (bucket_id = 'travel-photos')
    $SQL$;
  END IF;
END
$$;

-- ========== 驗證 SOP (跑完後 curl 確認) ==========
-- curl -s "$URL/rest/v1/trips?select=id,title" -H "apikey: $ANON"
--   → 應有 1 筆: "2026 江南 8 天 7 夜遊記"
-- curl -s "$URL/rest/v1/posts?select=count" -H "apikey: $ANON"
--   → 應為 0 筆 (全新 table)


-- =====================================================================
-- 🆕 2026-08-10 聖上拍板 (第 2 輪): 行程表塞進 LLM context
--   - trips 表加 itinerary JSONB 欄位 (8 天行程)
--   - 聖上 8-10 提供 8 天真實行程, seed 進去
--   - 潤飾 API 自動收當天 itinerary → LLM 看行程潤飾, 不瞎編
--
-- 設計:
--   - JSONB 而非 text: 結構化查詢 (可以 WHERE itinerary @> '{...}')
--   - 格式: { "1": [...], "2": [...], "3": [...], "4": [...], "5": [...], "6": [...], "7": [...], "8": [...] }
--   - day 0 (前言) / day 9 (後記) 沒 itinerary → 預設空陣列
-- =====================================================================

alter table public.trips
  add column if not exists itinerary jsonb not null default '{}'::jsonb;

comment on column public.trips.itinerary is '🆕 8-10: 8 天行程表 (key=day_number 字串, value=時段字串陣列) — 給 LLM 潤飾時參考時段';

-- ========== 種子: 2026 江南 8 天 7 夜 真實行程 (聖上 8-10 提供) ==========
update public.trips
set itinerary = '{
  "1": [
    "08:30～09:00 桃園機場第一航廈集合T1",
    "09:15 開始劃位/掛行李（春秋航空無預劃）",
    "10:50 開始登機",
    "11:15 飛機起飛",
    "13:20 抵達上海浦東機場T2",
    "14:20 出關",
    "15:00 完成手機辦理",
    "15:15 前往磁浮列車月台-前往龍陽路站 *8分鐘",
    "15:30～16:00 坐捷運2號線＝》人民廣場",
    "16:00～16:15 上海嘉廷酒店Check in",
    "16:15~17:00 休息一會兒 -- 各小組自行帶開",
    "17:00～往南京東路步行街/外灘/豫園商城 逛大街！",
    "21:30～打滴回往上海嘉庭飯店"
  ],
  "2": [
    "05:00 check out-行李放飯店",
    "05:20 泳度蘇州河抵達四行倉庫-（賽門）-其他人繼續睡",
    "07:00～08:00 小楊生煎包黃河路店/佳家湯包/王家沙",
    "08:00～08:30 人民廣場-前往南京西路LV巨輪-地鐵2號線*9分鐘",
    "08:30～10:00 LV巨輪拍照/星巴客旗鑑店",
    "10:30 南京西路-人民廣場-前往豫園-地鐵2號線轉10號線 *13分鐘",
    "11:00～12:30 南翔饅頭店",
    "12:00～15:30 豫園/城隍廟",
    "15:00～返回上海嘉廷飯店",
    "15:30～17:00 搭乘包車出發前往西塘古鎮",
    "17:00～17:30 check in 西塘古鎮內古韻雅居客棧",
    "18:00～20:00 椒釀釀火鍋",
    "20:00～22:00 夜遊西塘古鎮"
  ],
  "3": [
    "05:00～15:00 西塘古鎮整日遊！",
    "15:30～17:00 搭乘包車出發前往烏鎮西柵景區外",
    "17:00～17:30 check in 烏鎮夏朵.悠舍悠得藝術飯店（西柵-北門）",
    "17:30～19:30 水宴餐廳",
    "19:30～21:00 景區外閒晃大街或找足浴洗腳",
    "21:30～回飯店休息"
  ],
  "4": [
    "05:00～09:00 烏鎮外吃早餐！",
    "09:00～09:30 check in 烏鎮西柵",
    "09:30～18:00 西柵內慢悠悠看活動",
    "18:00～22:00 景區外閒晃大街或找足浴洗腳",
    "21:30～回飯店休息"
  ],
  "5": [
    "07:00～09:00 烏鎮內吃早茶客！",
    "10:00～11:30 搭乘包車出發前往杭州",
    "11:30~12:00 check in 杭州大酒店",
    "12:00～18:00 遊西湖/蘇堤春曉/曲院風荷",
    "18:00～21:30 武林夜市/銀泰in 77",
    "21:30～回飯店休息"
  ],
  "6": [
    "07:00～09:00 吃飯店早餐或附近吃",
    "09:00～10:20 武林广场东1 搭乘318公車出發前往宋城千古情",
    "17:00～18:20 宋城东·感应桥南搭乘318公車回杭州大酒店",
    "18:30～20:30 馬鴻興餐廳",
    "20:30～22:30 閒晃西湖/銀泰 in 77",
    "22:30～回飯店休息"
  ],
  "7": [
    "07:00～09:00 吃飯店早餐或附近吃",
    "09:20～09:50 武林广场(约7分钟)地铁3号线往黃龍洞 *7分鐘",
    "10:00～11:30 杭州宮宴換裝",
    "11:30～12:10 杭州宮宴入座",
    "12:10～14:10 開始用餐/看秀",
    "14:10～14:30 杭州宮宴結束",
    "14:30～15:30 黃龍洞回武林广场(约7分钟)地铁3号线",
    "15:30～21:00 續遊西湖/南宋御街杭州大運河/飯店休息"
  ],
  "8": [
    "07:00～09:00 吃飯店早餐或附近吃",
    "09:00～15:00 靈隱寺/杭州大運河/西湖/綠茶餐廳",
    "14:30～15:00 由杭州大酒店離開",
    "15:00～16:00 地铁1号线 地铁19号线-武林广场(E口进) 往蕭山T4",
    "16:00～17:00 先行抵達T4",
    "19:35～21:30 飛機起飛前往桃園T2",
    "22:00～出關各自返家休息"
  ]
}'::jsonb
where id = '00000000-0000-0000-0000-000000000001'::uuid;

-- ========== 驗證 SOP (跑完後 curl 確認) ==========
-- curl -s "$URL/rest/v1/trips?select=id,itinerary&itinerary->>1" -H "apikey: $ANON"
--   → 應有 1 筆: itinerary key "1" 是 D1 行程 array

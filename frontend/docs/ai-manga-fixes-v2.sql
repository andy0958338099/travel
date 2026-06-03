-- ============================================================
-- AI 漫畫圖鑑 — 補 SQL v2 (先補欄位保險)
-- ============================================================

-- ── 0) 保險：補 ai_characters 可能缺的欄位 ──
alter table public.ai_characters
  add column if not exists name_en text,
  add column if not exists reference_image_url text,
  add column if not exists style_prompt text,
  add column if not exists suitable_for_tags text[] default '{}',
  add column if not exists usage_count int default 0;

-- 保險：補 travel_mangas 可能缺的欄位
alter table public.travel_mangas
  add column if not exists source_name text default '',
  add column if not exists character_id uuid,
  add column if not exists character_name text default 'Q版漫畫',
  add column if not exists panel_1_url text,
  add column if not exists panel_1_title text,
  add column if not exists panel_1_caption text,
  add column if not exists panel_2_url text,
  add column if not exists panel_2_title text,
  add column if not exists panel_2_caption text,
  add column if not exists panel_3_url text,
  add column if not exists panel_3_title text,
  add column if not exists panel_3_caption text,
  add column if not exists panel_4_url text,
  add column if not exists panel_4_title text,
  add column if not exists panel_4_caption text,
  add column if not exists short_desc text,
  add column if not exists medium_desc text,
  add column if not exists long_desc text,
  add column if not exists view_count int default 0,
  add column if not exists like_count int default 0;

-- 保險：補 manga_likes 欄位
alter table public.manga_likes
  add column if not exists user_fingerprint text,
  add column if not exists target_type text default 'photo';

-- ── 1) 建 bucket ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel-manga', 'travel-manga', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "公開讀 travel-manga" on storage.objects;
create policy "公開讀 travel-manga" on storage.objects for select to public
  using (bucket_id = 'travel-manga');

-- ── 2) Seed 8 個導遊角色 ──
insert into public.ai_characters (name, region, description, reference_image_url, style_prompt, suitable_for_tags, is_active) values
('阿布吉', 'abugi',
  '搞笑台式導遊，愛講冷笑話但很實用',
  '/characters/abugi.png',
  'a friendly chubby Asian man tour guide, black sunglasses, baseball cap worn backwards, holding a small Taiwan flag, big warm smile, casual t-shirt, vibrant colorful manga illustration',
  array['taiwan','temple','nightmarket','street'],
  true),

('台灣導遊', 'taiwan',
  '熱情的台灣女孩，詳細解說在地文化',
  '/characters/taiwan-guide.png',
  'a young Taiwanese woman tour guide, long brown hair, casual modern outfit, warm friendly smile, holding a clipboard, soft watercolor illustration style',
  array['taiwan','culture','history','food'],
  true),

('日本導遊', 'japan',
  '優雅的京都藝伎，細膩介紹寺廟與祭典',
  '/characters/japan-guide.png',
  'a Japanese woman in elegant traditional kimono, traditional Japanese hairstyle with ornaments, serene graceful expression, ukiyo-e meets modern anime style, soft pink and gold tones',
  array['japan','temple','cherry','traditional'],
  true),

('韓國導遊', 'korea',
  '時尚首爾女生，推薦潮流景點與美食',
  '/characters/korea-guide.png',
  'a trendy Korean woman, K-pop idol inspired look, colorful pastel hair, modern streetwear, cute pose with peace sign, kawaii anime style, neon accent colors',
  array['korea','modern','cafe','kpop'],
  true),

('歐洲導遊', 'europe',
  '古典歐洲紳士，深度講解建築歷史',
  '/characters/europe-guide.png',
  'a distinguished elderly European gentleman tour guide, top hat, monocle, tweed jacket with bowtie, holding an antique rolled map, vintage storybook illustration style, warm sepia tones',
  array['europe','castle','cathedral','museum'],
  true),

('歷史人物', 'history',
  '根據景點自動切換：孔子/拿破崙/蘇軾等',
  '/characters/historical.png',
  'a wise ancient Chinese scholar, long white beard, traditional Hanfu robe, holding a bamboo scroll, classical Chinese ink painting meets manga style, muted elegant colors',
  array['history','ancient','classical','heritage'],
  true),

('可愛動物', 'cute',
  '吉祥物風格：貓熊/柴犬/貓咪任選',
  '/characters/cute-mascot.png',
  'an adorable cartoon panda mascot character wearing a tiny tour guide uniform and hat, big sparkly eyes, super kawaii style, soft rounded shapes, vibrant colors',
  array['cute','family','kids','zoo'],
  true),

('Q版漫畫', 'qstyle',
  '純 Q版漫畫風，最通用預設',
  '/characters/qstyle.png',
  'chibi super-deformed manga character, simple round head, large expressive eyes, 2-head-tall proportions, neutral standing pose, simple lineart, bright flat colors, versatile neutral design',
  array['any','default','versatile'],
  true)
on conflict (name) do update set
  reference_image_url = excluded.reference_image_url,
  style_prompt = excluded.style_prompt,
  description = excluded.description,
  is_active = excluded.is_active,
  suitable_for_tags = excluded.suitable_for_tags;

-- ── 3) view_count RPC ──
create or replace function public.increment_view_count(p_manga_id uuid)
returns void language sql as $$
  update public.travel_mangas
  set view_count = view_count + 1
  where id = p_manga_id;
$$;

-- ── 4) 確認結果 ──
select 'buckets:' as info, count(*)::text as value from storage.buckets where id = 'travel-manga'
union all
select 'ai_characters:' as info, count(*)::text as value from public.ai_characters;

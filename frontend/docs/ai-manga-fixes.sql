-- ============================================================
-- AI 漫畫圖鑑 — 補 SQL
-- 在 Supabase SQL Editor 跑這段
-- 2026-06-03
-- ============================================================

-- ── 1) 建 bucket ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('travel-manga', 'travel-manga', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- 公開讀 policy（先 drop 避免重複）
drop policy if exists "公開讀 travel-manga" on storage.objects;
create policy "公開讀 travel-manga" on storage.objects for select to public
  using (bucket_id = 'travel-manga');

-- ── 2) Seed 8 個導遊角色 ──
-- reference_image_url 指向 /public/characters/，部署後用 NEXT_PUBLIC_SITE_URL 拼接
-- 因為 MiniMax subject_reference 需要可訪問 URL，先用 data URL 在 server 端轉換
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
  is_active = excluded.is_active;

-- ── 3) view_count trigger (讓單個頁面 view++ 自動 +1) ──
create or replace function public.increment_view_count(p_manga_id uuid)
returns void language sql as $$
  update public.travel_mangas
  set view_count = view_count + 1
  where id = p_manga_id;
$$;

-- ── 4) 確認結果 ──
select 'buckets:' as info, count(*)::text as value from storage.buckets where id = 'travel-manga'
union all
select 'ai_characters:' as info, count(*)::text as value from public.ai_characters
union all
select 'travel_mangas:' as info, count(*)::text as value from public.travel_mangas;

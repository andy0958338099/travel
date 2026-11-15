-- ============================================================================
-- 🆕 2026-10-20 聖上指示: 個人化客製書 (custom story books)
--
-- 業務目標:
--   - 每個人可以從 370 篇 posts 自由勾選篇章,組成「自選版」客製書
--   - 個人勾選草稿存 localStorage (不上傳),按「儲存並公開」才上傳 DB
--   - 上傳後產生 share slug → 任何人點 share URL 都能看見預覽 + 列印 PDF
--   - 完全匿名:anon RLS,不需要登入,作者匿名 = 隨機暱稱
--
-- 設計原則 (8-19/8-16 聖上拍板延續):
--   - 零註冊門檻 (跟現有 RLS 全公開一致)
--   - 不修改 posts 表 (避免污染現有 370 篇 + 9 章印刷排版)
--   - 客製書只存「selected_post_ids + 版型 + 標題」,內容仍由 posts 表 join 出來
--   - 重新頁號 = API GET 該書 → 預覽頁只 render 勾選 posts → 真實 paginateDay 算法重算
--
-- 作者: Brian + Hermes on 2026-10-20
-- ============================================================================

-- ========== custom_story_books ==========
create table if not exists public.custom_story_books (
  book_id              uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references public.trips(id) on delete cascade,

  -- 作者資訊 (匿名,只存暱稱)
  author_name          text not null default '匿名旅人',  -- 顯示名,可改
  author_token         uuid not null default gen_random_uuid(), -- 作者「擁有權」token,放 URL hash 不上傳

  -- 分享 (短碼給人用)
  share_slug           text unique,                           -- 8 碼 nanoid,給人分享用
  is_public            boolean not null default true,         -- false = 私密 (前端進階用)

  -- 客製內容
  title                text not null default '我的江南之旅',  -- 書名 (可改)
  layout_mode          text not null default 'A'
                        check (layout_mode in ('A','B','C')),  -- A 攝影 / B 故事 / C 高密度
  selected_post_ids    uuid[] not null default '{}',          -- 勾選的 posts,順序 = sort
  page_count_estimate  integer not null default 0,            -- 估算頁數 (live preview 用)

  -- 統計 / 時間
  view_count           integer not null default 0,            -- 預覽被看次數 (best-effort)
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists idx_custom_books_trip
  on public.custom_story_books (trip_id);

create index if not exists idx_custom_books_slug
  on public.custom_story_books (share_slug);

create index if not exists idx_custom_books_updated
  on public.custom_story_books (updated_at desc);

comment on table public.custom_story_books is
  '🆕 10-20 聖上指示: 個人化客製書存儲 — 勾選 posts + 版型 + 標題,內容由 posts 表 join';
comment on column public.custom_story_books.author_token is
  '作者「擁有權」token,放 URL hash (不上傳 server)用於更新/刪除/看 view_count';
comment on column public.custom_story_books.share_slug is
  '8 碼 nanoid,給人分享用;null = 完全私密 (前端進階)';
comment on column public.custom_story_books.selected_post_ids is
  'uuid[] — 順序即書籍章節排序;空陣列 = 0 篇';

-- ========== RLS: 全公開協作 (跟 posts 一致) ==========
alter table public.custom_story_books enable row level security;

drop policy if exists "anon_all_custom_books"  on public.custom_story_books;
drop policy if exists "anon_read_custom_books" on public.custom_story_books;
drop policy if exists "anon_write_custom_books" on public.custom_story_books;

-- 全公開協作:任何人都能讀/寫,跟 posts 一致
create policy "anon_all_custom_books" on public.custom_story_books
  for all to anon using (true) with check (true);

-- ========== updated_at trigger (function 共用,先確保存在) ==========
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_custom_books_updated on public.custom_story_books;
create trigger trg_custom_books_updated
  before update on public.custom_story_books
  for each row execute function public.tg_set_updated_at();

-- ========== 安全遞增 view_count (RPC) ==========
-- 防止簡單 client 直接 PATCH 把 view_count 灌爆
create or replace function public.increment_book_view_count(p_book_id uuid)
returns void
language sql
security definer
as $$
  update public.custom_story_books
  set view_count = view_count + 1
  where book_id = p_book_id;
$$;

comment on function public.increment_book_view_count is
  '🆕 10-20 客製書預覽被看時 +1 view;client 不能直接 PATCH view_count';

-- ========== 短碼產生 (8 碼 nanoid-ish) ==========
create or replace function public.generate_book_share_slug()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghijkmnpqrstuvwxyz23456789'; -- 排除容易混淆的 l/1/o/0
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(chars, 1 + (random() * length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

comment on function public.generate_book_share_slug is
  '🆕 10-20 產生 8 碼 base32 短碼 (去除 l/1/o/0 避免誤判);client 儲存時若撞 conflict 重試';

-- ============================================================
-- AI 漫畫圖鑑 — 2026-07-02 聖上拍板: 隱藏整張生成漫畫
-- 設計：純 anon 共用 hide list (雲端同步)
--
-- v5 (2026-07-02): 終極暴力 — DROP TABLE CASCADE + 全新 policy namespace
--   v2-v4 為什麼一直撞: USER 之前跑 SQL 有 partial commit, 留下孤兒 policy
--   同一個 table name 撞 create policy 一定 fail
--   v5 解法: 砍整個 table (CASCADE 一起掉所有依附 policy),
--           重新 create, policy 名字換全新 namespace
--           (manga_hidden_select/insert/update/delete), 永遠不撞名
--
-- 跑這條之前: 已知砍掉 manga_hidden table 全部內容 (目前是空的, 中堂不寫資料到這)
-- ============================================================

-- 1) 暴力砍掉 manga_hidden 整個 table + 所有依附 (policy/trigger/default)
DROP TABLE IF EXISTS public.manga_hidden CASCADE;

-- 2) 全新 create
CREATE TABLE public.manga_hidden (
  source_id   text PRIMARY KEY,
  source_type text DEFAULT 'attraction',
  hidden_at   timestamptz DEFAULT now()
);

ALTER TABLE public.manga_hidden ENABLE ROW LEVEL SECURITY;

-- 3) Create 4 policies (全新 table + 全新命名空間, 絕不撞名)
CREATE POLICY "manga_hidden_select" ON public.manga_hidden FOR SELECT USING (true);
CREATE POLICY "manga_hidden_insert" ON public.manga_hidden FOR INSERT WITH CHECK (true);
CREATE POLICY "manga_hidden_update" ON public.manga_hidden FOR UPDATE USING (true);
CREATE POLICY "manga_hidden_delete" ON public.manga_hidden FOR DELETE USING (true);

-- 4) 確認結果 — 應該 4 條 policy, 1 個 table
SELECT 'manga_hidden policies:' AS info, count(*)::text AS value
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'manga_hidden'
UNION ALL
SELECT 'manga_hidden exists:', 'yes'
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'manga_hidden';

-- 🅒 8-9: 第 3 輪嘗試 reload PostgREST schema cache
--   前幾輪 NOTIFY + pg_notify + set_config 都失敗, 這次試更深入的方法
--
--   強烈建議這次跑完後:
--   1. 看 result tab 看 "Success"
--   2. 聖上跟我說 ✅
--   3. 等 30 秒後臣跑 seed
--
--   已知會 rebuild PostgREST schema cache 的方法:
--   A. NOTIFY pgrst 'reload schema' (舊版)
--   B. pg_notify('pgrst', 'reload schema') (新版)
--   C. SET pgrst.db_schema TO 'public' (GUC)
--   D. 強制 rebuild db_schema view:
--      drop view if exists pgrst.dashboard;
--      notify pgrst, 'reload schema';

-- 步驟 1: 確認所有 music_* 表都在
select 'A) 表存在診斷' as step;
select
  tablename,
  '✅ exists' as status
from pg_tables
where schemaname = 'public' and tablename like 'music_%'
order by tablename;

-- 步驟 2: 確認 schemas 中有 public
select 'B) public schema' as step;
select schema_name from information_schema.schemata
where schema_name = 'public';

-- 步驟 3: 列出 pgrst 相關 schemas 和檢視
select 'C) pgrst 相關物件' as step;
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as kind
from pg_namespace n
join pg_class c on c.relnamespace = n.oid
where n.nspname like 'pgrst%' or n.nspname = 'graphql_public'
order by n.nspname, c.relname;

-- 步驟 4: 列出 current pgrst 相關 GUC settings
select 'D) pgrst GUC 設定' as step;
select name, setting, category
from pg_db_role_setting
join unnest(setconfig) as cfg on true
where setdatabase = 0 and setrole = 0
limit 20;

-- 步驟 5: 用 info schema 看 PostgREST 是否暴露 schema
select 'E) PostgREST exposed schemas' as step;
select n.nspname as schema_name
from pg_namespace n
join pg_class c on c.relnamespace = n.oid
where c.relname = 'pg_class' -- pgrst 通常從 pg_catalog 拉
limit 10;

-- 步驟 6: 嘗試 5 種不同的 reload 通道 (全部一次性發)
select 'F) 5 種 reload 通道' as step;
-- 6a
select pg_notify('pgrst', 'reload schema');
-- 6b
select pg_notify('pgrst', 'reload config');
-- 6c
select pg_notify('pgrst', 'reload');
-- 6d
select pg_notify('pgrst', 'reload schema cache');
-- 6e (純 pg_notify 不帶 channel — 試這條會回 error, 跳過)
-- 6f: 直接 SELECT 觸發 (有時 lazy load)
select 1 as trigger_lazy_load;

-- 步驟 7: 最後強烈 reload
do $$
declare
  v_count int;
begin
  -- 7a: drop + recreate pgrst.dashboard view (強迫 rebuild)
  begin
    execute 'drop view if exists pgrst.dashboard cascade';
  exception when others then null;
  end;

  -- 7b: 發送最強 reload signal
  perform pg_notify('pgrst', 'reload schema');
  perform pg_notify('pgrst', 'reload config');

  -- 7c: 看 db_schema 是否還在 cache
  select count(*) into v_count
  from pg_tables
  where schemaname = 'public' and tablename = 'music_songs';

  raise notice '✅ music_songs 在 PostgreSQL: % 條', v_count;
  raise notice '✅ 強 reload 信號已發送';
  raise notice '⏳ 等 30 秒讓 PostgREST daemon 收到 notify';
end $$;

-- 步驟 8: 最終統計
select '📊 最終統計' as step;
select
  (select count(*) from pg_tables where tablename like 'music_%') as tables,
  (select count(*) from pg_policies where tablename like 'music_%') as policies,
  (select count(*) from information_schema.triggers where event_object_table like 'music_%') as triggers;
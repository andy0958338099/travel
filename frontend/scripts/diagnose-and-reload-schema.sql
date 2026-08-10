-- 🅒 8-9: 聖上跑 schema SQL 但 PostgREST 404, 給你這條 SQL 同時做 3 件事:
--   1. 診斷: 確認表真的存在於 PostgreSQL
--   2. 真 reload: pg_notify 用 Supabase 內建 channel
--   3. 驗證: 列出 music 相關物件

-- 步驟 1: 確認 music_songs / music_votes 表真的存在於 PostgreSQL
select '✅ 表存在性診斷' as step;
select
  schemaname,
  tablename,
  tableowner
from pg_tables
where tablename in ('music_songs', 'music_votes')
order by tablename;

-- 步驟 2: 列出 music_songs 欄位 (確認 schema 完整)
select '✅ music_songs schema 細節' as step;
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'music_songs'
order by ordinal_position;

-- 步驟 3: 確認 trigger function + trigger 存在
select '✅ trigger 物件' as step;
select trigger_name, event_manipulation, event_object_table, action_timing
from information_schema.triggers
where event_object_table in ('music_songs', 'music_votes')
order by trigger_name;

-- 步驟 4: 列出 RLS policies
select '✅ RLS policies' as step;
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('music_songs', 'music_votes')
order by tablename, policyname;

-- 步驟 5: 嘗試多個 PostgREST reload 通道 (新版 Supabase 可能用 pg_notify)
select '🔄 嘗試 reload PostgREST schema cache' as step;
do $$
begin
  -- 5a: pg_notify 用 'pgrst' channel (Supabase managed PostgREST 標準)
  perform pg_notify('pgrst', 'reload schema');
  raise notice '✅ pg_notify(pgrst, reload schema) 已發送';
exception when others then
  raise notice '❌ pg_notify 失敗: %', sqlerrm;
end $$;

-- 5b: 用 db_schema GUC 強迫 reload (新版 PostgREST 支援)
do $$
begin
  perform set_config('pgrst.db_schema', 'public', false);
  raise notice '✅ pgrst.db_schema=public 已設定';
exception when others then
  raise notice '❌ set_config 失敗: %', sqlerrm;
end $$;

-- 步驟 6: 再次發送 reload
select pg_notify('pgrst', 'reload schema') as "5b: 第二次 NOTIFY";
select pg_notify('pgrst', 'reload config') as "5c: 第三次 (reload config)";
do $$
begin
  perform pg_notify('pgrst', 'reload');
  raise notice '✅ pg_notify(pgrst, reload) 已發送';
end $$;

-- 步驟 7: 最後通知 + 統計
select '📊 統計' as step;
select
  (select count(*) from pg_tables where tablename like 'music_%') as tables,
  (select count(*) from pg_policies where tablename like 'music_%') as policies,
  (select count(*) from information_schema.triggers where event_object_table like 'music_%') as triggers;

-- ====================================================
-- 跑完預期結果 (10-30 秒後 PostgREST 應 reload):
--   ✅ tables: 2 (music_songs + music_votes)
--   ✅ policies: 6 (1 music_songs + 5 music_votes)
--   ✅ triggers: 1 (trg_update_song_votes_count on music_votes)
-- ====================================================

-- 跑完這 SQL 後, 等 10-30 秒, 然後跑:
--   cd /Volumes/Transcend/manga-studio/frontend && node scripts/seed-music-songs.mjs

-- 如果還是 404, 請聖上去 Dashboard:
--   Settings > API > PostgREST 區塊 > 點 "Restart" 按鈕
--   (這是 process restart, 不是 cache refresh, 真的會 reload)
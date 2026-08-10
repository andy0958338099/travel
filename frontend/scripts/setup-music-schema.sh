#!/bin/bash
# 🅒 8-9 聖上拍板: 顯示 music schema 給聖上看, 提示如何跑
#   因為 Supabase DDL 需要 Dashboard 手動跑, 臣無法直接從 .env.local 連
#   (需要 DATABASE_URL connection string, Supabase 預設不在 env 給)
#
# 用法:
#   1. 進 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/sql/new
#   2. 貼上 src/utils/supabase/schema.sql 整段
#   3. 點 "Run"
#   4. 然後跑 scripts/seed-music-songs.mjs
#
# 本 script 只是 display 提示, 不實際跑 SQL

echo "=================================================="
echo "🎵 Supabase Music Schema Setup"
echo "=================================================="
echo ""
echo "❗ 這個 setup 需要手動在 Supabase Dashboard 跑 SQL"
echo ""
echo "步驟:"
echo "  1. 開瀏覽器到 https://supabase.com/dashboard/project/bphhksbzedadaoscjctz/sql/new"
echo "  2. 複製 src/utils/supabase/schema.sql 整段貼到 SQL Editor"
echo "  3. 點 'Run' 按鈕 (右下角)"
echo "  4. 應該看到 'Success. No rows returned' (DDL 通常不 return rows)"
echo ""
echo "SQL 內容 preview (前 40 行):"
echo "=================================================="
head -40 src/utils/supabase/schema.sql
echo ""
echo "=================================================="
echo "SQL 全文路徑: $(realpath src/utils/supabase/schema.sql)"
echo "大小: $(wc -l < src/utils/supabase/schema.sql) 行"
echo ""
echo "📊 預期 schema 內容:"
echo "  ✅ table music_songs (id, title, youtube_url, youtube_id, category, cover_url, mp3_url, description, votes, play_count, created_at, updated_at)"
echo "  ✅ table music_votes (id, song_id, user_id, vote, created_at) — unique(song_id, user_id)"
echo "  ✅ trigger trg_update_song_votes_count (自動算 songs.votes = sum(music_votes.vote))"
echo "  ✅ 5 個 RLS policies (anon 讀 music_songs + music_votes read/insert/update/delete)"
echo ""
echo "📋 預期結果驗證 (跑完 SQL 後用這個查):"
cat <<'EOF'
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'music_%';
-- 應該回: music_songs, music_votes

select trigger_name from information_schema.triggers
where event_object_table = 'music_votes';
-- 應該回: trg_update_song_votes_count

select policyname, cmd from pg_policies
where tablename in ('music_songs', 'music_votes');
-- 應該回 5 個 policies
EOF
echo ""
echo "🚀 跑完 SQL 確認成功後, 跑 seed script:"
echo "   node scripts/seed-music-songs.mjs"
echo ""
echo "❌ 如果你想讓臣試著自動化跑 SQL:"
echo "   1. 進 Supabase Dashboard > Project Settings > Database > Connection string"
echo "   2. 複製 'URI' (postgres://postgres...)"
echo "   3. 把它加到 .env.local:  DATABASE_URL=postgres://..."
echo "   4. 跟臣說, 臣用 pg 套件直連跑 SQL"
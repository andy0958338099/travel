-- 查 3 個表的實際 schema（看欄位名 + 型別）
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('ai_characters', 'travel_mangas', 'manga_likes')
order by table_name, ordinal_position;

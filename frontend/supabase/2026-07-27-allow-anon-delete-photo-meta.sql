-- 2026-07-27 聖上拍板: 開放 anon DELETE travel_photo_meta
-- 原因: 拖到 🗑️ 垃圾筒 → 永久刪除照片 metadata
-- 安全: 有 confirm modal 確認 + 只刪 travel_photo_meta, 不影響其他表
-- 同時看現有 policy 是怎麼寫的
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'travel_photo_meta';

-- 新增 anon DELETE policy (如果還沒)
DROP POLICY IF EXISTS "anon delete photo meta" ON travel_photo_meta;
CREATE POLICY "anon delete photo meta" ON travel_photo_meta
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 確認結果
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'travel_photo_meta'
ORDER BY cmd, policyname;

-- ============================================================
-- � 2026-08-19 聖上拍板 �: D1 文章 sort_order 重新編號
-- ============================================================
-- 原因: 35 篇中有 8 對重複 sort_order (72000, 73000, 78000, 32833.4245681763)
--       handleMove swap 兩篇相同 sort_order 等於沒換 → 「無法調整上下」
-- 修法: 按現有順序重新編號 1000~35000, 間隔 1000, 確保唯一且遞增
-- 影響: 34 篇更新, 1 篇 (sort=1000) 不變
-- 風險: 只改 sort_order column, 其他欄位不動
--
-- 跑法: 進 Supabase Dashboard → SQL Editor → 貼上下面 Step 2 → Run
--       https://app.supabase.com/project/wydftkqwhebwlmdbosap/editor
-- ============================================================

-- ============================================
-- Step 1 (建議): 先看當前 D1 重複分布
-- ============================================
SELECT
  sort_order,
  COUNT(*) as duplicate_count,
  array_agg(title ORDER BY created_at) as titles
FROM posts
WHERE day_number = 1
GROUP BY sort_order
HAVING COUNT(*) > 1
ORDER BY sort_order;

-- ============================================
-- Step 2: 重編號 (一次完成)
-- ============================================
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC)) * 1000 AS new_sort_order
  FROM posts
  WHERE day_number = 1
)
UPDATE posts
SET sort_order = ranked.new_sort_order
FROM ranked
WHERE posts.id = ranked.id
  AND posts.sort_order != ranked.new_sort_order;  -- 只動需要改的

-- ============================================
-- Step 3: 驗證 (應該 0 row = 無重複)
-- ============================================
SELECT sort_order, COUNT(*) AS duplicate_count
FROM posts
WHERE day_number = 1
GROUP BY sort_order
HAVING COUNT(*) > 1;

-- ============================================
-- Step 4: 確認新順序 (35 行)
-- ============================================
SELECT sort_order, title, author_name
FROM posts
WHERE day_number = 1
ORDER BY sort_order ASC;

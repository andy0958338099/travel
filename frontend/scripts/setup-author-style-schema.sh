#!/usr/bin/env bash
# ============================================================
# 🆕 2026-08-29 聖上拍板 🅒: author_style_samples 表 setup
#
# 用途: 「🅒 作者風格切換潤稿」前置資料表 (Step 1 of 3)
#
# 故事:
#   聖上 USER 偏好 (8-29)「AI 給予部落格改文字的方式, 我覺得就命名為阿喜風格,
#   至於現在其他的創作者例如雅茹/阿橋/... 他們都自己寫作有自己的風格,
#   能否後續在潤稿的時侯, 可以讓用戶選擇某位成員的創作風格來改寫呢?
#   他們現在都有許多文章應該可以當成 reference 了」
#
# Step 1: 建表 + 索引
# Step 2: 跑 build-author-style-corpus.mjs 抓 5-10 篇真文進 DB
# Step 3: /api/story-blog/polish route 從 DB 拉 few-shot 注入 prompt
#
# 聖上「等我說好再上傳github」= hard commit gate, 本 script 不寫進 git 等聖上驗證
# ============================================================

set -euo pipefail

cat <<'EOF'
═══════════════════════════════════════════════════
🆕 聖上請手動在 Supabase Dashboard SQL Editor 跑以下 DDL
═══════════════════════════════════════════════════

📍 路徑: Supabase Dashboard → SQL Editor → New query

-- ============================================================
-- author_style_samples: 「🅒 作者風格切換潤稿」reference 庫
--   - Step 2 build-author-style-corpus.mjs 寫入 (5-10 篇/作者)
--   - Step 3 /api/story-blog/polish 讀出塞進 LLM prompt
--   - 前端不直查, 由 service_role 中介
-- ============================================================

CREATE TABLE IF NOT EXISTS public.author_style_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  title text,
  day_number int,
  sort_order int,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id)  -- 同一篇不能選兩次 (冪等)
);

-- 索引: 給 /api/story-blog/polish 加速查 (by author_name + sort_order)
CREATE INDEX IF NOT EXISTS idx_author_style_samples_author
  ON public.author_style_samples(author_name, sort_order);

-- RLS: 暫不開 policy, service_role 中介 (前端不直查)
ALTER TABLE public.author_style_samples ENABLE ROW LEVEL SECURITY;

═══════════════════════════════════════════════════
✅ 跑完貼「Success. No rows returned」給臣
🚀 接著跑: node scripts/build-author-style-corpus.mjs
═══════════════════════════════════════════════════
EOF

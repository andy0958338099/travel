#!/bin/bash
# cron-takeout-auto-import.sh
# 🆕 2026-07-28 聖上拍板: Takeout 自動 import (零手動上傳流程)
#
# 聖上解壓 Google Takeout zip 到 ~/Desktop/Takeout/Google 相簿/
# 之後 cron 每天掃描, 自動跑 fix-day-from-takeout-truth.mjs --apply
#
# 用法:
#   1. 設 crontab (聖上 Mac): crontab -e → 加這行
#      0 14 * * * /Volumes/Transcend/manga-studio/frontend/scripts/cron-takeout-auto-import.sh
#      (每天 14:00 跑, 聖上下班回家電腦開著就掃)
#
#   2. 或用 Hermes cronjob (推薦, 跨平台):
#      see Hermes cron job created below
#
#   3. 聖上手動下載完 Takeout, 直接跑:
#      bash cron-takeout-auto-import.sh
#
# 設計:
#   - 比對 00-inbox 檔案 hash, 只 import 新檔 (不重複)
#   - 寫 log 到 /Volumes/Transcend/travel-archive/2026-jiangnan/import-log.txt
#   - 失敗不退出 (避免阻塞 cron)

set -e

PROJECT_DIR="/Volumes/Transcend/manga-studio/frontend"
ARCHIVE_DIR="/Volumes/Transcend/travel-archive/2026-jiangnan"
INBOX="$ARCHIVE_DIR/00-inbox"
METADATA="$ARCHIVE_DIR/05-exif-csv"
LOG="$ARCHIVE_DIR/import-log.txt"
HASH_FILE="$ARCHIVE_DIR/.imported-hashes.txt"

mkdir -p "$ARCHIVE_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

log "=== Takeout auto-import 開始 ==="

# 0. 偵測聖上 Takeout 解壓位置
#    優先: ~/Desktop/Takeout/Google 相簿/
#    fallback: $ARCHIVE_DIR/00-inbox
TAKEOUT_ROOT="$HOME/Desktop/Takeout/Google 相簿"
if [ ! -d "$TAKEOUT_ROOT" ]; then
  TAKEOUT_ROOT="$HOME/Desktop/Google 相簿"
fi
if [ ! -d "$TAKEOUT_ROOT" ]; then
  TAKEOUT_ROOT="$HOME/Downloads/Google 相簿"
fi

if [ -d "$TAKEOUT_ROOT" ]; then
  log "📂 偵測到聖上 Takeout 解壓目錄: $TAKEOUT_ROOT"
  log "   開始複製新照片到 $INBOX ..."
  # 只複製新檔 (用 rsync --ignore-existing 避免覆蓋)
  rsync -a --ignore-existing --include='*/' --include='*.HEIC' --include='*.JPG' --include='*.JPEG' --include='*.PNG' --include='*.MOV' --include='*.MP4' --include='*.json' --exclude='*' "$TAKEOUT_ROOT/" "$INBOX/"
  rsync -a --ignore-existing --include='*/' --include='*.HEIC' --include='*.JPG' --include='*.JPEG' --include='*.PNG' --include='*.MOV' --include='*.MP4' --include='*.json' --exclude='*' "$TAKEOUT_ROOT/" "$METADATA/"
  log "✅ 複製完成"
else
  log "ℹ️  $TAKEOUT_ROOT 不存在, 用當前 $INBOX (無 rsync 動作)"
fi

# 1. 比對 hash, 只 import 新檔
log "🔍 計算 inbox 檔案 hash..."
NEW_FILES=()
HASH_LIST=$(mktemp)
trap "rm -f $HASH_LIST" EXIT

# 找所有 HEIC/JPG/MOV + 對應 JSON
find "$INBOX" -type f \( -name "*.HEIC" -o -name "*.JPG" -o -name "*.JPEG" -o -name "*.PNG" -o -name "*.MOV" -o -name "*.MP4" \) | while read -r f; do
  hash=$(shasum -a 256 "$f" | awk '{print $1}')
  echo "$hash  $f" >> "$HASH_LIST"
done

# 比對, 找新檔
if [ -f "$HASH_FILE" ]; then
  comm -23 <(sort "$HASH_LIST") <(sort "$HASH_FILE") > /tmp/new-hashes.txt
  NEW_COUNT=$(wc -l < /tmp/new-hashes.txt | tr -d ' ')
else
  # 第一次跑, 全部當新檔
  sort "$HASH_LIST" > /tmp/new-hashes.txt
  NEW_COUNT=$(wc -l < /tmp/new-hashes.txt | tr -d ' ')
fi

log "📊 新檔案數: $NEW_COUNT (累計已 import: $(wc -l < "$HASH_FILE" 2>/dev/null || echo 0))"

if [ "$NEW_COUNT" -eq 0 ]; then
  log "✅ 沒有新檔案, 跳過 import"
  exit 0
fi

# 2. 跑 fix-day-from-takeout-truth.mjs (DRY RUN 先看會改幾筆)
log "🔄 跑 fix-day-from-takeout-truth.mjs (DRY RUN)..."
cd "$PROJECT_DIR"
if ! node scripts/fix-day-from-takeout-truth.mjs 2>&1 | tee -a "$LOG"; then
  log "❌ DRY RUN 失敗, 不寫 DB"
  exit 1
fi

# 3. 確認後跑 --apply
log "🔄 跑 fix-day-from-takeout-truth.mjs --apply (寫入 Supabase)..."
if ! node scripts/fix-day-from-takeout-truth.mjs --apply 2>&1 | tee -a "$LOG"; then
  log "❌ APPLY 失敗"
  exit 1
fi

# 4. 更新 hash 檔
sort "$HASH_LIST" > "$HASH_FILE"
log "✅ 已更新 $HASH_FILE"

log "=== Takeout auto-import 完成 ==="
log ""
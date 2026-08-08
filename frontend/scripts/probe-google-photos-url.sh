#!/bin/bash
# 🅒 8-9 聖上 USER 偏好質疑: 重新驗證 lh3 URL 是否真的不可用
# 之前 7-29 拍板「lh3 URL 不可信, 必須存 Supabase」, 但聖上 8-9 質疑:
#   「為何要放到 Supabase 才能正常讀取? 不能好好的放在 google 雲端相簿裡去取用嗎?」
#
# 本腳本: 重新跑 lh3 URL server-side fetch, 確認 4 種 Google Photos URL
#   1. photos.app.goo.gl (短網址)
#   2. photos.google.com/share/<id> (相簿入口)
#   3. photos.google.com/photo/AF1Qip<base64> (Takeout 給的單張)
#   4. lh3.googleusercontent.com/pw/<path> (Takeout 給的真實直連)
# 看每個能不能拿回真實 image bytes (不是 HTML SPA shell)
set -e
cd /Volumes/Transcend/manga-studio/frontend

USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# 用 photo-proxy 邏輯直接抓 (不寫 DB)
KEY=$(grep SUPABASE_SERVICE_KEY .env.local | cut -d= -f2- | tr -d "'\"" | head -1)

check_url() {
  local label="$1"
  local url="$2"
  echo ""
  echo "=== $label ==="
  echo "URL: $url"
  # server-side fetch (模擬 photo-proxy)
  result=$(curl -sL --max-time 15 -w "\n---HTTP %{http_code} | size=%{size_download} | type=%{content_type} | redirect=%{url_effective}\n" \
    -H "User-Agent: $USER_AGENT" \
    "$url" 2>&1)
  echo "$result" | head -3
  echo "---"
  # file type 判斷
  curl -sL --max-time 15 -H "User-Agent: $USER_AGENT" "$url" -o /tmp/probe.bin 2>/dev/null
  echo "File type: $(file /tmp/probe.bin | head -c 80)"
  echo "Real bytes: $(wc -c < /tmp/probe.bin)"
}

# 從聖上 paste 過的 takeout JSON 找 lh3 URL 範例
# 已知聖上 supabase DB 內 IMG_1300 是 takeout HEIC→JPEG, 但要驗證 lh3 直連 URL

# 用聖上 paste 過的 Google 相簿公開相簿 URL
PUBLIC_ALBUM="https://photos.app.goo.gl/jPL9tjmkFsewqZGHA"

# 這是 8-9 聖上 paste 過的, 曾上傳到 supabase 但內容是 HTML
OLD_LH3="https://lh3.googleusercontent.com/pw/XXXXX=w2400"

# 模擬 takeout 給的單張 URL (AF1Qip base64)
FAKE_PHOTO_URL="https://photos.google.com/photo/AF1QipOZqHjYv2KMuouXIGm7ERpHW1g-6qN0x1bCZlJsAfSDzJoCdsbQeZiC6pouh5fa3w"

echo "🔍 重新驗證 Google Photos URL 是否真的不可直接讀"
echo "=================================================="

check_url "1. 短網址 photos.app.goo.gl" "$PUBLIC_ALBUM"
check_url "2. 相簿入口 photos.google.com/share" "https://photos.google.com/share/AF1QipOZqHjYv2KMuouXIGm7ERpHW1g-6qN0x1bCZlJsAfSDzJoCdsbQeZiC6pouh5fa3w?key=ZElDVXFZX3Q4UVlUZlA4NmtQODFkdXJUMEljT3Z3"
check_url "3. Takeout 給的單張 photos.google.com/photo/AF1Qip" "$FAKE_PHOTO_URL"
check_url "4. lh3.googleusercontent.com (直接直連)" "https://lh3.googleusercontent.com/pw/AP1GczO4bMzVsX3lE5yXsZ3bC5yXsZ3bC5yXsZ3bC5yXsZ3bC5yXsZ3bC5yXsZ3=s1024"

echo ""
echo "=================================================="
echo "📋 結論判斷:"
echo "  - 如果都是 'HTML document' (Google SPA shell) → 確認 7-29 拍板, 不需改"
echo "  - 如果至少 lh3 是 JPEG image → 可改回 lh3 直連 (聖上 USER 偏好質疑成立)"
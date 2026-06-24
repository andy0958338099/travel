#!/bin/zsh
# 2026-06-24 中堂: 統一 AI 生圖 helper (nano-banana → sips 1:1 → 16:9 stretch → jpeg)
#
# 用法:
#   ./scripts/qgen.sh <output_id> <prompt> [width] [height]
#
# 例:
#   ./scripts/qgen.sh shanghai "Create a cute Q-version chibi illustration of Shanghai..."
#   ./scripts/qgen.sh xihu "Create a cute Q-version chibi illustration of West Lake..." 1920 1080
#
# 環境變數:
#   POCKGO_KEY: pockgo API key (預設用聖上提供的)
#   POCKGO_MODEL: 模型名 (預設 nano-banana)
#   POCKGO_URL: API endpoint (預設 newapi.pockgo.com)
#   POCKGO_QDIR: Q版輸出目錄 (預設 public/<page>/q/, 用 --page-dir 覆寫)

set +e

POCKGO_KEY="${POCKGO_KEY:-sk-5XyiTHMibQgPQ0iaho639nNHUIY0kS5LOGOs7T8shyXVSXC9}"
POCKGO_MODEL="${POCKGO_MODEL:-nano-banana}"
POCKGO_URL="${POCKGO_URL:-https://newapi.pockgo.com/v1/chat/completions}"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <output_id> <prompt> [width=1920] [height=1080] [--page-dir=<path>]"
  exit 1
fi

ID="$1"
PROMPT="$2"
WIDTH="${3:-1920}"
HEIGHT="${4:-1080}"

# --page-dir=<path> 解析
PAGE_DIR=""
for arg in "$@"; do
  case "$arg" in
    --page-dir=*) PAGE_DIR="${arg#--page-dir=}";;
  esac
done

# 預設輸出到 public/q/ (聖上傳的 3 個 qgen 各自 mv 到正確目錄)
if [ -z "$PAGE_DIR" ]; then
  PAGE_DIR="public/q"
fi

mkdir -p "$PAGE_DIR"

PNG="$PAGE_DIR/${ID}.png"
JPG="$PAGE_DIR/${ID}.jpg"
LOG="$PAGE_DIR/${ID}.log"
TMP="/tmp/qgen-${ID}.json"

echo "=== T0 $(date +%H:%M:%S) ${ID} start ===" > "$LOG"
echo "model: $POCKGO_MODEL, url: $POCKGO_URL" >> "$LOG"
echo "prompt: $PROMPT" >> "$LOG"
echo "---" >> "$LOG"

# build JSON body safely via jq (handles quotes)
BODY=$(jq -nc --arg p "$PROMPT" --arg m "$POCKGO_MODEL" '{model:$m, messages:[{role:"user", content:$p}]}')

# 2026-06-23 同其他 qgen pattern: retry 3 次
ATTEMPT=0
MAX=3
T0=$(date +%s)
HTTP="000"
while [ $ATTEMPT -lt $MAX ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "--- attempt=$ATTEMPT/$MAX at $(date +%H:%M:%S) ---" >> "$LOG"
  HTTP=$(curl -s -o "$TMP" -w "%{http_code}" \
    -X POST "$POCKGO_URL" \
    -H "Authorization: Bearer $POCKGO_KEY" -H "Content-Type: application/json" \
    -d "$BODY" \
    --max-time 90)
  echo "http: $HTTP" >> "$LOG"
  if [ "$HTTP" = "200" ]; then
    break
  fi
  head -c 500 "$TMP" >> "$LOG"
  echo "" >> "$LOG"
  if [ $ATTEMPT -lt $MAX ]; then sleep 3; fi
done

if [ "$HTTP" != "200" ]; then
  echo "=== FAILED ===" >> "$LOG"
  exit 1
fi

# extract image URL from markdown response
URL_IMG=$(python3 -c "
import json, re
d = json.load(open('$TMP'))
content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
m = re.search(r'!\[[^\]]*\]\((https?://[^\)\s]+)\)', content)
print(m.group(1) if m else '')
")
if [ -z "$URL_IMG" ]; then
  echo "no image URL in response" >> "$LOG"
  head -c 500 "$TMP" >> "$LOG"
  echo "" >> "$LOG"
  exit 1
fi
echo "img URL: $URL_IMG" >> "$LOG"
curl -sL "$URL_IMG" -o "$PNG" >> "$LOG" 2>&1

# 1:1 → target aspect ratio stretch + jpeg encode
sips -z "$HEIGHT" "$WIDTH" "$PNG" --out "${PNG}.tmp.png" >/dev/null 2>&1
sips -s format jpeg "${PNG}.tmp.png" --out "$JPG" >/dev/null 2>&1
rm -f "${PNG}.tmp.png" "$PNG"
T1=$(date +%s)
SIZE=$(stat -f%z "$JPG" 2>/dev/null || wc -c < "$JPG" | tr -d ' ')
echo "size: $SIZE bytes, dimensions: ${WIDTH}x${HEIGHT}, elapsed: $((T1-T0))s" >> "$LOG"
echo "=== T+$((T1-T0))s: DONE $JPG ===" >> "$LOG"
rm -f "$TMP"

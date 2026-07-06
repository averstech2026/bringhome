#!/usr/bin/env bash
# Деплой API распознавания в Yandex Cloud Functions (работает в РФ без VPN).
#
# Требуется: yc CLI (https://yandex.cloud/ru/docs/cli/quickstart)
#   yc init
#
# Использование:
#   YANDEX_API_KEY=... YANDEX_FOLDER_ID=b1gopp0dfgdbi9fv8c00 ./scripts/deploy-yandex-parse.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNCTION_NAME="${YC_PARSE_FUNCTION_NAME:-bringhome-parse}"
RUNTIME="${YC_PARSE_RUNTIME:-nodejs22}"
FOLDER_ID="${YANDEX_FOLDER_ID:?Set YANDEX_FOLDER_ID}"
API_KEY="${YANDEX_API_KEY:?Set YANDEX_API_KEY}"

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT

# Yandex Cloud Functions загружает только содержимое архива — копируем shared-код.
cp "$ROOT/yandex-cloud/parseProducts/index.js" "$STAGE_DIR/"
cp "$ROOT/yandex-cloud/parseProducts/package.json" "$STAGE_DIR/"
cp "$ROOT/functions/yandexGpt.js" "$STAGE_DIR/yandexGpt.js"

yc serverless function create --name "$FUNCTION_NAME" 2>/dev/null || true

yc serverless function version create \
  --function-name "$FUNCTION_NAME" \
  --runtime "$RUNTIME" \
  --entrypoint index.handler \
  --memory 256m \
  --execution-timeout 30s \
  --source-path "$STAGE_DIR" \
  --environment "YANDEX_API_KEY=${API_KEY},YANDEX_FOLDER_ID=${FOLDER_ID}"

yc serverless function allow-unauthenticated-invoke "$FUNCTION_NAME" 2>/dev/null || true

FUNCTION_ID="$(yc serverless function get "$FUNCTION_NAME" --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
URL="https://functions.yandexcloud.net/${FUNCTION_ID}"

echo ""
echo "Готово. Добавьте в GitHub Secrets:"
echo "  VITE_YANDEX_PARSE_URL=${URL}"
echo ""
echo "Затем перезапустите Deploy to GitHub Pages."

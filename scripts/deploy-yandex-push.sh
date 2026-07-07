#!/usr/bin/env bash
# Деплой прокси отправки push (FCM HTTP v1) в Yandex Cloud Functions.
# Держит service account на сервере — приватный ключ не попадает в клиентский бандл.
#
# Требуется: yc CLI (https://yandex.cloud/ru/docs/cli/quickstart), затем `yc init`.
#
# Использование:
#   FCM_SERVICE_ACCOUNT_FILE=./serviceAccount.json \
#   YANDEX_FOLDER_ID=b1gopp0dfgdbi9fv8c00 \
#   ./scripts/deploy-yandex-push.sh
#
# serviceAccount.json: Firebase Console → Project settings → Service accounts →
#   Generate new private key. НЕ коммить этот файл.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FUNCTION_NAME="${YC_PUSH_FUNCTION_NAME:-bringhome-push}"
RUNTIME="${YC_PUSH_RUNTIME:-nodejs22}"
FOLDER_ID="${YANDEX_FOLDER_ID:?Set YANDEX_FOLDER_ID}"
SA_FILE="${FCM_SERVICE_ACCOUNT_FILE:?Set FCM_SERVICE_ACCOUNT_FILE (path to Firebase service account JSON)}"

if [ ! -f "$SA_FILE" ]; then
  echo "Файл service account не найден: $SA_FILE" >&2
  exit 1
fi

# base64 без переносов строк (совместимо с Linux/macOS).
SA_B64="$(base64 < "$SA_FILE" | tr -d '\n')"

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT

cp "$ROOT/yandex-cloud/sendPush/index.js" "$STAGE_DIR/"
cp "$ROOT/yandex-cloud/sendPush/package.json" "$STAGE_DIR/"

yc serverless function create --name "$FUNCTION_NAME" 2>/dev/null || true

yc serverless function version create \
  --function-name "$FUNCTION_NAME" \
  --runtime "$RUNTIME" \
  --entrypoint index.handler \
  --memory 256m \
  --execution-timeout 30s \
  --source-path "$STAGE_DIR" \
  --environment "FCM_SERVICE_ACCOUNT_B64=${SA_B64}"

yc serverless function allow-unauthenticated-invoke "$FUNCTION_NAME" 2>/dev/null || true

FUNCTION_ID="$(yc serverless function get "$FUNCTION_NAME" --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
URL="https://functions.yandexcloud.net/${FUNCTION_ID}"

echo ""
echo "Готово. Добавьте в GitHub Secrets и локальный .env:"
echo "  VITE_YANDEX_PUSH_URL=${URL}"
echo ""
echo "Затем перезапустите Deploy to GitHub Pages."

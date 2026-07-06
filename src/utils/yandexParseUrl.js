const PARSE_REGION = 'europe-west1';
const PARSE_FUNCTION = 'parseProducts';

/** Локально — Vite-прокси; в проде — Cloud Function Firebase. */
export function resolveYandexParseUrl() {
  const configured = import.meta.env.VITE_YANDEX_PARSE_URL;

  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, '');
  }

  if (import.meta.env.PROD && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return `https://${PARSE_REGION}-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/${PARSE_FUNCTION}`;
  }

  return configured || '/api/yandex/parse';
}

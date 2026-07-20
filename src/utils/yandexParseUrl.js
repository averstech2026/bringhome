/** Локально — Vite-прокси; в проде — Yandex Cloud Functions (VITE_YANDEX_PARSE_URL). */
export function resolveYandexParseUrl() {
  // В dev всегда локальный middleware с актуальным yandexGpt.js
  // (иначе .env с прод-URL бьёт в старый Cloud Function без shopping-create).
  if (import.meta.env.DEV) {
    return '/api/yandex/parse';
  }

  const configured = import.meta.env.VITE_YANDEX_PARSE_URL;

  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, '');
  }

  return configured || '/api/yandex/parse';
}

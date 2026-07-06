/** Локально — Vite-прокси; в проде — URL Cloudflare Worker (VITE_YANDEX_PARSE_URL). */
export function resolveYandexParseUrl() {
  const configured = import.meta.env.VITE_YANDEX_PARSE_URL;

  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/$/, '');
  }

  return configured || '/api/yandex/parse';
}

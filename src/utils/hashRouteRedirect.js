/**
 * HashRouter не обрабатывает pathname вида /list/:id — только #/list/:id.
 * Перенаправляем «битые» ссылки (без #), если пользователь открыл их напрямую.
 */
export function redirectBrokenListPathToHashRoute() {
  const { pathname, search, hash } = window.location;
  if (hash.startsWith('#/')) return false;

  const match = pathname.match(/\/list\/([^/]+)\/?$/);
  if (!match) return false;

  const base = import.meta.env.BASE_URL || '/';
  const prefix = `${window.location.origin}${base.endsWith('/') ? base : `${base}/`}`;
  const listId = match[1];
  window.location.replace(`${prefix}#/list/${listId}${search}`);
  return true;
}

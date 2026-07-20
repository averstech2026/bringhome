/** Рабочие столы главного экрана (горизонтальный пейджер). */

const LEGACY_APP_SETTINGS_KEY = 'bringhome.appSettings';
const DEFAULT_HOME_DESKTOP_CACHE_PREFIX = 'bringhome_default_home_desktop_';

export const HOME_DESKTOP = {
  SHOPPING: 'shopping',
  TRAVEL: 'travel',
};

export const HOME_DESKTOP_OPTIONS = [
  {
    id: HOME_DESKTOP.SHOPPING,
    label: 'Список покупок',
    shortLabel: 'Покупки',
    index: 0,
  },
  {
    id: HOME_DESKTOP.TRAVEL,
    label: 'Список сборов',
    shortLabel: 'Сборы',
    index: 1,
  },
];

export const HOME_DESKTOP_COUNT = HOME_DESKTOP_OPTIONS.length;

export const DEFAULT_HOME_DESKTOP_CHANGE_EVENT = 'user-default-home-desktop-change';

/** Сколько пикселей соседнего стола «выглядывает» с края (edge-peek). */
export const HOME_DESKTOP_PEEK_PX = 12;

export function homeDesktopToIndex(desktopId) {
  return desktopId === HOME_DESKTOP.TRAVEL ? 1 : 0;
}

export function homeDesktopFromIndex(index) {
  return index === 1 ? HOME_DESKTOP.TRAVEL : HOME_DESKTOP.SHOPPING;
}

export function normalizeHomeDesktop(value) {
  return value === HOME_DESKTOP.TRAVEL ? HOME_DESKTOP.TRAVEL : HOME_DESKTOP.SHOPPING;
}

export function getCachedDefaultHomeDesktop(userId) {
  if (!userId || typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(`${DEFAULT_HOME_DESKTOP_CACHE_PREFIX}${userId}`);
  if (raw == null) return null;
  return normalizeHomeDesktop(raw);
}

export function setCachedDefaultHomeDesktop(userId, desktopId) {
  if (!userId || typeof localStorage === 'undefined') return;
  localStorage.setItem(
    `${DEFAULT_HOME_DESKTOP_CACHE_PREFIX}${userId}`,
    normalizeHomeDesktop(desktopId),
  );
}

function readLegacyDefaultHomeDesktop() {
  if (typeof localStorage === 'undefined') return HOME_DESKTOP.SHOPPING;
  try {
    const raw = localStorage.getItem(LEGACY_APP_SETTINGS_KEY);
    if (!raw) return HOME_DESKTOP.SHOPPING;
    const parsed = JSON.parse(raw);
    return normalizeHomeDesktop(parsed.defaultHomeDesktop);
  } catch {
    return HOME_DESKTOP.SHOPPING;
  }
}

/** Профиль → per-user cache → legacy localStorage → shopping. */
export function resolveDefaultHomeDesktop(profile, userId) {
  if (profile?.defaultHomeDesktop != null) {
    const resolved = normalizeHomeDesktop(profile.defaultHomeDesktop);
    if (userId) setCachedDefaultHomeDesktop(userId, resolved);
    return resolved;
  }

  if (userId) {
    const cached = getCachedDefaultHomeDesktop(userId);
    if (cached) return cached;
  }

  return readLegacyDefaultHomeDesktop();
}

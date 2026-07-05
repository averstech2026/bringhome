const STORAGE_KEY = 'bringhome:repeat-draft';

/** In-memory кэш переживает remount в React Strict Mode */
let memoryCache = null;

export function saveRepeatDraft({ repeatItems, repeatFrom, type }) {
  const payload = { repeatItems, repeatFrom, type };
  memoryCache = payload;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function peekRepeatDraft() {
  if (memoryCache) return memoryCache;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    memoryCache = JSON.parse(raw);
    return memoryCache;
  } catch {
    return null;
  }
}

export function clearRepeatDraft() {
  memoryCache = null;
  sessionStorage.removeItem(STORAGE_KEY);
}

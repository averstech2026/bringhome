import { HOME_DESKTOP, normalizeHomeDesktop } from './homeDesktops';

const STORAGE_KEY = 'bringhome.appSettings';

const DEFAULTS = {
  groupByDate: false,
  /** Стартовый рабочий стол главной: shopping | travel */
  defaultHomeDesktop: HOME_DESKTOP.SHOPPING,
};

export function getAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
    parsed.defaultHomeDesktop = normalizeHomeDesktop(parsed.defaultHomeDesktop);
    return parsed;
  } catch {
    return { ...DEFAULTS };
  }
}

export function setAppSetting(key, value) {
  const settings = { ...getAppSettings(), [key]: value };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('app-settings-change', { detail: settings }));
  return settings;
}

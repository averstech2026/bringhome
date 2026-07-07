const STORAGE_KEY = 'bringhome.appSettings';

const DEFAULTS = {
  groupByDate: false,
};

export function getAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
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

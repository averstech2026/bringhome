/** Рабочие столы главного экрана (горизонтальный пейджер). */

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
    label: 'Списки сборов',
    shortLabel: 'Сборы',
    index: 1,
  },
];

export const HOME_DESKTOP_COUNT = HOME_DESKTOP_OPTIONS.length;

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

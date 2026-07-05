/**
 * Единый стиль карточек — ориентир: ListCard на главном экране.
 * Мягкий «парящий» объём без жёстких стандартных shadow.
 */

/** Подложка приложения — как на главном экране */
export const APP_BACKGROUND = 'bg-[#f5f5f7]';

export const APP_HEADER = 'bg-[#f5f5f7]/90 backdrop-blur-md';
export const CARD_SURFACE =
  'rounded-2xl border border-gray-50/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]';

/** Компактные отступы как у плашки списка на главной */
export const CARD_PAD = 'px-3 py-2';

/** Чуть просторнее — для блоков с формой */
export const CARD_PAD_V = 'px-3 py-3';

export const CARD_INNER = 'px-1 py-1.5';

export const CARD_TITLE = 'truncate font-medium text-slate-800';

export const CARD_BADGE = 'shrink-0 text-xs font-medium';

export const PAGE_SECTION_TITLE = 'text-[17px] font-bold text-slate-900';

export const PAGE_X = 'px-4';

export const STICKY_TOP =
  'sticky top-0 z-50 border-b border-gray-200/40 bg-white/90 backdrop-blur-md';

export const ZONE_TITLE = 'font-sans text-sm font-bold text-gray-900';

/** @deprecated используйте ZONE_TITLE */
export const SECTION_TITLE = ZONE_TITLE;

export const HINT_TEXT = 'text-left text-sm text-gray-400';

export const INPUT_PLACEHOLDER =
  'placeholder:text-left placeholder:text-sm placeholder:text-gray-400/90';

/** Интерактивное нажатие — как у карточки-ссылки на главной */
export const CARD_PRESS = 'transition active:scale-[0.99]';

export const PRIMARY_BTN =
  'w-full rounded-full bg-emerald-500 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all duration-150 hover:bg-emerald-600 hover:shadow-[0_6px_20px_rgba(16,185,129,0.38)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100';

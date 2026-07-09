export const UI_THEME_IDS = ['default', 'hogwarts', 'star_wars'];

export const PROFILE_THEME_OPTIONS = [
  { id: 'default', label: 'Обычная' },
  { id: 'hogwarts', label: 'Магия Хогвартса ✨' },
  { id: 'star_wars', label: 'Путь Джедая 🌌' },
];

export const UI_THEMES = {
  default: {
    id: 'default',
    label: 'Дефолт',
    description: 'Стандартный интерфейс BringHome',
  },
  hogwarts: {
    id: 'hogwarts',
    label: 'Гарри Поттер',
    description: 'Магическая пасхалка для детей',
  },
  star_wars: {
    id: 'star_wars',
    label: 'Звёздные войны',
    description: 'Сила распознавания списков',
  },
};

export const DEFAULT_SURFACE_CLASS = 'bg-gradient-to-r from-violet-600 to-indigo-600';
export const HOGWARTS_SURFACE_CLASS = 'bg-gradient-to-r from-red-950 via-red-900 to-amber-600';
export const STAR_WARS_SURFACE_CLASS = 'bg-gradient-to-r from-slate-800 to-indigo-900';

const LEGEND_CAPSULE_BASE =
  'inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:text-sm';

const PASTE_BUTTON_BASE =
  'absolute right-4 top-0 z-10 flex -translate-y-1/2 shrink-0 touch-manipulation select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40';

const THEME_CHROME = {
  default: {
    surfaceClass: DEFAULT_SURFACE_CLASS,
    shadowClass: 'shadow-sm shadow-violet-300/60',
    borderClassName: 'border-violet-200',
    cardClassName: 'bg-gradient-to-br from-violet-50/55 via-white to-indigo-50/40',
    legendClassName: `${LEGEND_CAPSULE_BASE} border-violet-200 text-violet-700`,
    pasteButtonClassName: `${PASTE_BUTTON_BASE} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 active:bg-violet-100`,
    pasteIconClassName: 'text-violet-600',
    hintClassName: 'text-violet-600',
    glowClassName: 'animate-ai-glow',
    badgeClass: 'bg-white/20 text-violet-50',
    label: 'Распознать ИИ',
    loadingLabel: 'Распознаём…',
    icon: 'sparkles',
  },
  hogwarts: {
    surfaceClass: HOGWARTS_SURFACE_CLASS,
    shadowClass: 'shadow-sm shadow-amber-900/35',
    borderClassName: 'border-amber-300',
    cardClassName: 'bg-gradient-to-br from-amber-50/65 via-white to-red-50/50',
    legendClassName: `${LEGEND_CAPSULE_BASE} border-amber-300 text-amber-900`,
    pasteButtonClassName: `${PASTE_BUTTON_BASE} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 active:bg-amber-100`,
    pasteIconClassName: 'text-amber-700',
    hintClassName: 'text-amber-800',
    glowClassName: 'animate-ai-glow-hogwarts',
    badgeClass: 'bg-white/20 text-amber-50',
    label: '✨ Акцио, списочек!',
    loadingLabel: 'Колдуем…',
    icon: 'wand',
  },
  star_wars: {
    surfaceClass: STAR_WARS_SURFACE_CLASS,
    shadowClass: 'shadow-sm shadow-indigo-900/30',
    borderClassName: 'border-indigo-300',
    cardClassName: 'bg-gradient-to-br from-slate-100/80 via-white to-indigo-100/55',
    legendClassName: `${LEGEND_CAPSULE_BASE} border-indigo-300 text-indigo-900`,
    pasteButtonClassName: `${PASTE_BUTTON_BASE} border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 active:bg-indigo-100`,
    pasteIconClassName: 'text-indigo-700',
    hintClassName: 'text-indigo-700',
    glowClassName: 'animate-ai-glow-star-wars',
    badgeClass: 'bg-white/15 text-indigo-100',
    label: 'Да прибудет с нами Сила! 🌌',
    loadingLabel: 'Сканируем галактику…',
    icon: 'sword',
  },
};

function resolveThemeId(themeId) {
  return UI_THEME_IDS.includes(themeId) ? themeId : 'default';
}

function getThemeChrome(themeId) {
  return THEME_CHROME[resolveThemeId(themeId)];
}

function getActiveSurfaceClass(themeId) {
  const { surfaceClass, shadowClass } = getThemeChrome(themeId);
  return `${surfaceClass} text-white ${shadowClass}`;
}

export const PROFILE_THEME_ACTIVE_CLASSES = {
  default: getActiveSurfaceClass('default'),
  hogwarts: getActiveSurfaceClass('hogwarts'),
  star_wars: getActiveSurfaceClass('star_wars'),
};

const PROFILE_THEME_BUTTON_BASE =
  'shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium leading-tight transition-all duration-300 disabled:opacity-50 sm:text-xs';

export function getProfileThemeButtonClass(themeId, active) {
  if (!active) {
    return `${PROFILE_THEME_BUTTON_BASE} border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50`;
  }

  const activeClass = PROFILE_THEME_ACTIVE_CLASSES[resolveThemeId(themeId)];
  return `${PROFILE_THEME_BUTTON_BASE} border border-transparent ${activeClass}`;
}

export function resolveUiTheme(profile) {
  const theme = profile?.uiTheme;
  if (UI_THEME_IDS.includes(theme)) return theme;
  return profile?.isChild ? 'hogwarts' : 'default';
}

export function getAiInputTheme(themeId) {
  const chrome = getThemeChrome(themeId);
  return {
    ...chrome,
    buttonClass: getActiveSurfaceClass(themeId),
  };
}

/** @deprecated используйте getAiInputTheme */
export function getAiButtonTheme(themeId) {
  const theme = getAiInputTheme(themeId);
  return {
    label: theme.label,
    loadingLabel: theme.loadingLabel,
    buttonClass: theme.buttonClass,
    badgeClass: theme.badgeClass,
    icon: theme.icon,
  };
}

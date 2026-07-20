export const UI_THEME_IDS = ['default', 'hogwarts', 'star_wars', 'paddington'];

const UI_THEME_CACHE_PREFIX = 'bringhome_ui_theme_';

export function getCachedUiTheme(userId) {
  if (!userId || typeof localStorage === 'undefined') return null;
  const theme = localStorage.getItem(`${UI_THEME_CACHE_PREFIX}${userId}`);
  return UI_THEME_IDS.includes(theme) ? theme : null;
}

export function setCachedUiTheme(userId, themeId) {
  if (!userId || typeof localStorage === 'undefined') return;
  localStorage.setItem(`${UI_THEME_CACHE_PREFIX}${userId}`, resolveThemeId(themeId));
}

function resolveUiThemeFromProfile(profile) {
  const theme = profile?.uiTheme;
  if (UI_THEME_IDS.includes(theme)) return theme;
  return profile?.isChild ? 'hogwarts' : 'default';
}

export const PROFILE_THEME_OPTIONS = [
  { id: 'default', label: 'Обычная' },
  { id: 'hogwarts', label: 'Магия Хогвартса ✨' },
  { id: 'star_wars', label: 'Путь Джедая ⚔️' },
  { id: 'paddington', label: 'Медвежонок Паддингтон 🧸' },
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
  paddington: {
    id: 'paddington',
    label: 'Медвежонок Паддингтон',
    description: 'Уютный британский список покупок',
  },
};

export const DEFAULT_SURFACE_CLASS = 'bg-gradient-to-r from-violet-600 to-indigo-600';
export const HOGWARTS_SURFACE_CLASS = 'bg-gradient-to-r from-red-950 via-red-900 to-amber-600';
export const STAR_WARS_SURFACE_CLASS = 'bg-gradient-to-r from-slate-800 to-indigo-900';
export const PADDINGTON_SURFACE_CLASS = 'bg-gradient-to-r from-blue-950 to-blue-800';

export const DEFAULT_AI_INPUT_PLACEHOLDER = 'Например: молоко 2л, хлеб, яйца 10 шт, помидоры 1 кг';

const LEGEND_CAPSULE_BASE =
  'inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:text-sm';

const PASTE_BUTTON_BASE =
  'absolute right-4 top-0 z-10 flex -translate-y-1/2 shrink-0 touch-manipulation select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40';

/** Единая акцентная палитра: аватар, рамка ИИ-ввода, кнопка действия */
const THEME_ACCENTS = {
  default: {
    border: 'border-violet-500',
    ring: 'ring-2 ring-violet-500',
    avatarRing: 'ring-1 ring-fuchsia-500 shadow-[0_0_12px_rgba(168,85,247,0.55)]',
    solid: 'bg-violet-600',
    solidHover: 'hover:bg-violet-700',
    surface: DEFAULT_SURFACE_CLASS,
    shadow: 'shadow-sm shadow-violet-400/50',
    hint: 'text-violet-600',
    pasteIcon: 'text-violet-600',
    pasteBg: 'bg-violet-50',
    pasteHover: 'hover:bg-violet-100 active:bg-violet-100',
    pasteText: 'text-violet-700',
    card: 'bg-gradient-to-br from-violet-50/55 via-white to-indigo-50/40',
    legendText: 'text-violet-700',
    badge: 'bg-white/20 text-violet-50',
    jumpChip: 'border-violet-500 text-violet-700 hover:border-fuchsia-500 hover:bg-violet-50/80 active:bg-violet-50',
    buttonShimmer: 'ai-btn-shimmer ai-btn-shimmer-default',
    glow: 'animate-ai-glow',
    previewPanel: 'border border-violet-200 bg-gradient-to-b from-violet-50/90 via-white to-white',
    previewLink: 'text-violet-600 hover:text-violet-700',
    previewDivider: 'border-violet-100',
    previewCloseHover: 'hover:bg-violet-50 hover:text-violet-600',
  },
  hogwarts: {
    border: 'border-red-800',
    ring: 'ring-2 ring-red-800',
    avatarRing: 'ring-1 ring-red-800 shadow-[0_0_12px_rgba(153,27,27,0.55)]',
    solid: 'bg-red-900',
    solidHover: 'hover:bg-red-950',
    surface: HOGWARTS_SURFACE_CLASS,
    shadow: 'shadow-sm shadow-amber-900/35',
    hint: 'text-red-900',
    pasteIcon: 'text-red-800',
    pasteBg: 'bg-red-50',
    pasteHover: 'hover:bg-red-100 active:bg-red-100',
    pasteText: 'text-red-900',
    card: 'bg-gradient-to-br from-amber-50/65 via-white to-red-50/50',
    legendText: 'text-red-900',
    badge: 'bg-white/20 text-amber-50',
    jumpChip: 'border-red-800 text-red-900 hover:border-amber-600 hover:bg-amber-50/90 active:bg-amber-50',
    buttonShimmer: 'ai-btn-shimmer ai-btn-shimmer-hogwarts',
    glow: 'animate-ai-glow-hogwarts',
    previewPanel: 'border border-red-200 bg-gradient-to-b from-amber-50/85 via-white to-white',
    previewLink: 'text-red-800 hover:text-red-900',
    previewDivider: 'border-amber-100',
    previewCloseHover: 'hover:bg-amber-50 hover:text-red-800',
  },
  star_wars: {
    border: 'border-indigo-500',
    ring: 'ring-2 ring-indigo-500',
    avatarRing: 'ring-1 ring-sky-600 shadow-[0_0_12px_rgba(2,132,199,0.55)]',
    solid: 'bg-indigo-700',
    solidHover: 'hover:bg-indigo-800',
    surface: STAR_WARS_SURFACE_CLASS,
    shadow: 'shadow-sm shadow-indigo-900/30',
    hint: 'text-indigo-700',
    pasteIcon: 'text-indigo-700',
    pasteBg: 'bg-indigo-50',
    pasteHover: 'hover:bg-indigo-100 active:bg-indigo-100',
    pasteText: 'text-indigo-900',
    card: 'bg-gradient-to-br from-slate-100/80 via-white to-indigo-100/55',
    legendText: 'text-indigo-900',
    badge: 'bg-white/15 text-indigo-100',
    jumpChip: 'border-indigo-500 text-indigo-800 hover:border-indigo-600 hover:bg-indigo-50/90 active:bg-indigo-50',
    buttonShimmer: 'ai-btn-shimmer ai-btn-shimmer-star-wars',
    glow: 'animate-ai-glow-star-wars',
    previewPanel: 'border border-sky-200 bg-gradient-to-b from-slate-50 via-white to-white',
    previewLink: 'text-sky-600 hover:text-sky-700',
    previewDivider: 'border-sky-100',
    previewCloseHover: 'hover:bg-sky-50 hover:text-indigo-700',
  },
  paddington: {
    border: 'border-blue-800',
    ring: 'ring-2 ring-blue-800',
    avatarRing: 'ring-1 ring-blue-800 shadow-[0_0_12px_rgba(30,64,175,0.55)]',
    solid: 'bg-blue-900',
    solidHover: 'hover:bg-blue-950',
    surface: PADDINGTON_SURFACE_CLASS,
    shadow: 'shadow-sm shadow-blue-900/35',
    hint: 'text-blue-900',
    pasteIcon: 'text-blue-800',
    pasteBg: 'bg-blue-50',
    pasteHover: 'hover:bg-blue-100 active:bg-blue-100',
    pasteText: 'text-blue-950',
    card: 'bg-gradient-to-br from-blue-50/60 via-white to-blue-50/40',
    legendText: 'text-blue-950',
    badge: 'bg-white/20 text-blue-50',
    jumpChip: 'border-blue-800 text-blue-950 hover:border-blue-900 hover:bg-blue-50/80 active:bg-blue-50',
    buttonShimmer: 'ai-btn-shimmer ai-btn-shimmer-paddington',
    glow: 'animate-ai-glow-paddington',
    previewPanel: 'border border-blue-200 bg-gradient-to-b from-blue-50/90 via-white to-white',
    previewLink: 'text-blue-800 hover:text-blue-950',
    previewDivider: 'border-blue-100',
    previewCloseHover: 'hover:bg-blue-50 hover:text-blue-900',
  },
};

function buildThemeChrome(accent, content) {
  return {
    accentBorderClassName: accent.border,
    accentRingClassName: accent.ring,
    accentAvatarRingClassName: accent.avatarRing ?? accent.ring,
    accentSolidClassName: accent.solid,
    accentSolidHoverClassName: accent.solidHover,
    surfaceClass: accent.surface,
    shadowClass: accent.shadow,
    buttonShimmerClass: accent.buttonShimmer,
    borderClassName: accent.border,
    cardClassName: accent.card,
    legendClassName: `${LEGEND_CAPSULE_BASE} ${accent.border} ${accent.legendText}`,
    pasteButtonClassName: `${PASTE_BUTTON_BASE} ${accent.border} ${accent.pasteBg} ${accent.pasteText} ${accent.pasteHover}`,
    pasteIconClassName: accent.pasteIcon,
    hintClassName: accent.hint,
    glowClassName: accent.glow,
    badgeClass: accent.badge,
    jumpChipClassName: accent.jumpChip,
    previewPanelClassName: accent.previewPanel,
    previewLabelClassName: accent.hint,
    previewLinkClassName: accent.previewLink,
    previewDividerClassName: accent.previewDivider,
    previewCloseHoverClassName: accent.previewCloseHover,
    ...content,
  };
}

const THEME_CHROME = {
  default: buildThemeChrome(THEME_ACCENTS.default, {
    placeholder: DEFAULT_AI_INPUT_PLACEHOLDER,
    label: 'Распознать ИИ',
    loadingLabel: 'Распознаём…',
    createPackingLabel: 'Сгенерировать список с ИИ',
    createPackingLoadingLabel: 'Генерируем…',
    createPackingEmptyLabel: 'Опишите поездку, чтобы сгенерировать список',
    createPackingConfirmLabel: 'Все отлично, создать',
    createPackingConfirmLoadingLabel: 'Создаём…',
    limitExhaustedLabel: 'Лимит исчерпан',
    limitExhaustedDisabled: true,
    limitExhaustedMessage:
      'Дневной лимит распознавания списков израсходован. Новые запросы станут доступны после полуночи. Пока добавляйте товары вручную.',
    formatSuccessMessage: (count) => `Добавлено ${count} позиций`,
    formatPackingSuccessMessage: (count, sectionCategory) => (
      sectionCategory
        ? `Добавлено ${count} в «${sectionCategory}»`
        : `Добавлено ${count} позиций`
    ),
    icon: 'sparkles',
  }),
  hogwarts: buildThemeChrome(THEME_ACCENTS.hogwarts, {
    placeholder: 'Например: сливочное пиво 4 шт, тыквенный сок, лакричные палочки, сахарные перья',
    label: '✨ Акцио, списочек!',
    loadingLabel: 'Колдуем…',
    createPackingLabel: '✨ Акцио, сборы!',
    createPackingLoadingLabel: 'Колдуем над рюкзаком…',
    createPackingEmptyLabel: 'Опишите поездку — и произнесём заклинание',
    createPackingConfirmLabel: 'Шалость удалась — создать! 🪄',
    createPackingConfirmLoadingLabel: 'Зачаровываем список…',
    limitExhaustedLabel: 'Палочка перегрелась! 🪄',
    limitExhaustedDisabled: true,
    limitExhaustedMessage:
      'Твоя магическая энергия на сегодня исчерпана. Чтобы снова творить заклинания «Акцио, продукты», нужно дождаться полуночи и накопить ману. Отдыхай, юный волшебник! А пока — добавляй вручную.',
    formatSuccessMessage: (count) =>
      `✨ Акцио сработало! Продукты аккуратно легли в список. (Добавлено позиций: ${count})`,
    formatPackingSuccessMessage: (count, sectionCategory) => (
      sectionCategory
        ? `✨ Акцио сработало! Вещи аккуратно легли в «${sectionCategory}». (Добавлено позиций: ${count})`
        : `✨ Акцио сработало! Вещи аккуратно легли в сборы. (Добавлено позиций: ${count})`
    ),
    icon: 'wand',
  }),
  star_wars: buildThemeChrome(THEME_ACCENTS.star_wars, {
    placeholder: 'Например: синие наггетсы 1 уп, сухой паёк 3 шт, кореллианский эль, космо-чечевица',
    label: 'Да прибудет с нами Сила! ⚔️',
    loadingLabel: 'Сканируем галактику…',
    createPackingLabel: 'Да прибудет с нами Сила! ⚔️',
    createPackingLoadingLabel: 'Собираем гиперпрыжок…',
    createPackingEmptyLabel: 'Опишите миссию, чтобы собрать рюкзак',
    createPackingConfirmLabel: 'Список готов — в путь! ⚔️',
    createPackingConfirmLoadingLabel: 'Готовим к гиперпрыжку…',
    limitExhaustedLabel: 'Исчерпана Сила твоя! ⚔️',
    limitExhaustedDisabled: true,
    limitExhaustedMessage:
      'Слишком много запросов во Вселенную отправил ты. Медитировать должен ты теперь и восстановления лимита ждать. Да пребудет с тобой Сила завтра! А пока — добавляй товары вручную.',
    formatSuccessMessage: (count) =>
      `Сила распознала список! ⚔️ (Добавлено позиций: ${count})`,
    formatPackingSuccessMessage: (count, sectionCategory) => (
      sectionCategory
        ? `Сила собрала рюкзак в «${sectionCategory}»! ⚔️ (Добавлено позиций: ${count})`
        : `Сила собрала рюкзак! ⚔️ (Добавлено позиций: ${count})`
    ),
    icon: 'sword',
  }),
  paddington: buildThemeChrome(THEME_ACCENTS.paddington, {
    placeholder: 'Например: апельсины для мармелада 3кг, какао, хрустящие булочки, чашка чая',
    label: 'Проверить чемоданчик 💼',
    loadingLabel: 'Сортируем по карманам…',
    createPackingLabel: 'Собрать чемоданчик 💼',
    createPackingLoadingLabel: 'Сортируем по карманам…',
    createPackingEmptyLabel: 'Опишите поездку для чемоданчика',
    createPackingConfirmLabel: 'Чемоданчик готов! 💼',
    createPackingConfirmLoadingLabel: 'Закрываем чемоданчик…',
    limitExhaustedLabel: 'Чемоданчик пуст 💼',
    limitExhaustedDisabled: true,
    limitExhaustedMessage:
      'Ой, кажется, у Паддингтона закончился весь апельсиновый мармелад на сегодня, и ему нужно немного отдохнуть... 🧸🍊 Попробуй добавить продукты вручную или подожди до завтра!',
    formatSuccessMessage: (count) =>
      `Медвежонок Паддингтон аккуратно разложил продукты по карманам! (Добавлено позиций: ${count})`,
    formatPackingSuccessMessage: (count, sectionCategory) => (
      sectionCategory
        ? `Паддингтон аккуратно сложил вещи в «${sectionCategory}»! (Добавлено позиций: ${count})`
        : `Паддингтон аккуратно сложил вещи в чемоданчик! (Добавлено позиций: ${count})`
    ),
    icon: 'briefcase',
  }),
};

function resolveThemeId(themeId) {
  return UI_THEME_IDS.includes(themeId) ? themeId : 'default';
}

function getThemeChrome(themeId) {
  return THEME_CHROME[resolveThemeId(themeId)];
}

function getActiveSurfaceClass(themeId) {
  const { buttonShimmerClass, shadowClass } = getThemeChrome(themeId);
  return `${buttonShimmerClass} text-white ${shadowClass}`;
}

export const PROFILE_THEME_ACTIVE_CLASSES = {
  default: getActiveSurfaceClass('default'),
  hogwarts: getActiveSurfaceClass('hogwarts'),
  star_wars: getActiveSurfaceClass('star_wars'),
  paddington: getActiveSurfaceClass('paddington'),
};

const PROFILE_THEME_BUTTON_BASE =
  'relative inline-flex w-full items-center justify-center overflow-hidden rounded-full border px-4 py-3.5 text-sm font-semibold transition-all duration-300 disabled:opacity-50';

export function getProfileThemeButtonClass(themeId, active) {
  if (!active) {
    return `${PROFILE_THEME_BUTTON_BASE} border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50`;
  }

  const activeClass = PROFILE_THEME_ACTIVE_CLASSES[resolveThemeId(themeId)];
  return `${PROFILE_THEME_BUTTON_BASE} border-0 ${activeClass}`;
}

export function resolveUiTheme(profile, userId) {
  if (profile) {
    const resolved = resolveUiThemeFromProfile(profile);
    if (userId) setCachedUiTheme(userId, resolved);
    return resolved;
  }

  if (userId) {
    const cached = getCachedUiTheme(userId);
    if (cached) return cached;
  }

  return 'default';
}

/** Текст нейтральной кнопки выхода из списка без изменений. */
export function getNeutralExitLabel(themeId) {
  switch (resolveThemeId(themeId)) {
    case 'star_wars':
      return 'Всё спокойно в Галактике';
    case 'paddington':
      return 'Мармелад цел, я назад 🧸';
    case 'hogwarts':
      return 'Шалость удалась, выхожу 🪄';
    default:
      return 'Ничего не менялось, назад';
  }
}

/** Плейсхолдеры ИИ-ввода для списков сборов / путешествий. */
const PACKING_AI_PLACEHOLDERS = {
  default: 'Например: едем в Териберку / купить билеты, зарядка, аптечка',
  hogwarts: 'Например: едем в Хогвартс / мантия-невидимка, волшебная палочка, купить билет на Хогвартс-экспресс',
  star_wars: 'Например: летим на Татуин / световой меч, сухой паёк, забронировать гиперпространственный прыжок',
  paddington:
    'Например: едем в Лондон / бутерброд с мармеладом, красная шляпа, забронировать отель',
};

export function getPackingAiPlaceholder(themeId) {
  const id = resolveThemeId(themeId);
  return PACKING_AI_PLACEHOLDERS[id] || PACKING_AI_PLACEHOLDERS.default;
}

export function getThemeAccent(themeId) {
  const chrome = getThemeChrome(themeId);
  return {
    borderClassName: chrome.accentBorderClassName,
    ringClassName: chrome.accentRingClassName,
    avatarRingClassName: chrome.accentAvatarRingClassName,
    solidClassName: chrome.accentSolidClassName,
    solidHoverClassName: chrome.accentSolidHoverClassName,
    buttonClass: getActiveSurfaceClass(themeId),
  };
}

export function getAiInputTheme(themeId) {
  const chrome = getThemeChrome(themeId);
  return {
    ...chrome,
    buttonClass: getActiveSurfaceClass(themeId),
    placeholder: chrome.placeholder ?? DEFAULT_AI_INPUT_PLACEHOLDER,
  };
}

/** Тема CTA создания списка сборов через ИИ. */
export function getPackingCreateAiTheme(themeId) {
  const chrome = getThemeChrome(themeId);
  return {
    icon: chrome.icon || 'sparkles',
    buttonClass: getActiveSurfaceClass(themeId),
    label: chrome.createPackingLabel || 'Сгенерировать список с ИИ',
    loadingLabel: chrome.createPackingLoadingLabel || chrome.loadingLabel || 'Генерируем…',
    emptyLabel: chrome.createPackingEmptyLabel || 'Опишите поездку, чтобы сгенерировать список',
    confirmLabel: chrome.createPackingConfirmLabel || 'Все отлично, создать',
    confirmLoadingLabel: chrome.createPackingConfirmLoadingLabel || 'Создаём…',
    accentBorderClassName: chrome.accentBorderClassName,
    accentRingClassName: chrome.accentRingClassName,
  };
}

export function getAiPreviewTheme(themeId) {
  const chrome = getThemeChrome(themeId);
  return {
    panelClassName: chrome.previewPanelClassName,
    labelClassName: chrome.previewLabelClassName,
    linkClassName: chrome.previewLinkClassName,
    dividerClassName: chrome.previewDividerClassName,
    closeHoverClassName: chrome.previewCloseHoverClassName,
    confirmButtonClass: getActiveSurfaceClass(themeId),
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

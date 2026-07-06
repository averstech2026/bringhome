export const BUILTIN_TYPES = {
  home: 'Домой',
  cottage: 'Дача',
  trip: 'В дорогу',
};

export const BUILTIN_TYPE_SET = new Set(Object.keys(BUILTIN_TYPES));

export const LIST_TYPE_LABELS = BUILTIN_TYPES;

const CUSTOM_PALETTES = [
  {
    badge: 'bg-rose-50 text-rose-600',
    cardBadge: 'text-rose-600/80',
    progress: 'bg-rose-500',
    draftActive: 'border-rose-300 bg-rose-50 text-rose-700',
    draftIdle: 'border-rose-200/80 text-rose-700 hover:bg-rose-50/60',
  },
  {
    badge: 'bg-orange-50 text-orange-600',
    cardBadge: 'text-orange-600/80',
    progress: 'bg-orange-500',
    draftActive: 'border-orange-300 bg-orange-50 text-orange-700',
    draftIdle: 'border-orange-200/80 text-orange-700 hover:bg-orange-50/60',
  },
  {
    badge: 'bg-sky-50 text-sky-600',
    cardBadge: 'text-sky-600/80',
    progress: 'bg-sky-500',
    draftActive: 'border-sky-300 bg-sky-50 text-sky-700',
    draftIdle: 'border-sky-200/80 text-sky-700 hover:bg-sky-50/60',
  },
  {
    badge: 'bg-teal-50 text-teal-600',
    cardBadge: 'text-teal-600/80',
    progress: 'bg-teal-500',
    draftActive: 'border-teal-300 bg-teal-50 text-teal-700',
    draftIdle: 'border-teal-200/80 text-teal-700 hover:bg-teal-50/60',
  },
  {
    badge: 'bg-fuchsia-50 text-fuchsia-600',
    cardBadge: 'text-fuchsia-600/80',
    progress: 'bg-fuchsia-500',
    draftActive: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700',
    draftIdle: 'border-fuchsia-200/80 text-fuchsia-700 hover:bg-fuchsia-50/60',
  },
  {
    badge: 'bg-indigo-50 text-indigo-600',
    cardBadge: 'text-indigo-600/80',
    progress: 'bg-indigo-500',
    draftActive: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    draftIdle: 'border-indigo-200/80 text-indigo-700 hover:bg-indigo-50/60',
  },
];

const BUILTIN_CARD_BADGE = {
  home: 'text-emerald-600/80',
  cottage: 'text-amber-700/80',
  trip: 'text-sky-600/80',
};

const BUILTIN_PROGRESS = {
  home: 'bg-emerald-500',
  cottage: 'bg-amber-500',
  trip: 'bg-sky-500',
};

const BUILTIN_BADGE = {
  home: { label: 'Домашний', className: 'bg-blue-50 text-blue-600' },
  cottage: { label: 'Дачный', className: 'bg-amber-50 text-amber-700' },
  trip: { label: 'Дорожный', className: 'bg-sky-50 text-sky-600' },
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function isBuiltinListType(type) {
  return BUILTIN_TYPE_SET.has(type);
}

export function sanitizeCustomTypeName(input) {
  return (input || '').trim().replace(/\s+/g, ' ').slice(0, 32);
}

export function getListTypeLabel(type) {
  if (!type) return BUILTIN_TYPES.home;
  return BUILTIN_TYPES[type] || type;
}

export function formatListTitle(type, date = new Date()) {
  const typeLabel = getListTypeLabel(type);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${typeLabel} ${day}.${month}`;
}

export function encodeListTypeForUrl(type) {
  return encodeURIComponent(type || 'home');
}

export function decodeListTypeFromUrl(raw) {
  if (!raw) return 'home';
  const decoded = decodeURIComponent(raw);
  if (decoded === 'road') return 'trip';
  return decoded;
}

/** Для сохранения в Firestore — не сбрасывает кастомные типы */
export function normalizeListTypeForCreate(type) {
  if (!type) return 'home';
  if (type === 'road') return 'trip';
  if (isBuiltinListType(type)) return type;
  return sanitizeCustomTypeName(type) || 'home';
}

/** @deprecated используй decodeListTypeFromUrl для URL */
export function normalizeListType(type) {
  const decoded = typeof type === 'string' ? type : '';
  if (decoded === 'road') return 'trip';
  if (isBuiltinListType(decoded)) return decoded;
  if (decoded) return sanitizeCustomTypeName(decoded) || 'home';
  return 'home';
}

export function getCustomTypePalette(type) {
  if (isBuiltinListType(type)) return null;
  return CUSTOM_PALETTES[hashString(type) % CUSTOM_PALETTES.length];
}

export function getListCardBadgeClass(type) {
  if (isBuiltinListType(type)) return BUILTIN_CARD_BADGE[type] || 'text-slate-400';
  return getCustomTypePalette(type)?.cardBadge || 'text-slate-500';
}

export function getListProgressClass(type) {
  if (isBuiltinListType(type)) return BUILTIN_PROGRESS[type] || BUILTIN_PROGRESS.home;
  return getCustomTypePalette(type)?.progress || 'bg-slate-400';
}

export function getListTypeBadgeProps(type) {
  if (isBuiltinListType(type)) {
    return BUILTIN_BADGE[type] || BUILTIN_BADGE.home;
  }

  const palette = getCustomTypePalette(type);
  return {
    label: getListTypeLabel(type),
    className: palette?.badge || 'bg-slate-100 text-slate-600',
  };
}

export function getDraftTypeClasses(type, active) {
  if (isBuiltinListType(type)) {
    const map = {
      home: active
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
        : 'border-emerald-200/80 text-emerald-700 hover:bg-emerald-50/60',
      cottage: active
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-amber-200/80 text-amber-800 hover:bg-amber-50/60',
      trip: active
        ? 'border-sky-300 bg-sky-50 text-sky-700'
        : 'border-sky-200/80 text-sky-700 hover:bg-sky-50/60',
    };
    return map[type] || map.home;
  }

  const palette = getCustomTypePalette(type);
  return active ? palette.draftActive : palette.draftIdle;
}

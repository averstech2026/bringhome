/** Константы и хелперы для списков сборов / путешествий. */

import { formatQuantity, parseQuantity } from './quantity';

export const PACKING_SCOPE = {
  COMMON: 'common',
  PERSONAL: 'personal',
};

export const PACKING_ITEM_TYPE = {
  ITEM: 'item',
  TODO: 'todo',
};

const CHIP_ACTIVE_SHADOW = 'shadow-sm shadow-black/10';

/** Способ поездки (транспорт). */
export const PACKING_TRANSPORTS = [
  {
    id: 'car',
    label: '+ На авто',
    idleClassName: 'text-emerald-600/80',
    activeClassName: `border-transparent bg-emerald-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    id: 'plane',
    label: '+ Самолёт',
    idleClassName: 'text-sky-600/80',
    activeClassName: `border-transparent bg-sky-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    id: 'train',
    label: '+ Поезд',
    idleClassName: 'text-violet-600/80',
    activeClassName: `border-transparent bg-violet-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
];

/** Назначение поездки (куда / зачем). */
export const PACKING_PURPOSES = [
  {
    id: 'sea',
    label: '+ Море',
    idleClassName: 'text-cyan-600/80',
    activeClassName: `border-transparent bg-cyan-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    id: 'mountains',
    label: '+ Горы',
    idleClassName: 'text-amber-700/80',
    activeClassName: `border-transparent bg-amber-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    id: 'city',
    label: '+ Город',
    idleClassName: 'text-indigo-600/80',
    activeClassName: `border-transparent bg-indigo-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    id: 'nature',
    label: '+ Туризм',
    idleClassName: 'text-teal-700/80',
    activeClassName: `border-transparent bg-teal-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
];

/** @deprecated используйте PACKING_TRANSPORTS + PACKING_PURPOSES */
export const PACKING_TRIP_TYPES = [
  ...PACKING_TRANSPORTS,
  ...PACKING_PURPOSES.filter((entry) => entry.id === 'mountains' || entry.id === 'sea'),
];

const TRANSPORT_IDS = new Set(PACKING_TRANSPORTS.map((entry) => entry.id));
const PURPOSE_IDS = new Set(PACKING_PURPOSES.map((entry) => entry.id));

export function getPackingTransportLabel(id) {
  const found = PACKING_TRANSPORTS.find((entry) => entry.id === id);
  return found ? found.label.replace(/^\+\s*/, '') : '';
}

export function getPackingPurposeLabel(id) {
  const found = PACKING_PURPOSES.find((entry) => entry.id === id);
  return found ? found.label.replace(/^\+\s*/, '') : '';
}

/**
 * Нормализует оси поездки. Старый tripType (car/plane/mountains/sea)
 * раскладывается в transport + purpose.
 */
export function resolvePackingTripAxes(listOrAxes = {}) {
  const transportRaw = listOrAxes.tripTransport || listOrAxes.transport || null;
  const purposeRaw = listOrAxes.tripPurpose || listOrAxes.purpose || null;

  if (TRANSPORT_IDS.has(transportRaw) || PURPOSE_IDS.has(purposeRaw)) {
    return {
      transport: TRANSPORT_IDS.has(transportRaw) ? transportRaw : 'car',
      purpose: PURPOSE_IDS.has(purposeRaw) ? purposeRaw : 'city',
    };
  }

  const legacy = listOrAxes.tripType;
  if (legacy === 'plane' || legacy === 'car' || legacy === 'train') {
    return { transport: legacy, purpose: 'city' };
  }
  if (legacy === 'mountains' || legacy === 'sea') {
    return { transport: 'car', purpose: legacy };
  }
  if (legacy === 'city' || legacy === 'nature') {
    return { transport: 'car', purpose: legacy };
  }

  return { transport: 'car', purpose: 'city' };
}

/** Короткая подпись для бейджа: «Авто · Море». */
export function formatPackingTripBadge(listOrAxes) {
  const { transport, purpose } = resolvePackingTripAxes(listOrAxes);
  const left = getPackingTransportLabel(transport);
  const right = getPackingPurposeLabel(purpose);
  if (left && right) return `${left} · ${right}`;
  return left || right || 'Поездка';
}

/** Ключ для группировки готовых списков. */
export function getPackingTripGroupKey(listOrAxes) {
  const { transport, purpose } = resolvePackingTripAxes(listOrAxes);
  return `${transport}|${purpose}`;
}

export function packingTripAxesToPayload({
  transport,
  purpose,
  tripTransport,
  tripPurpose,
  tripType,
} = {}) {
  const axes = resolvePackingTripAxes({
    tripTransport: tripTransport || transport,
    tripPurpose: tripPurpose || purpose,
    tripType,
  });
  return {
    tripTransport: axes.transport,
    tripPurpose: axes.purpose,
    // deprecated: для старых читателей / группировок
    tripType: axes.transport,
  };
}

/** Формат даты для названия поездки: «20.07». */
export function formatPackingDateLabel(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

const DATE_IN_TITLE_RE = /\b\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\b/;

export function packingTitleHasDate(title) {
  return DATE_IN_TITLE_RE.test(String(title || '').trim());
}

/** Добавляет « ДД.ММ» к названию, если даты ещё нет. */
export function appendDateToPackingTitle(title, date = new Date()) {
  const trimmed = String(title || '').trim();
  if (!trimmed) return trimmed;
  if (packingTitleHasDate(trimmed)) return trimmed;
  return `${trimmed} ${formatPackingDateLabel(date)}`;
}

export function createPackingItemId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizePackingQuantity(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    if (raw === 1) return '';
    return formatQuantity(raw, 'шт');
  }
  const text = String(raw).trim();
  if (!text) return '';
  // Только число без единицы — нормализуем как «N шт».
  if (/^[\d]+(?:[.,]\d+)?$/.test(text)) {
    const n = Number.parseFloat(text.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n === 1) return '';
    return formatQuantity(n, 'шт');
  }
  const { count, unit } = parseQuantity(text);
  if (!Number.isFinite(count) || count <= 0) return text;
  const resolvedUnit = unit || 'шт';
  // Дефолт «1 шт» не храним — в UI это просто отсутствие количества.
  if (count === 1 && resolvedUnit === 'шт') return '';
  return formatQuantity(count, resolvedUnit);
}

/** Есть ли недефолтное количество для отображения в строке пункта. */
export function packingQuantityLabel(raw) {
  const normalized = normalizePackingQuantity(raw);
  if (!normalized) return '';
  return normalized;
}

function normalizePackingDueDate(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function normalizePackingItem(raw = {}) {
  const scope = raw.scope === PACKING_SCOPE.PERSONAL
    ? PACKING_SCOPE.PERSONAL
    : PACKING_SCOPE.COMMON;
  const type = raw.type === PACKING_ITEM_TYPE.TODO
    ? PACKING_ITEM_TYPE.TODO
    : PACKING_ITEM_TYPE.ITEM;

  const hasExplicitActivity = Object.prototype.hasOwnProperty.call(raw, 'activity');
  const legacyCategory = String(raw.category || '').trim();
  const legacyCategoryIcon = String(raw.categoryIcon || '').trim();

  let activity;
  let activityIcon = String(raw.activityIcon || '').trim();
  let category;
  let categoryIcon;

  if (hasExplicitActivity) {
    activity = normalizePackingActivity(raw.activity);
    activityIcon = isPackingMainActivity(activity)
      ? ''
      : (activityIcon || legacyCategoryIcon);
    category = String(raw.category || '').trim();
    if (category === PACKING_UNCATEGORIZED_LABEL) category = '';
    categoryIcon = getPackingCategoryIcon(category, String(raw.categoryIcon || '').trim());
  } else if (!legacyCategory || legacyCategory === PACKING_UNCATEGORIZED_LABEL) {
    // Legacy: пустой category → основной список без тега вещи
    activity = PACKING_ACTIVITY_MAIN;
    activityIcon = '';
    category = '';
    categoryIcon = '';
  } else if (isKnownPackingCategory(legacyCategory)) {
    // Legacy: канонический тег вещи → category, раздел main
    activity = PACKING_ACTIVITY_MAIN;
    activityIcon = '';
    category = legacyCategory;
    categoryIcon = getPackingCategoryIcon(legacyCategory, legacyCategoryIcon);
  } else {
    // Legacy: кастомная тема ИИ («Морская прогулка») → activity
    activity = legacyCategory;
    activityIcon = legacyCategoryIcon;
    category = '';
    categoryIcon = '';
  }

  return {
    id: raw.id || createPackingItemId(),
    name: String(raw.name || '').trim(),
    scope,
    type,
    activity,
    activityIcon,
    category,
    categoryIcon,
    assignedTo: scope === PACKING_SCOPE.COMMON ? (raw.assignedTo || null) : null,
    ownerId: scope === PACKING_SCOPE.PERSONAL ? (raw.ownerId || null) : null,
    checked: Boolean(raw.checked),
    statusMap: raw.statusMap && typeof raw.statusMap === 'object' ? { ...raw.statusMap } : {},
    checkedBy: raw.checkedBy || null,
    checkedByUid: raw.checkedByUid || null,
    checkedByPhotoUrl: raw.checkedByPhotoUrl || null,
    bookingUrl: typeof raw.bookingUrl === 'string' ? raw.bookingUrl.trim() : '',
    note: typeof raw.note === 'string' ? raw.note.trim() : '',
    quantity: type === PACKING_ITEM_TYPE.ITEM ? normalizePackingQuantity(raw.quantity) : '',
    dueDate: type === PACKING_ITEM_TYPE.TODO ? normalizePackingDueDate(raw.dueDate) : '',
  };
}

/** Копия items шаблона без прогресса (для новой поездки). */
export function clonePackingItemsFromTemplate(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizePackingItem(item))
    .filter((item) => item.name)
    .map((item) => ({
      ...item,
      id: createPackingItemId(),
      checked: false,
      statusMap: {},
      checkedBy: null,
      checkedByUid: null,
      checkedByPhotoUrl: null,
      ownerId: null,
      assignedTo: item.scope === PACKING_SCOPE.COMMON ? item.assignedTo : null,
    }));
}

export function filterPackingItemsByScope(items, scope) {
  return (Array.isArray(items) ? items : []).filter((item) => item.scope === scope);
}

/** Личный рюкзак текущего пользователя (чужие personal-пункты скрыты). */
export function filterPersonalPackingItems(items, userId) {
  if (!userId) return [];
  return filterPackingItemsByScope(items, PACKING_SCOPE.PERSONAL).filter((item) => {
    if (item.ownerId) return item.ownerId === userId;
    // Legacy без ownerId: показываем только если assignedTo совпал (старые данные)
    return item.assignedTo === userId;
  });
}

export function filterCommonPackingItems(items) {
  return filterPackingItemsByScope(items, PACKING_SCOPE.COMMON);
}

export const PACKING_ACTIVITY_MAIN = 'main';
export const PACKING_MAIN_LIST_LABEL = 'Основной список';
export const PACKING_UNCATEGORIZED_LABEL = 'Без категории';

/**
 * Канонические категории вещи/дела (теги в модалке).
 * Разделы списка (activity) — отдельно: main или кастомные ИИ-активности.
 */
export const PACKING_SUGGESTED_CATEGORIES = [
  { category: 'Документы', categoryIcon: '🪪' },
  { category: 'Одежда', categoryIcon: '👗' },
  { category: 'Аптечка', categoryIcon: '💊' },
  { category: 'Техника', categoryIcon: '🔌' },
  { category: 'Снаряжение', categoryIcon: '🏕' },
  { category: 'Перекус', categoryIcon: '🍔' },
  { category: 'Прочее', categoryIcon: '📦' },
];

export const PACKING_CATEGORY_ORDER = PACKING_SUGGESTED_CATEGORIES.map(
  (entry) => entry.category,
);

const PACKING_CATEGORY_ICON_BY_NAME = Object.fromEntries(
  PACKING_SUGGESTED_CATEGORIES.map((entry) => [entry.category, entry.categoryIcon]),
);

export function isKnownPackingCategory(category) {
  const key = String(category || '').trim();
  return Boolean(key) && PACKING_CATEGORY_ORDER.includes(key);
}

export function isPackingMainActivity(activity) {
  const key = String(activity || '').trim();
  return !key
    || key === PACKING_ACTIVITY_MAIN
    || key === PACKING_MAIN_LIST_LABEL
    || key === PACKING_UNCATEGORIZED_LABEL;
}

export function normalizePackingActivity(raw) {
  return isPackingMainActivity(raw) ? PACKING_ACTIVITY_MAIN : String(raw || '').trim();
}

/** Иконка канонической категории вещи; для неизвестных — fallback. */
export function getPackingCategoryIcon(category, fallbackIcon = '') {
  const key = String(category || '').trim();
  if (!key || key === PACKING_UNCATEGORIZED_LABEL) return '';
  return PACKING_CATEGORY_ICON_BY_NAME[key] || String(fallbackIcon || '').trim();
}

/** Нормализует название раздела (activity): пусто / «Основной список» → main. */
export function resolvePackingActivityRename(rawTitle, { keepIcon = '' } = {}) {
  const title = String(rawTitle || '').trim();
  if (
    !title
    || title === PACKING_MAIN_LIST_LABEL
    || title === PACKING_UNCATEGORIZED_LABEL
    || title === PACKING_ACTIVITY_MAIN
  ) {
    return { activity: PACKING_ACTIVITY_MAIN, activityIcon: '' };
  }

  const emojiMatch = title.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.+)$/u,
  );
  if (emojiMatch) {
    return {
      activity: emojiMatch[2].trim(),
      activityIcon: emojiMatch[1],
    };
  }

  return {
    activity: title,
    activityIcon: String(keepIcon || '').trim(),
  };
}

/** @deprecated используйте resolvePackingActivityRename */
export function resolvePackingCategoryRename(rawTitle, options) {
  const next = resolvePackingActivityRename(rawTitle, options);
  return { category: next.activity === PACKING_ACTIVITY_MAIN ? '' : next.activity, categoryIcon: next.activityIcon };
}

export function packingItemMatchesActivity(item, activityKey) {
  const activity = normalizePackingActivity(item?.activity);
  const key = normalizePackingActivity(activityKey);
  return activity === key;
}

export function packingItemMatchesCategory(item, categoryKey) {
  const cat = String(item?.category || '').trim();
  const key = String(categoryKey || '').trim();
  if (!key || key === PACKING_UNCATEGORIZED_LABEL) {
    return !cat || cat === PACKING_UNCATEGORIZED_LABEL;
  }
  return cat === key;
}

/**
 * Группирует пункты сборов по activity.
 * Основной список (main) — первым; кастомные активности — ниже по алфавиту.
 */
export function groupPackingItemsByActivity(items = []) {
  const buckets = new Map();
  const mainItems = [];

  for (const item of Array.isArray(items) ? items : []) {
    const activity = normalizePackingActivity(item?.activity);
    if (activity === PACKING_ACTIVITY_MAIN) {
      mainItems.push(item);
      continue;
    }
    if (!buckets.has(activity)) {
      buckets.set(activity, {
        activity,
        activityIcon: String(item?.activityIcon || '').trim(),
        items: [],
      });
    }
    const bucket = buckets.get(activity);
    if (!bucket.activityIcon && item?.activityIcon) {
      bucket.activityIcon = String(item.activityIcon).trim();
    }
    bucket.items.push(item);
  }

  const groups = [...buckets.values()].sort((a, b) => (
    String(a.activity).localeCompare(String(b.activity), 'ru')
  ));

  if (mainItems.length > 0 || groups.length === 0) {
    groups.unshift({
      activity: PACKING_ACTIVITY_MAIN,
      activityIcon: '',
      items: mainItems,
    });
  }

  return groups;
}

/**
 * Группирует пункты по category (тег вещи) внутри одного раздела.
 * Порядок: канонические → прочие по алфавиту → «Без категории».
 */
export function groupPackingItemsByItemCategory(items = []) {
  const buckets = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    let category = String(item?.category || '').trim();
    if (category === PACKING_UNCATEGORIZED_LABEL) category = '';
    const key = category;
    if (!buckets.has(key)) {
      buckets.set(key, {
        category: key,
        categoryIcon: getPackingCategoryIcon(key, item?.categoryIcon),
        items: [],
      });
    }
    const bucket = buckets.get(key);
    if (!bucket.categoryIcon && item?.categoryIcon) {
      bucket.categoryIcon = getPackingCategoryIcon(key, item.categoryIcon);
    }
    bucket.items.push(item);
  }

  const ordered = [];
  for (const name of PACKING_CATEGORY_ORDER) {
    if (!buckets.has(name)) continue;
    ordered.push(buckets.get(name));
    buckets.delete(name);
  }

  const uncategorized = buckets.get('');
  if (buckets.has('')) buckets.delete('');

  const custom = [...buckets.values()].sort((a, b) => (
    String(a.category).localeCompare(String(b.category), 'ru')
  ));

  if (uncategorized) {
    return [...ordered, ...custom, uncategorized];
  }
  return [...ordered, ...custom];
}

/** @deprecated используйте groupPackingItemsByActivity */
export function groupPackingItemsByCategory(items = []) {
  return groupPackingItemsByActivity(items).map((group) => ({
    category: group.activity === PACKING_ACTIVITY_MAIN ? '' : group.activity,
    categoryIcon: group.activityIcon,
    items: group.items,
  }));
}

export function formatPackingActivityLabel(activity, activityIcon = '') {
  if (isPackingMainActivity(activity)) return PACKING_MAIN_LIST_LABEL;
  const title = String(activity || '').trim();
  const icon = String(activityIcon || '').trim();
  return icon ? `${icon} ${title}` : title;
}

export function formatPackingCategoryLabel(category, categoryIcon = '') {
  const title = String(category || '').trim();
  if (!title || title === PACKING_UNCATEGORIZED_LABEL) {
    return PACKING_UNCATEGORIZED_LABEL;
  }
  const icon = getPackingCategoryIcon(category, categoryIcon);
  return icon ? `${icon} ${title}` : title;
}

/** Варианты разделов (activity) для переноса пункта. */
export function listPackingActivityOptions(items = []) {
  const groups = groupPackingItemsByActivity(items);
  const options = groups.map((group) => ({
    activity: group.activity,
    activityIcon: group.activityIcon,
    label: formatPackingActivityLabel(group.activity, group.activityIcon),
  }));

  if (!options.some((option) => option.activity === PACKING_ACTIVITY_MAIN)) {
    options.unshift({
      activity: PACKING_ACTIVITY_MAIN,
      activityIcon: '',
      label: PACKING_MAIN_LIST_LABEL,
    });
  }

  return options;
}

/** @deprecated используйте listPackingActivityOptions */
export function listPackingCategoryOptions(items = []) {
  return listPackingActivityOptions(items).map((option) => ({
    category: option.activity === PACKING_ACTIVITY_MAIN ? '' : option.activity,
    categoryIcon: option.activityIcon,
    label: option.label,
  }));
}

/** Чипы категорий вещи для модалки: только канонические + «Без категории». */
export function mergePackingCategoryChips() {
  return [
    ...PACKING_SUGGESTED_CATEGORIES.map((opt) => ({
      category: opt.category,
      categoryIcon: opt.categoryIcon,
      label: formatPackingCategoryLabel(opt.category, opt.categoryIcon),
    })),
    {
      category: '',
      categoryIcon: '',
      label: PACKING_UNCATEGORIZED_LABEL,
    },
  ];
}

/** Прогресс вкладки «Мой рюкзак» — только вещи текущего пользователя. */
export function getPersonalPackingProgress(items, userId) {
  const personal = filterPersonalPackingItems(items, userId);
  const total = personal.length;
  if (total === 0) return { total: 0, checked: 0, percent: 0 };

  let checked = 0;
  for (const item of personal) {
    if (item.checked) checked += 1;
  }

  return {
    total,
    checked,
    percent: Math.round((checked / total) * 100),
  };
}

/** Прогресс шапки: общие пункты + личный рюкзак текущего пользователя. */
export function getPackingListProgress(list, userId) {
  const items = Array.isArray(list?.items) ? list.items : [];
  const common = filterCommonPackingItems(items);
  const personal = filterPersonalPackingItems(items, userId);
  const visible = [...common, ...personal];
  if (visible.length === 0) return { total: 0, checked: 0, percent: 0 };

  let checked = 0;
  for (const item of visible) {
    if (item.checked) checked += 1;
  }

  return {
    total: visible.length,
    checked,
    percent: Math.round((checked / visible.length) * 100),
  };
}

/** Снимок редактируемых полей для сравнения isDirty. */
export function createPackingEditableSnapshot(list, {
  isPublic,
  selectedIds,
  authorId,
} = {}) {
  const items = (Array.isArray(list?.items) ? list.items : []).map((item) =>
    normalizePackingItem(item),
  );
  const resolvedPublic = isPublic !== undefined
    ? Boolean(isPublic)
    : list?.isPublic !== false;
  const resolvedSelected = selectedIds !== undefined
    ? selectedIds
    : packingMembersToSelectedIds(list?.members, authorId || list?.createdBy);

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      scope: item.scope,
      type: item.type,
      activity: item.activity || PACKING_ACTIVITY_MAIN,
      activityIcon: item.activityIcon || '',
      category: item.category || '',
      categoryIcon: item.categoryIcon || '',
      assignedTo: item.assignedTo || null,
      ownerId: item.ownerId || null,
      // checked* не входят в dirty: отметки пишутся в облако сразу (как у покупок)
      statusMap: { ...(item.statusMap || {}) },
      bookingUrl: item.bookingUrl || '',
      note: item.note || '',
      quantity: item.quantity || '',
      dueDate: item.dueDate || '',
    })),
    isPublic: resolvedPublic,
    selectedIds: [...(Array.isArray(resolvedSelected) ? resolvedSelected : [])]
      .filter(Boolean)
      .sort(),
  };
}

export function packingEditableSnapshotsEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Собирает members для packing_lists: вся семья или выбранные + автор. */
export function resolvePackingMembers({
  isPublic,
  selectedIds = [],
  authorId,
  familyMemberIds = [],
} = {}) {
  const author = authorId ? [authorId] : [];
  if (isPublic) {
    return [...new Set([...author, ...familyMemberIds.filter(Boolean)])];
  }
  return [...new Set([...author, ...(Array.isArray(selectedIds) ? selectedIds : []).filter(Boolean)])];
}

/**
 * Видит ли пользователь список сборов.
 * Доступ: автор, members, sharedWithFamilyIds, либо своя семья (isPublic / legacy).
 */
export function canAccessPackingList(list, userId, {
  isFamilyAdmin = false,
  familyId = null,
  shareToken = null,
} = {}) {
  if (!list || !userId) return false;
  if (list.createdBy === userId) return true;

  // Гость по ссылке-приглашению (до/во время join)
  if (shareToken && list.shareInviteToken && list.shareInviteToken === shareToken) {
    return true;
  }

  const members = Array.isArray(list.members) ? list.members : null;
  if (members?.includes(userId)) return true;

  if (
    familyId
    && Array.isArray(list.sharedWithFamilyIds)
    && list.sharedWithFamilyIds.includes(familyId)
  ) {
    return true;
  }

  const sameFamily = Boolean(familyId && list.familyId === familyId);
  if (!sameFamily) {
    // Без familyId в опциях — прежняя эвристика для экрана списка
    if (!familyId) {
      if (isFamilyAdmin) return true;
      if (list.isPublic === true) return true;
      if (members === null) return true;
      return false;
    }
    return false;
  }

  if (isFamilyAdmin) return true;
  if (list.isPublic === true) return true;
  if (list.isPublic !== false && members === null) return true;
  if (members === null) return true;
  if (members.length === 0) return list.createdBy === userId;
  return false;
}

/** Ids для selectedIds в CreateListAccess (без автора). */
export function packingMembersToSelectedIds(members, authorId) {
  return (Array.isArray(members) ? members : []).filter((id) => id && id !== authorId);
}

/** Константы и хелперы для списков сборов / путешествий. */

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

export function normalizePackingItem(raw = {}) {
  const scope = raw.scope === PACKING_SCOPE.PERSONAL
    ? PACKING_SCOPE.PERSONAL
    : PACKING_SCOPE.COMMON;
  const type = raw.type === PACKING_ITEM_TYPE.TODO
    ? PACKING_ITEM_TYPE.TODO
    : PACKING_ITEM_TYPE.ITEM;
  const category = String(raw.category || '').trim();
  const categoryIcon = String(raw.categoryIcon || '').trim();

  return {
    id: raw.id || createPackingItemId(),
    name: String(raw.name || '').trim(),
    scope,
    type,
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

export const PACKING_UNCATEGORIZED_LABEL = 'Без категории';

/** Нормализует название раздела: пусто / «Без категории» → без category. */
export function resolvePackingCategoryRename(rawTitle, { keepIcon = '' } = {}) {
  const title = String(rawTitle || '').trim();
  if (!title || title === PACKING_UNCATEGORIZED_LABEL) {
    return { category: '', categoryIcon: '' };
  }

  const emojiMatch = title.match(
    /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s+(.+)$/u,
  );
  if (emojiMatch) {
    return {
      category: emojiMatch[2].trim(),
      categoryIcon: emojiMatch[1],
    };
  }

  return {
    category: title,
    categoryIcon: String(keepIcon || '').trim(),
  };
}

export function packingItemMatchesCategory(item, categoryKey) {
  const cat = String(item?.category || '').trim();
  const key = String(categoryKey || '').trim();
  if (!key || key === PACKING_UNCATEGORIZED_LABEL) {
    return !cat || cat === PACKING_UNCATEGORIZED_LABEL;
  }
  return cat === key;
}

/** Группирует пункты сборов по category; без категории — блок «Без категории» в конце. */
export function groupPackingItemsByCategory(items = []) {
  const buckets = new Map();
  const uncategorized = [];

  for (const item of Array.isArray(items) ? items : []) {
    const category = String(item?.category || '').trim();
    if (!category || category === PACKING_UNCATEGORIZED_LABEL) {
      uncategorized.push(item);
      continue;
    }
    if (!buckets.has(category)) {
      buckets.set(category, {
        category,
        categoryIcon: String(item?.categoryIcon || '').trim(),
        items: [],
      });
    }
    const bucket = buckets.get(category);
    if (!bucket.categoryIcon && item?.categoryIcon) {
      bucket.categoryIcon = String(item.categoryIcon).trim();
    }
    bucket.items.push(item);
  }

  const groups = [...buckets.values()];
  if (uncategorized.length > 0) {
    groups.push({
      category: '',
      categoryIcon: '',
      items: uncategorized,
    });
  }
  return groups;
}

export function formatPackingCategoryLabel(category, categoryIcon = '') {
  const title = String(category || '').trim();
  if (!title || title === PACKING_UNCATEGORIZED_LABEL) {
    return PACKING_UNCATEGORIZED_LABEL;
  }
  const icon = String(categoryIcon || '').trim();
  return icon ? `${icon} ${title}` : title;
}

/** Варианты разделов для переноса пункта (всегда включает «Без категории»). */
export function listPackingCategoryOptions(items = []) {
  const groups = groupPackingItemsByCategory(items);
  const options = groups.map((group) => ({
    category: group.category,
    categoryIcon: group.categoryIcon,
    label: formatPackingCategoryLabel(group.category, group.categoryIcon),
  }));

  if (!options.some((option) => !option.category)) {
    options.push({
      category: '',
      categoryIcon: '',
      label: PACKING_UNCATEGORIZED_LABEL,
    });
  }

  return options;
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
      category: item.category || '',
      categoryIcon: item.categoryIcon || '',
      assignedTo: item.assignedTo || null,
      ownerId: item.ownerId || null,
      // checked* не входят в dirty: отметки пишутся в облако сразу (как у покупок)
      statusMap: { ...(item.statusMap || {}) },
      bookingUrl: item.bookingUrl || '',
      note: item.note || '',
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

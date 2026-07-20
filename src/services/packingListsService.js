import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import {
  clonePackingItemsFromTemplate,
  createPackingItemId,
  normalizePackingItem,
  PACKING_SCOPE,
  packingTripAxesToPayload,
  resolvePackingMembers,
  canAccessPackingList,
} from '../utils/packingLists';
import { startOfDay } from '../utils/listSchedule';

function packingListsCol() {
  return collection(db, COLLECTIONS.PACKING_LISTS);
}

function packingListRef(listId) {
  return doc(db, COLLECTIONS.PACKING_LISTS, listId);
}

function toTravelDateTimestamp(travelDate) {
  if (!travelDate) return Timestamp.fromDate(startOfDay(new Date()));
  if (travelDate instanceof Timestamp) return travelDate;
  if (typeof travelDate?.toDate === 'function') {
    return Timestamp.fromDate(startOfDay(travelDate.toDate()));
  }
  return Timestamp.fromDate(startOfDay(travelDate instanceof Date ? travelDate : new Date(travelDate)));
}

function mapPackingListDoc(snapshot) {
  if (!snapshot?.exists()) return null;
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    items: Array.isArray(data.items)
      ? data.items.map((item) => normalizePackingItem(item))
      : [],
  };
}

export async function getFamilyPackingLists(familyId) {
  if (!familyId) return [];
  const snapshot = await getDocs(
    query(packingListsCol(), where('familyId', '==', familyId)),
  );
  return snapshot.docs
    .map((docSnap) => mapPackingListDoc(docSnap))
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

/**
 * Публичные сборы семьи (query-safe для не-админов).
 * Нельзя запрашивать все familyId сразу: приватный список без доступа → permission-denied на весь query.
 */
export async function getPublicFamilyPackingLists(familyId) {
  if (!familyId) return [];
  const snapshot = await getDocs(
    query(
      packingListsCol(),
      where('familyId', '==', familyId),
      where('isPublic', '==', true),
    ),
  );
  return snapshot.docs.map((docSnap) => mapPackingListDoc(docSnap)).filter(Boolean);
}

/** Сборы, где пользователь явно в members (в т.ч. совместные выезды). */
export async function getPackingListsForMember(userId) {
  if (!userId) return [];
  const snapshot = await getDocs(
    query(packingListsCol(), where('members', 'array-contains', userId)),
  );
  return snapshot.docs.map((docSnap) => mapPackingListDoc(docSnap)).filter(Boolean);
}

/** Сборы, расшаренные с семьёй через sharedWithFamilyIds. */
export async function getExternalSharedPackingLists(familyId) {
  if (!familyId) return [];
  const snapshot = await getDocs(
    query(packingListsCol(), where('sharedWithFamilyIds', 'array-contains', familyId)),
  );
  return snapshot.docs.map((docSnap) => mapPackingListDoc(docSnap)).filter(Boolean);
}

export function isPackingListArchived(list) {
  return Boolean(list?.archived || list?.status === 'archived');
}

/**
 * Списки для рабочего стола «Путешествия».
 * Как getHomePageLists: админ — весь familyId; иначе public ∪ members ∪ sharedWithFamilyIds.
 */
export async function getTravelDesktopPackingLists(
  userId,
  familyId,
  { isFamilyAdmin = false, includeArchived = false } = {},
) {
  if (!userId || !familyId) return [];

  const externalPromise = getExternalSharedPackingLists(familyId);

  let familyLists = [];
  if (isFamilyAdmin) {
    familyLists = await getFamilyPackingLists(familyId);
  } else {
    const [publicLists, memberLists] = await Promise.all([
      getPublicFamilyPackingLists(familyId),
      getPackingListsForMember(userId),
    ]);
    const byId = new Map();
    for (const list of [...publicLists, ...memberLists]) {
      if (!list?.id) continue;
      byId.set(list.id, list);
    }
    familyLists = [...byId.values()];
  }

  const externalLists = await externalPromise;
  const byId = new Map();
  for (const list of [...familyLists, ...externalLists]) {
    if (!list?.id) continue;
    byId.set(list.id, list);
  }

  return [...byId.values()]
    .filter((list) => canAccessPackingList(list, userId, { isFamilyAdmin, familyId }))
    .filter((list) => includeArchived || !isPackingListArchived(list))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function getPackingList(listId) {
  if (!listId) return null;
  const snapshot = await getDoc(packingListRef(listId));
  return mapPackingListDoc(snapshot);
}

export async function createPackingList({
  title,
  familyId,
  createdBy,
  isTemplate = false,
  items = [],
  templateId = null,
  isPublic = true,
  members = null,
  familyMemberIds = [],
  travelDate = null,
  description = '',
  groupByCategory = false,
  tripType = null,
  tripTransport = null,
  tripPurpose = null,
}) {
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) throw new Error('Укажите название списка');
  if (!familyId) throw new Error('Не удалось определить семью');
  if (!createdBy) throw new Error('Не удалось определить пользователя');

  let nextItems = Array.isArray(items)
    ? items
      .map((item) => {
        const normalized = normalizePackingItem(item);
        // Личные пункты без ownerId не видны ни в «Общих», ни в «Моём рюкзаке».
        if (normalized.scope === PACKING_SCOPE.PERSONAL && !normalized.ownerId) {
          return { ...normalized, ownerId: createdBy };
        }
        return normalized;
      })
      .filter((item) => item.name)
    : [];

  if (templateId) {
    const template = await getPackingList(templateId);
    if (!template || template.familyId !== familyId) {
      throw new Error('Шаблон не найден');
    }
    nextItems = clonePackingItemsFromTemplate(template.items);
  }

  const nextIsPublic = Boolean(isPublic);
  const nextMembers = resolvePackingMembers({
    isPublic: nextIsPublic,
    selectedIds: Array.isArray(members) ? members : [],
    authorId: createdBy,
    familyMemberIds,
  });

  const resolvedTravelDate = toTravelDateTimestamp(travelDate);
  const trimmedDescription = String(description || '').trim();
  const tripAxes = packingTripAxesToPayload({
    tripTransport,
    tripPurpose,
    tripType,
  });

  const ref = await addDoc(packingListsCol(), {
    title: trimmedTitle,
    familyId,
    createdBy,
    isTemplate: Boolean(isTemplate),
    isPublic: nextIsPublic,
    members: nextMembers,
    items: nextItems,
    description: trimmedDescription,
    groupByCategory: Boolean(groupByCategory),
    ...tripAxes,
    travelDate: resolvedTravelDate,
    tripStartDate: resolvedTravelDate,
    tripEndDate: resolvedTravelDate,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function archivePackingList(listId, userId) {
  if (!listId) throw new Error('Список не найден');
  if (!userId) throw new Error('Не удалось определить пользователя');
  await updateDoc(packingListRef(listId), {
    status: 'archived',
    archived: true,
    archivedAt: serverTimestamp(),
    archivedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function restorePackingList(listId) {
  if (!listId) throw new Error('Список не найден');
  await updateDoc(packingListRef(listId), {
    status: 'active',
    archived: false,
    archivedAt: null,
    archivedBy: null,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePackingList(listId, data) {
  await updateDoc(packingListRef(listId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePackingList(listId) {
  await deleteDoc(packingListRef(listId));
}

export async function replacePackingListItems(listId, items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => normalizePackingItem(item))
    .filter((item) => item.name);
  await updatePackingList(listId, { items: normalized });
  return normalized;
}

/** Клонирует активную поездку в новый документ-шаблон (поездка не меняется). */
export async function savePackingListAsTemplate(listId, { titleSuffix = ' (шаблон)' } = {}) {
  const source = await getPackingList(listId);
  if (!source) throw new Error('Список не найден');

  const templateTitle = source.isTemplate
    ? source.title
    : `${source.title}${titleSuffix}`;

  return createPackingList({
    title: templateTitle,
    familyId: source.familyId,
    createdBy: source.createdBy,
    isTemplate: true,
    items: clonePackingItemsFromTemplate(source.items),
    isPublic: source.isPublic !== false,
    members: Array.isArray(source.members) ? source.members : [source.createdBy],
    familyMemberIds: Array.isArray(source.members) ? source.members : [source.createdBy],
    travelDate: source.travelDate || source.tripStartDate || null,
    description: source.description || '',
    groupByCategory: Boolean(source.groupByCategory),
    tripTransport: source.tripTransport,
    tripPurpose: source.tripPurpose,
    tripType: source.tripType || source.tripTransport || 'car',
  });
}

/**
 * Повторить список сборов: новый документ с теми же пунктами (unchecked),
 * без статуса архива / шаблона.
 */
export async function repeatPackingList(sourceId, {
  createdBy,
  familyId,
  title = null,
  travelDate = null,
  familyMemberIds = [],
} = {}) {
  const source = await getPackingList(sourceId);
  if (!source) throw new Error('Список не найден');

  const nextFamilyId = familyId || source.familyId;
  const nextCreatedBy = createdBy || source.createdBy;
  if (!nextFamilyId) throw new Error('Не удалось определить семью');
  if (!nextCreatedBy) throw new Error('Не удалось определить пользователя');

  const nextTitle = String(title || source.title || '').trim() || 'Список сборов';
  const memberIds = Array.isArray(familyMemberIds) && familyMemberIds.length > 0
    ? familyMemberIds
    : (Array.isArray(source.members) ? source.members : [nextCreatedBy]);

  return createPackingList({
    title: nextTitle,
    familyId: nextFamilyId,
    createdBy: nextCreatedBy,
    isTemplate: false,
    items: clonePackingItemsFromTemplate(source.items),
    isPublic: source.isPublic !== false,
    members: memberIds,
    familyMemberIds: memberIds,
    travelDate: travelDate || source.travelDate || source.tripStartDate || null,
    description: source.description || '',
    groupByCategory: Boolean(source.groupByCategory),
    tripTransport: source.tripTransport,
    tripPurpose: source.tripPurpose,
    tripType: source.tripType || source.tripTransport || 'car',
  });
}

export async function addPackingItem(listId, {
  name,
  scope = PACKING_SCOPE.COMMON,
  type = 'item',
  assignedTo = null,
  ownerId = null,
}) {
  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');

  const item = normalizePackingItem({
    id: createPackingItemId(),
    name,
    scope,
    type,
    assignedTo: scope === PACKING_SCOPE.COMMON ? assignedTo : null,
    ownerId: scope === PACKING_SCOPE.PERSONAL ? ownerId : null,
    checked: false,
    statusMap: {},
  });
  if (!item.name) throw new Error('Введите название');

  const items = [...list.items, item];
  await replacePackingListItems(listId, items);
  return item;
}

/** Пакетное добавление пунктов (ИИ / импорт). */
export async function addPackingItemsBatch(listId, entries, {
  scope = PACKING_SCOPE.COMMON,
  type = 'item',
  assignedTo = null,
  ownerId = null,
} = {}) {
  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');

  const additions = (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const nextScope = entry?.scope || scope;
      return normalizePackingItem({
        id: createPackingItemId(),
        name: entry?.name,
        scope: nextScope,
        type: entry?.type || type,
        activity: entry?.activity ?? 'main',
        activityIcon: entry?.activityIcon || '',
        category: entry?.category || '',
        categoryIcon: entry?.categoryIcon || '',
        assignedTo: nextScope === PACKING_SCOPE.COMMON
          ? (entry?.assignedTo !== undefined ? entry.assignedTo : assignedTo)
          : null,
        ownerId: nextScope === PACKING_SCOPE.PERSONAL
          ? (entry?.ownerId || ownerId || null)
          : null,
        checked: false,
        statusMap: {},
      });
    })
    .filter((item) => item.name);

  if (additions.length === 0) return [];

  await replacePackingListItems(listId, [...list.items, ...additions]);
  return additions;
}

export async function toggleCommonPackingItem(listId, itemId, checked) {
  return togglePackingItemChecked(listId, itemId, { checked });
}

/** Отмечает пункт списка сборов в облаке (общие и личные). */
export async function togglePackingItemChecked(listId, itemId, {
  checked,
  checkedBy = null,
  checkedByUid = null,
  checkedByPhotoUrl = null,
  requireOwnerId = null,
} = {}) {
  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');

  let found = false;
  const items = list.items.map((item) => {
    if (item.id !== itemId) return item;
    found = true;
    if (
      requireOwnerId
      && (item.scope !== PACKING_SCOPE.PERSONAL || item.ownerId !== requireOwnerId)
    ) {
      throw new Error('Нельзя отметить чужой пункт рюкзака');
    }
    const nextChecked = Boolean(checked);
    return {
      ...item,
      checked: nextChecked,
      checkedBy: nextChecked ? (checkedBy || null) : null,
      checkedByUid: nextChecked ? (checkedByUid || null) : null,
      checkedByPhotoUrl: nextChecked ? (checkedByPhotoUrl || null) : null,
    };
  });

  if (!found) throw new Error('Пункт не найден');
  await replacePackingListItems(listId, items);
}

/** Отмечает пункт личного рюкзака (только ownerId === userId). */
export async function togglePersonalPackingItem(listId, itemId, userId, checked) {
  if (!userId) throw new Error('Не удалось определить пользователя');
  return togglePackingItemChecked(listId, itemId, {
    checked,
    checkedByUid: checked ? userId : null,
    requireOwnerId: userId,
  });
}

export async function updatePackingItemAssignee(listId, itemId, assignedTo) {
  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');

  const items = list.items.map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, assignedTo: assignedTo || null };
  });
  await replacePackingListItems(listId, items);
}

export async function removePackingItem(listId, itemId) {
  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');
  await replacePackingListItems(
    listId,
    list.items.filter((item) => item.id !== itemId),
  );
}

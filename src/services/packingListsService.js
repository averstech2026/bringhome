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
 * Списки для рабочего стола «Путешествия»:
 * своя familyId ∪ members∋uid ∪ sharedWithFamilyIds∋familyId.
 */
export async function getTravelDesktopPackingLists(
  userId,
  familyId,
  { isFamilyAdmin = false, includeArchived = false } = {},
) {
  if (!userId || !familyId) return [];

  const [byFamily, byMember, byShared] = await Promise.all([
    getFamilyPackingLists(familyId),
    getPackingListsForMember(userId),
    getExternalSharedPackingLists(familyId),
  ]);

  const byId = new Map();
  for (const list of [...byFamily, ...byMember, ...byShared]) {
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
}) {
  const trimmedTitle = String(title || '').trim();
  if (!trimmedTitle) throw new Error('Укажите название списка');
  if (!familyId) throw new Error('Не удалось определить семью');
  if (!createdBy) throw new Error('Не удалось определить пользователя');

  let nextItems = Array.isArray(items)
    ? items.map((item) => normalizePackingItem(item)).filter((item) => item.name)
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

  const ref = await addDoc(packingListsCol(), {
    title: trimmedTitle,
    familyId,
    createdBy,
    isTemplate: Boolean(isTemplate),
    isPublic: nextIsPublic,
    members: nextMembers,
    items: nextItems,
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
  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');

  const items = list.items.map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, checked: Boolean(checked) };
  });
  await replacePackingListItems(listId, items);
}

/** Отмечает пункт личного рюкзака (только ownerId === userId). */
export async function togglePersonalPackingItem(listId, itemId, userId, checked) {
  if (!userId) throw new Error('Не удалось определить пользователя');

  const list = await getPackingList(listId);
  if (!list) throw new Error('Список не найден');

  const items = list.items.map((item) => {
    if (item.id !== itemId) return item;
    if (item.scope !== PACKING_SCOPE.PERSONAL || item.ownerId !== userId) {
      return item;
    }
    return {
      ...item,
      checked: Boolean(checked),
      checkedByUid: checked ? userId : null,
    };
  });
  await replacePackingListItems(listId, items);
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

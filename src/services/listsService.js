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
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { DEFAULT_GROUP_ID, getListFamilyId } from '../utils/familyGroup';
import { getExternalSharedLists } from './listShareService';
import { buildBookingPayload } from '../utils/booking';
import { getFamily } from './familiesService';
import { findActiveItemByName, normalizeItemName } from '../utils/mergeItems';
import { addQuantities, parseQuantity, resetBaseQuantity } from '../utils/quantity';
import { computeListStatusFromItems } from '../utils/listStatus';
import { startOfDay } from '../utils/listSchedule';
import {
  LIST_TYPE_LABELS,
  formatListTitle,
  normalizeListTypeForCreate,
} from '../utils/listTypes';

export { LIST_TYPE_LABELS, formatListTitle, normalizeListTypeForCreate as normalizeListType };
export { decodeListTypeFromUrl, encodeListTypeForUrl, getListTypeLabel } from '../utils/listTypes';

function toScheduledForTimestamp(scheduledFor) {
  if (!scheduledFor) return null;
  return Timestamp.fromDate(startOfDay(scheduledFor));
}

export function buildListSchedulePatch({ scheduledFor = null, remindOnDay = false } = {}) {
  const scheduledDate = scheduledFor ? startOfDay(scheduledFor) : null;
  return {
    scheduledFor: toScheduledForTimestamp(scheduledDate),
    remindOnDay: Boolean(scheduledDate && remindOnDay),
  };
}

export async function createList({
  type = 'home',
  createdBy,
  isPublic = false,
  description = '',
  groupId = DEFAULT_GROUP_ID,
  familyId = groupId,
  allowedUsers,
  scheduledFor = null,
  remindOnDay = false,
}) {
  const resolvedType = normalizeListTypeForCreate(type);
  const resolvedFamilyId = familyId || groupId || DEFAULT_GROUP_ID;
  const scheduledDate = scheduledFor ? startOfDay(scheduledFor) : null;
  // Автор всегда имеет доступ; остальных участников выбирают ещё на экране создания.
  const resolvedAllowed = Array.isArray(allowedUsers) && allowedUsers.length > 0
    ? [...new Set([createdBy, ...allowedUsers.filter(Boolean)])]
    : [createdBy];

  let ownerFamilyName = null;
  let ownerFamilyAvatarUrl = null;
  try {
    const ownerFamily = await getFamily(resolvedFamilyId);
    ownerFamilyName = ownerFamily?.name || null;
    ownerFamilyAvatarUrl = ownerFamily?.avatarUrl || null;
  } catch {
    // необязательный снимок для карточек гостей
  }

  const ref = await addDoc(collection(db, COLLECTIONS.LISTS), {
    title: formatListTitle(resolvedType, scheduledDate || new Date()),
    description: description.trim() || '',
    type: resolvedType,
    isPublic,
    createdBy,
    familyId: resolvedFamilyId,
    groupId: resolvedFamilyId,
    allowedUsers: resolvedAllowed,
    ownerFamilyName,
    ownerFamilyAvatarUrl,
    viewedBy: { [createdBy]: true },
    status: 'active',
    archived: false,
    scheduledFor: toScheduledForTimestamp(scheduledDate),
    remindOnDay: Boolean(scheduledDate && remindOnDay),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateList(listId, data) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), data);
}

/** Отмечает список просмотренным текущим пользователем */
export async function markListViewed(listId, userId) {
  if (!listId || !userId) return;
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), {
    [`viewedBy.${userId}`]: true,
  });
}

export async function toggleListPublic(listId, isPublic) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), { isPublic });
}

export async function addUserToList(listId, userId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) return false;

  const data = snapshot.data();
  if (data.allowedUsers?.includes(userId)) return true;

  await updateDoc(listRef, {
    allowedUsers: arrayUnion(userId),
  });
  return true;
}

export async function removeUserFromList(listId, userId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) return false;

  const data = snapshot.data();
  if (data.createdBy === userId) return false;

  await updateDoc(listRef, {
    allowedUsers: arrayRemove(userId),
  });
  return true;
}

export async function toggleUserListAccess(listId, userId, hasAccess) {
  if (hasAccess) {
    return removeUserFromList(listId, userId);
  }
  return addUserToList(listId, userId);
}

export async function ensureListAccess(listId, userId, { isAdmin = false, userFamilyId } = {}) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);

  let snapshot;
  try {
    snapshot = await getDoc(listRef);
  } catch (err) {
    if (err?.code !== 'permission-denied') throw err;
    snapshot = null;
  }

  if (!snapshot?.exists()) {
    if (isAdmin) return { allowed: false, reason: 'not_found' };

    try {
      await updateDoc(listRef, { allowedUsers: arrayUnion(userId) });
      snapshot = await getDoc(listRef);
    } catch {
      return { allowed: false, reason: 'no_access' };
    }
  }

  if (!snapshot?.exists()) return { allowed: false, reason: 'not_found' };

  const data = snapshot.data();
  if (data.archived || data.status === 'archived') {
    return { allowed: false, reason: 'archived' };
  }
  if (isAdmin) {
    return { allowed: true, list: { id: snapshot.id, ...data } };
  }
  if (data.isPublic) return { allowed: true, list: { id: snapshot.id, ...data } };
  if (data.createdBy === userId) return { allowed: true, list: { id: snapshot.id, ...data } };
  if (userFamilyId && data.sharedWithFamilyIds?.includes(userFamilyId)) {
    return { allowed: true, list: { id: snapshot.id, ...data } };
  }
  if (data.allowedUsers?.includes(userId)) {
    return { allowed: true, list: { id: snapshot.id, ...data } };
  }

  try {
    await updateDoc(listRef, { allowedUsers: arrayUnion(userId) });
  } catch {
    return { allowed: false, reason: 'no_access' };
  }

  return { allowed: true, list: { id: snapshot.id, ...data }, joined: true };
}

export async function ensureArchivedListAccess(listId) {
  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.LISTS, listId));
    if (!snapshot.exists()) return { allowed: false, reason: 'not_found' };

    const data = snapshot.data();
    if (!isListArchived(data)) return { allowed: false, reason: 'not_archived' };

    return {
      allowed: true,
      list: { id: snapshot.id, ...data },
      readOnly: true,
    };
  } catch {
    return { allowed: false, reason: 'no_access' };
  }
}

function isListArchived(list) {
  return Boolean(list.archived || list.status === 'archived');
}

export async function getUserLists(userId, { includeArchived = false, familyId } = {}) {
  const constraints = [where('allowedUsers', 'array-contains', userId)];
  if (familyId) {
    constraints.unshift(where('familyId', '==', familyId));
  }

  const q = query(collection(db, COLLECTIONS.LISTS), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => {
      if (familyId && getListFamilyId(list) !== familyId) return false;
      return includeArchived || !isListArchived(list);
    })
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getPublicFamilyLists(familyId, { includeArchived = false } = {}) {
  if (!familyId) return [];

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.LISTS),
      where('familyId', '==', familyId),
      where('isPublic', '==', true),
    ),
  );

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => includeArchived || !isListArchived(list))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

/** Списки для главного экрана: учитывает роль и ограничения Firestore rules */
export async function getHomePageLists(userId, familyId, { isFamilyAdmin = false, includeArchived = false } = {}) {
  if (!userId || !familyId) return [];

  const externalListsPromise = getExternalSharedLists(familyId, { includeArchived });

  let familyLists = [];
  if (isFamilyAdmin) {
    familyLists = await getFamilyLists(familyId, { includeArchived });
  } else {
    const [personalLists, publicLists] = await Promise.all([
      getUserLists(userId, { familyId, includeArchived }),
      getPublicFamilyLists(familyId, { includeArchived }),
    ]);
    const listsById = new Map();
    for (const list of [...personalLists, ...publicLists]) {
      listsById.set(list.id, list);
    }
    familyLists = [...listsById.values()];
  }

  const externalLists = await externalListsPromise;
  const listsById = new Map();
  for (const list of [...familyLists, ...externalLists]) {
    listsById.set(list.id, list);
  }

  return [...listsById.values()].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function getFamilyLists(familyId, { includeArchived = false } = {}) {
  if (!familyId) return [];

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.LISTS), where('familyId', '==', familyId)),
  );

  const listsById = new Map(
    snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
  );

  if (familyId === DEFAULT_GROUP_ID) {
    const legacySnapshot = await getDocs(
      query(collection(db, COLLECTIONS.LISTS), where('groupId', '==', familyId)),
    );
    for (const docSnap of legacySnapshot.docs) {
      if (!docSnap.data().familyId && !listsById.has(docSnap.id)) {
        listsById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      }
    }

    const noFamilySnapshot = await getDocs(collection(db, COLLECTIONS.LISTS));
    for (const docSnap of noFamilySnapshot.docs) {
      const data = docSnap.data();
      if (!data.familyId && !data.groupId && !listsById.has(docSnap.id)) {
        listsById.set(docSnap.id, { id: docSnap.id, ...data });
      }
    }
  }

  return [...listsById.values()]
    .filter((list) => includeArchived || !isListArchived(list))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getAllLists({ includeArchived = false } = {}) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LISTS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => includeArchived || !isListArchived(list))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getGroupLists(groupId, { includeArchived = true } = {}) {
  return getFamilyLists(groupId, { includeArchived });
}

function getListSortTime(list) {
  if (isListArchived(list)) {
    return list.archivedAt?.toMillis?.() ?? list.createdAt?.toMillis?.() ?? 0;
  }
  return list.updatedAt?.toMillis?.() ?? list.createdAt?.toMillis?.() ?? 0;
}

export async function getArchivedLists() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LISTS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => isListArchived(list))
    .sort((a, b) => {
      const ta = a.archivedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const tb = b.archivedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getUserArchivedLists(userId, { familyId } = {}) {
  const constraints = [where('allowedUsers', 'array-contains', userId)];
  if (familyId) {
    constraints.unshift(where('familyId', '==', familyId));
  }

  const q = query(collection(db, COLLECTIONS.LISTS), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => {
      if (familyId && getListFamilyId(list) !== familyId) return false;
      return isListArchived(list);
    })
    .sort((a, b) => {
      const ta = a.archivedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const tb = b.archivedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function archiveList(listId, userId) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), {
    status: 'archived',
    archived: true,
    archivedAt: serverTimestamp(),
    archivedBy: userId,
  });
}

export async function restoreList(listId) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), {
    archived: false,
    archivedAt: null,
    archivedBy: null,
  });
  await syncListStatus(listId);
}

export async function deleteList(listId) {
  const itemsQuery = query(
    collection(db, COLLECTIONS.ITEMS),
    where('listId', '==', listId),
  );
  const itemsSnapshot = await getDocs(itemsQuery);

  const batch = writeBatch(db);
  itemsSnapshot.docs.forEach((itemDoc) => batch.delete(itemDoc.ref));
  batch.delete(doc(db, COLLECTIONS.LISTS, listId));
  await batch.commit();
}

export async function getListItems(listId) {
  const q = query(
    collection(db, COLLECTIONS.ITEMS),
    where('listId', '==', listId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function prepareItemsForRepeat(items) {
  return items.map((item) => ({
    name: item.name,
    quantity: resetBaseQuantity(item.quantity),
    category: item.category || 'Прочее',
    comment: item.comment?.trim() || null,
  }));
}

export async function getListItemsForRepeat(listId) {
  const items = await getListItems(listId);
  return prepareItemsForRepeat(items);
}

/** Прогресс по спискам: { [listId]: { total, checked, percent } } */
async function fetchItemsProgressChunk(listIds) {
  const chunkProgress = Object.fromEntries(
    listIds.map((id) => [id, { total: 0, checked: 0, percent: 0 }]),
  );

  if (listIds.length === 0) return chunkProgress;

  try {
    const q = query(
      collection(db, COLLECTIONS.ITEMS),
      where('listId', 'in', listIds),
    );
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((d) => {
      const { listId, checked } = d.data();
      if (!chunkProgress[listId]) {
        chunkProgress[listId] = { total: 0, checked: 0, percent: 0 };
      }
      chunkProgress[listId].total += 1;
      if (checked) chunkProgress[listId].checked += 1;
    });

    return chunkProgress;
  } catch {
    const results = await Promise.all(
      listIds.map(async (listId) => {
        try {
          const single = await fetchItemsProgressChunk([listId]);
          return [listId, single[listId]];
        } catch {
          return [listId, { total: 0, checked: 0, percent: 0 }];
        }
      }),
    );

    return Object.fromEntries(results);
  }
}

export async function getItemsProgressByListIds(listIds) {
  const progress = Object.fromEntries(
    listIds.map((id) => [id, { total: 0, checked: 0, percent: 0 }]),
  );

  if (listIds.length === 0) return progress;

  const chunkSize = 10;
  for (let i = 0; i < listIds.length; i += chunkSize) {
    const chunk = listIds.slice(i, i + chunkSize);
    const chunkProgress = await fetchItemsProgressChunk(chunk);

    for (const [listId, value] of Object.entries(chunkProgress)) {
      progress[listId] = value;
    }
  }

  listIds.forEach((id) => {
    const { total, checked } = progress[id];
    progress[id].percent = total === 0 ? 0 : Math.round((checked / total) * 100);
  });

  return progress;
}

export async function addItem(
  listId,
  { name, quantity = '1 шт', category = 'Прочее', comment = '' },
) {
  const trimmedName = normalizeItemName(name);
  if (!trimmedName) return;

  const existingItems = await getListItems(listId);
  const existing = findActiveItemByName(existingItems, trimmedName);

  if (existing) {
    const update = {
      quantity: addQuantities(existing.quantity, quantity),
    };
    if (comment && !existing.comment) update.comment = comment.trim();
    await updateDoc(doc(db, COLLECTIONS.ITEMS, existing.id), update);
  } else {
    await addDoc(collection(db, COLLECTIONS.ITEMS), {
      listId,
      name: trimmedName,
      quantity,
      category,
      comment: comment.trim() || null,
      checked: false,
      checkedBy: null,
      bookedBy: null,
    });
  }

  await syncListStatus(listId);

  return existing?.id;
}

export async function updateItemQuantity(itemId, quantity) {
  await updateDoc(doc(db, COLLECTIONS.ITEMS, itemId), { quantity });
}

export async function updateItemCategory(itemId, category) {
  await updateDoc(doc(db, COLLECTIONS.ITEMS, itemId), { category });
}

export async function updateItemComment(itemId, comment) {
  await updateDoc(doc(db, COLLECTIONS.ITEMS, itemId), {
    comment: comment?.trim() || null,
  });
}

export async function updateItemBooking(itemId, bookedBy, bookingMeta = {}) {
  const payload = typeof bookedBy === 'object' && bookedBy !== null
    ? buildBookingPayload(bookedBy.bookedBy, bookedBy)
    : buildBookingPayload(bookedBy, bookingMeta);

  await updateDoc(doc(db, COLLECTIONS.ITEMS, itemId), payload);
}

export async function updateItemsBookingBatch(updates) {
  if (!updates?.length) return;

  const batch = writeBatch(db);
  for (const update of updates) {
    const { itemId, bookedBy, ...meta } = update;
    const payload = typeof bookedBy === 'object' && bookedBy !== null
      ? buildBookingPayload(bookedBy.bookedBy, bookedBy)
      : buildBookingPayload(bookedBy, meta);

    batch.update(doc(db, COLLECTIONS.ITEMS, itemId), payload);
  }
  await batch.commit();
}

export async function clearAllListItems(listId) {
  const items = await getListItems(listId);
  if (items.length === 0) return;

  const batch = writeBatch(db);
  items.forEach((item) => batch.delete(doc(db, COLLECTIONS.ITEMS, item.id)));
  await batch.commit();
  await syncListStatus(listId);
}

export async function deleteItem(itemId) {
  const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
  const itemSnap = await getDoc(itemRef);
  const listId = itemSnap.data()?.listId;

  await deleteDoc(itemRef);

  if (listId) await syncListStatus(listId);
}

export async function createActualList({
  type,
  createdBy,
  items = [],
  description = '',
  groupId,
  familyId,
  isPublic = false,
  allowedUsers,
  scheduledFor = null,
  remindOnDay = false,
}) {
  const resolvedFamilyId = familyId || groupId;
  const listId = await createList({
    type: normalizeListTypeForCreate(type),
    createdBy,
    description,
    groupId: resolvedFamilyId,
    familyId: resolvedFamilyId,
    isPublic,
    allowedUsers,
    scheduledFor,
    remindOnDay,
  });
  if (items.length > 0) {
    await addItemsBatch(listId, items);
  } else {
    await syncListStatus(listId);
  }
  return listId;
}

export async function addItemsBatch(listId, items) {
  const existingItems = await getListItems(listId);
  const updatesById = new Map();
  const pendingNew = [];

  for (const incoming of items) {
    const trimmedName = normalizeItemName(incoming.name);
    if (!trimmedName) continue;
    const key = normalizeItemName(trimmedName);
    const quantity = incoming.quantity || '1 шт';
    const comment = incoming.comment?.trim() || null;

    const pending = pendingNew.find((p) => normalizeItemName(p.name) === key);
    if (pending) {
      pending.quantity = addQuantities(pending.quantity, quantity);
      if (comment && !pending.comment) pending.comment = comment;
      continue;
    }

    const activeExisting = existingItems.find(
      (item) => normalizeItemName(item.name) === key && !item.checked,
    );

    if (activeExisting) {
      const current = updatesById.get(activeExisting.id) ?? {
        quantity: activeExisting.quantity,
        comment: activeExisting.comment,
      };
      updatesById.set(activeExisting.id, {
        quantity: addQuantities(current.quantity, quantity),
        comment: comment || current.comment || null,
      });
      continue;
    }

    pendingNew.push({
      name: trimmedName,
      quantity,
      category: incoming.category || 'Прочее',
      comment,
      checked: Boolean(incoming.checked),
      checkedBy: incoming.checked ? incoming.checkedBy : null,
      bookedBy: incoming.bookedBy || null,
    });
  }

  if (updatesById.size === 0 && pendingNew.length === 0) return;

  const batch = writeBatch(db);

  for (const [itemId, update] of updatesById) {
    const payload = { quantity: update.quantity };
    if (update.comment) payload.comment = update.comment;
    batch.update(doc(db, COLLECTIONS.ITEMS, itemId), payload);
  }

  for (const item of pendingNew) {
    const ref = doc(collection(db, COLLECTIONS.ITEMS));
    batch.set(ref, {
      listId,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      comment: item.comment,
      checked: item.checked,
      checkedBy: item.checkedBy,
      bookedBy: item.bookedBy || null,
      checkedAt: item.checked ? serverTimestamp() : null,
    });
  }

  await batch.commit();
  await syncListStatus(listId);
}

export async function syncListStatus(listId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists()) return;

  const listData = listSnap.data();
  if (listData.archived || listData.status === 'archived') return;

  const items = await getListItems(listId);
  const status = computeListStatusFromItems(items);

  if (listData.status !== status) {
    await updateDoc(listRef, { status });
  }
}

export async function toggleItem(itemId, { checked, checkedBy, checkedByUid, checkedByPhotoUrl }) {
  const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
  const itemSnap = await getDoc(itemRef);
  const listId = itemSnap.data()?.listId;

  await updateDoc(itemRef, {
    checked,
    checkedBy: checked ? checkedBy : null,
    checkedByUid: checked ? (checkedByUid || null) : null,
    checkedByPhotoUrl: checked ? (checkedByPhotoUrl || null) : null,
    checkedAt: checked ? serverTimestamp() : null,
    ...(checked
      ? {
          bookedBy: null,
          bookedByFamilyId: null,
          bookedByFamilyName: null,
          bookedByUid: null,
        }
      : {}),
  });

  if (listId) await syncListStatus(listId);
}

export async function searchProductHistory(userId, searchText) {
  if (!searchText.trim()) return [];

  const q = query(
    collection(db, COLLECTIONS.PRODUCT_HISTORY),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(q);
  const lower = normalizeItemName(searchText);

  const seen = new Set();
  const names = [];

  snapshot.docs.forEach((d) => {
    const name = normalizeItemName(d.data().name);
    if (!name || !name.includes(lower) || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  });

  return names.sort((a, b) => a.localeCompare(b, 'ru')).slice(0, 8);
}

export async function getProductHistoryUnit(userId, name) {
  const trimmed = normalizeItemName(name);
  if (!trimmed) return null;

  const q = query(
    collection(db, COLLECTIONS.PRODUCT_HISTORY),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(q);
  const match = snapshot.docs.find((d) => normalizeItemName(d.data().name) === trimmed);
  if (!match) return null;

  const data = match.data();
  if (!data.quantity) return null;

  return parseQuantity(data.quantity).unit;
}

export async function saveToProductHistory(userId, name, quantity = null) {
  const trimmed = normalizeItemName(name);
  if (!trimmed) return;

  const q = query(
    collection(db, COLLECTIONS.PRODUCT_HISTORY),
    where('userId', '==', userId),
  );
  const existing = await getDocs(q);
  const alreadySaved = existing.docs.some((d) => normalizeItemName(d.data().name) === trimmed);
  if (alreadySaved) return;

  await addDoc(collection(db, COLLECTIONS.PRODUCT_HISTORY), {
    userId,
    name: trimmed,
    ...(quantity ? { quantity } : {}),
  });
}

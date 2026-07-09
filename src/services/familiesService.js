import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { DEFAULT_GROUP_ID } from '../utils/familyGroup';
import { normalizeAiUsage, resolveFamilyAiLimitMonth } from '../utils/aiLimits';
import { ROLES } from '../utils/roles';

export const DEFAULT_FAMILY_LIMITS = {
  maxUsers: 5,
  maxLists: 20,
  aiRequests: 30,
};

export { resolveFamilyAiLimitMonth };

/** Краткое описание лимитов семьи для UI */
export function formatFamilyLimitsSummary(limits, family = null) {
  const maxUsers = limits?.maxUsers ?? DEFAULT_FAMILY_LIMITS.maxUsers;
  const maxLists = limits?.maxLists ?? DEFAULT_FAMILY_LIMITS.maxLists;
  const aiLimitMonth = family
    ? resolveFamilyAiLimitMonth(family)
    : (limits?.aiRequests ?? DEFAULT_FAMILY_LIMITS.aiRequests);
  return `до ${maxUsers} участников, ${maxLists} списков, ${aiLimitMonth} ИИ-запросов/мес.`;
}

export async function updateFamilyName(familyId, name) {
  const trimmed = name?.trim();
  if (!familyId) throw new Error('Семья не найдена');
  if (!trimmed) throw new Error('Введите название семьи');

  await updateDoc(doc(db, COLLECTIONS.FAMILIES, familyId), {
    name: trimmed,
  });
}

function normalizeFamilyLimitsPayload(limits) {
  const maxUsers = Math.max(1, Number(limits?.maxUsers ?? DEFAULT_FAMILY_LIMITS.maxUsers));
  const maxLists = Math.max(1, Number(limits?.maxLists ?? DEFAULT_FAMILY_LIMITS.maxLists));
  const aiLimitMonth = Math.max(0, Number(limits?.aiRequests ?? limits?.aiLimitMonth ?? DEFAULT_FAMILY_LIMITS.aiRequests));

  return {
    maxUsers,
    maxLists,
    aiRequests: aiLimitMonth,
    aiLimitMonth,
  };
}

export async function updateFamilyLimits(familyId, limits) {
  if (!familyId) throw new Error('Семья не найдена');

  const { maxUsers, maxLists, aiRequests, aiLimitMonth } = normalizeFamilyLimitsPayload(limits);

  await updateDoc(doc(db, COLLECTIONS.FAMILIES, familyId), {
    aiLimitMonth,
    limits: { maxUsers, maxLists, aiRequests },
  });

  return { maxUsers, maxLists, aiRequests, aiLimitMonth };
}

export async function createFamily({ name, ownerId, limits, createdBy = null }, firestore = db) {
  const ref = doc(collection(firestore, COLLECTIONS.FAMILIES));
  const { maxUsers, maxLists, aiRequests, aiLimitMonth } = normalizeFamilyLimitsPayload(limits);

  await setDoc(ref, {
    name: name?.trim() || 'Моя семья',
    ownerId,
    aiLimitMonth,
    limits: { maxUsers, maxLists, aiRequests },
    createdAt: serverTimestamp(),
    createdBy,
  });

  return ref.id;
}

export async function getFamily(familyId) {
  if (!familyId) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.FAMILIES, familyId));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function getAllFamilies() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.FAMILIES));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getFamilyMembers(familyId) {
  if (!familyId) return [];
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where('familyId', '==', familyId)),
  );

  const membersById = new Map(
    snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
  );

  if (familyId === DEFAULT_GROUP_ID) {
    const legacySnapshot = await getDocs(
      query(collection(db, COLLECTIONS.USERS), where('groupId', '==', familyId)),
    );
    for (const docSnap of legacySnapshot.docs) {
      if (!docSnap.data().familyId && !membersById.has(docSnap.id)) {
        membersById.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
      }
    }
  }

  return [...membersById.values()]
    .filter((u) => !u.disabled)
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'ru'));
}

export async function getFamilyUsageStats(familyId) {
  const [members, listsSnapshot, family] = await Promise.all([
    getFamilyMembers(familyId),
    getDocs(query(collection(db, COLLECTIONS.LISTS), where('familyId', '==', familyId))),
    getFamily(familyId),
  ]);

  const lists = listsSnapshot.docs.map((d) => d.data());
  const activeLists = lists.filter((l) => !l.archived && l.status !== 'archived');

  const aiUsed = members.reduce((sum, member) => {
    return sum + normalizeAiUsage(member.aiUsage).monthly.count;
  }, 0);

  const owner = members.find((m) => m.id === family?.ownerId)
    || members.find((m) => m.role === ROLES.FAMILY_ADMIN);

  return {
    usersCount: members.length,
    listsCount: activeLists.length,
    aiUsed,
    owner,
    members,
    family,
  };
}

export async function updateFamilyMemberByAdmin(
  familyId,
  memberId,
  { role, isChild, aiLimitMonth },
  { actorId },
) {
  const memberRef = doc(db, COLLECTIONS.USERS, memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) throw new Error('Участник не найден');

  const member = memberSnap.data();
  if (member.familyId !== familyId) throw new Error('Участник не из вашей семьи');
  if (memberId === actorId && role && role !== member.role) {
    throw new Error('Нельзя изменить свою роль');
  }

  const payload = {};

  if (role === ROLES.FAMILY_ADMIN || role === ROLES.MEMBER) {
    payload.role = role;
    if (role === ROLES.FAMILY_ADMIN) {
      payload.isChild = false;
    }
  }

  if (typeof isChild === 'boolean') {
    payload.isChild = isChild;
    if (isChild) {
      payload.uiTheme = 'hogwarts';
    }
  }

  if (aiLimitMonth !== undefined) {
    if (aiLimitMonth == null || aiLimitMonth === '') {
      payload.aiLimitMonth = deleteField();
      payload.aiLimits = deleteField();
    } else {
      payload.aiLimitMonth = Math.max(0, Number(aiLimitMonth));
      payload.aiLimits = deleteField();
    }
  }

  if (Object.keys(payload).length === 0) return;
  await updateDoc(memberRef, payload);
}

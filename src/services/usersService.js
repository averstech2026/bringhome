import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS, firebaseConfig, auth } from '../firebase';
import { compressImageToDataUrl } from '../utils/compressImage';
import { DEFAULT_GROUP_ID, getFamilyId } from '../utils/familyGroup';
import { DEFAULT_AI_LIMITS, deriveAiLimitsFromMonthly } from '../utils/aiLimits';
import { UI_THEME_IDS } from '../utils/uiThemes';
import { ROLES, normalizeRole, isSuperAdmin, PLATFORM_OWNER_EMAIL } from '../utils/roles';
import { createFamily } from './familiesService';

export const OWNER_EMAIL = PLATFORM_OWNER_EMAIL;

export function isOwnerEmail(email) {
  return email === OWNER_EMAIL;
}

async function assertNotOwner(userId) {
  const profile = await getUserProfile(userId);
  if (profile && isOwnerEmail(profile.email)) {
    throw new Error('Нельзя изменить аккаунт владельца');
  }
}

export async function getPlatformAdminUid() {
  const snapshot = await getDoc(doc(db, COLLECTIONS.CONFIG, 'setup'));
  return snapshot.exists() ? snapshot.data()?.adminUid || null : null;
}

export async function isAppInitialized() {
  const snapshot = await getDoc(doc(db, COLLECTIONS.CONFIG, 'setup'));
  return snapshot.exists() && snapshot.data().initialized === true;
}

export async function createBootstrapAdmin({ email, password, displayName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }

  const resolvedName = displayName || email.split('@')[0];
  const familyId = await createFamily({
    name: 'Платформа',
    ownerId: cred.user.uid,
    limits: { maxUsers: 100, maxLists: 500, aiRequests: 9999 },
    createdBy: cred.user.uid,
  });

  await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
    email,
    displayName: resolvedName,
    role: ROLES.SUPER_ADMIN,
    disabled: false,
    familyId,
    groupId: familyId,
    isChild: false,
    uiTheme: 'default',
    aiLimits: { ...DEFAULT_AI_LIMITS },
    aiUsage: {
      daily: { count: 0, periodKey: '' },
      weekly: { count: 0, periodKey: '' },
      monthly: { count: 0, periodKey: '' },
      total: 0,
    },
    createdAt: serverTimestamp(),
    createdBy: null,
  });

  await setDoc(doc(db, COLLECTIONS.CONFIG, 'setup'), {
    initialized: true,
    groupId: DEFAULT_GROUP_ID,
    createdAt: serverTimestamp(),
    adminUid: cred.user.uid,
  });

  return cred.user;
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function getFamilyMembers(
  familyIdOrProfile,
  { includeDisabled = false, sortBy = 'name', includeLegacy = true } = {},
) {
  const familyId = typeof familyIdOrProfile === 'string'
    ? familyIdOrProfile
    : getFamilyId(familyIdOrProfile);

  if (!familyId) return [];

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where('familyId', '==', familyId)),
  );

  const membersById = new Map(
    snapshot.docs.map((d) => [d.id, { id: d.id, ...d.data() }]),
  );

  // Legacy: только для старой семьи `family` и только если явно разрешено
  if (includeLegacy && familyId === DEFAULT_GROUP_ID) {
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
    .filter((u) => includeDisabled || !u.disabled)
    .sort((a, b) => {
      if (sortBy === 'createdAt') {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      }
      return (a.displayName || '').localeCompare(b.displayName || '', 'ru');
    });
}

export async function getAdminUsers() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => {
      const role = normalizeRole(u.role);
      return (role === ROLES.SUPER_ADMIN || role === ROLES.FAMILY_ADMIN) && !u.disabled;
    })
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'ru'));
}

export async function getAllUsers() {
  const q = query(collection(db, COLLECTIONS.USERS), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createUserAsAdmin({
  email,
  password,
  displayName,
  createdBy,
  role = ROLES.MEMBER,
  aiLimits,
  isChild = false,
  uiTheme = 'default',
  familyId,
}) {
  const creatorProfile = createdBy ? await getUserProfile(createdBy) : null;
  const resolvedFamilyId = familyId || getFamilyId(creatorProfile);

  const secondaryApp = initializeApp(firebaseConfig, `AdminCreate_${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  const normalizedRole = normalizeRole(role);
  const normalizedTheme = UI_THEME_IDS.includes(uiTheme) ? uiTheme : 'default';
  const isAdminRole = normalizedRole === ROLES.SUPER_ADMIN || normalizedRole === ROLES.FAMILY_ADMIN;

  const explicitAiLimitMonth = aiLimits?.monthly != null
    ? Math.max(0, Number(aiLimits.monthly))
    : (aiLimits?.aiLimitMonth != null ? Math.max(0, Number(aiLimits.aiLimitMonth)) : undefined);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    const userPayload = {
      email,
      displayName: displayName || email.split('@')[0],
      role: normalizedRole,
      disabled: false,
      familyId: resolvedFamilyId,
      groupId: resolvedFamilyId,
      isChild: isAdminRole ? false : Boolean(isChild),
      uiTheme: isChild && !isAdminRole ? 'hogwarts' : normalizedTheme,
      aiUsage: {
        daily: { count: 0, periodKey: '' },
        weekly: { count: 0, periodKey: '' },
        monthly: { count: 0, periodKey: '' },
        total: 0,
      },
      createdAt: serverTimestamp(),
      createdBy,
    };

    if (aiLimits && (aiLimits.daily != null || aiLimits.weekly != null || aiLimits.monthly != null)) {
      userPayload.aiLimits = {
        daily: Math.max(0, Number(aiLimits.daily ?? DEFAULT_AI_LIMITS.daily)),
        weekly: Math.max(0, Number(aiLimits.weekly ?? DEFAULT_AI_LIMITS.weekly)),
        monthly: Math.max(0, Number(aiLimits.monthly ?? DEFAULT_AI_LIMITS.monthly)),
      };
    } else if (explicitAiLimitMonth != null) {
      userPayload.aiLimitMonth = explicitAiLimitMonth;
    } else if (!resolvedFamilyId) {
      userPayload.aiLimits = deriveAiLimitsFromMonthly(DEFAULT_AI_LIMITS.monthly);
    }

    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), userPayload);

    await signOut(secondaryAuth);
    return cred.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function setUserDisabled(userId, disabled) {
  await assertNotOwner(userId);
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { disabled });
}

export async function setUserRole(userId, role) {
  const normalized = normalizeRole(role);
  if (![ROLES.SUPER_ADMIN, ROLES.FAMILY_ADMIN, ROLES.MEMBER].includes(normalized)) {
    throw new Error('Недопустимая роль');
  }
  await assertNotOwner(userId);
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { role: normalized });
}

export async function updateUserAsAdmin(
  userId,
  { displayName, role, isChild, uiTheme, aiLimits },
  { currentUserId } = {},
) {
  await assertNotOwner(userId);

  const payload = {};

  if (displayName?.trim()) {
    payload.displayName = displayName.trim();
  }

  if (uiTheme != null) {
    payload.uiTheme = UI_THEME_IDS.includes(uiTheme) ? uiTheme : 'default';
  }

  const normalizedRole = role ? normalizeRole(role) : null;
  const adminRoles = [ROLES.SUPER_ADMIN, ROLES.FAMILY_ADMIN];

  if (normalizedRole) {
    if (userId !== currentUserId) {
      payload.role = normalizedRole;
    }

    if (adminRoles.includes(normalizedRole)) {
      payload.isChild = false;
    } else if (typeof isChild === 'boolean') {
      payload.isChild = isChild;
      if (isChild) payload.uiTheme = 'hogwarts';
    }
  } else if (typeof isChild === 'boolean') {
    payload.isChild = isChild;
    if (isChild) payload.uiTheme = 'hogwarts';
  }

  if (aiLimits && normalizedRole !== ROLES.SUPER_ADMIN) {
    payload.aiLimits = {
      daily: Math.max(0, Number(aiLimits.daily ?? DEFAULT_AI_LIMITS.daily)),
      weekly: Math.max(0, Number(aiLimits.weekly ?? DEFAULT_AI_LIMITS.weekly)),
      monthly: Math.max(0, Number(aiLimits.monthly ?? DEFAULT_AI_LIMITS.monthly)),
    };
    payload.aiLimitMonth = deleteField();
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.USERS, userId), payload);
}

export async function setUserProfileSettings(userId, { isChild, uiTheme }) {
  await assertNotOwner(userId);

  const payload = {};

  if (typeof isChild === 'boolean') {
    payload.isChild = isChild;
    if (isChild) payload.uiTheme = 'hogwarts';
  }

  if (uiTheme != null && !payload.uiTheme) {
    payload.uiTheme = UI_THEME_IDS.includes(uiTheme) ? uiTheme : 'default';
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.USERS, userId), payload);
}

export async function updateOwnUiTheme(userId, uiTheme) {
  const normalized = UI_THEME_IDS.includes(uiTheme) ? uiTheme : 'default';
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { uiTheme: normalized });
}

export async function updateUserAvatar(user, file) {
  const avatarUrl = await compressImageToDataUrl(file);

  await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { avatarUrl });

  return avatarUrl;
}

export async function removeUserAvatar(user) {
  await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { avatarUrl: null });
}

export { isSuperAdmin };
export { setUserAiLimits } from './aiUsageService';

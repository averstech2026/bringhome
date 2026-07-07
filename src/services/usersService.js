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
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS, firebaseConfig, auth } from '../firebase';
import { compressImageToDataUrl } from '../utils/compressImage';
import { DEFAULT_GROUP_ID } from '../utils/familyGroup';
import { DEFAULT_AI_LIMITS } from '../utils/aiLimits';
import { UI_THEME_IDS } from '../utils/uiThemes';

export const OWNER_EMAIL = 'inert@mail.ru';

export function isOwnerEmail(email) {
  return email === OWNER_EMAIL;
}

async function assertNotOwner(userId) {
  const profile = await getUserProfile(userId);
  if (profile && isOwnerEmail(profile.email)) {
    throw new Error('Нельзя изменить аккаунт владельца');
  }
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

  await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
    email,
    displayName: displayName || email.split('@')[0],
    role: 'admin',
    disabled: false,
    groupId: DEFAULT_GROUP_ID,
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

export async function getFamilyMembers() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => !u.disabled)
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'ru'));
}

export async function getAdminUsers() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => u.role === 'admin' && !u.disabled)
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
  role = 'user',
  aiLimits,
  isChild = false,
  uiTheme = 'default',
}) {
  const secondaryApp = initializeApp(firebaseConfig, `AdminCreate_${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  const normalizedRole = role === 'admin' ? 'admin' : 'user';
  const normalizedTheme = UI_THEME_IDS.includes(uiTheme) ? uiTheme : 'default';
  const limits = {
    daily: Math.max(0, Number(aiLimits?.daily ?? DEFAULT_AI_LIMITS.daily)),
    weekly: Math.max(0, Number(aiLimits?.weekly ?? DEFAULT_AI_LIMITS.weekly)),
    monthly: Math.max(0, Number(aiLimits?.monthly ?? DEFAULT_AI_LIMITS.monthly)),
  };

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      email,
      displayName: displayName || email.split('@')[0],
      role: normalizedRole,
      disabled: false,
      groupId: DEFAULT_GROUP_ID,
      isChild: normalizedRole === 'admin' ? false : Boolean(isChild),
      uiTheme: normalizedTheme,
      aiLimits: limits,
      aiUsage: {
        daily: { count: 0, periodKey: '' },
        weekly: { count: 0, periodKey: '' },
        monthly: { count: 0, periodKey: '' },
        total: 0,
      },
      createdAt: serverTimestamp(),
      createdBy,
    });

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
  if (role !== 'admin' && role !== 'user') {
    throw new Error('Недопустимая роль');
  }
  await assertNotOwner(userId);
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { role });
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

  if (role === 'admin' || role === 'user') {
    if (userId !== currentUserId) {
      payload.role = role;
    }

    if (role === 'admin') {
      payload.isChild = false;
    } else if (typeof isChild === 'boolean') {
      payload.isChild = isChild;
    }
  }

  if (aiLimits && role !== 'admin') {
    payload.aiLimits = {
      daily: Math.max(0, Number(aiLimits.daily)),
      weekly: Math.max(0, Number(aiLimits.weekly)),
      monthly: Math.max(0, Number(aiLimits.monthly)),
    };
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
  }

  if (uiTheme != null) {
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

  // Auth photoURL ограничен ~2048 символов — data URL обычно длиннее, храним только в Firestore
  return avatarUrl;
}

export async function removeUserAvatar(user) {
  await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { avatarUrl: null });
}

export { setUserAiLimits } from './aiUsageService';

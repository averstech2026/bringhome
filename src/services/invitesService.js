import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { db, COLLECTIONS, firebaseConfig } from '../firebase';
import { createFamily } from './familiesService';
import { ROLES } from '../utils/roles';

function generateInviteToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export async function createInvite({ familyLimits, createdBy }) {
  const token = generateInviteToken();
  const limits = {
    maxUsers: Math.max(1, Number(familyLimits?.maxUsers ?? 5)),
    maxLists: Math.max(1, Number(familyLimits?.maxLists ?? 20)),
    aiRequests: Math.max(0, Number(familyLimits?.aiRequests ?? 30)),
  };

  await setDoc(doc(db, COLLECTIONS.INVITES, token), {
    familyId: null,
    isUsed: false,
    familyLimits: limits,
    createdAt: serverTimestamp(),
    createdBy,
    usedByEmail: null,
    usedByUid: null,
  });

  return { token, limits };
}

export function getInviteRegisterUrl(token) {
  const base = import.meta.env.BASE_URL || '/';
  const path = base.endsWith('/') ? `${base}#/register` : `${base}#/register`;
  return `${window.location.origin}${path}?invite=${encodeURIComponent(token)}`;
}

export async function getInvite(token) {
  if (!token?.trim()) return null;
  const snapshot = await getDoc(doc(db, COLLECTIONS.INVITES, token.trim()));
  if (!snapshot.exists()) return null;
  const data = { id: snapshot.id, ...snapshot.data() };
  if (data.isUsed || data.revoked) return null;
  return data;
}

export async function revokeInvite(token) {
  if (!token?.trim()) throw new Error('Инвайт не найден');
  const ref = doc(db, COLLECTIONS.INVITES, token.trim());
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) throw new Error('Инвайт не найден');
  const data = snapshot.data();
  if (data.isUsed) throw new Error('Инвайт уже использован');
  if (data.revoked) return;
  await deleteDoc(ref);
}

export async function getAllInvites() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.INVITES));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function registerFamilyAdminViaInvite({
  token,
  email,
  password,
  displayName,
  familyName,
}) {
  const inviteRef = doc(db, COLLECTIONS.INVITES, token.trim());
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Ссылка более недействительна');
  }

  const invite = inviteSnap.data();
  if (invite.isUsed || invite.revoked) {
    throw new Error('Ссылка более недействительна');
  }

  const secondaryApp = initializeApp(firebaseConfig, `InviteRegister_${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb = getFirestore(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    const resolvedName = displayName?.trim() || email.split('@')[0];

    if (displayName) {
      await updateProfile(cred.user, { displayName: resolvedName });
    }

    const familyId = await createFamily({
      name: familyName?.trim() || `Семья ${resolvedName}`,
      ownerId: uid,
      limits: invite.familyLimits,
      createdBy: uid,
    }, secondaryDb);

    if (!familyId) {
      throw new Error('Не удалось создать семью');
    }

    const familySnap = await getDoc(doc(secondaryDb, COLLECTIONS.FAMILIES, familyId));
    if (!familySnap.exists() || familySnap.data()?.ownerId !== uid) {
      throw new Error('Не удалось создать изолированную семью');
    }

    await setDoc(doc(secondaryDb, COLLECTIONS.USERS, uid), {
      email,
      displayName: resolvedName,
      role: ROLES.FAMILY_ADMIN,
      disabled: false,
      familyId,
      groupId: familyId,
      isChild: false,
      uiTheme: 'default',
      aiUsage: {
        daily: { count: 0, periodKey: '' },
        weekly: { count: 0, periodKey: '' },
        monthly: { count: 0, periodKey: '' },
        total: 0,
      },
      createdAt: serverTimestamp(),
      createdBy: null,
    });

    await runTransaction(secondaryDb, async (transaction) => {
      const inviteRefOnSecondary = doc(secondaryDb, COLLECTIONS.INVITES, token.trim());
      const freshInvite = await transaction.get(inviteRefOnSecondary);
      if (!freshInvite.exists() || freshInvite.data().isUsed || freshInvite.data().revoked) {
        throw new Error('Ссылка более недействительна');
      }
      transaction.update(inviteRefOnSecondary, {
        isUsed: true,
        familyId,
        usedByEmail: email,
        usedByUid: uid,
        usedAt: serverTimestamp(),
      });
    });

    await signOut(secondaryAuth);
    return { uid, familyId };
  } finally {
    await deleteApp(secondaryApp);
  }
}

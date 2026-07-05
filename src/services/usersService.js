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
    createdAt: serverTimestamp(),
    createdBy: null,
  });

  await setDoc(doc(db, COLLECTIONS.CONFIG, 'setup'), {
    initialized: true,
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

export async function createUserAsAdmin({ email, password, displayName, createdBy }) {
  const secondaryApp = initializeApp(firebaseConfig, `AdminCreate_${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    await setDoc(doc(db, COLLECTIONS.USERS, cred.user.uid), {
      email,
      displayName: displayName || email.split('@')[0],
      role: 'user',
      disabled: false,
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
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { disabled });
}

export async function setUserRole(userId, role) {
  if (role !== 'admin' && role !== 'user') {
    throw new Error('Недопустимая роль');
  }
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), { role });
}

export async function updateUserAvatar(user, file) {
  const avatarUrl = await compressImageToDataUrl(file);

  await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { avatarUrl });

  // Auth photoURL ограничен ~2048 символов — data URL обычно длиннее, храним только в Firestore
  return avatarUrl;
}

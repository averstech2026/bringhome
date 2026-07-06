import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firestore collections:
 *
 * lists: {
 *   id, title, description?, type ("home" | "cottage"), isPublic, createdBy,
 *   allowedUsers: string[], createdAt
 * }
 *
 * items: {
 *   id, listId, name, quantity, category, comment?, checked,
 *   checkedBy, checkedAt, bookedBy?
 * }
 *
 * product_history: {
 *   id, userId, name
 * }
 *
 * users: {
 *   email, displayName, role ("admin" | "user"), disabled,
 *   avatarUrl, createdAt, createdBy
 * }
 *
 * config/setup: { initialized, adminUid, createdAt }
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export { firebaseConfig };

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { auth, db, storage };

export const COLLECTIONS = {
  LISTS: 'lists',
  ITEMS: 'items',
  PRODUCT_HISTORY: 'product_history',
  USERS: 'users',
  CONFIG: 'config',
};

export default app;

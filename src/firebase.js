import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firestore collections:
 *
 * lists: {
 *   id, title, description?, type ("home" | "cottage"), isPublic, createdBy,
 *   familyId, groupId?, allowedUsers: string[], viewedBy?: { [uid]: boolean },
 *   sharedWithFamilyIds?: string[], externalFamilies?: { [familyId]: { familyName, avatarUrl?, joinedAt, joinedBy } },
 *   ownerFamilyName?: string, ownerFamilyAvatarUrl?: string,
 *   shareInviteToken?: string, shareInviteCreatedAt?, shareInviteCreatedBy?,
 *   scheduledFor?: Timestamp, remindOnDay?: boolean, createdAt
 * }
 *
 * notifications: {
 *   userId?, type, title, body, link, isRead?, createdAt,
 *   senderId?, senderDisplayName?, receiverIds?: string[],
 *   familyId?: string, familyName?: string,
 *   readByUids?: string[], sendAsPush?: boolean,
 *   hintId?: string, isActive?: boolean
 * }
 *
 * items: {
 *   id, listId, name, quantity, category, comment?, checked,
 *   checkedBy, checkedAt, checkedByUid?, checkedByPhotoUrl?, bookedBy?, bookedByFamilyId?, bookedByFamilyName?, bookedByUid?
 * }
 *
 * product_history: {
 *   id, userId, name
 * }
 *
 * custom_products_dictionary: {
 *   name, category, unit, updatedAt
 * }
 *
 * announcements: {
 *   id, title, content, hint, active, createdAt
 * }
 *
 * users: {
 *   email, displayName, role ("super_admin" | "family_admin" | "member"), disabled,
 *   familyId, groupId?, avatarUrl, aiLimitMonth?, aiLimits?, aiUsage?, isChild?, uiTheme?,
 *   pushEnabled?: boolean, fcmTokens?: string[],
 *   onboardingCompleted?: boolean, readAnnouncements?: string[],
 *   unlockedHints?: string[], dismissedHints?: string[],
 *   createdAt, createdBy
 * }
 *
 * families: {
 *   id, name, ownerId, avatarUrl?, aiLimitMonth?, limits: { maxUsers, maxLists, aiRequests }, createdAt, createdBy?
 * }
 *
 * invites: {
 *   id, familyId?, isUsed, familyLimits: { maxUsers, maxLists, aiRequests },
 *   usedByEmail?, usedByUid?, createdAt, createdBy?
 * }
 *
 * feedbacks: {
 *   id, type: "feedback", fromUser, fromFamily, fromUserName?, fromFamilyName?,
 *   category ("error" | "idea"), text, status ("new"|"read"|"noted"|"backlog"|"completed"),
 *   isRead, statusSeenByAuthor?, createdAt
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

// Публичный VAPID-ключ (Firebase Console → Cloud Messaging → Web Push certificates)
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// URL serverless-прокси отправки push (Yandex Cloud Function, FCM HTTP v1).
// Legacy FCM API отключён Google, а v1 требует service account — его нельзя держать
// в публичном бандле, поэтому отправка идёт через прокси. Тариф Spark не задействован.
export const PUSH_API_URL = import.meta.env.VITE_YANDEX_PUSH_URL || '';

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
  CUSTOM_PRODUCTS_DICTIONARY: 'custom_products_dictionary',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  CONFIG: 'config',
  FAMILIES: 'families',
  INVITES: 'invites',
  FEEDBACKS: 'feedbacks',
  ANNOUNCEMENTS: 'announcements',
};

export default app;

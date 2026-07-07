import {
  getMessaging,
  getToken,
  deleteToken,
  isSupported,
  onMessage,
} from 'firebase/messaging';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import app, {
  auth,
  db,
  COLLECTIONS,
  firebaseConfig,
  VAPID_KEY,
  PUSH_API_URL,
} from '../firebase';

const BASE_URL = import.meta.env.BASE_URL || '/';
const NOTIFICATION_ICON = `${BASE_URL}icons/note.png`;

let messagingPromise = null;
// Токен текущего устройства — нужен, чтобы аккуратно удалить его при выключении тумблера.
let currentDeviceToken = null;

/** Поддерживает ли окружение веб-пуши (Safari в приватном режиме и пр. — нет). */
export async function isPushSupported() {
  try {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      'PushManager' in window &&
      (await isSupported())
    );
  } catch {
    return false;
  }
}

function buildServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  });
  return `${BASE_URL}firebase-messaging-sw.js?${params.toString()}`;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return undefined;
  try {
    return await navigator.serviceWorker.register(buildServiceWorkerUrl(), {
      scope: BASE_URL,
    });
  } catch (err) {
    console.warn('[push] Не удалось зарегистрировать service worker', err);
    return undefined;
  }
}

async function getMessagingInstance() {
  if (!(await isPushSupported())) return null;
  if (!messagingPromise) {
    messagingPromise = Promise.resolve().then(() => getMessaging(app));
  }
  return messagingPromise;
}

/** Запрашивает разрешение (если нужно) и возвращает свежий FCM-токен устройства. */
async function requestDeviceToken() {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    throw new Error('Пуш-уведомления не поддерживаются этим браузером');
  }
  if (!VAPID_KEY) {
    throw new Error('Не задан VITE_FIREBASE_VAPID_KEY — добавьте ключ в .env');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Вы не разрешили уведомления в браузере');
  }

  const serviceWorkerRegistration = await registerServiceWorker();
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration,
  });

  if (!token) {
    throw new Error('Не удалось получить токен устройства для уведомлений');
  }

  currentDeviceToken = token;
  return token;
}

/**
 * Включает пуши: запрашивает разрешение, получает токен устройства и сохраняет его
 * в массив `fcmTokens` документа пользователя вместе с флагом `pushEnabled`.
 */
export async function enablePushNotifications(uid) {
  if (!uid) throw new Error('Нет активного пользователя');

  const token = await requestDeviceToken();
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    pushEnabled: true,
    fcmTokens: arrayUnion(token),
  });
  return token;
}

/** Выключает пуши: снимает флаг и по возможности убирает токен текущего устройства. */
export async function disablePushNotifications(uid) {
  if (!uid) return;

  const payload = { pushEnabled: false };
  if (currentDeviceToken) {
    payload.fcmTokens = arrayRemove(currentDeviceToken);
  }
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), payload);

  try {
    const messaging = await getMessagingInstance();
    if (messaging) await deleteToken(messaging);
  } catch (err) {
    console.warn('[push] Не удалось удалить токен устройства', err);
  }
  currentDeviceToken = null;
}

/**
 * Тихо освежает токен при входе в приложение (токены FCM могут ротироваться).
 * Вызывать только если пользователь уже включал пуши и дал разрешение.
 */
export async function syncPushTokenOnLogin(uid, profile) {
  if (!uid || profile?.pushEnabled !== true) return;
  if (!(await isPushSupported())) return;
  if (Notification.permission !== 'granted') return;

  try {
    const token = await requestDeviceToken();
    await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
      fcmTokens: arrayUnion(token),
    });
  } catch (err) {
    console.warn('[push] Не удалось синхронизировать токен', err);
  }
}

/** Подписка на пуши, пришедшие пока вкладка активна (foreground). */
export async function onForegroundPush(handler) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}

/**
 * Отправка пуша о новом списке всем активным членам семьи, у которых включены
 * уведомления, кроме автора. Токены собираются на клиенте, а сама доставка идёт
 * через serverless-прокси (FCM HTTP v1) — приватный ключ остаётся на сервере.
 */
export async function sendNewListNotification({ senderUid, creatorName, listTitle }) {
  if (!PUSH_API_URL) {
    console.warn('[push] VITE_YANDEX_PUSH_URL не задан — уведомления о новом списке не отправлены');
    return { sent: 0, skipped: true };
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) return { sent: 0, skipped: true };

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where('pushEnabled', '==', true)),
  );

  const tokens = [];
  snapshot.forEach((docSnap) => {
    if (docSnap.id === senderUid) return; // автора не уведомляем
    const data = docSnap.data();
    if (data.disabled === true) return;
    if (Array.isArray(data.fcmTokens)) {
      tokens.push(...data.fcmTokens.filter(Boolean));
    }
  });

  const uniqueTokens = [...new Set(tokens)];
  if (uniqueTokens.length === 0) return { sent: 0 };

  const name = (creatorName || '').trim() || 'Кто-то из семьи';
  const title = (listTitle || '').trim() || 'Новый список';
  const body = `📝 ${name} создал список «${title}»`;

  const idToken = await currentUser.getIdToken();

  try {
    const response = await fetch(PUSH_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens: uniqueTokens,
        title: 'КупиДомой',
        body,
        data: {
          type: 'new_list',
          title,
          creator: name,
          icon: NOTIFICATION_ICON,
        },
      }),
    });

    if (!response.ok) {
      console.warn('[push] Прокси ответил ошибкой', response.status, await response.text());
      return { sent: 0 };
    }

    const result = await response.json().catch(() => ({}));
    return { sent: result.sent ?? 0 };
  } catch (err) {
    console.warn('[push] Ошибка отправки пуша', err);
    return { sent: 0 };
  }
}

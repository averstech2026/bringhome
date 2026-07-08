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
  getDoc,
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
  VAPID_KEY,
  PUSH_API_URL,
} from '../firebase';

const BASE_URL = import.meta.env.BASE_URL || '/';
// Крупная иконка уведомления по умолчанию (когда аватар отправителя недоступен).
const APP_ICON = `${BASE_URL}icons/logo.png`;
// Мелкая монохромная иконка в статус-баре (Android/Chrome тонируют её по alpha-каналу).
const APP_BADGE = `${BASE_URL}icons/badge.png`;

// FCM ограничивает размер сообщения (~4 КБ), а аватары хранятся как data URL до 120 КБ —
// такой аватар не влезет в payload и «уронит» доставку. Поэтому в пуш кладём только
// короткие https-ссылки; для локальных/ data:-аватаров используем фирменную иконку.
const MAX_IMAGE_URL_LENGTH = 480;
function safeRemoteImage(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!/^https:\/\//i.test(trimmed)) return '';
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) return '';
  return trimmed;
}

const DEVICE_TOKEN_KEY = 'bringhome:fcmToken';

let messagingPromise = null;
// Токен текущего устройства — нужен, чтобы аккуратно удалить его при выключении тумблера.
let currentDeviceToken = null;

// Последний токен этого устройства сохраняем локально, чтобы при ротации заменять
// старый на новый и не копить дубли в fcmTokens (иначе одно устройство получит N пушей).
function readStoredDeviceToken() {
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}
function writeStoredDeviceToken(token) {
  try {
    if (token) localStorage.setItem(DEVICE_TOKEN_KEY, token);
    else localStorage.removeItem(DEVICE_TOKEN_KEY);
  } catch {
    // localStorage может быть недоступен — не критично
  }
}

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

// Единый SW регистрируется через virtual:pwa-register (см. src/main.jsx).
// Здесь только дожидаемся активной регистрации, чтобы передать её в getToken:
// у приложения один service worker на scope, и это как раз он (с логикой FCM внутри).
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return undefined;
  try {
    return await navigator.serviceWorker.ready;
  } catch (err) {
    console.warn('[push] Не удалось получить регистрацию service worker', err);
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
  const ref = doc(db, COLLECTIONS.USERS, uid);

  // Заменяем прежний токен этого устройства, чтобы не было дублей доставки.
  const previous = readStoredDeviceToken();
  if (previous && previous !== token) {
    await updateDoc(ref, { fcmTokens: arrayRemove(previous) });
  }

  await updateDoc(ref, {
    pushEnabled: true,
    fcmTokens: arrayUnion(token),
  });
  writeStoredDeviceToken(token);
  return token;
}

/** Выключает пуши: снимает флаг и по возможности убирает токен текущего устройства. */
export async function disablePushNotifications(uid) {
  if (!uid) return;

  const tokenToRemove = currentDeviceToken || readStoredDeviceToken();
  const payload = { pushEnabled: false };
  if (tokenToRemove) {
    payload.fcmTokens = arrayRemove(tokenToRemove);
  }
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), payload);

  try {
    const messaging = await getMessagingInstance();
    if (messaging) await deleteToken(messaging);
  } catch (err) {
    console.warn('[push] Не удалось удалить токен устройства', err);
  }
  writeStoredDeviceToken(null);
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
    const ref = doc(db, COLLECTIONS.USERS, uid);
    const previous = readStoredDeviceToken();
    if (previous && previous !== token) {
      await updateDoc(ref, { fcmTokens: arrayRemove(previous) });
    }
    await updateDoc(ref, { fcmTokens: arrayUnion(token) });
    writeStoredDeviceToken(token);
  } catch (err) {
    console.warn('[push] Не удалось синхронизировать токен', err);
  }
}

/**
 * Диагностика: отправляет тестовый пуш самому себе (на токены текущего юзера).
 * Полезно проверить всю цепочку без второго аккаунта.
 */
export async function sendTestPush(uid, { photoUrl } = {}) {
  if (!PUSH_API_URL) {
    throw new Error('VITE_YANDEX_PUSH_URL не задан — задеплойте прокси и заполните URL');
  }
  const tokens = await getUserTokens(uid);
  if (tokens.length === 0) {
    throw new Error('Нет сохранённых токенов — переключите тумблер пушей заново');
  }

  const avatar = safeRemoteImage(photoUrl) || safeRemoteImage(auth?.currentUser?.photoURL);
  const result = await postToProxy(tokens, {
    body: '🔔 Тестовое уведомление — всё работает!',
    icon: avatar || APP_ICON,
    ...(avatar ? { image: avatar } : {}),
    data: { type: 'test' },
  });
  if ((result.sent ?? 0) === 0) {
    throw new Error('Прокси принял запрос, но доставок 0 — проверьте логи функции');
  }
  return result;
}

/** Подписка на пуши, пришедшие пока вкладка активна (foreground). */
export async function onForegroundPush(handler) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, handler);
}

// --- Точечная адресация получателей ---

/**
 * Есть ли у пользователя доступ к списку. Логика совпадает с firestore.rules:
 * явный доступ (allowedUsers) ИЛИ публичный список внутри той же семейной группы.
 */
function userCanAccessList(userData, uid, list) {
  const allowedUsers = Array.isArray(list?.allowedUsers) ? list.allowedUsers : [];
  if (allowedUsers.includes(uid)) return true;
  if (list?.isPublic === true && userData?.groupId && userData.groupId === list?.groupId) {
    return true;
  }
  return false;
}

/**
 * Пользователи с включёнными пушами, имеющие доступ к списку.
 * Возвращает [{ uid, tokens }], чтобы вызывающий мог исключить нужные uid.
 */
async function getAccessibleUsers(list) {
  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where('pushEnabled', '==', true)),
  );

  const result = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.disabled === true) return;
    if (!userCanAccessList(data, docSnap.id, list)) return;
    const tokens = Array.isArray(data.fcmTokens) ? data.fcmTokens.filter(Boolean) : [];
    if (tokens.length > 0) result.push({ uid: docSnap.id, tokens });
  });
  return result;
}

function toExcludeSet(exclude) {
  if (!exclude) return new Set();
  return new Set((Array.isArray(exclude) ? exclude : [exclude]).filter(Boolean));
}

/**
 * Токены получателей с доступом к списку, кроме excludeUid.
 * excludeUid — один uid или массив (например, автор + только что добавленные участники).
 */
export async function getTargetUserTokens(list, excludeUid) {
  const excluded = toExcludeSet(excludeUid);
  const users = await getAccessibleUsers(list);
  const tokens = [];
  for (const u of users) {
    if (excluded.has(u.uid)) continue;
    tokens.push(...u.tokens);
  }
  return [...new Set(tokens)];
}

/** Токены одного пользователя (если у него включены пуши). */
async function getUserTokens(uid) {
  if (!uid) return [];
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  if (data.pushEnabled !== true || data.disabled === true) return [];
  return Array.isArray(data.fcmTokens) ? [...new Set(data.fcmTokens.filter(Boolean))] : [];
}

// --- Транспорт: доставка на набор токенов через serverless-прокси (FCM HTTP v1) ---

async function postToProxy(tokens, { title = 'КупиДомой', body, data = {}, icon, badge, image } = {}) {
  if (!PUSH_API_URL) {
    console.warn('[push] VITE_YANDEX_PUSH_URL не задан — пуш не отправлен');
    return { sent: 0, skipped: true };
  }
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (uniqueTokens.length === 0) return { sent: 0 };

  const currentUser = auth?.currentUser;
  if (!currentUser) return { sent: 0, skipped: true };

  // icon — крупная иконка (аватар отправителя или логотип), badge — монохромный значок
  // в статус-баре, image — большое превью (аватар отправителя, если это https-ссылка).
  const payloadData = {
    icon: icon || APP_ICON,
    badge: badge || APP_BADGE,
    ...(image ? { image } : {}),
    ...data,
  };

  const idToken = await currentUser.getIdToken();
  try {
    const response = await fetch(PUSH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        tokens: uniqueTokens,
        title,
        body,
        data: payloadData,
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

function resolveAuthorName(author) {
  return (author?.name || '').trim() || 'Кто-то из семьи';
}
function resolveListTitle(list) {
  return (list?.title || '').trim() || 'список';
}

/**
 * Иконки для персонализированного пуша: если у отправителя есть https-аватар —
 * показываем его крупной иконкой и превью, иначе — фирменную иконку приложения.
 */
function authorImages(author) {
  const avatar = safeRemoteImage(author?.photoUrl);
  return {
    icon: avatar || APP_ICON,
    image: avatar || undefined,
  };
}

// --- Сценарии уведомлений ---

/** Сценарий А: создан новый список — всем участникам с доступом, кроме автора. */
export async function notifyListCreated({ list, author }) {
  const tokens = await getTargetUserTokens(list, author?.uid);
  return postToProxy(tokens, {
    body: `📝 ${resolveAuthorName(author)} создал список «${resolveListTitle(list)}»`,
    ...authorImages(author),
    data: { type: 'list_created', listId: list?.id || '' },
  });
}

/**
 * Сценарий Б: список изменён — всем участникам с доступом, кроме автора и excludeUids
 * (новые участники получают персональный пуш из сценария В, а не это уведомление).
 */
export async function notifyListUpdated({ list, author, excludeUids = [] }) {
  const exclude = [author?.uid, ...(Array.isArray(excludeUids) ? excludeUids : [excludeUids])];
  const tokens = await getTargetUserTokens(list, exclude);
  return postToProxy(tokens, {
    body: `🔄 ${resolveAuthorName(author)} обновил список «${resolveListTitle(list)}»`,
    ...authorImages(author),
    data: { type: 'list_updated', listId: list?.id || '' },
  });
}

/** Сценарий В: пользователю открыли доступ — персонально только ему. */
export async function notifyUserAddedToList({ list, author, newUid }) {
  if (!newUid || newUid === author?.uid) return { sent: 0, skipped: true };
  const tokens = await getUserTokens(newUid);
  return postToProxy(tokens, {
    body: `👋 ${resolveAuthorName(author)} открыл вам доступ к списку «${resolveListTitle(list)}»`,
    ...authorImages(author),
    data: { type: 'list_shared', listId: list?.id || '' },
  });
}

/* eslint-env serviceworker */
/* global self */
// Единый service worker приложения «КупиДомой».
//
// Совмещает две задачи в ОДНОМ воркере (на один scope может претендовать только один SW):
//   1. Offline-кэш ресурсов через Workbox precache (сюда vite-plugin-pwa в режиме
//      injectManifest подставляет список файлов сборки вместо self.__WB_MANIFEST).
//   2. Фоновые push-уведомления Firebase Cloud Messaging.
//
// Файл собирается Vite, поэтому import.meta.env.* подставляются на этапе билда.
// Конфиг Firebase для web не является секретом (он и так уходит в клиентский бандл),
// так что раньше применявшийся приём с query-параметрами больше не нужен.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

// --- Offline-кэш ресурсов сборки ---
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// registerType: 'autoUpdate' — обновляемся сразу, без ожидания закрытия всех вкладок.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// --- Фоновые push-уведомления FCM ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (firebaseConfig.projectId) {
  const app = initializeApp(firebaseConfig);
  // Инициализируем messaging, чтобы SDK сам показал ОДНО уведомление для
  // notification-сообщений в фоне. Свой onBackgroundMessage с showNotification
  // НЕ добавляем — иначе уведомление задваивается (авто-показ SDK + наш вызов).
  getMessaging(app);
}

// Фокус/открытие приложения по клику на уведомление.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.registration.scope);
      }
      return undefined;
    }),
  );
});

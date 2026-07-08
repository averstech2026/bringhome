import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { createYandexParseHandler } from './functions/yandexGpt.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Приложение само обновляется на новую сборку без ручной перезагрузки.
        registerType: 'autoUpdate',
        // injectManifest: используем СВОЙ service worker (src/firebase-messaging-sw.js),
        // а плагин лишь дописывает туда список файлов для offline-кэша (self.__WB_MANIFEST),
        // не затирая логику фоновых push от Firebase Messaging.
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'firebase-messaging-sw.js',
        injectManifest: {
          // Классический (iife) воркер для совместимости со всеми браузерами в проде.
          rollupFormat: 'iife',
        },
        // SW регистрируем вручную (см. src/main.jsx: registerSW из virtual:pwa-register),
        // чтобы не плодить дублирующую регистрацию.
        injectRegister: null,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'КупиДомой — Семейные списки продуктов',
          short_name: 'КупиДомой',
          description: 'Умные списки покупок для всей семьи с поддержкой ИИ',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          // Относительный путь: корректно резолвится и на '/', и на '/bringhome/' (GitHub Pages).
          start_url: '.',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        devOptions: {
          // Включаем SW и в dev, чтобы проверять пуши/установку локально.
          // type: 'module' обязателен, т.к. воркер использует import (workbox/firebase).
          enabled: true,
          type: 'module',
        },
      }),
      {
        name: 'yandex-parse-api',
        configureServer(server) {
          const handler = createYandexParseHandler(() => ({
            apiKey: env.YANDEX_API_KEY,
            folderId: env.YANDEX_FOLDER_ID,
          }));

          server.middlewares.use('/api/yandex/parse', (req, res) => {
            handler(req, res);
          });
        },
      },
    ],
    base:
      mode === 'pages' || process.env.GITHUB_PAGES === 'true' || process.env.CI === 'true'
        ? '/bringhome/'
        : '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
  };
});

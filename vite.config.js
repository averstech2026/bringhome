import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createYandexParseHandler } from './functions/yandexGpt.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
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
      process.env.GITHUB_PAGES === 'true' || process.env.CI === 'true'
        ? '/bringhome/'
        : '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
  };
});

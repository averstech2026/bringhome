import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createYandexParseHandler } from './yandexGpt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });
config({ path: resolve(__dirname, '../.env') });

const yandexApiKey = defineSecret('YANDEX_API_KEY');
const yandexFolderId = defineSecret('YANDEX_FOLDER_ID');

function resolveConfig() {
  const apiKey = yandexApiKey.value() || process.env.YANDEX_API_KEY;
  const folderId = yandexFolderId.value() || process.env.YANDEX_FOLDER_ID;
  return { apiKey, folderId };
}

export const parseProducts = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
    secrets: [yandexApiKey, yandexFolderId],
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    const handler = createYandexParseHandler(resolveConfig);
    await handler(req, res);
  },
);

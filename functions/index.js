import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from 'firebase-functions/v2/https';
import { createYandexParseHandler } from './yandexGpt.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });
config({ path: resolve(__dirname, '../.env') });

const parseHandler = createYandexParseHandler(() => ({
  apiKey: process.env.YANDEX_API_KEY,
  folderId: process.env.YANDEX_FOLDER_ID,
}));

export const parseProducts = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
  },
  async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    await parseHandler(req, res);
  },
);

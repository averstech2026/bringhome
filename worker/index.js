import { callYandexGpt } from '../functions/yandexGpt.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed' },
        { status: 405, headers: corsHeaders },
      );
    }

    try {
      const body = await request.json();
      const text = String(body.text || '').trim();

      if (!text) {
        return Response.json(
          { error: 'Поле text обязательно' },
          { status: 400, headers: corsHeaders },
        );
      }

      const products = await callYandexGpt(text, {
        apiKey: env.YANDEX_API_KEY,
        folderId: env.YANDEX_FOLDER_ID,
      });

      return Response.json({ products }, { headers: corsHeaders });
    } catch (err) {
      return Response.json(
        { error: err.message || 'Ошибка распознавания' },
        { status: 500, headers: corsHeaders },
      );
    }
  },
};

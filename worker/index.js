import { callYandexGpt } from '../functions/yandexGpt.js';

function corsHeaders(request) {
  const requested = request.headers.get('Access-Control-Request-Headers');
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': requested || 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed' },
        { status: 405, headers },
      );
    }

    try {
      const body = await request.json();
      const text = String(body.text || '').trim();
      const customDictionary = Array.isArray(body.customDictionary) ? body.customDictionary : [];

      if (!text) {
        return Response.json(
          { error: 'Поле text обязательно' },
          { status: 400, headers },
        );
      }

      const products = await callYandexGpt(text, {
        apiKey: env.YANDEX_API_KEY,
        folderId: env.YANDEX_FOLDER_ID,
        customDictionary,
      });

      return Response.json({ products }, { headers });
    } catch (err) {
      return Response.json(
        { error: err.message || 'Ошибка распознавания' },
        { status: 500, headers },
      );
    }
  },
};

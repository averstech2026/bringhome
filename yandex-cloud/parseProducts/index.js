import { callYandexGpt, normalizeParseMode, PARSE_MODE } from './yandexGpt.js';

function corsHeaders(event) {
  const headers = event.headers || {};
  const requested =
    headers['access-control-request-headers'] ||
    headers['Access-Control-Request-Headers'];

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': requested || 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };
}

function parseBody(event) {
  let raw = event.body || '';
  if (event.isBase64Encoded && raw) {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  }
  return raw ? JSON.parse(raw) : {};
}

function isPackingMode(mode) {
  return mode === PARSE_MODE.PACKING || mode === PARSE_MODE.PACKING_CREATE;
}

export async function handler(event) {
  const headers = corsHeaders(event);
  const method = (event.httpMethod || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = parseBody(event);
    const text = String(body.text || '').trim();
    const mode = normalizeParseMode(body.mode);
    const customDictionary = Array.isArray(body.customDictionary) ? body.customDictionary : [];

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Поле text обязательно' }),
      };
    }

    const parsed = await callYandexGpt(text, {
      apiKey: process.env.YANDEX_API_KEY,
      folderId: process.env.YANDEX_FOLDER_ID,
      customDictionary: isPackingMode(mode) ? [] : customDictionary,
      mode,
    });

    if (mode === PARSE_MODE.PACKING_CREATE) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ list: parsed, mode }),
      };
    }

    if (mode === PARSE_MODE.PACKING) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ items: parsed, mode }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products: parsed, mode }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Ошибка распознавания' }),
    };
  }
}

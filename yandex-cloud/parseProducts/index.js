import { callYandexGpt } from './yandexGpt.js';

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

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Поле text обязательно' }),
      };
    }

    const products = await callYandexGpt(text, {
      apiKey: process.env.YANDEX_API_KEY,
      folderId: process.env.YANDEX_FOLDER_ID,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ products }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Ошибка распознавания' }),
    };
  }
}

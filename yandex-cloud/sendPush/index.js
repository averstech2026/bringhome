import crypto from 'node:crypto';

// Serverless-прокси отправки push через Firebase Cloud Messaging HTTP v1.
// Держит service account на сервере (Yandex Cloud Function) — приватный ключ не
// попадает в публичный бандл GitHub Pages. НЕ Firebase Cloud Functions: тариф Spark не задействован.
//
// ENV:
//   FCM_SERVICE_ACCOUNT_B64 — base64 от JSON-ключа service account (Firebase → Project settings →
//                              Service accounts → Generate new private key).

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SECURETOKEN_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function corsHeaders(event) {
  const headers = event.headers || {};
  const requested =
    headers['access-control-request-headers'] || headers['Access-Control-Request-Headers'];

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

function loadServiceAccount() {
  const b64 = process.env.FCM_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error('FCM_SERVICE_ACCOUNT_B64 не задан');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

// OAuth2 access token для FCM через подпись JWT приватным ключом service account.
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify(claim),
  )}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key);
  const jwt = `${unsigned}.${signature.toString('base64url')}`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(json)}`);
  return json.access_token;
}

// Проверка Firebase ID-токена вызывающего, чтобы функцию нельзя было дёргать анонимно.
async function verifyIdToken(idToken, projectId) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Некорректный токен');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  const certsRes = await fetch(SECURETOKEN_CERTS_URL);
  const certs = await certsRes.json();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Неизвестный ключ подписи');

  const valid = crypto
    .createVerify('RSA-SHA256')
    .update(`${headerB64}.${payloadB64}`)
    .verify(cert, Buffer.from(sigB64, 'base64url'));
  if (!valid) throw new Error('Подпись токена не прошла проверку');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('Токен истёк');
  if (payload.aud !== projectId) throw new Error('Неверный aud');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Неверный iss');

  return payload;
}

async function sendToToken(accessToken, projectId, token, message) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { token, ...message } }),
    },
  );

  if (res.ok) return { ok: true };

  const errBody = await res.json().catch(() => ({}));
  const status = errBody?.error?.details?.[0]?.errorCode || errBody?.error?.status || res.status;
  // Токены, которые больше не действительны — сообщаем клиенту, чтобы он их подчистил.
  const invalid = status === 'UNREGISTERED' || status === 'INVALID_ARGUMENT' || res.status === 404;
  return { ok: false, invalid, token, status };
}

export async function handler(event) {
  const headers = corsHeaders(event);
  const method = (event.httpMethod || 'GET').toUpperCase();

  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (method !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const sa = loadServiceAccount();
    const projectId = sa.project_id;

    const body = parseBody(event);

    // Firebase ID-токен передаём в теле, а НЕ в заголовке Authorization: иначе шлюз
    // Yandex Cloud пытается проверить его как свой IAM-токен и отвечает 403.
    const idToken = String(body.idToken || '').trim();
    if (!idToken) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Нет idToken' }) };
    }
    await verifyIdToken(idToken, projectId);

    const tokens = [...new Set((Array.isArray(body.tokens) ? body.tokens : []).filter(Boolean))];
    const title = String(body.title || 'КупиДомой');
    const text = String(body.body || '');
    const data = body.data && typeof body.data === 'object' ? body.data : {};

    if (tokens.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ sent: 0, invalidTokens: [] }) };
    }

    const accessToken = await getAccessToken(sa);

    // Иконки/превью приходят в data: icon — крупная иконка (аватар/логотип),
    // badge — монохромный значок в статус-баре, image — большое превью.
    const icon = String(data.icon || '') || undefined;
    const badge = String(data.badge || '') || undefined;
    const image = String(data.image || '') || undefined;
    const link = String(data.link || '') || undefined;

    const webpushNotification = { title, body: text, icon, badge };
    if (image) webpushNotification.image = image;

    const message = {
      notification: { title, body: text },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      // Высокий приоритет: Android доставляет сразу (не группирует и не откладывает
      // ради экономии батареи), а Urgency: high просит push-сервис доставить срочно.
      android: { priority: 'high' },
      webpush: {
        headers: { Urgency: 'high', TTL: '86400' },
        notification: webpushNotification,
        ...(link ? { fcm_options: { link } } : {}),
      },
    };

    const results = await Promise.all(
      tokens.map((token) => sendToToken(accessToken, projectId, token, message)),
    );

    const sent = results.filter((r) => r.ok).length;
    const invalidTokens = results.filter((r) => !r.ok && r.invalid).map((r) => r.token);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sent, failed: tokens.length - sent, invalidTokens }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Ошибка отправки push' }),
    };
  }
}

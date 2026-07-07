const AI_CATEGORIES = [
  'Овощи и фрукты',
  'Молочные продукты',
  'Мясо и рыба',
  'Бакалея',
  'Напитки',
  'Заморозка',
  'К чаю / Сладости',
  'Бытовая химия',
  'Прочее',
];

export const YANDEX_SYSTEM_PROMPT_BASE =
  `Ты — строгое API для парсинга списка покупок. Извлеки продукты из текста сообщения и верни ответ СТРОГО в формате JSON-массива объектов. Каждая покупка должна быть объектом со следующими ключами: 'name' (название продукта в правильном литературном русском, строка, с маленькой буквы), 'quantity' (число или строка, если указано количество), 'unit' (единица измерения: шт, кг, л, уп, пачка, пучок, бутылка, десяток, или пустая строка ''), 'category' (строго одно из значений: ${AI_CATEGORIES.join(', ')}). Обязательно автоматически исправляй явные орфографические и грамматические ошибки в названиях товаров на правильный русский язык (например, если в исходном тексте написано 'малако', в JSON-ответ должно пойти 'молоко'; если написано 'кифир' — должно быть 'кефир'). При этом сохраняй оригинальный смысл, вкусы и бренды, если они узнаваемы. Зелень (укроп, петрушка, салат) — категория «Овощи и фрукты». Яйца — «Бакалея». Квас, сок, вода — «Напитки». Если количество не указано, запиши в quantity значение null. Выводи только чистый JSON-массив, без markdown-разметки, без пояснений и лишних символов.`;

/** @deprecated используйте buildYandexSystemPrompt */
export const YANDEX_SYSTEM_PROMPT = YANDEX_SYSTEM_PROMPT_BASE;

export function buildYandexSystemPrompt(customDictionary = []) {
  const entries = Array.isArray(customDictionary) ? customDictionary : [];
  if (entries.length === 0) return YANDEX_SYSTEM_PROMPT_BASE;

  const lines = entries
    .filter((entry) => entry?.name && entry?.category)
    .map((entry) => `${entry.name} → ${entry.category}${entry.unit ? ` (${entry.unit})` : ''}`)
    .join('\n');

  if (!lines) return YANDEX_SYSTEM_PROMPT_BASE;

  return `${YANDEX_SYSTEM_PROMPT_BASE}

Пользовательские соответствия (высший приоритет при выборе category и unit):
${lines}`;
}

const YANDEX_COMPLETION_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

export function parseYandexJsonResponse(text) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

  if (!Array.isArray(parsed)) {
    throw new Error('YandexGPT вернул не массив');
  }

  return parsed;
}

export async function callYandexGpt(userText, { apiKey, folderId, customDictionary = [] } = {}) {
  if (!apiKey) {
    throw new Error('YANDEX_API_KEY не задан в .env');
  }
  if (!folderId) {
    throw new Error('YANDEX_FOLDER_ID не задан в .env');
  }

  const systemPrompt = buildYandexSystemPrompt(customDictionary);

  const response = await fetch(YANDEX_COMPLETION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
    },
    body: JSON.stringify({
      modelUri: `gpt://${folderId}/yandexgpt/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.1,
        maxTokens: '2000',
      },
      messages: [
        { role: 'system', text: systemPrompt },
        { role: 'user', text: userText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`YandexGPT: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const content = data.result?.alternatives?.[0]?.message?.text?.trim();

  if (!content) {
    throw new Error('Пустой ответ от YandexGPT');
  }

  return parseYandexJsonResponse(content);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function createYandexParseHandler(getConfig) {
  return async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const body =
        req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)
          ? req.body
          : await readJsonBody(req);
      const text = String(body.text || '').trim();
      const customDictionary = Array.isArray(body.customDictionary) ? body.customDictionary : [];

      if (!text) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Поле text обязательно' }));
        return;
      }

      const { apiKey, folderId } = getConfig();
      const products = await callYandexGpt(text, { apiKey, folderId, customDictionary });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ products }));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Ошибка распознавания' }));
    }
  };
}

export const PARSE_MODE = {
  SHOPPING: 'shopping',
  PACKING: 'packing',
};

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

export const YANDEX_PACKING_SYSTEM_PROMPT =
  `ТЫ — ИИ-ассистент для сборов в путешествия и поездки. Твоя задача — распарсить текст пользователя ИЛИ сгенерировать базовый список сборов с нуля, если пользователь просто указал направление (например, "мы едем в Териберку").

Верни строго JSON-массив объектов следующей структуры:
[
  {
    "text": "Название вещи или дела",
    "type": "item" или "todo",
    "scope": "common" или "personal",
    "category": "Название активности/темы или пустая строка",
    "categoryIcon": "один эмодзи-иконка темы или пустая строка"
  }
]

type: item — физическая вещь в рюкзак; todo — действие/задача (забронировать, передать ключи, купить билеты).
scope: common — общая на всю поездку (аптечка, палатка, билеты); personal — индивидуальная для каждого (пауэрбанк, носки, термобелье).
category: ключевая тема/активность из запроса пользователя (например, "Морская прогулка", "Трекинг", "Кемпинг"). Название с заглавной буквы, короткое (2–4 слова). Если явной активности нет (просто "едем в Териберку" или список вещей без темы) — поставь "".
categoryIcon: один эмодзи, подходящий к category (🌊 для моря, 🏔 для гор, ⛺ для кемпинга). Если category пустая — "".

ПРАВИЛА ГЕНЕРАЦИИ:
1. Если пользователь дал конкретный список (например, "купить билеты, взять зарядку"), просто распредели эти пункты по структуре; category обычно "".
2. Если пользователь написал концептуально ("едем в Териберку/горы на авто"), включи логику эксперта по туризму: добавь обязательные общие дела (забронировать отель, проверить авто), общие вещи (документы, аптечка) и базовые личные вещи (теплые вещи для севера, треккинговые ботинки для гор).
3. Если пользователь указал конкретную активность ("планируем морскую прогулку", "идём в горы", "ночуем в палатке"), выдели эту тему в category/categoryIcon и отнеси к ней релевантные пункты. Базовые универсальные вещи поездки (документы, аптечка, зарядка) можно оставить с пустой category.

Выводи только чистый JSON-массив, без markdown-разметки, без пояснений и лишних символов.`;

/** @deprecated используйте buildYandexSystemPrompt */
export const YANDEX_SYSTEM_PROMPT = YANDEX_SYSTEM_PROMPT_BASE;

export function normalizeParseMode(mode) {
  return mode === PARSE_MODE.PACKING ? PARSE_MODE.PACKING : PARSE_MODE.SHOPPING;
}

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

export function resolveSystemPrompt(mode, customDictionary = []) {
  if (normalizeParseMode(mode) === PARSE_MODE.PACKING) {
    return YANDEX_PACKING_SYSTEM_PROMPT;
  }
  return buildYandexSystemPrompt(customDictionary);
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

export async function callYandexGpt(userText, {
  apiKey,
  folderId,
  customDictionary = [],
  mode = PARSE_MODE.SHOPPING,
} = {}) {
  if (!apiKey) {
    throw new Error('YANDEX_API_KEY не задан в .env');
  }
  if (!folderId) {
    throw new Error('YANDEX_FOLDER_ID не задан в .env');
  }

  const parseMode = normalizeParseMode(mode);
  const systemPrompt = resolveSystemPrompt(parseMode, customDictionary);
  const temperature = parseMode === PARSE_MODE.PACKING ? 0.3 : 0.1;
  const maxTokens = parseMode === PARSE_MODE.PACKING ? '4000' : '2000';

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
        temperature,
        maxTokens,
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
      const mode = normalizeParseMode(body.mode);
      const customDictionary = Array.isArray(body.customDictionary) ? body.customDictionary : [];

      if (!text) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Поле text обязательно' }));
        return;
      }

      const { apiKey, folderId } = getConfig();
      const parsed = await callYandexGpt(text, {
        apiKey,
        folderId,
        customDictionary: mode === PARSE_MODE.PACKING ? [] : customDictionary,
        mode,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      if (mode === PARSE_MODE.PACKING) {
        res.end(JSON.stringify({ items: parsed, mode }));
      } else {
        res.end(JSON.stringify({ products: parsed, mode }));
      }
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err.message || 'Ошибка распознавания' }));
    }
  };
}

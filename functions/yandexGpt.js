export const PARSE_MODE = {
  SHOPPING: 'shopping',
  /** Полная генерация списка покупок из текста (type + title + items). */
  SHOPPING_CREATE: 'shopping-create',
  PACKING: 'packing',
  /** Полная генерация списка сборов по описанию поездки (title + sections + items). */
  PACKING_CREATE: 'packing-create',
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

const PACKING_ITEM_CATEGORIES = [
  'Документы',
  'Одежда',
  'Аптечка',
  'Техника',
  'Снаряжение',
  'Перекус',
  'Прочее',
];

export const YANDEX_SYSTEM_PROMPT_BASE =
  `Ты — строгое API для парсинга списка покупок. Извлеки продукты из текста сообщения и верни ответ СТРОГО в формате JSON-массива объектов. Каждая покупка должна быть объектом со следующими ключами: 'name' (название продукта в правильном литературном русском, строка, с маленькой буквы), 'quantity' (число или строка, если указано количество), 'unit' (единица измерения: шт, кг, л, уп, пачка, пучок, бутылка, десяток, или пустая строка ''), 'category' (строго одно из значений: ${AI_CATEGORIES.join(', ')}). Обязательно автоматически исправляй явные орфографические и грамматические ошибки в названиях товаров на правильный русский язык (например, если в исходном тексте написано 'малако', в JSON-ответ должно пойти 'молоко'; если написано 'кифир' — должно быть 'кефир'). При этом сохраняй оригинальный смысл, вкусы и бренды, если они узнаваемы. Зелень (укроп, петрушка, салат) — категория «Овощи и фрукты». Яйца — «Бакалея». Квас, сок, вода — «Напитки». Если количество не указано, запиши в quantity значение null. Выводи только чистый JSON-массив, без markdown-разметки, без пояснений и лишних символов.`;

export const YANDEX_SHOPPING_CREATE_SYSTEM_PROMPT =
  `ТЫ — ИИ-ассистент для создания списка покупок из свободного текста (чат, заметки, голосовая расшифровка).

Верни строго один JSON-объект следующей структуры:
{
  "type": "Домой" | "Дача" | "В дорогу",
  "title": "Название списка",
  "items": [
    {
      "name": "название продукта",
      "quantity": число или null,
      "unit": "шт" | "кг" | "л" | "уп" | "пак." | "пачка" | "пучок" | "бутылка" | "десяток" | "",
      "category": "одна из категорий"
    }
  ]
}

type — назначение списка. Определяй по явным триггерам в тексте:
- «на дачу», «дача», «в огород», «на участок» → «Дача»
- «в дорогу», «в поездку», «в машину», «в дорожный», «на пикник в дороге» → «В дорогу»
- «домой», «для дома», «в квартиру» → «Домой»

FALLBACK, ЕСЛИ НАЗНАЧЕНИЕ НЕ УКАЗАНО:
1. Если в тексте НЕТ явных триггеров дачи или дороги — type ОБЯЗАТЕЛЬНО «Домой».
2. title по умолчанию: «Продукты Домой (ДД.ММ)», где ДД.ММ — сегодняшняя дата из сообщения пользователя (если дата не передана — используй плейсхолдер «сегодня»).
3. АЛЬТЕРНАТИВА ПО КОНТЕКСТУ: если состав продуктов явно намекает на узкую тему (только овощи/фрукты, только мясо и угли для шашлыка, только молочка и т.п.), можешь предложить более точное title, например «Покупки: Овощи/Фрукты (ДД.ММ)» или «Шашлык (ДД.ММ)». Но type всё равно остаётся «Домой», пока нет триггеров дачи или дороги.

Если type = «Дача» или «В дорогу», title формируй кратко с датой, например «Продукты на дачу (ДД.ММ)» / «В дорогу (ДД.ММ)».

items — массив продуктов. Правила наполнения:
1. Если пользователь ПЕРЕЧИСЛИЛ товары («молоко, хлеб, яйца») — извлеки их все, не добавляй лишнего.
2. Если описал ЗАДАЧУ без списка («нужны продукты для шашлыка», «набор для борща», «закупка на неделю») — СОСТАВЬ типичный набор из 6–15 позиций под эту задачу.
3. Можно комбинировать: явные товары из текста + недостающее для понятной задачи (шашлык → мясо, уголь, овощи и т.п.).

name: правильный литературный русский, с маленькой буквы; исправляй опечатки («малако» → «молоко»).
quantity: число, если указано (в т.ч. «2 пакета» → quantity: 2, unit: «пак.»); иначе null.
unit: единица измерения; для «пакет/пакета/пакетов» используй «пак.»; если не указана — "".
category: строго одно из: ${AI_CATEGORIES.join(', ')}.
Зелень — «Овощи и фрукты». Яйца — «Бакалея». Квас, сок, вода — «Напитки». Угли, фольга, пакеты, губки — «Бытовая химия» (хозтовары).

Выводи только чистый JSON-объект, без markdown-разметки, без пояснений и лишних символов.`;

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

export const YANDEX_PACKING_CREATE_SYSTEM_PROMPT =
  `ТЫ — ИИ-ассистент для создания полного списка сборов в путешествие по свободному описанию пользователя.

ГЛАВНОЕ ПРАВИЛО РАЗДЕЛОВ (ОБЯЗАТЕЛЬНО):
Ты ОБЯЗАН анализировать маршрут, этапы и места в тексте пользователя и РАЗБИВАТЬ вещи по тематическим разделам (поле activity).
Нельзя сваливать всё в один «Основной список», если в описании есть несколько мест, этапов или активностей.

Пример: «Сначала Анталия, потом отель на море» → минимум 3 раздела:
- «Основной список» — документы, билеты, аптечка, общие дела на всю поездку
- «Анталия» — городская одежда, обувь для прогулок, карта/навигация по городу
- «Отель на море» — купальник, пляжные вещи, SPF, пляжная обувь

Верни строго один JSON-объект следующей структуры:
{
  "title": "Короткое название списка",
  "sections": ["Основной список", "Анталия", "Отель на море"],
  "items": [
    {
      "text": "Название вещи или дела",
      "type": "item" или "todo",
      "scope": "common" или "personal",
      "activity": "Название раздела из sections",
      "activityIcon": "один эмодзи раздела или пустая строка",
      "category": "Категория вещи",
      "categoryIcon": "один эмодзи категории или пустая строка"
    }
  ]
}

title: короткое название поездки/направления (1–4 слова), например «Турция», «Сочи», «Териберка». Без даты.
sections: массив названий разделов. Всегда начинай с «Основной список». Затем добавь отдельный раздел на КАЖДОЕ место/этап/активность из текста (города, отели, экскурсии, «на море», «в горы»). Обычно 2–5 разделов. Если в тексте одно место без этапов — достаточно «Основной список» + 1 тематический раздел.
items: 15–40 пунктов. У КАЖДОГО пункта activity = ТОЧНОЕ имя из sections (без опечаток и другого регистра).

type: item — физическая вещь; todo — действие/задача.
scope: всегда "common" (общие вещи и дела списка). Не используй "personal".
activity: раздел списка. Универсальное (паспорт, виза, билеты, аптечка, зарядка) → «Основной список». Всё, что относится к конкретному месту/этапу → в соответствующий раздел, НЕ в основной.
activityIcon: эмодзи раздела (🏙 Анталия, 🏖 отель на море). Для «Основной список» — "".
category: строго одно из: ${PACKING_ITEM_CATEGORIES.join(', ')}.
categoryIcon: эмодзи категории (🪪 Документы, 👗 Одежда, 💊 Аптечка, 🔌 Техника, 🏕 Снаряжение, 🍔 Перекус, 📦 Прочее).

ПРАВИЛА:
1. Сначала выпиши этапы/места из описания → заполни sections.
2. Затем распредели пункты: в каждом кастомном разделе должно быть не меньше 3 релевантных вещей/дел.
3. В «Основной список» — только общее на всю поездку (документы, билеты, аптечка, техника, общие брони).
4. Добавь и вещи (item), и дела (todo).
5. Не дублируй одинаковые пункты в разных разделах без необходимости.
6. ЗАПРЕЩЕНО: вернуть только «Основной список», если пользователь упомянул 2+ места или этапа.

Выводи только чистый JSON-объект, без markdown-разметки, без пояснений и лишних символов.`;

/** @deprecated используйте buildYandexSystemPrompt */
export const YANDEX_SYSTEM_PROMPT = YANDEX_SYSTEM_PROMPT_BASE;

export function normalizeParseMode(mode) {
  if (mode === PARSE_MODE.PACKING) return PARSE_MODE.PACKING;
  if (mode === PARSE_MODE.PACKING_CREATE) return PARSE_MODE.PACKING_CREATE;
  if (mode === PARSE_MODE.SHOPPING_CREATE) return PARSE_MODE.SHOPPING_CREATE;
  return PARSE_MODE.SHOPPING;
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
  const parseMode = normalizeParseMode(mode);
  if (parseMode === PARSE_MODE.PACKING_CREATE) {
    return YANDEX_PACKING_CREATE_SYSTEM_PROMPT;
  }
  if (parseMode === PARSE_MODE.PACKING) {
    return YANDEX_PACKING_SYSTEM_PROMPT;
  }
  if (parseMode === PARSE_MODE.SHOPPING_CREATE) {
    return YANDEX_SHOPPING_CREATE_SYSTEM_PROMPT;
  }
  return buildYandexSystemPrompt(customDictionary);
}

const YANDEX_COMPLETION_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

function isPackingMode(mode) {
  const parseMode = normalizeParseMode(mode);
  return parseMode === PARSE_MODE.PACKING || parseMode === PARSE_MODE.PACKING_CREATE;
}

function isObjectCreateMode(mode) {
  const parseMode = normalizeParseMode(mode);
  return parseMode === PARSE_MODE.PACKING_CREATE || parseMode === PARSE_MODE.SHOPPING_CREATE;
}

function stripMarkdownFence(text) {
  return String(text || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/** Достаёт первую сбалансированную JSON-скобку, учитывая строки. */
function extractBalancedJson(text, openChar, closeChar) {
  const start = text.indexOf(openChar);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function tryJsonParse(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/**
 * Разбор ответа YandexGPT: объект (create-режимы) или массив (parse-режимы).
 * Устойчив к markdown-ограждениям и «болтливому» тексту вокруг JSON.
 */
export function parseYandexJsonResponse(text, { expectObject = false } = {}) {
  const cleaned = stripMarkdownFence(text);
  let parsed;
  let lastError;

  const direct = tryJsonParse(cleaned);
  if (direct.ok) {
    parsed = direct.value;
  } else {
    lastError = direct.error;
    const candidates = expectObject
      ? [
        extractBalancedJson(cleaned, '{', '}'),
        extractBalancedJson(cleaned, '[', ']'),
      ]
      : [
        extractBalancedJson(cleaned, '[', ']'),
        extractBalancedJson(cleaned, '{', '}'),
      ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const result = tryJsonParse(candidate);
      if (result.ok) {
        parsed = result.value;
        break;
      }
      lastError = result.error;
    }
  }

  if (parsed === undefined) {
    const detail = lastError?.message ? `: ${lastError.message}` : '';
    throw new Error(`Не удалось разобрать ответ ИИ${detail}`);
  }

  if (expectObject) {
    // Иногда модель возвращает массив продуктов вместо { type, title, items }.
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('YandexGPT вернул не объект');
    }
    return parsed;
  }

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.products)) return parsed.products;
  if (Array.isArray(parsed?.items)) return parsed.items;
  throw new Error('YandexGPT вернул не массив');
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
  const temperature = isPackingMode(parseMode) || parseMode === PARSE_MODE.SHOPPING_CREATE
    ? 0.3
    : 0.1;
  const maxTokens = parseMode === PARSE_MODE.PACKING_CREATE
    ? '6000'
    : (parseMode === PARSE_MODE.PACKING || parseMode === PARSE_MODE.SHOPPING_CREATE
      ? '4000'
      : '2000');

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

  let parsed = parseYandexJsonResponse(content, {
    expectObject: isObjectCreateMode(parseMode),
  });

  // shopping-create: массив продуктов → оборачиваем в ожидаемый объект.
  if (parseMode === PARSE_MODE.SHOPPING_CREATE && Array.isArray(parsed)) {
    parsed = { type: 'Домой', title: '', items: parsed };
  }

  if (isObjectCreateMode(parseMode)) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('YandexGPT вернул не объект');
    }
  }

  return parsed;
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
        customDictionary: isPackingMode(mode) ? [] : customDictionary,
        mode,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      if (mode === PARSE_MODE.PACKING_CREATE || mode === PARSE_MODE.SHOPPING_CREATE) {
        res.end(JSON.stringify({ list: parsed, mode }));
      } else if (mode === PARSE_MODE.PACKING) {
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

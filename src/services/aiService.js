import { formatQuantity } from '../utils/quantity';
import { resolveCategory } from '../utils/productCategoryMap';
import { resolveYandexParseUrl } from '../utils/yandexParseUrl';
import {
  getPackingCategoryIcon,
  isKnownPackingCategory,
  normalizePackingActivity,
  PACKING_ACTIVITY_MAIN,
  PACKING_ITEM_TYPE,
  PACKING_MAIN_LIST_LABEL,
  PACKING_SCOPE,
} from '../utils/packingLists';
import { lookupPopularPackingItem } from '../utils/packingAutocomplete';
import { BUILTIN_TYPES, getListTypeLabel } from '../utils/listTypes';

export const AI_PARSE_MODE = {
  SHOPPING: 'shopping',
  SHOPPING_CREATE: 'shopping-create',
  PACKING: 'packing',
  PACKING_CREATE: 'packing-create',
};

const SHOPPING_TYPE_BY_LABEL = {
  домой: 'home',
  дача: 'cottage',
  'на дачу': 'cottage',
  'в дорогу': 'trip',
  дорогу: 'trip',
  home: 'home',
  cottage: 'cottage',
  trip: 'trip',
};

/** Человекочитаемое назначение для плашки превью. */
export const SHOPPING_PURPOSE_LABELS = {
  home: 'Домой',
  cottage: 'На дачу',
  trip: 'В дорогу',
};

export function resolveShoppingCreateType(rawType) {
  const key = String(rawType || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (SHOPPING_TYPE_BY_LABEL[key]) return SHOPPING_TYPE_BY_LABEL[key];
  if (BUILTIN_TYPES[key]) return key;
  return 'home';
}

/** Эвристика назначения по тексту, если API не вернул type (старый режим shopping). */
export function inferShoppingTypeFromText(text) {
  const value = String(text || '').toLowerCase();
  if (/(на\s+дач|на\s+участок|в\s+огород|\bдач[ауеы]?\b)/.test(value)) {
    return 'cottage';
  }
  if (/(в\s+дорогу|в\s+поездк|в\s+машин|дорожн)/.test(value)) {
    return 'trip';
  }
  if (/(домой|для\s+дома|в\s+квартир)/.test(value)) {
    return 'home';
  }
  return 'home';
}

function formatShoppingCreateDateLabel(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

export function buildDefaultShoppingCreateTitle(type = 'home', date = new Date()) {
  const dateLabel = formatShoppingCreateDateLabel(date);
  if (type === 'cottage') return `Продукты на дачу (${dateLabel})`;
  if (type === 'trip') return `В дорогу (${dateLabel})`;
  return `Продукты Домой (${dateLabel})`;
}

/**
 * Нормализация ответа режима shopping-create:
 * { type, title, items[] } с category / quantity у каждого пункта.
 * Также принимает legacy `{ products: [] }` и массив продуктов.
 */
export function normalizeShoppingCreateResponse(raw = {}, { today = new Date(), sourceText = '' } = {}) {
  const payload = Array.isArray(raw)
    ? { items: raw }
    : (raw && typeof raw === 'object' ? raw : {});

  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : (Array.isArray(payload.products) ? payload.products : []);

  const hasExplicitType = Boolean(String(payload.type || '').trim());
  const type = hasExplicitType
    ? resolveShoppingCreateType(payload.type)
    : inferShoppingTypeFromText(sourceText);

  const dateLabel = formatShoppingCreateDateLabel(today);

  let title = String(payload.title || '').trim()
    .replace(/\(ДД\.ММ\)/gi, `(${dateLabel})`)
    .replace(/\bДД\.ММ\b/gi, dateLabel);
  if (!title) {
    title = buildDefaultShoppingCreateTitle(type, today);
  } else if (!/\(\d{1,2}\.\d{1,2}\)/.test(title) && !/\d{1,2}\.\d{1,2}/.test(title)) {
    title = `${title} (${dateLabel})`;
  }

  const items = rawItems
    .map((item) => normalizeYandexProduct(item))
    .filter((item) => item.name);

  return {
    type,
    typeLabel: getListTypeLabel(type),
    purposeLabel: SHOPPING_PURPOSE_LABELS[type] || getListTypeLabel(type),
    title,
    items,
  };
}

/** Достаёт структуру списка из ответа API (новый shopping-create или legacy shopping). */
export function extractShoppingCreatePayload(data) {
  if (!data || typeof data !== 'object') return null;

  if (data.list && typeof data.list === 'object' && !Array.isArray(data.list)) {
    return data.list;
  }

  if (Array.isArray(data.products)) {
    return { products: data.products };
  }

  if (Array.isArray(data.items)) {
    return { items: data.items, type: data.type, title: data.title };
  }

  if (Array.isArray(data)) {
    return { items: data };
  }

  if (Array.isArray(data.list)) {
    return { items: data.list };
  }

  if (typeof data === 'object' && (data.items || data.products || data.type || data.title)) {
    return data;
  }

  return null;
}

function normalizeYandexProduct(item) {
  const name = String(item?.name || item?.text || item?.product || '')
    .trim()
    .toLowerCase();

  if (!name) {
    return { name: '', quantity: '1 шт', category: 'Прочее' };
  }

  let quantity = '1 шт';

  if (item.quantity != null && item.quantity !== '') {
    const unit = String(item.unit || 'шт').trim() || 'шт';
    const rawQty = item.quantity;
    const count =
      typeof rawQty === 'number'
        ? rawQty
        : parseFloat(String(rawQty).replace(',', '.'));

    if (Number.isFinite(count)) {
      quantity = formatQuantity(count, unit);
    } else {
      quantity = `${rawQty} ${unit}`.trim();
    }
  }

  return {
    name,
    quantity,
    category: resolveCategory({ aiCategory: item.category, productName: name }),
  };
}

function normalizeYandexPackingItem(item) {
  const name = String(item.text || item.name || '').trim();
  const type = item.type === PACKING_ITEM_TYPE.TODO
    ? PACKING_ITEM_TYPE.TODO
    : PACKING_ITEM_TYPE.ITEM;
  const scope = item.scope === PACKING_SCOPE.PERSONAL
    ? PACKING_SCOPE.PERSONAL
    : PACKING_SCOPE.COMMON;

  // GPT historically returns activity theme as `category`
  const themeRaw = String(item.activity || item.category || '').trim();
  const themeIcon = String(item.activityIcon || item.categoryIcon || item.icon || '').trim();
  const dictHit = lookupPopularPackingItem(name);

  let activity = PACKING_ACTIVITY_MAIN;
  let activityIcon = '';
  let category = '';

  if (themeRaw && isKnownPackingCategory(themeRaw)) {
    // Model returned a physical tag — keep as category, stay in main list
    category = themeRaw;
  } else if (themeRaw) {
    activity = normalizePackingActivity(themeRaw);
    activityIcon = themeIcon;
    category = dictHit?.category || '';
  } else {
    category = dictHit?.category || '';
  }

  return {
    name,
    type,
    scope,
    activity,
    activityIcon,
    category,
    categoryIcon: getPackingCategoryIcon(category, dictHit?.categoryIcon),
  };
}

/**
 * Нормализация ответа режима packing-create:
 * { title, sections, items[] } с явными activity + category у каждого пункта.
 */
export function normalizePackingCreateResponse(raw = {}) {
  const title = String(raw.title || '').trim() || 'Поездка';

  const sectionNames = (Array.isArray(raw.sections) ? raw.sections : [])
    .map((section) => String(section || '').trim())
    .filter(Boolean);

  const sectionIconByName = new Map();
  for (const section of sectionNames) {
    sectionIconByName.set(section, '');
  }

  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((item) => {
      const name = String(item?.text || item?.name || '').trim();
      if (!name) return null;

      const type = item?.type === PACKING_ITEM_TYPE.TODO
        ? PACKING_ITEM_TYPE.TODO
        : PACKING_ITEM_TYPE.ITEM;
      // Создание списка с ИИ: всё в общие по умолчанию (личный рюкзак — вручную позже)
      const scope = PACKING_SCOPE.COMMON;

      const activityRaw = String(item?.activity || item?.section || '').trim()
        || PACKING_MAIN_LIST_LABEL;

      // Сопоставляем с sections без учёта регистра, чтобы не терять кастомные разделы
      const matchedSection = sectionNames.find(
        (section) => section.toLowerCase() === activityRaw.toLowerCase(),
      );
      const resolvedActivityLabel = matchedSection || activityRaw;
      const activity = normalizePackingActivity(resolvedActivityLabel);
      const activityIcon = activity === PACKING_ACTIVITY_MAIN
        ? ''
        : String(
          item?.activityIcon
          || sectionIconByName.get(resolvedActivityLabel)
          || sectionIconByName.get(activityRaw)
          || '',
        ).trim();

      if (activity !== PACKING_ACTIVITY_MAIN && activityIcon) {
        sectionIconByName.set(resolvedActivityLabel, activityIcon);
      }

      let category = String(item?.category || '').trim();
      if (category && !isKnownPackingCategory(category)) {
        const dictHit = lookupPopularPackingItem(name);
        category = dictHit?.category || '';
      }
      if (!category) {
        category = lookupPopularPackingItem(name)?.category || '';
      }

      return {
        name,
        type,
        scope,
        activity,
        activityIcon,
        category,
        categoryIcon: getPackingCategoryIcon(
          category,
          String(item?.categoryIcon || '').trim(),
        ),
      };
    })
    .filter(Boolean);

  const sections = [];
  const seen = new Set();

  const pushSection = (label, icon = '') => {
    const activity = normalizePackingActivity(label);
    const key = activity === PACKING_ACTIVITY_MAIN ? PACKING_ACTIVITY_MAIN : activity;
    if (seen.has(key)) return;
    seen.add(key);
    sections.push({
      activity: key,
      activityIcon: key === PACKING_ACTIVITY_MAIN
        ? ''
        : (icon || sectionIconByName.get(label) || ''),
      label: key === PACKING_ACTIVITY_MAIN ? PACKING_MAIN_LIST_LABEL : activity,
    });
  };

  pushSection(PACKING_MAIN_LIST_LABEL);
  for (const section of sectionNames) {
    pushSection(section, sectionIconByName.get(section) || '');
  }
  for (const item of items) {
    if (item.activity !== PACKING_ACTIVITY_MAIN) {
      pushSection(item.activity, item.activityIcon);
    }
  }

  return { title, sections, items };
}

async function postYandexParse(payload) {
  const apiUrl = resolveYandexParseUrl();

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      'Нет связи с сервером распознавания. Проверьте интернет. Если без VPN — используйте URL Yandex Cloud Functions.',
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Ошибка распознавания: ${response.status}`);
  }

  return data;
}

/**
 * Распознавание через Vite-прокси (локально) или Yandex Cloud Functions (прод).
 * Лимиты учитываются в Firestore на клиенте (план Spark, без Firebase Cloud Functions).
 */
export async function parseProductsWithAI(text, { customDictionary = [] } = {}) {
  const data = await postYandexParse({
    text,
    mode: AI_PARSE_MODE.SHOPPING,
    customDictionary,
  });

  const parsed = data.products;

  if (!Array.isArray(parsed)) {
    throw new Error('Некорректный ответ сервера');
  }

  return parsed
    .map(normalizeYandexProduct)
    .filter((item) => item.name);
}

/** ИИ-парсинг для списков сборов / путешествий. */
export async function parsePackingItemsWithAI(text) {
  const data = await postYandexParse({
    text,
    mode: AI_PARSE_MODE.PACKING,
  });

  const parsed = data.items ?? data.products;

  if (!Array.isArray(parsed)) {
    throw new Error('Некорректный ответ сервера');
  }

  return parsed
    .map(normalizeYandexPackingItem)
    .filter((item) => item.name);
}

/**
 * Полная генерация списка покупок по тексту из чата/заметок.
 * @returns {{ type: string, typeLabel: string, purposeLabel: string, title: string, items: Array }}
 */
export async function generateShoppingListWithAI(text, { customDictionary = [], today = new Date() } = {}) {
  const sourceText = String(text || '').trim();
  const dateLabel = formatShoppingCreateDateLabel(today);
  const requestText = `Сегодняшняя дата: ${dateLabel}\n\n${sourceText}`;
  const dictionary = Array.isArray(customDictionary)
    ? customDictionary
    : Object.values(customDictionary || {});

  let normalized = { items: [] };
  let createError = null;

  try {
    const data = await postYandexParse({
      text: requestText,
      mode: AI_PARSE_MODE.SHOPPING_CREATE,
      customDictionary: dictionary,
    });
    const rawList = extractShoppingCreatePayload(data);
    normalized = normalizeShoppingCreateResponse(rawList || {}, {
      today,
      sourceText,
    });
  } catch (err) {
    createError = err;
    normalized = { items: [] };
  }

  // Старый Cloud Function / пустой ответ — режим shopping (извлечение).
  if (normalized.items.length === 0) {
    try {
      const data = await postYandexParse({
        text: sourceText,
        mode: AI_PARSE_MODE.SHOPPING,
        customDictionary: dictionary,
      });
      const rawList = extractShoppingCreatePayload(data);
      normalized = normalizeShoppingCreateResponse(rawList || {}, {
        today,
        sourceText,
      });
    } catch (err) {
      if (!createError) createError = err;
    }
  }

  // Концептуальный запрос («для шашлыка») без явного списка — shopping часто
  // возвращает []. Подсказка в user-тексте помогает даже на старом CF.
  if (normalized.items.length === 0) {
    const hinted = [
      'Составь типичный список продуктов по запросу ниже.',
      'Верни конкретные товары (мясо, овощи, уголь и т.п.), не общие слова.',
      '',
      sourceText,
    ].join('\n');
    try {
      const data = await postYandexParse({
        text: hinted,
        mode: AI_PARSE_MODE.SHOPPING,
        customDictionary: dictionary,
      });
      const rawList = extractShoppingCreatePayload(data);
      normalized = normalizeShoppingCreateResponse(rawList || {}, {
        today,
        sourceText,
      });
    } catch (err) {
      if (!createError) createError = err;
    }
  }

  if (normalized.items.length === 0) {
    throw new Error(
      createError?.message || 'ИИ не смог распознать продукты в этом тексте',
    );
  }

  return normalized;
}

/**
 * Полная генерация списка сборов по текстовому описанию поездки.
 * @returns {{ title: string, sections: Array<{activity, activityIcon, label}>, items: Array }}
 */
export async function generatePackingListWithAI(text) {
  const data = await postYandexParse({
    text,
    mode: AI_PARSE_MODE.PACKING_CREATE,
  });

  const rawList = data.list ?? data;
  if (!rawList || typeof rawList !== 'object' || Array.isArray(rawList)) {
    throw new Error('Некорректный ответ сервера');
  }

  const normalized = normalizePackingCreateResponse(rawList);
  if (normalized.items.length === 0) {
    throw new Error('ИИ не смог подобрать вещи для этого описания');
  }

  return normalized;
}

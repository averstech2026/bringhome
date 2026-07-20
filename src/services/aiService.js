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

export const AI_PARSE_MODE = {
  SHOPPING: 'shopping',
  PACKING: 'packing',
  PACKING_CREATE: 'packing-create',
};

function normalizeYandexProduct(item) {
  const name = String(item.name || '')
    .trim()
    .toLowerCase();

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

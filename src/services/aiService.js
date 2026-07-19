import { formatQuantity } from '../utils/quantity';
import { resolveCategory } from '../utils/productCategoryMap';
import { resolveYandexParseUrl } from '../utils/yandexParseUrl';
import { PACKING_ITEM_TYPE, PACKING_SCOPE } from '../utils/packingLists';

export const AI_PARSE_MODE = {
  SHOPPING: 'shopping',
  PACKING: 'packing',
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
  const category = String(item.category || '').trim();
  const categoryIcon = String(item.categoryIcon || item.icon || '').trim();

  return { name, type, scope, category, categoryIcon };
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

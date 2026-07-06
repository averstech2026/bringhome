import { formatQuantity } from '../utils/quantity';
import { resolveCategory } from '../utils/productCategoryMap';
import { resolveYandexParseUrl } from '../utils/yandexParseUrl';

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

export async function parseProductsWithAI(text) {
  const apiUrl = resolveYandexParseUrl();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Ошибка распознавания: ${response.status}`);
  }

  const parsed = data.products;

  if (!Array.isArray(parsed)) {
    throw new Error('Некорректный ответ сервера');
  }

  return parsed
    .map(normalizeYandexProduct)
    .filter((item) => item.name);
}

import { normalizeItemName } from './mergeItems';
import { CATEGORY_ORDER, detectCategory } from './categories';

const STORAGE_KEY = 'bringhome_product_categories';

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getLearnedCategory(productName) {
  const map = loadMap();
  return map[normalizeItemName(productName)] || null;
}

export function saveLearnedCategory(productName, category) {
  const map = loadMap();
  map[normalizeItemName(productName)] = category;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function resolveCategory({ aiCategory, productName }) {
  const learned = getLearnedCategory(productName);
  if (learned && CATEGORY_ORDER.includes(learned)) {
    return learned;
  }

  if (aiCategory && CATEGORY_ORDER.includes(aiCategory)) {
    return aiCategory;
  }

  return detectCategory(productName) || 'Прочее';
}

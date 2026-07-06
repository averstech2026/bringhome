import { normalizeItemName } from './mergeItems';
import { parseQuantity } from './quantity';

const STORAGE_KEY = 'bringhome_product_units';

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getLearnedUnit(productName) {
  const map = loadMap();
  return map[normalizeItemName(productName)] || null;
}

export function saveLearnedUnit(productName, quantity) {
  const trimmed = (productName || '').trim();
  if (!trimmed || !quantity) return;

  const { unit } = parseQuantity(quantity);
  if (!unit) return;

  const map = loadMap();
  map[normalizeItemName(trimmed)] = unit;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

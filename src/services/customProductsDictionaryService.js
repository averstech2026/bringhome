import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { normalizeItemName } from '../utils/mergeItems';
import { CATEGORY_ORDER } from '../utils/categories';

let cache = null;
let loadPromise = null;

function normalizeCategory(category) {
  if (!category || !CATEGORY_ORDER.includes(category)) return null;
  return category;
}

function normalizeUnit(unit) {
  const value = String(unit || 'шт').trim() || 'шт';
  return value;
}

export async function ensureDictionaryLoaded() {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!db) {
      cache = {};
      return cache;
    }

    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.CUSTOM_PRODUCTS_DICTIONARY));
      const next = {};
      snapshot.docs.forEach((entry) => {
        const data = entry.data();
        const name = normalizeItemName(data.name || entry.id);
        const category = normalizeCategory(data.category);
        if (!name || !category) return;
        next[name] = {
          name,
          category,
          unit: normalizeUnit(data.unit),
        };
      });
      cache = next;
    } catch {
      cache = {};
    }

    return cache;
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function getDictionaryCache() {
  return cache || {};
}

export function invalidateDictionaryCache() {
  cache = null;
  loadPromise = null;
}

export function lookupCustomProduct(name) {
  const norm = normalizeItemName(name);
  if (!norm) return null;
  return getDictionaryCache()[norm] || null;
}

/** Совпадение по префиксу: «моца» → «моцарелла» */
export function findPartialCustomProductMatch(text) {
  const lower = text.toLowerCase().trim();
  if (lower.length < 2) return null;

  const map = getDictionaryCache();
  if (map[lower]) return map[lower];

  let best = null;
  for (const entry of Object.values(map)) {
    if (!entry.name.startsWith(lower)) continue;
    if (!best || entry.name.length < best.name.length) {
      best = entry;
    }
  }
  return best;
}

export function resolveCustomProduct(name) {
  return lookupCustomProduct(name) || findPartialCustomProductMatch(name);
}

export async function saveCustomProduct({ name, category, unit, respectExisting = false }) {
  const norm = normalizeItemName(name);
  const normalizedCategory = normalizeCategory(category);
  if (!norm || !normalizedCategory || !db) return false;

  if (respectExisting) {
    const existing = lookupCustomProduct(norm);
    if (existing?.category) return false;
  }

  const normalizedUnit = normalizeUnit(unit);
  const entry = {
    name: norm,
    category: normalizedCategory,
    unit: normalizedUnit,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, COLLECTIONS.CUSTOM_PRODUCTS_DICTIONARY, norm), entry, { merge: true });
  } catch {
    return false;
  }

  if (!cache) cache = {};
  cache[norm] = {
    name: norm,
    category: normalizedCategory,
    unit: normalizedUnit,
  };

  return true;
}

export function formatDictionaryForAI(dictionary = getDictionaryCache()) {
  const lines = Object.values(dictionary)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .map((entry) => `${entry.name} → ${entry.category} (${entry.unit})`);

  if (lines.length === 0) return '';
  return lines.join('\n');
}

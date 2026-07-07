/** Единицы для выбора в калькуляторе количества */
export const QUANTITY_UNITS = ['шт', 'кг', 'л', 'г', 'уп', 'пуч.', 'пак.', 'бан.'];

/** Сокращения единиц для компактного отображения */
const UNIT_ABBREVIATIONS = {
  пучок: 'пуч.',
  пуч: 'пуч.',
  бутылка: 'бут.',
  бут: 'бут.',
  десяток: 'дес.',
  дес: 'дес.',
  пачка: 'пч.',
  пч: 'пч.',
  килограмм: 'кг',
  кг: 'кг',
  грамм: 'г',
  г: 'г',
  литр: 'л',
  л: 'л',
  штука: 'шт',
  шт: 'шт',
  упаковка: 'уп',
  уп: 'уп',
  банка: 'бан.',
  бан: 'бан.',
  пакет: 'пак.',
  пак: 'пак.',
  батон: 'бат.',
  бат: 'бат.',
};

export function abbreviateUnit(unit) {
  const normalized = (unit || 'шт').trim().toLowerCase();
  return UNIT_ABBREVIATIONS[normalized] || normalized;
}

/** Приводит единицу к значению из списка выбора (бан → бан.) */
export function resolvePickerUnit(unit) {
  const raw = (unit || 'шт').trim().toLowerCase();
  const short = abbreviateUnit(raw);
  const found = QUANTITY_UNITS.find(
    (q) => q.toLowerCase() === raw || abbreviateUnit(q) === short,
  );
  return found || unit || 'шт';
}

/** Список единиц для пикера без дублей по отображаемому ярлыку */
export function getUnitPickerOptions(currentUnit) {
  const resolved = resolvePickerUnit(currentUnit);
  const extras = resolved
    && !QUANTITY_UNITS.some((q) => abbreviateUnit(q) === abbreviateUnit(resolved))
    ? [resolved]
    : [];

  const seen = new Set();
  return [...QUANTITY_UNITS, ...extras].filter((u) => {
    const key = abbreviateUnit(u);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getStepByUnit(unit) {
  const normalized = abbreviateUnit((unit || 'шт').trim().toLowerCase());
  if (normalized === 'г') return 100;
  return 1;
}

export function getQuantityStep(qtyStr) {
  const { count, unit } = parseQuantity(qtyStr);
  if (abbreviateUnit(unit) === 'г') return 100;
  if (!Number.isInteger(count)) return 0.5;
  return 1;
}

export function getMinimumCount(qtyStr) {
  return getQuantityStep(qtyStr);
}

export function roundQuantityCount(count, unit = null) {
  if (unit && getStepByUnit(unit) === 100) {
    return Math.round(count);
  }
  if (Number.isInteger(count)) return count;
  return Number(count.toFixed(1));
}

/** Разбирает строку количества вида "2 шт", "1.5 кг", "3л" */
export function parseQuantity(qtyStr) {
  const str = (qtyStr || '1 шт').trim();
  const match = str.match(/^([\d]+(?:[.,]\d+)?)\s*(.*)$/);
  if (match) {
    const count = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].trim() || 'шт';
    return { count: Number.isFinite(count) ? count : 1, unit };
  }
  return { count: 1, unit: 'шт' };
}

export function formatQuantity(count, unit = 'шт') {
  const n = Number.isInteger(count) ? count : parseFloat(count.toFixed(2));
  return `${n} ${unit}`.trim();
}

export function addQuantities(a, b) {
  const pa = parseQuantity(a);
  const pb = parseQuantity(b);
  if (pa.unit === pb.unit) {
    return formatQuantity(pa.count + pb.count, pa.unit);
  }
  return formatQuantity(pa.count + 1, pa.unit);
}

export function incrementQuantity(qtyStr, delta = 1) {
  const { count, unit } = parseQuantity(qtyStr);
  const direction = delta < 0 ? -1 : 1;
  const step = Math.abs(delta) === 1 ? getQuantityStep(qtyStr) : Math.abs(delta);
  let newCount = count + direction * step;
  if (getStepByUnit(unit) === 100) {
    newCount = Math.round(newCount / 100) * 100;
  } else {
    newCount = roundQuantityCount(newCount, unit);
  }
  const min = getMinimumCount(qtyStr);
  if (newCount < min) return null;
  return formatQuantity(newCount, unit);
}

export function resetBaseQuantity(qtyStr) {
  const { unit } = parseQuantity(qtyStr);
  return formatQuantity(1, unit);
}

export function getQuantityDisplay(qtyStr) {
  const { count, unit } = parseQuantity(qtyStr);
  const shortUnit = abbreviateUnit(unit);
  const n = Number.isInteger(count) ? count : roundQuantityCount(count);
  return { count, unit, label: `${n} ${shortUnit}`.trim() };
}

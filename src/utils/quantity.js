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

const WEIGHT_VOLUME_UNITS = new Set([
  'кг',
  'килограмм',
  'г',
  'грамм',
  'л',
  'литр',
  'ml',
  'мл',
]);

export function isFractionalQuantity(qtyStr) {
  const { count, unit } = parseQuantity(qtyStr);
  if (!Number.isInteger(count)) return true;
  return WEIGHT_VOLUME_UNITS.has(unit.trim().toLowerCase());
}

export function getQuantityStep(qtyStr) {
  return isFractionalQuantity(qtyStr) ? 0.5 : 1;
}

export function getMinimumCount(qtyStr) {
  return getQuantityStep(qtyStr);
}

export function roundQuantityCount(count) {
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
  const newCount = roundQuantityCount(count + direction * step);
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

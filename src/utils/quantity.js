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
  const newCount = count + delta;
  if (newCount <= 0) return null;
  return formatQuantity(newCount, unit);
}

export function resetBaseQuantity(qtyStr) {
  const { unit } = parseQuantity(qtyStr);
  return formatQuantity(1, unit);
}

export function getQuantityDisplay(qtyStr) {
  const { count, unit } = parseQuantity(qtyStr);
  return { count, unit, label: formatQuantity(count, unit) };
}

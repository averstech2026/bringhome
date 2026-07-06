import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import CheckToggle from './CheckToggle';
import { getQuantityDisplay } from '../../utils/quantity';
import {
  CATEGORY_ORDER,
  CATEGORY_EMOJI,
  getCategoryHeaderClass,
} from '../../utils/categories';
import { groupItemsByCategory } from '../../utils/groupByCategory';

function normalizePreviewCategory(category) {
  const value = category || 'Прочее';
  return CATEGORY_ORDER.includes(value) ? value : 'Прочее';
}

function PreviewRow({ item, checked, onToggle }) {
  const { label } = getQuantityDisplay(item.quantity);
  const emoji = CATEGORY_EMOJI[item.category] || '📦';

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
      <CheckToggle checked={checked} onChange={onToggle} />
      <span className="min-w-0 flex-1 text-sm text-slate-700">{item.name}</span>
      <span className="shrink-0 text-sm" aria-hidden>
        {emoji}
      </span>
      <span className="w-20 shrink-0 text-right text-xs font-medium text-slate-500 tabular-nums">
        {label}
      </span>
    </div>
  );
}

function PreviewCategorySection({
  category,
  items,
  selectedIds,
  onToggleItem,
  onToggleCategory,
  isFirst,
}) {
  const headerColor = getCategoryHeaderClass(category);
  const emoji = CATEGORY_EMOJI[category] || '📦';
  const selectedInCategory = items.filter((item) => selectedIds.has(item._previewId)).length;
  const allSelected = selectedInCategory === items.length;

  return (
    <section className={isFirst ? '' : 'mt-4'}>
      <div
        className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${headerColor}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm" aria-hidden>
            {emoji}
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wider">{category}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] font-semibold opacity-70">{items.length}</span>
          <button
            type="button"
            onClick={() => onToggleCategory?.(category, !allSelected)}
            className="text-[11px] font-medium underline-offset-2 transition-colors hover:underline"
          >
            {allSelected ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <PreviewRow
            key={item._previewId}
            item={item}
            checked={selectedIds.has(item._previewId)}
            onToggle={() => onToggleItem(item._previewId)}
          />
        ))}
      </div>
    </section>
  );
}

function pluralItems(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'товаров';
  if (mod10 === 1) return 'товар';
  if (mod10 >= 2 && mod10 <= 4) return 'товара';
  return 'товаров';
}

export default function AiPreviewModal({
  open,
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  onToggleCategory,
  onConfirm,
  onClose,
  adding = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const grouped = useMemo(() => {
    const normalized = items.map((item) => ({
      ...item,
      category: normalizePreviewCategory(item.category),
    }));
    return groupItemsByCategory(normalized);
  }, [items]);

  if (!open || items.length === 0) return null;

  const selectedCount = items.filter((p) => selectedIds.has(p._previewId)).length;
  const allSelected = selectedCount === items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
              Распознано ИИ
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              {items.length} {pluralItems(items.length)}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Выберите, что добавить в список</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => onToggleAll?.(!allSelected)}
            className="text-xs font-medium text-violet-600 transition-colors hover:text-violet-700"
          >
            {allSelected ? 'Снять всё' : 'Выбрать всё'}
          </button>
          <span className="text-xs text-slate-400">Выбрано: {selectedCount}</span>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {grouped.map(([category, categoryItems], index) => (
            <PreviewCategorySection
              key={category}
              category={category}
              items={categoryItems}
              selectedIds={selectedIds}
              onToggleItem={onToggleItem}
              onToggleCategory={onToggleCategory}
              isFirst={index === 0}
            />
          ))}
        </div>

        <div className="border-t border-slate-100 p-4 sm:p-5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={adding || selectedCount === 0}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {adding
              ? 'Добавляем…'
              : `Добавить в список (+${selectedCount} ${pluralItems(selectedCount)})`}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, ChevronDown, ClipboardList, FolderPlus, ListPlus, X } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET } from '../ui/AppModal';
import CheckToggle from './CheckToggle';
import { getQuantityDisplay } from '../../utils/quantity';
import {
  CATEGORY_ORDER,
  CATEGORY_EMOJI,
  getCategoryHeaderClass,
} from '../../utils/categories';
import { groupItemsByCategory } from '../../utils/groupByCategory';
import { getAiPreviewTheme } from '../../utils/uiThemes';
import { AI_PARSE_MODE } from '../../services/aiService';
import {
  formatPackingCategoryLabel,
  PACKING_ITEM_TYPE,
  PACKING_SCOPE,
  PACKING_UNCATEGORIZED_LABEL,
  resolvePackingCategoryRename,
} from '../../utils/packingLists';

const MODAL_PANEL_WIDE_BASE =
  'relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl shadow-2xl sm:max-h-[85vh] sm:rounded-2xl';

const PACKING_SCOPE_ORDER = [PACKING_SCOPE.COMMON, PACKING_SCOPE.PERSONAL];

const PACKING_SCOPE_LABELS = {
  [PACKING_SCOPE.COMMON]: 'Общие',
  [PACKING_SCOPE.PERSONAL]: 'Личные',
};

function normalizePreviewCategory(category) {
  const value = category || 'Прочее';
  return CATEGORY_ORDER.includes(value) ? value : 'Прочее';
}

function pluralShopping(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'товаров';
  if (mod10 === 1) return 'товар';
  if (mod10 >= 2 && mod10 <= 4) return 'товара';
  return 'товаров';
}

function pluralPacking(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'пунктов';
  if (mod10 === 1) return 'пункт';
  if (mod10 >= 2 && mod10 <= 4) return 'пункта';
  return 'пунктов';
}

function ShoppingPreviewRow({ item, checked, onToggle }) {
  const { label } = getQuantityDisplay(item.quantity);
  const emoji = CATEGORY_EMOJI[item.category] || '📦';

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50/80">
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

function PackingPreviewRow({ item, checked, onToggle }) {
  const isTodo = item.type === PACKING_ITEM_TYPE.TODO;
  const TypeIcon = isTodo ? ClipboardList : Briefcase;

  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50/80">
      <CheckToggle checked={checked} onChange={onToggle} />
      <span className="min-w-0 flex-1 text-sm text-slate-700">{item.name}</span>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          isTodo ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <TypeIcon className="h-3 w-3" aria-hidden />
        {isTodo ? 'Дело' : 'Вещь'}
      </span>
    </div>
  );
}

function PackingScopeHeader({
  scope,
  count,
  allSelected,
  onToggleCategory,
  onChangeScope,
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-slate-100 px-3 py-2 text-slate-700">
      <label className="relative inline-flex min-w-0 items-center gap-1">
        <select
          value={scope}
          onChange={(event) => {
            const next = event.target.value;
            if (next !== scope) onChangeScope?.(scope, next);
          }}
          aria-label="Тип группы: общие или личные"
          className="appearance-none rounded-md bg-transparent py-0.5 pl-0 pr-5 text-xs font-bold uppercase tracking-wider text-slate-700 outline-none"
        >
          <option value={PACKING_SCOPE.COMMON}>{PACKING_SCOPE_LABELS[PACKING_SCOPE.COMMON]}</option>
          <option value={PACKING_SCOPE.PERSONAL}>{PACKING_SCOPE_LABELS[PACKING_SCOPE.PERSONAL]}</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-slate-500"
          strokeWidth={2.25}
          aria-hidden
        />
      </label>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[11px] font-semibold opacity-70">{count}</span>
        <button
          type="button"
          onClick={() => onToggleCategory?.(scope, !allSelected)}
          className="text-[11px] font-medium underline-offset-2 transition-colors hover:underline"
        >
          {allSelected ? 'Снять все' : 'Выбрать все'}
        </button>
      </div>
    </div>
  );
}

function PreviewCategorySection({
  category,
  items,
  selectedIds,
  onToggleItem,
  onToggleCategory,
  onChangeScope,
  isFirst,
  packing = false,
}) {
  const headerColor = packing
    ? 'bg-slate-100 text-slate-700'
    : getCategoryHeaderClass(category);
  const emoji = packing ? null : (CATEGORY_EMOJI[category] || '📦');
  const selectedInCategory = items.filter((item) => selectedIds.has(item._previewId)).length;
  const allSelected = selectedInCategory === items.length;
  const title = packing ? (PACKING_SCOPE_LABELS[category] || category) : category;

  return (
    <section className={isFirst ? '' : 'mt-4'}>
      {packing ? (
        <PackingScopeHeader
          scope={category}
          count={items.length}
          allSelected={allSelected}
          onToggleCategory={onToggleCategory}
          onChangeScope={onChangeScope}
        />
      ) : (
        <div
          className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${headerColor}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {emoji && (
              <span className="text-sm" aria-hidden>
                {emoji}
              </span>
            )}
            <span className="truncate text-xs font-bold uppercase tracking-wider">{title}</span>
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
      )}

      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          packing ? (
            <PackingPreviewRow
              key={item._previewId}
              item={item}
              checked={selectedIds.has(item._previewId)}
              onToggle={() => onToggleItem(item._previewId)}
            />
          ) : (
            <ShoppingPreviewRow
              key={item._previewId}
              item={item}
              checked={selectedIds.has(item._previewId)}
              onToggle={() => onToggleItem(item._previewId)}
            />
          )
        ))}
      </div>
    </section>
  );
}

function groupPackingByScope(items) {
  const buckets = {
    [PACKING_SCOPE.COMMON]: [],
    [PACKING_SCOPE.PERSONAL]: [],
  };

  for (const item of items) {
    const scope = item.scope === PACKING_SCOPE.PERSONAL
      ? PACKING_SCOPE.PERSONAL
      : PACKING_SCOPE.COMMON;
    buckets[scope].push(item);
  }

  return PACKING_SCOPE_ORDER
    .filter((scope) => buckets[scope].length > 0)
    .map((scope) => [scope, buckets[scope]]);
}

/** Самая частая тема активности из ответа ИИ. */
function pickSuggestedPackingSection(items = []) {
  const counts = new Map();

  for (const item of items) {
    const category = String(item?.category || '').trim();
    if (!category || category === PACKING_UNCATEGORIZED_LABEL) continue;
    const prev = counts.get(category) || {
      count: 0,
      category,
      categoryIcon: '',
    };
    prev.count += 1;
    if (!prev.categoryIcon && item?.categoryIcon) {
      prev.categoryIcon = String(item.categoryIcon).trim();
    }
    counts.set(category, prev);
  }

  let best = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best
    ? { category: best.category, categoryIcon: best.categoryIcon || '' }
    : null;
}

export default function AiPreviewModal({
  open,
  items,
  selectedIds,
  onToggleItem,
  onToggleAll,
  onToggleCategory,
  onChangePackingScope,
  onConfirm,
  onClose,
  adding = false,
  uiTheme = 'default',
  mode = AI_PARSE_MODE.SHOPPING,
}) {
  const isPacking = mode === AI_PARSE_MODE.PACKING;
  const previewTheme = useMemo(() => getAiPreviewTheme(uiTheme), [uiTheme]);
  const suggestedSection = useMemo(
    () => (isPacking ? pickSuggestedPackingSection(items) : null),
    [items, isPacking],
  );

  const [placement, setPlacement] = useState('default'); // 'section' | 'default'
  const [sectionDraft, setSectionDraft] = useState('');

  useEffect(() => {
    if (!open || !isPacking) return;
    if (suggestedSection?.category) {
      setPlacement('section');
      setSectionDraft(
        formatPackingCategoryLabel(suggestedSection.category, suggestedSection.categoryIcon),
      );
    } else {
      setPlacement('default');
      setSectionDraft('');
    }
  }, [open, isPacking, suggestedSection]);

  const grouped = useMemo(() => {
    if (isPacking) {
      return groupPackingByScope(items);
    }

    const normalized = items.map((item) => ({
      ...item,
      category: normalizePreviewCategory(item.category),
    }));
    return groupItemsByCategory(normalized);
  }, [items, isPacking]);

  if (!open || items.length === 0) return null;

  const selectedCount = items.filter((p) => selectedIds.has(p._previewId)).length;
  const allSelected = selectedCount === items.length;
  const plural = isPacking ? pluralPacking : pluralShopping;
  const resolvedSection = resolvePackingCategoryRename(sectionDraft, {
    keepIcon: suggestedSection?.categoryIcon || '',
  });
  const sectionReady = Boolean(resolvedSection.category);
  const confirmDisabled = adding
    || selectedCount === 0
    || (isPacking && placement === 'section' && !sectionReady);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    if (!isPacking) {
      onConfirm?.();
      return;
    }
    onConfirm?.({
      placement,
      category: placement === 'section' ? resolvedSection.category : '',
      categoryIcon: placement === 'section' ? resolvedSection.categoryIcon : '',
    });
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="ai-preview-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE_BASE} ${previewTheme.panelClassName}`}
    >
      <div className={`flex items-start justify-between gap-3 border-b px-5 pb-4 pt-5 sm:px-6 sm:pt-6 ${previewTheme.dividerClassName}`}>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${previewTheme.labelClassName}`}>
            Распознано ИИ
          </p>
          <h2 id="ai-preview-title" className="mt-1 text-lg font-bold text-slate-900">
            {items.length} {plural(items.length)}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {isPacking ? 'Выберите, что добавить в сборы' : 'Выберите, что добавить в список'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors ${previewTheme.closeHoverClassName}`}
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={`flex items-center justify-between border-b px-5 py-2 sm:px-6 ${previewTheme.dividerClassName}`}>
        <button
          type="button"
          onClick={() => onToggleAll?.(!allSelected)}
          className={`text-xs font-medium transition-colors ${previewTheme.linkClassName}`}
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
            onChangeScope={onChangePackingScope}
            isFirst={index === 0}
            packing={isPacking}
          />
        ))}
      </div>

      <div className={`border-t p-4 sm:p-5 ${previewTheme.dividerClassName}`}>
        {isPacking && (
          <div className="mb-3 space-y-2">
            <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Куда добавить
            </p>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2.5 transition ${
                placement === 'section'
                  ? 'border-indigo-200 bg-indigo-50/60'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="packing-ai-placement"
                checked={placement === 'section'}
                onChange={() => setPlacement('section')}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <FolderPlus className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                  Создать новый раздел
                </span>
                <input
                  type="text"
                  value={sectionDraft}
                  onFocus={() => setPlacement('section')}
                  onChange={(event) => {
                    setPlacement('section');
                    setSectionDraft(event.target.value);
                  }}
                  placeholder="Например: Морская прогулка"
                  maxLength={48}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-300"
                />
              </span>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                placement === 'default'
                  ? 'border-indigo-200 bg-indigo-50/60'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="packing-ai-placement"
                checked={placement === 'default'}
                onChange={() => setPlacement('default')}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <ListPlus className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  В «{PACKING_UNCATEGORIZED_LABEL}»
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Обычный список без отдельного раздела
                </span>
              </span>
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className={`relative inline-flex w-full items-center justify-center overflow-hidden rounded-full py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:opacity-50 disabled:active:scale-100 ${previewTheme.confirmButtonClass}`}
        >
          <span className="relative z-10">
            {adding
              ? 'Добавляем…'
              : isPacking && placement === 'section' && sectionReady
                ? `В раздел «${resolvedSection.category}» (+${selectedCount})`
                : `Добавить в список (+${selectedCount} ${plural(selectedCount)})`}
          </span>
        </button>
      </div>
    </AppModal>
  );
}

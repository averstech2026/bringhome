import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, X } from 'lucide-react';
import PackingItemRow from './PackingItemRow';
import {
  formatPackingActivityLabel,
  formatPackingCategoryLabel,
  groupPackingItemsByItemCategory,
  isPackingMainActivity,
  PACKING_ACTIVITY_MAIN,
  PACKING_MAIN_LIST_LABEL,
  resolvePackingActivityRename,
} from '../../utils/packingLists';

function PackingItemList({
  items,
  mode,
  currentUserId,
  currentUserName,
  currentUserPhotoUrl,
  membersById,
  members,
  busyItemId,
  cloudSync,
  persistedItemIds,
  onToggle,
  onAssign,
  onOpenDetails,
  onRemove,
  onSyncStateChange,
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <PackingItemRow
          key={item.id}
          item={item}
          mode={mode}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserPhotoUrl={currentUserPhotoUrl}
          membersById={membersById}
          members={members}
          busy={busyItemId === item.id}
          cloudSync={cloudSync && (persistedItemIds ? persistedItemIds.has(item.id) : true)}
          onToggle={(next) => onToggle?.(item, next)}
          onAssign={(userId) => onAssign?.(item, userId)}
          onOpenDetails={onOpenDetails}
          onRemove={onRemove}
          onSyncStateChange={onSyncStateChange}
        />
      ))}
    </ul>
  );
}

/**
 * Аккордеон-блок пунктов сборов по разделу (activity),
 * внутри — подгруппы по category (тег вещи).
 */
export default function PackingCategoryGroup({
  activity = PACKING_ACTIVITY_MAIN,
  activityIcon = '',
  items = [],
  groupByCategory = false,
  defaultOpen = true,
  mode = 'common',
  currentUserId,
  currentUserName = '',
  currentUserPhotoUrl = null,
  membersById = {},
  members = [],
  busyItemId = null,
  onToggle,
  onAssign,
  onOpenDetails,
  onRemove,
  onRenameActivity = null,
  onSyncStateChange = null,
  cloudSync = false,
  persistedItemIds = null,
  isFirst = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const wasCompleteRef = useRef(null);

  const label = formatPackingActivityLabel(activity, activityIcon);
  const totalCount = items.length;
  const checkedCount = items.filter((item) => item.checked).length;
  const isComplete = totalCount > 0 && checkedCount === totalCount;
  const canRename = typeof onRenameActivity === 'function';
  const isMain = isPackingMainActivity(activity);

  const categoryGroups = useMemo(
    () => groupPackingItemsByItemCategory(items),
    [items],
  );
  // Подзаголовки категорий — только если тумблер включён и есть хотя бы одна категория.
  const showCategoryHeaders = groupByCategory
    && categoryGroups.some((group) => Boolean(group.category));

  // Авто-сворачивание, когда раздел только что стал полностью собранным.
  useEffect(() => {
    if (wasCompleteRef.current === null) {
      wasCompleteRef.current = isComplete;
      if (isComplete) setOpen(false);
      return;
    }
    const wasComplete = wasCompleteRef.current;
    wasCompleteRef.current = isComplete;
    if (isComplete && !wasComplete) {
      setOpen(false);
    }
  }, [isComplete]);

  useEffect(() => {
    if (!editing) return undefined;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  const startEditing = (event) => {
    event.stopPropagation();
    if (!canRename) return;
    setDraft(
      isMain ? '' : String(activity || '').trim(),
    );
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft('');
  };

  const commitEditing = () => {
    if (!canRename) {
      cancelEditing();
      return;
    }
    const next = resolvePackingActivityRename(draft, { keepIcon: activityIcon });
    const prevKey = isMain ? PACKING_ACTIVITY_MAIN : String(activity || '').trim();
    const nextKey = next.activity;
    const prevIcon = String(activityIcon || '').trim();
    const unchanged = nextKey === prevKey
      && (nextKey === PACKING_ACTIVITY_MAIN ? true : next.activityIcon === prevIcon);
    if (!unchanged) {
      onRenameActivity?.(prevKey, next);
    }
    cancelEditing();
  };

  const headerBg = isMain ? 'bg-slate-50' : 'bg-indigo-50/70';
  const titleClass = isMain ? 'text-slate-700' : 'text-indigo-900/80';
  const metaClass = isMain ? 'text-slate-400' : 'text-indigo-500/80';
  const iconBtnClass = isMain
    ? 'text-slate-400 hover:bg-slate-100'
    : 'text-indigo-500/80 hover:bg-white/60';

  const rowProps = {
    mode,
    currentUserId,
    currentUserName,
    currentUserPhotoUrl,
    membersById,
    members,
    busyItemId,
    cloudSync,
    persistedItemIds,
    onToggle,
    onAssign,
    onOpenDetails,
    onRemove,
    onSyncStateChange,
  };

  return (
    <section className={isFirst ? '' : 'mt-3'}>
      <div
        className={`flex w-full items-center gap-1 px-4 py-2.5 ${headerBg} ${
          isFirst ? 'rounded-t-2xl' : ''
        }`}
      >
        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitEditing();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEditing();
                }
              }}
              placeholder={PACKING_MAIN_LIST_LABEL}
              className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Название раздела"
            />
            <button
              type="button"
              onClick={commitEditing}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"
              aria-label="Сохранить название"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              aria-label="Отменить"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className={`truncate text-xs font-bold uppercase tracking-wide ${titleClass}`}>
                {label}
              </span>
            </button>
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium tabular-nums ${
                isComplete ? 'text-emerald-600' : metaClass
              }`}
            >
              {isComplete ? (
                <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              ) : null}
              {checkedCount}/{totalCount}
            </span>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition ${iconBtnClass}`}
              aria-expanded={open}
              aria-label={open ? 'Свернуть раздел' : 'Развернуть раздел'}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
            {canRename && (
              <button
                type="button"
                onClick={startEditing}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-indigo-50 hover:text-indigo-600 ${
                  isMain ? 'text-slate-300' : 'text-indigo-400'
                }`}
                aria-label={`Переименовать раздел «${label}»`}
                title="Переименовать раздел"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              </button>
            )}
          </>
        )}
      </div>

      {open ? (
        showCategoryHeaders ? (
          <div>
            {categoryGroups.map((group) => {
              const groupChecked = group.items.filter((item) => item.checked).length;
              return (
                <div key={group.category || '__uncategorized'}>
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100/80 bg-white px-4 py-1.5">
                    <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {formatPackingCategoryLabel(group.category, group.categoryIcon)}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-slate-400">
                      {groupChecked}/{group.items.length}
                    </span>
                  </div>
                  <PackingItemList items={group.items} {...rowProps} />
                </div>
              );
            })}
          </div>
        ) : (
          <PackingItemList items={items} {...rowProps} />
        )
      ) : null}
    </section>
  );
}

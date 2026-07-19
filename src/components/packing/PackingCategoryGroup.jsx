import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pencil, X } from 'lucide-react';
import PackingItemRow from './PackingItemRow';
import {
  formatPackingCategoryLabel,
  PACKING_UNCATEGORIZED_LABEL,
  resolvePackingCategoryRename,
} from '../../utils/packingLists';

/**
 * Аккордеон-блок пунктов сборов по теме активности (category из ИИ)
 * или «Без категории» для обычных пунктов.
 */
export default function PackingCategoryGroup({
  category = '',
  categoryIcon = '',
  items = [],
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
  onOpenBooking,
  onRemove,
  onCopyToPersonal = null,
  onMoveToCategory = null,
  categoryOptions = [],
  onRenameCategory = null,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const label = formatPackingCategoryLabel(category, categoryIcon);
  const checkedCount = items.filter((item) => item.checked).length;
  const canRename = typeof onRenameCategory === 'function';

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
    setDraft(String(category || '').trim());
    setEditing(true);
    setOpen(true);
  };

  const cancelEditing = (event) => {
    event?.stopPropagation();
    setEditing(false);
    setDraft('');
  };

  const commitEditing = (event) => {
    event?.stopPropagation();
    if (!canRename) return;

    const next = resolvePackingCategoryRename(draft, { keepIcon: categoryIcon });
    const prevKey = String(category || '').trim();
    const nextKey = next.category;
    const prevIcon = String(categoryIcon || '').trim();

    const unchanged = nextKey === prevKey
      && (nextKey ? next.categoryIcon === prevIcon : true);
    if (!unchanged) {
      onRenameCategory?.(prevKey, next);
    }

    setEditing(false);
    setDraft('');
  };

  return (
    <section className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-1 bg-slate-50/90 px-2 py-1.5">
        {editing ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              commitEditing();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelEditing();
                }
              }}
              placeholder={PACKING_UNCATEGORIZED_LABEL}
              maxLength={48}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 outline-none focus:border-slate-300"
              aria-label="Название раздела"
            />
            <button
              type="submit"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-50"
              aria-label="Сохранить название"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
              aria-label="Отменить"
            >
              <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-slate-100/80"
              aria-expanded={open}
            >
              <span className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wider text-slate-700">
                {label}
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                {checkedCount}/{items.length}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                  open ? 'rotate-180' : ''
                }`}
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
            {canRename && (
              <button
                type="button"
                onClick={startEditing}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
              onToggle={(next) => onToggle?.(item, next)}
              onAssign={(userId) => onAssign?.(item, userId)}
              onOpenBooking={onOpenBooking}
              onRemove={onRemove}
              onCopyToPersonal={onCopyToPersonal}
              onMoveToCategory={onMoveToCategory}
              categoryOptions={categoryOptions}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

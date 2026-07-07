import { useEffect, useState } from 'react';
import { Check, Hand, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_EMOJI } from '../../utils/categories';
import { PRIMARY_BTN } from './cardStyles';
import { formatBookerLabel } from '../../utils/booking';

const STATUS_BTN =
  'flex min-h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full border border-transparent px-3 py-2.5 text-sm font-semibold shadow-none transition-all duration-150 active:scale-[0.98] disabled:cursor-default disabled:opacity-50';

const STATUS_BTN_BOUGHT_IDLE =
  'bg-slate-100 text-slate-600 hover:bg-slate-200';

const STATUS_BTN_BOUGHT_ACTIVE =
  'bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.2)] hover:bg-emerald-600';

const STATUS_BTN_BOOKING_IDLE =
  'bg-indigo-50 text-indigo-600 hover:bg-indigo-100';

const STATUS_BTN_BOOKING_ACTIVE =
  'bg-indigo-500 text-white shadow-[0_2px_8px_rgba(99,102,241,0.22)] hover:bg-indigo-600';

export default function ItemDetailsModal({
  open,
  item,
  displayName,
  userPhotoUrl,
  disabled = false,
  readOnly = false,
  onClose,
  onSave,
}) {
  const [comment, setComment] = useState('');
  const [bookedBy, setBookedBy] = useState(null);
  const [category, setCategory] = useState('Прочее');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!open || !item) return undefined;
    setComment(item.comment || '');
    setBookedBy(item.bookedBy || null);
    setCategory(item.category || 'Прочее');
    setChecked(Boolean(item.checked));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, item]);

  if (!open || !item) return null;

  const isMine = bookedBy && bookedBy === displayName;
  const isOther = bookedBy && bookedBy !== displayName;

  const buildPayload = ({ nextChecked = checked, nextBookedBy = bookedBy } = {}) => ({
    comment: comment.trim() || null,
    bookedBy: nextChecked ? null : nextBookedBy || null,
    category,
    checked: nextChecked,
  });

  const persistAndClose = (payload) => {
    onSave?.(payload);
    onClose?.();
  };

  const handleSave = () => {
    persistAndClose(buildPayload());
  };

  const canEdit = !disabled && !readOnly;
  const canEditMeta = canEdit && !checked;

  const handleToggleChecked = () => {
    if (!canEdit) return;
    const nextChecked = !checked;
    persistAndClose(
      buildPayload({
        nextChecked,
        nextBookedBy: nextChecked ? null : bookedBy,
      }),
    );
  };

  const handleToggleBooking = () => {
    if (!canEditMeta || isOther) return;
    const nextBookedBy = bookedBy === displayName ? null : displayName;
    persistAndClose(buildPayload({ nextBookedBy }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-sm rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-details-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <p id="item-details-title" className="truncate text-sm font-semibold text-slate-800">
              {item.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Категория, примечание и статус</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Категория</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const isActive = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={!canEditMeta}
                    onClick={() => setCategory(c)}
                    aria-pressed={isActive}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
                      isActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-70'
                    }`}
                  >
                    {CATEGORY_EMOJI[c]} {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="item-comment" className="mb-1.5 block text-xs font-medium text-slate-500">
              Примечание
            </label>
            <textarea
              id="item-comment"
              rows={3}
              value={comment}
              disabled={!canEditMeta}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: 2.5%, пожирнее"
              className="w-full resize-none rounded-2xl border border-gray-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-3 text-xs font-medium text-slate-500">Статус</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canEditMeta || isOther}
                onClick={handleToggleBooking}
                aria-pressed={isMine}
                className={`${STATUS_BTN} ${
                  isMine || isOther ? STATUS_BTN_BOOKING_ACTIVE : STATUS_BTN_BOOKING_IDLE
                } ${isOther ? 'disabled:opacity-100' : ''}`}
              >
                <Hand className="h-4 w-4 shrink-0" strokeWidth={isMine || isOther ? 2.25 : 2} aria-hidden />
                {isOther
                  ? `Купит ${formatBookerLabel(bookedBy)}`
                  : isMine
                    ? 'Вы берете'
                    : 'Взять на себя'}
              </button>

              <button
                type="button"
                disabled={!canEdit}
                onClick={handleToggleChecked}
                aria-pressed={checked}
                className={`${STATUS_BTN} ${checked ? STATUS_BTN_BOUGHT_ACTIVE : STATUS_BTN_BOUGHT_IDLE}`}
              >
                <Check className="h-4 w-4 shrink-0" strokeWidth={checked ? 2.5 : 2} aria-hidden />
                Куплено
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={readOnly ? onClose : handleSave}
            disabled={!canEdit}
            className={PRIMARY_BTN}
          >
            {readOnly ? 'Закрыть' : 'Готово'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

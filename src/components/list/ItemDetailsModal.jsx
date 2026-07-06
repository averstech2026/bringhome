import { useEffect, useState } from 'react';
import { User, X } from 'lucide-react';
import { UserAvatar } from '../profile/UserAvatar';
import { CATEGORIES, CATEGORY_EMOJI } from '../../utils/categories';
import { PRIMARY_BTN } from './cardStyles';

function formatBookerLabel(name) {
  if (!name) return '';
  const first = name.trim().split(/\s+/)[0];
  return first || name;
}

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

  useEffect(() => {
    if (!open || !item) return undefined;
    setComment(item.comment || '');
    setBookedBy(item.bookedBy || null);
    setCategory(item.category || 'Прочее');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, item]);

  if (!open || !item) return null;

  const isMine = bookedBy && bookedBy === displayName;
  const isOther = bookedBy && bookedBy !== displayName;
  const bookerPhotoUrl = isMine ? userPhotoUrl : undefined;

  const handleSave = () => {
    onSave?.({
      comment: comment.trim() || null,
      bookedBy: bookedBy || null,
      category,
    });
    onClose?.();
  };

  const canEdit = !disabled && !readOnly;

  const handleToggleBooking = () => {
    if (!canEdit || isOther) return;
    setBookedBy((prev) => (prev === displayName ? null : displayName));
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
            <p className="mt-0.5 text-xs text-slate-400">Категория, примечание и бронь</p>
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
                    disabled={!canEdit}
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
              disabled={!canEdit}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: 2.5%, пожирнее"
              className="w-full resize-none rounded-2xl border border-gray-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Бронь</p>

            {isOther ? (
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  photoUrl={undefined}
                  name={bookedBy}
                  className="h-8 w-8 text-[11px]"
                  variant="vivid"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Забронировано
                  </p>
                  <p className="text-xs text-slate-400">Купит {formatBookerLabel(bookedBy)}</p>
                </div>
              </div>
            ) : isMine ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <UserAvatar
                    photoUrl={bookerPhotoUrl}
                    name={bookedBy}
                    className="h-8 w-8 text-[11px]"
                    variant="vivid"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Вы берёте на себя</p>
                    <p className="text-xs text-slate-400">Забронировано</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={handleToggleBooking}
                  className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:opacity-40"
                >
                  Снять
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canEdit}
                onClick={handleToggleBooking}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-40"
              >
                <User className="h-4 w-4" aria-hidden />
                Взять на себя
              </button>
            )}
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

import { useEffect, useState } from 'react';
import { Check, Hand, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_EMOJI } from '../../utils/categories';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_SHEET } from '../ui/AppModal';
import { PRIMARY_BTN } from './cardStyles';
import BookingBadge from './BookingBadge';
import {
  isItemBookedByMe,
  isItemBookedByOtherFamily,
  getBookerDisplayInfo,
} from '../../utils/booking';

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

const STATUS_BTN_BOOKING_BLOCKED =
  'cursor-not-allowed bg-slate-100 text-slate-400';

export default function ItemDetailsModal({
  open,
  item,
  displayName,
  userPhotoUrl,
  bookingContext,
  externalFamilies = {},
  ownerFamily = null,
  membersById = {},
  disabled = false,
  readOnly = false,
  onClose,
  onSave,
}) {
  const [comment, setComment] = useState('');
  const [bookedBy, setBookedBy] = useState(null);
  const [category, setCategory] = useState('Прочее');
  const [checked, setChecked] = useState(false);

  const ctx = bookingContext || { displayName, userPhotoUrl };

  useEffect(() => {
    if (!open || !item) return;
    setComment(item.comment || '');
    setBookedBy(item.bookedBy || null);
    setCategory(item.category || 'Прочее');
    setChecked(Boolean(item.checked));
  }, [open, item]);

  if (!open || !item) return null;

  const itemSnapshot = { ...item, bookedBy, checked };
  const isMine = bookedBy && isItemBookedByMe(itemSnapshot, ctx);
  const isOtherFamily = bookedBy && isItemBookedByOtherFamily(itemSnapshot, ctx.familyId);
  const isOtherUser = bookedBy && !isMine && !isOtherFamily;
  const bookerInfo = bookedBy
    ? getBookerDisplayInfo(itemSnapshot, {
        familyId: ctx.familyId,
        userId: ctx.userId,
        displayName: ctx.displayName || displayName,
        externalFamilies,
        ownerFamily,
      })
    : null;

  const buildPayload = ({ nextChecked = checked, nextBookedBy = bookedBy } = {}) => {
    const resolvedBookedBy = nextChecked ? null : nextBookedBy || null;
    const bookingMeta = resolvedBookedBy
      ? {
          familyId: ctx.familyId,
          familyName: ctx.familyName,
          userId: ctx.userId,
        }
      : {};

    return {
      comment: comment.trim() || null,
      bookedBy: resolvedBookedBy,
      bookingMeta,
      category,
      checked: nextChecked,
    };
  };

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
    if (!canEditMeta || isOtherFamily || isOtherUser) return;
    const nextBookedBy = isMine ? null : displayName;
    persistAndClose(buildPayload({ nextBookedBy }));
  };

  const bookingLabel = isOtherFamily
    ? bookerInfo?.label || 'Другая семья'
    : isOtherUser
      ? `Купит ${bookerInfo?.label || bookedBy}`
      : isMine
        ? 'Вы берете'
        : 'Взять на себя';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="item-details-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={MODAL_PANEL_SHEET}
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
                disabled={!canEditMeta || isOtherFamily || isOtherUser}
                onClick={handleToggleBooking}
                aria-pressed={isMine || isOtherFamily || isOtherUser}
                className={`${STATUS_BTN} ${
                  isOtherFamily || isOtherUser
                    ? STATUS_BTN_BOOKING_BLOCKED
                    : isMine
                      ? STATUS_BTN_BOOKING_ACTIVE
                      : STATUS_BTN_BOOKING_IDLE
                } ${isOtherFamily || isOtherUser ? 'disabled:opacity-100' : ''}`}
              >
                {bookedBy ? (
                  <BookingBadge
                    item={itemSnapshot}
                    bookingContext={ctx}
                    externalFamilies={externalFamilies}
                    ownerFamily={ownerFamily}
                    membersById={membersById}
                    avatarOnly
                    className="h-5 w-5 text-[9px]"
                  />
                ) : (
                  <Hand className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                )}
                {bookingLabel}
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
    </AppModal>
  );
}

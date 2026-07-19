import { useEffect, useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import { PACKING_ACCENT } from '../../utils/contextAccents';

function normalizeExternalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function PackingTodoDetailsModal({
  open,
  item = null,
  onClose,
  onSave,
  saving = false,
}) {
  const [bookingUrl, setBookingUrl] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setBookingUrl(item.bookingUrl || '');
    setNote(item.note || '');
  }, [open, item]);

  const resolvedUrl = normalizeExternalUrl(bookingUrl);

  const handleSave = () => {
    onSave?.({
      bookingUrl: bookingUrl.trim(),
      note: note.trim(),
    });
  };

  const handleOpenLink = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="packing-todo-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-y-auto overscroll-contain p-5 sm:p-6`}
      disableClose={saving}
    >
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          <Calendar className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="packing-todo-title" className="text-lg font-bold text-slate-900">
            Детали дела
          </h2>
          <p className="mt-0.5 truncate text-sm text-slate-500">{item?.name || 'Дело'}</p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-medium text-slate-500">Ссылка на бронь</span>
        <input
          type="url"
          value={bookingUrl}
          disabled={saving}
          onChange={(e) => setBookingUrl(e.target.value)}
          placeholder="https://booking.com/…"
          className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-medium text-slate-500">Заметка</span>
        <textarea
          rows={3}
          value={note}
          disabled={saving}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Номер брони, время экскурсии, контакты…"
          maxLength={240}
          className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
        />
      </label>

      {resolvedUrl && (
        <button
          type="button"
          onClick={handleOpenLink}
          disabled={saving}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 active:scale-[0.98] disabled:opacity-50"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Открыть ссылку
        </button>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`mt-4 ${PACKING_ACCENT.primaryBtn}`}
      >
        {saving ? 'Сохраняем…' : 'Сохранить'}
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="mt-3 w-full rounded-full border border-gray-200 py-3.5 text-[15px] font-semibold text-gray-500 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
      >
        Отмена
      </button>
    </AppModal>
  );
}

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function DeleteListConfirmModal({
  open,
  listTitle,
  deleting,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onCancel}
        disabled={deleting}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-list-title"
      >
        <h2 id="delete-list-title" className="text-base font-semibold text-slate-900">
          Удалить список?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {listTitle
            ? `Вы уверены, что хотите удалить «${listTitle}» навсегда? Это действие нельзя отменить.`
            : 'Вы уверены, что хотите удалить этот список навсегда? Это действие нельзя отменить.'}
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className={`${PRIMARY_BTN} !bg-red-500 !py-3 text-sm hover:!bg-red-600 disabled:opacity-50`}
          >
            {deleting ? 'Удаляем…' : 'Да, удалить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function ArchiveListConfirmModal({
  open,
  listTitle,
  archiving,
  confirmClassName,
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

  const confirmBtnClass = confirmClassName || PRIMARY_BTN;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onCancel}
        disabled={archiving}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-list-title"
      >
        <h2 id="archive-list-title" className="text-base font-semibold text-slate-900">
          Архивировать список?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {listTitle
            ? `Вы уверены, что хотите перенести список «${listTitle}» в архив? Он перестанет отображаться на главном экране.`
            : 'Вы уверены, что хотите перенести этот список в архив? Он перестанет отображаться на главном экране.'}
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={archiving}
            className={`${confirmBtnClass} !py-3 text-sm disabled:opacity-50`}
          >
            {archiving ? 'Архивируем…' : 'В архив'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={archiving}
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

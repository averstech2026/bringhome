import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PRIMARY_BTN } from '../list/cardStyles';

function resolveMessage(listTitle, creatorName, adminArchivingOthers) {
  if (adminArchivingOthers && listTitle) {
    const creator = creatorName || 'другим пользователем';
    return `Вы уверены, что хотите перенести в архив список «${listTitle}»? Этот список был создан пользователем ${creator}. Он перестанет отображаться на главном экране у всей семьи.`;
  }

  if (listTitle) {
    return `Вы уверены, что хотите перенести список «${listTitle}» в архив? Он перестанет отображаться на главном экране.`;
  }

  return 'Вы уверены, что хотите перенести этот список в архив? Он перестанет отображаться на главном экране.';
}

export default function ArchiveListConfirmModal({
  open,
  listTitle,
  creatorName,
  adminArchivingOthers = false,
  archiving,
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
        <p
          className={`mt-1.5 text-sm ${adminArchivingOthers ? 'text-slate-600' : 'text-slate-500'}`}
        >
          {resolveMessage(listTitle, creatorName, adminArchivingOthers)}
        </p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={archiving}
            className={
              adminArchivingOthers
                ? 'w-full rounded-full bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100'
                : `${PRIMARY_BTN} !bg-amber-500 !py-3 text-sm shadow-[0_4px_14px_rgba(245,158,11,0.28)] hover:!bg-amber-600 hover:shadow-[0_6px_20px_rgba(245,158,11,0.34)] disabled:opacity-50`
            }
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

import AppModal from './AppModal';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function ConfirmModal({
  open,
  title,
  message,
  titleId = 'confirm-modal-title',
  confirmLabel,
  cancelLabel = 'Отмена',
  confirming = false,
  confirmingLabel,
  onConfirm,
  onCancel,
  destructive = false,
  confirmClassName,
  messageClassName = 'mt-1.5 text-sm text-slate-500',
}) {
  const resolvedConfirmClass =
    confirmClassName
    || (destructive
      ? `${PRIMARY_BTN} !bg-red-500 !py-3 text-sm hover:!bg-red-600 disabled:opacity-50`
      : `${PRIMARY_BTN} !py-3 text-sm disabled:opacity-50`);

  return (
    <AppModal
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      closeOnBackdrop={!confirming}
      disableClose={confirming}
      panelClassName="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
    >
      <h2 id={titleId} className="text-base font-semibold text-slate-900">
        {title}
      </h2>

      {message ? (
        typeof message === 'string' ? (
          <p className={messageClassName}>{message}</p>
        ) : (
          <div className={messageClassName}>{message}</div>
        )
      ) : null}

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className={`w-full ${resolvedConfirmClass}`}
        >
          {confirming ? confirmingLabel || confirmLabel : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={confirming}
          className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </AppModal>
  );
}

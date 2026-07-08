import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_OVERLAY =
  'fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center';

const DEFAULT_PANEL = 'relative w-full max-w-sm rounded-2xl bg-white shadow-2xl';

export default function AppModal({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  overlayClassName = DEFAULT_OVERLAY,
  panelClassName = DEFAULT_PANEL,
  closeOnBackdrop = true,
  disableClose = false,
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

  const handleBackdrop = () => {
    if (!closeOnBackdrop || disableClose) return;
    onClose?.();
  };

  return createPortal(
    <div className={overlayClassName}>
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={handleBackdrop}
        disabled={disableClose}
      />

      <div
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const MODAL_OVERLAY_SHEET =
  'fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4';

export const MODAL_PANEL_SHEET =
  'relative w-full max-w-sm rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl';

export const MODAL_PANEL_WIDE =
  'relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl';

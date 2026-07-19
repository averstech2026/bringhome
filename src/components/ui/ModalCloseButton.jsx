import { X } from 'lucide-react';

const CLOSE_BTN_CLASS =
  'absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40';

/** Закреплённый крестик в правом верхнем углу панели AppModal. */
export default function ModalCloseButton({
  onClick,
  disabled = false,
  className = '',
  size = 'md',
}) {
  const sizeClass = size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const iconClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${CLOSE_BTN_CLASS} ${sizeClass} ${className}`.trim()}
      aria-label="Закрыть"
    >
      <X className={iconClass} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

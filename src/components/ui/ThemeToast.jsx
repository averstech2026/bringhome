import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ThemeToast({ message, onClose, durationMs = 4200 }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => onClose?.(), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto max-w-sm rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-center text-sm font-medium text-amber-950 shadow-[0_12px_40px_rgba(146,64,14,0.18)]"
      >
        {message}
      </div>
    </div>,
    document.body,
  );
}

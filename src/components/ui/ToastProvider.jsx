import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  default:
    'border-slate-200 bg-white text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_8px_30px_rgba(16,185,129,0.12)]',
  error:
    'border-red-200 bg-red-50 text-red-800 shadow-[0_8px_30px_rgba(239,68,68,0.12)]',
  themed:
    'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 shadow-[0_12px_40px_rgba(146,64,14,0.18)]',
};

function ToastViewport({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onDismiss, toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const styleClass = TOAST_STYLES[toast.variant] || TOAST_STYLES.default;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4">
      <div
        role="status"
        className={`pointer-events-auto max-w-sm rounded-2xl border px-4 py-3 text-center text-sm font-medium ${styleClass}`}
      >
        {toast.message}
      </div>
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return;
    const { variant = 'default', durationMs = 4200 } = options;
    setToast({ message, variant, durationMs });
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      success: (message, options) => showToast(message, { ...options, variant: 'success' }),
      error: (message, options) => showToast(message, { ...options, variant: 'error' }),
      themed: (message, options) => showToast(message, { ...options, variant: 'themed' }),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

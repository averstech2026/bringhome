import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PRIMARY_BTN } from './cardStyles';

const THEME_ACCENT = {
  hogwarts: 'border-amber-200 bg-gradient-to-b from-amber-50 to-white',
  star_wars: 'border-slate-200 bg-gradient-to-b from-slate-100 to-white',
  default: 'bg-white',
};

export default function AiLimitModal({ open, phrase, uiTheme = 'default', onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !phrase) return null;

  const accentClass = THEME_ACCENT[uiTheme] || THEME_ACCENT.default;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${accentClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-limit-title"
      >
        <h2 id="ai-limit-title" className="text-base font-semibold text-slate-900">
          {phrase.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{phrase.text}</p>

        <button type="button" onClick={onClose} className={`${PRIMARY_BTN} mt-5 !py-3 text-sm`}>
          Понятно
        </button>
      </div>
    </div>,
    document.body,
  );
}

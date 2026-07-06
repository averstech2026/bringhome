import { useEffect, useState } from 'react';
import { StickyNote, X } from 'lucide-react';
import { PRIMARY_BTN } from './cardStyles';

export function ListDescriptionButton({ hasDescription, onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hasDescription ? 'Редактировать заметку' : 'Добавить заметку'}
      aria-label={hasDescription ? 'Редактировать заметку к списку' : 'Добавить заметку к списку'}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
        hasDescription
          ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-600'
          : 'text-slate-300 hover:bg-slate-50 hover:text-slate-400'
      }`}
    >
      <StickyNote className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden />
    </button>
  );
}

export default function ListDescriptionModal({
  open,
  listTitle,
  value = '',
  readOnly = false,
  disabled = false,
  onClose,
  onSave,
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (!open) return undefined;
    setLocal(value);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, value]);

  if (!open) return null;

  const handleSave = async () => {
    await onSave?.(local.trim());
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-sm rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-description-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <p id="list-description-title" className="truncate text-sm font-semibold text-slate-800">
              {listTitle}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Заметка к списку</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            rows={4}
            value={local}
            readOnly={readOnly}
            disabled={disabled || readOnly}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Например: купить по дороге в гипермаркете"
            maxLength={120}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white disabled:opacity-50"
          />

          <div className="mt-4 flex gap-2">
            {readOnly ? (
              <button
                type="button"
                onClick={onClose}
                className={`${PRIMARY_BTN} !py-3 text-sm`}
              >
                Закрыть
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled}
                  className={`flex-1 ${PRIMARY_BTN} !py-3 text-sm`}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={disabled}
                  className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Отмена
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

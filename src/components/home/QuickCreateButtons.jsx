import { useEffect, useRef, useState } from 'react';
import { sanitizeCustomTypeName } from '../../utils/listTypes';

const BUTTONS = [
  {
    type: 'home',
    label: '+ Домой',
    className:
      'border-emerald-200 text-emerald-700 hover:bg-emerald-50/60 active:bg-emerald-50',
  },
  {
    type: 'cottage',
    label: '+ Дача',
    className: 'border-amber-200 text-amber-800 hover:bg-amber-50/60 active:bg-amber-50',
  },
  {
    type: 'trip',
    label: '+ В дорогу',
    className: 'border-violet-200 text-violet-700 hover:bg-violet-50/60 active:bg-violet-50',
  },
];

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function QuickCreateButtons({
  onCreate,
  onCreateCustom,
  onRequestCustom,
  canCreateCustom = false,
  disabled,
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const customFormRef = useRef(null);

  useEffect(() => {
    if (customMode) inputRef.current?.focus();
  }, [customMode]);

  useEffect(() => {
    if (!customMode || !scrollRef.current) return;

    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollWidth,
      behavior: 'smooth',
    });
  }, [customMode]);

  const cancelCustom = () => {
    setCustomMode(false);
    setCustomName('');
  };

  const submitCustom = () => {
    const name = sanitizeCustomTypeName(customName);
    if (!name) return;
    onCreateCustom(name);
    cancelCustom();
  };

  const handleInputBlur = () => {
    window.setTimeout(() => {
      if (customFormRef.current?.contains(document.activeElement)) return;
      cancelCustom();
    }, 0);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustom();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelCustom();
    }
  };

  const handleNewClick = () => {
    if (canCreateCustom) {
      setCustomMode(true);
    } else {
      onRequestCustom?.();
    }
  };

  return (
    <div className="min-w-0 -mx-4">
      <div
        ref={scrollRef}
        className="flex flex-row items-center gap-2 overflow-x-auto whitespace-nowrap px-4 pe-4 pb-1 overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {BUTTONS.map(({ type, label, className }) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onCreate(type)}
            className={`flex-shrink-0 rounded-full border bg-transparent px-5 py-2.5 text-sm font-medium transition disabled:opacity-40 ${className}`}
          >
            {label}
          </button>
        ))}

        {customMode && canCreateCustom ? (
          <div
            ref={customFormRef}
            className="flex flex-shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5"
          >
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={customName}
              disabled={disabled}
              onChange={(e) => setCustomName(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              placeholder="Название..."
              className="w-[7.5rem] flex-shrink-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              maxLength={32}
            />
            <button
              type="button"
              disabled={disabled || !sanitizeCustomTypeName(customName)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={submitCustom}
              aria-label="Создать"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 disabled:opacity-40 disabled:shadow-none"
            >
              <CheckIcon />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={handleNewClick}
            className={`flex-shrink-0 rounded-full border bg-slate-50/60 px-5 py-2.5 text-sm font-medium transition disabled:opacity-40 ${
              canCreateCustom
                ? 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-100'
                : 'cursor-pointer border-slate-200 text-slate-500 opacity-50 hover:opacity-70 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600'
            }`}
          >
            + Новый
          </button>
        )}
      </div>
    </div>
  );
}

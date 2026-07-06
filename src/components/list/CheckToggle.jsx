function CheckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function CheckToggle({ checked, onChange, disabled = false, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-slate-200 bg-white text-transparent hover:border-slate-300'
      } disabled:opacity-40 ${className}`}
    >
      <CheckIcon />
    </button>
  );
}

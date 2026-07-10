export default function CreateListFab({ onClick, disabled = false, label = 'Создать список' }) {
  return (
    <div
      className="pointer-events-none fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="pointer-events-auto absolute bottom-6 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.38)] transition-all duration-150 hover:bg-emerald-600 hover:shadow-[0_6px_24px_rgba(16,185,129,0.42)] active:scale-95 disabled:opacity-50 disabled:shadow-none"
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

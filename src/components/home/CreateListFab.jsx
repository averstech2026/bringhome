import { PACKING_ACCENT, SHOPPING_ACCENT } from '../../utils/contextAccents';

export default function CreateListFab({
  onClick,
  disabled = false,
  label = 'Создать список покупок',
  tone = 'shopping',
}) {
  const accent = tone === 'packing' ? PACKING_ACCENT : SHOPPING_ACCENT;

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
        className={`pointer-events-auto absolute bottom-6 right-4 flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:shadow-none ${accent.fab}`}
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

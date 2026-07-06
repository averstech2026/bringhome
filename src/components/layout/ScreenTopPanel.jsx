import { SCREEN_TOP_INNER } from '../list/cardStyles';

export default function ScreenTopPanel({ children, className = '' }) {
  return (
    <div
      className={`-mx-4 sticky top-0 z-30 rounded-b-2xl border border-t-0 border-gray-50/80 bg-white pt-[env(safe-area-inset-top,0px)] shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

/** Фиксированная высота строки плашки: pt-3 + h-10 + pb-4 */
export function ScreenTopBar({ children, className = '' }) {
  return (
    <div className={`${SCREEN_TOP_INNER} ${className}`}>
      <div className="flex h-10 items-center gap-2">{children}</div>
    </div>
  );
}

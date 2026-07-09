import { SCREEN_TOP_INNER, SCREEN_TOP_PANEL } from '../list/cardStyles';

export default function ScreenTopPanel({ children, className = '' }) {
  return (
    <div className={`${SCREEN_TOP_PANEL} ${className}`}>
      {children}
    </div>
  );
}

/** Строка плашки: pt-3 + min-h-10 + pb-4 */
export function ScreenTopBar({ children, className = '' }) {
  return (
    <div className={`${SCREEN_TOP_INNER} ${className}`}>
      <div className="flex min-h-10 items-center gap-2">{children}</div>
    </div>
  );
}

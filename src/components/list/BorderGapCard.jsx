const LEGEND_CAPSULE =
  'inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:text-sm';

/**
 * Карточка с заголовком-капсулой на линии границы (разрыв border до/после текста).
 */
export default function BorderGapCard({
  legend,
  children,
  className = 'bg-white',
  legendClassName = '',
  borderClassName = 'border-slate-200',
}) {
  return (
    <div
      className={`relative mt-6 rounded-2xl border px-4 pb-4 pt-6 ${borderClassName} ${className}`}
    >
      <div className="absolute left-4 top-0 z-10 -translate-y-1/2">
        <span className={legendClassName || LEGEND_CAPSULE}>{legend}</span>
      </div>
      {children}
    </div>
  );
}

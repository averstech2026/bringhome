import { Heart, List, Link2 } from 'lucide-react';
import { HOME_LIST_FILTER } from '../../utils/homeListFilter';

const TABS = [
  { id: HOME_LIST_FILTER.ALL, label: 'Все', Icon: List, strokeWidth: 2 },
  { id: HOME_LIST_FILTER.MINE, label: 'Мои', Icon: Heart },
  { id: HOME_LIST_FILTER.SHARED, label: 'Общие', Icon: Link2 },
];

export default function ListFilterSegmentedControl({ value, onChange, className = '' }) {
  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 ${className}`}
      role="tablist"
      aria-label="Фильтр списков"
    >
      {TABS.map(({ id, label, Icon, strokeWidth = 2.25 }) => {
        const selected = value === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-none transition-colors ${
              selected
                ? 'bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/70'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className="h-3 w-3 shrink-0" strokeWidth={strokeWidth} aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

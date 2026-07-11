import { LayoutList } from 'lucide-react';
import { CARD_SURFACE } from '../list/cardStyles';

export default function ListFilterEmptyState({ filterLabel }) {
  return (
    <div className={`mt-4 flex flex-col items-center px-4 py-10 text-center ${CARD_SURFACE}`}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <LayoutList className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <p className="text-sm font-medium text-slate-600">В этой категории пока нет списков</p>
      {filterLabel && (
        <p className="mt-1 text-xs text-slate-400">
          Переключитесь на «{filterLabel}», чтобы увидеть другие списки
        </p>
      )}
    </div>
  );
}

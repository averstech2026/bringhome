import { UserPlus } from 'lucide-react';

export function AddMemberButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <UserPlus className="h-4 w-4 stroke-[2.5]" aria-hidden />
      Добавить
    </button>
  );
}

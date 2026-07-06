export function UserAvatar({ photoUrl, name, className = 'h-9 w-9 text-sm', variant = 'default' }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const vividInitial =
    'bg-gradient-to-br from-slate-600 to-slate-800 font-bold text-white shadow-md ring-1 ring-white/40';
  const checkboxInitial =
    'bg-gradient-to-br from-slate-500 to-slate-700 font-bold text-white shadow-md ring-1 ring-white/50';
  const defaultInitial =
    'bg-gradient-to-br from-slate-600 to-slate-800 font-semibold text-white';

  const photoFilter =
    variant === 'checkbox'
      ? 'brightness-110 contrast-[1.12] saturate-[1.08]'
      : variant === 'vivid'
        ? 'brightness-105 contrast-[1.06]'
        : '';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || 'Аватар'}
        className={`shrink-0 rounded-full object-cover ${photoFilter} ${className}`}
      />
    );
  }

  const initialClass =
    variant === 'checkbox' ? checkboxInitial : variant === 'vivid' ? vividInitial : defaultInitial;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${initialClass} ${className}`}
    >
      {initial}
    </div>
  );
}

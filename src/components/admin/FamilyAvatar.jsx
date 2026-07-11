import { Camera } from 'lucide-react';
import { getFamilyAvatarGradient, getFamilyInitials } from '../../utils/familyAvatar';

export function FamilyAvatar({
  photoUrl,
  name,
  editable = false,
  busy = false,
  menuOpen = false,
  onClick,
  className = 'h-[76px] w-[76px] text-xl',
}) {
  const initials = getFamilyInitials(name);
  const gradient = getFamilyAvatarGradient(name);

  const content = photoUrl ? (
    <img
      src={photoUrl}
      alt={name || 'Аватар семьи'}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${gradient} ${className}`}
    >
      {initials}
    </div>
  );

  if (!editable) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="group relative shrink-0 cursor-pointer disabled:opacity-50"
      aria-label="Изменить аватар семьи"
    >
      {content}
      {!menuOpen && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
          Изменить
        </span>
      )}
      <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow-md transition group-hover:bg-violet-700">
        <Camera className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    </button>
  );
}

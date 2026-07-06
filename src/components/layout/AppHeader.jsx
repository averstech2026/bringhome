import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { APP_HEADER } from '../list/cardStyles';
import { ScreenTopBar } from './ScreenTopPanel';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { UserAvatar } from '../profile/UserAvatar';
import { getUserPhotoUrl } from '../../utils/userPhoto';
import AiBadge from './AiBadge';
export default function AppHeader({ variant = 'default' }) {
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const embedded = variant === 'embedded';

  const name =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Пользователь';
  const photoUrl = getUserPhotoUrl(user, profile);

  if (embedded) {
    return (
      <ScreenTopBar>
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">КупиДомой</h1>
          <AiBadge />
        </Link>

        <Link
          to="/settings"
          aria-label="Профиль"
          className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 transition-opacity duration-200 hover:opacity-80 active:opacity-70 focus:outline-none"
        >
          <span className="max-w-[100px] truncate text-sm text-slate-600">{name}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 stroke-[1.75]" aria-hidden />
          <UserAvatar photoUrl={photoUrl} name={name} className="h-8 w-8 text-xs" />
        </Link>
      </ScreenTopBar>
    );
  }

  return (
    <header className={`sticky top-0 z-30 ${APP_HEADER} px-4 py-3`}>
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">КупиДомой</h1>
          <AiBadge />
        </Link>

        <Link
          to="/settings"
          aria-label="Профиль"
          className="flex items-center gap-1.5 transition-opacity duration-200 hover:opacity-80 active:opacity-70 focus:outline-none"
        >
          <span className="max-w-[100px] truncate text-sm text-slate-600">{name}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 stroke-[1.75]" aria-hidden />
          <UserAvatar photoUrl={photoUrl} name={name} />
        </Link>
      </div>
    </header>
  );
}

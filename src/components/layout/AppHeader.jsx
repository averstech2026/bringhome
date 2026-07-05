import { Link } from 'react-router-dom';
import { APP_HEADER } from '../list/cardStyles';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { UserAvatar } from '../profile/UserAvatar';
import { getUserPhotoUrl } from '../../utils/userPhoto';
import AiBadge from './AiBadge';

export default function AppHeader() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user);

  const name =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Пользователь';
  const photoUrl = getUserPhotoUrl(user, profile);

  return (
    <header className={`sticky top-0 z-30 ${APP_HEADER} px-4 py-3`}>
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">КупиДомой</h1>
          <AiBadge />
        </Link>

        <div className="flex items-center gap-2">
          <span className="max-w-[100px] truncate text-sm text-slate-600">{name}</span>
          <Link
            to="/settings"
            aria-label="Профиль"
            className="rounded-full transition hover:ring-2 hover:ring-black/[0.06] active:scale-95"
          >
            <UserAvatar photoUrl={photoUrl} name={name} />
          </Link>
        </div>
      </div>
    </header>
  );
}

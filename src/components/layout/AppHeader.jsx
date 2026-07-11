import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { APP_HEADER } from '../list/cardStyles';
import { ScreenTopBar } from './ScreenTopPanel';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useFamily } from '../../hooks/useFamily';
import { useUnreadFeedbacks } from '../../hooks/useUnreadFeedbacks';
import { useUnseenFeedbackStatuses } from '../../hooks/useUnseenFeedbackStatuses';
import { UserAvatar } from '../profile/UserAvatar';
import { getThemeAccent, resolveUiTheme } from '../../utils/uiThemes';
import { getUserPhotoUrl } from '../../utils/userPhoto';
import AiBadge from './AiBadge';
import NotificationBell from '../notifications/NotificationBell';

const DEFAULT_HEADER_TITLE = 'КупиДомой AI';
const BRAND_SUBTITLE = 'Пространство КупиДомой';
const HEADER_PLACEHOLDER_BG = {
  default: 'bg-[#f5f5f7]/90',
  embedded: 'bg-white/95',
};

function HeaderBranding({ familyName, titleLoading, showFallbackTitle, variant = 'default' }) {
  const hasFamilyTitle = !titleLoading && Boolean(familyName);
  const mainTitle = hasFamilyTitle
    ? familyName
    : !titleLoading && showFallbackTitle
      ? DEFAULT_HEADER_TITLE
      : null;
  const placeholderBg = HEADER_PLACEHOLDER_BG[variant] || HEADER_PLACEHOLDER_BG.default;

  return (
    <Link to="/" className="flex min-w-0 flex-col justify-center py-0.5">
      {titleLoading ? (
        <span
          className={`h-5 min-w-[8rem] shrink-0 rounded-md ${placeholderBg}`}
          aria-hidden
        />
      ) : mainTitle ? (
        <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-slate-900">
          {mainTitle}
        </h1>
      ) : null}

      {hasFamilyTitle && (
        <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[9px] leading-tight text-slate-400/75">
          <AiBadge className="h-2.5 w-2.5 shrink-0 rounded-[2px]" />
          <span className="truncate">{BRAND_SUBTITLE}</span>
        </p>
      )}
    </Link>
  );
}

function HeaderProfileLink({ name, photoUrl, avatarClassName, uiTheme }) {
  const themeAccent = getThemeAccent(uiTheme);
  const { user } = useAuth();
  const { isSuperAdmin, familyId } = useUserProfile(user);
  const { unreadCount: feedbackUnread } = useUnreadFeedbacks(isSuperAdmin);
  const { unseenCount: feedbackStatusUnseen } = useUnseenFeedbackStatuses(
    user?.uid,
    Boolean(familyId) && !isSuperAdmin,
  );
  const showFeedbackBadge = (isSuperAdmin && feedbackUnread > 0)
    || (!isSuperAdmin && feedbackStatusUnseen > 0);
  const badgeCount = (isSuperAdmin ? feedbackUnread : 0)
    + (!isSuperAdmin ? feedbackStatusUnseen : 0);

  return (
    <Link
      to="/settings"
      aria-label={
        showFeedbackBadge
          ? `Профиль, ${badgeCount} обновлений по обращениям`
          : 'Профиль'
      }
      className="flex min-w-0 items-center gap-1.5 transition-opacity duration-200 hover:opacity-80 active:opacity-70 focus:outline-none"
    >
      <span className="max-w-[100px] truncate text-sm font-medium text-slate-900">{name}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-900 stroke-[1.75]" aria-hidden />
      <span className="relative shrink-0">
        <UserAvatar
          photoUrl={photoUrl}
          name={name}
          className={avatarClassName}
          ringClassName={themeAccent.avatarRingClassName}
        />
        {showFeedbackBadge && (
          <span
            className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${themeAccent.solidClassName}`}
            aria-hidden
          />
        )}
      </span>
    </Link>
  );
}

export default function AppHeader({ variant = 'default' }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading, familyId } = useUserProfile(user);
  const { familyName, loading: familyLoading } = useFamily(familyId);
  const embedded = variant === 'embedded';

  const brandingLoading = profileLoading || (Boolean(familyId) && familyLoading);
  const showFallbackTitle = !brandingLoading && !familyId;

  const name =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Пользователь';
  const photoUrl = getUserPhotoUrl(user, profile);
  const uiTheme = resolveUiTheme(profile, user?.uid);

  if (embedded) {
    return (
      <ScreenTopBar>
        <HeaderBranding
          familyName={familyName}
          titleLoading={brandingLoading}
          showFallbackTitle={showFallbackTitle}
          variant="embedded"
        />

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1">
          <NotificationBell userId={user?.uid} />
          <HeaderProfileLink
            name={name}
            photoUrl={photoUrl}
            avatarClassName="h-8 w-8 text-xs"
            uiTheme={uiTheme}
          />
        </div>
      </ScreenTopBar>
    );
  }

  return (
    <header className={`sticky top-0 z-30 ${APP_HEADER} px-4 py-3`}>
      <div className="flex items-center justify-between gap-3">
        <HeaderBranding
          familyName={familyName}
          titleLoading={brandingLoading}
          showFallbackTitle={showFallbackTitle}
          variant="default"
        />

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell userId={user?.uid} />
          <HeaderProfileLink name={name} photoUrl={photoUrl} avatarClassName="h-9 w-9 text-sm" uiTheme={uiTheme} />
        </div>
      </div>
    </header>
  );
}
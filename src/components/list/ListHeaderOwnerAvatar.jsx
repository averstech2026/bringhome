import { Link2, Lock } from 'lucide-react';
import { FamilyAvatarBadge } from './ListExternalShareSection';
import {
  getOwnerFamilyDisplay,
  isCrossFamilySharedList,
  isExternalGuestList,
} from '../../utils/listShare';

const AVATAR_CLASS = 'h-7 w-7 rounded-full object-cover text-[10px]';

function PrivacyBadge({ type, title }) {
  const Icon = type === 'external' ? Link2 : Lock;
  const iconClass = type === 'external' ? 'text-indigo-600' : 'text-slate-500';

  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 z-10 flex h-[17px] w-[17px] items-center justify-center rounded-full bg-white shadow-sm"
      title={title}
      aria-label={title}
    >
      <Icon className={`h-2.5 w-2.5 ${iconClass}`} strokeWidth={2.5} aria-hidden />
    </span>
  );
}

function getPrivacyBadge(list) {
  if (isCrossFamilySharedList(list) || list?.shareInviteToken) {
    const externalCount = list?.sharedWithFamilyIds?.length ?? 0;
    const title =
      externalCount > 0
        ? 'Список доступен другой семье'
        : 'Ссылка для приглашения другой семьи активна';
    return { type: 'external', title };
  }

  if (!list?.isPublic) {
    return { type: 'restricted', title: 'Доступ только для избранных членов семьи' };
  }

  return null;
}

export default function ListHeaderOwnerAvatar({ list, currentFamily, viewerFamilyId }) {
  if (!list || !viewerFamilyId) return null;

  const isGuest = isExternalGuestList(list, viewerFamilyId);

  if (isGuest) {
    const ownerFamily = getOwnerFamilyDisplay(list, {});

    return (
      <div
        className="relative shrink-0"
        title={`Список от семьи «${ownerFamily.familyName}»`}
      >
        <FamilyAvatarBadge family={ownerFamily} className={AVATAR_CLASS} />
        <PrivacyBadge
          type="external"
          title={`Список от семьи «${ownerFamily.familyName}»`}
        />
      </div>
    );
  }

  const family = currentFamily
    ? { familyName: currentFamily.name, avatarUrl: currentFamily.avatarUrl }
    : getOwnerFamilyDisplay(list, {});

  const privacyBadge = getPrivacyBadge(list);

  if (privacyBadge) {
    return (
      <div className="relative shrink-0">
        <FamilyAvatarBadge family={family} className={AVATAR_CLASS} />
        <PrivacyBadge type={privacyBadge.type} title={privacyBadge.title} />
      </div>
    );
  }

  return <FamilyAvatarBadge family={family} className={AVATAR_CLASS} />;
}

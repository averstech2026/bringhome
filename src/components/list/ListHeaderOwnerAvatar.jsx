import { Link2 } from 'lucide-react';
import { FamilyAvatarBadge } from './ListExternalShareSection';
import { getOwnerFamilyDisplay, isExternalGuestList } from '../../utils/listShare';

const AVATAR_CLASS = 'h-7 w-7 border-2 border-white text-[10px] shadow-sm';

function ExternalShareMarker({ title }) {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 ring-2 ring-white"
      title={title}
      aria-label={title}
    >
      <Link2 className="h-2 w-2" strokeWidth={2.5} aria-hidden />
    </span>
  );
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
        <ExternalShareMarker title={`Список от семьи «${ownerFamily.familyName}»`} />
      </div>
    );
  }

  const family = currentFamily
    ? { familyName: currentFamily.name, avatarUrl: currentFamily.avatarUrl }
    : getOwnerFamilyDisplay(list, {});

  return (
    <FamilyAvatarBadge
      family={family}
      className={AVATAR_CLASS}
    />
  );
}

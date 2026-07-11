import { UserAvatar } from '../profile/UserAvatar';
import { FamilyAvatarBadge } from './ListExternalShareSection';
import { getBookerDisplayInfo, formatBookerLabel } from '../../utils/booking';

function bookerNamesMatch(memberName, bookedBy) {
  if (!memberName || !bookedBy) return false;
  const left = memberName.trim().toLowerCase();
  const right = bookedBy.trim().toLowerCase();
  if (left === right) return true;
  return formatBookerLabel(memberName).toLowerCase() === formatBookerLabel(bookedBy).toLowerCase();
}

function resolveBookerPhotoUrl(item, bookingContext, membersById, info) {
  if (info.kind === 'mine') {
    return bookingContext?.userPhotoUrl || null;
  }

  if (info.kind === 'otherUser') {
    if (item.bookedByUid && membersById?.[item.bookedByUid]?.avatarUrl) {
      return membersById[item.bookedByUid].avatarUrl;
    }

    const byName = Object.values(membersById || {}).find(
      (member) => bookerNamesMatch(member.displayName, item.bookedBy),
    );
    return byName?.avatarUrl || null;
  }

  if (info.kind === 'otherFamily' && info.avatarUrl) {
    return info.avatarUrl;
  }

  return null;
}

function getBookingStatusLabel(info) {
  if (info.kind === 'mine') return '✨ Вы';
  if (info.kind === 'otherFamily') return info.label;
  return `Купит ${info.label}`;
}

export default function BookingBadge({
  item,
  bookingContext,
  externalFamilies = {},
  ownerFamily = null,
  membersById = {},
  avatarOnly = false,
  className = 'h-4 w-4 text-[8px]',
}) {
  const info = getBookerDisplayInfo(item, {
    familyId: bookingContext?.familyId,
    userId: bookingContext?.userId,
    displayName: bookingContext?.displayName,
    externalFamilies,
    ownerFamily,
  });

  if (!info) return null;

  const photoUrl = resolveBookerPhotoUrl(item, bookingContext, membersById, info);
  const label = getBookingStatusLabel(info);

  const avatar = info.kind === 'otherFamily' && !photoUrl ? (
    <FamilyAvatarBadge
      family={{ familyName: info.label, avatarUrl: info.avatarUrl }}
      className={`${className} shrink-0`}
    />
  ) : (
    <UserAvatar
      photoUrl={photoUrl}
      name={info.name}
      className={className}
      variant="vivid"
    />
  );

  if (avatarOnly) {
    return (
      <div className="shrink-0" title={label}>
        {avatar}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 text-xs text-slate-400"
      title={info.kind === 'mine' ? 'Вы берёте' : label}
    >
      {avatar}
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

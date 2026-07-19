import { Link } from 'react-router-dom';
import { Briefcase, LayoutTemplate, Link2 } from 'lucide-react';
import { CARD_PRESS, CARD_SURFACE, CARD_TITLE } from '../list/cardStyles';
import ListAccessIcon from '../home/ListAccessIcon';
import { FamilyAvatarBadge } from '../list/ListExternalShareSection';
import {
  getExternalFamiliesList,
  getOwnerFamilyDisplay,
  isCrossFamilySharedList,
  isExternalGuestList,
} from '../../utils/listShare';
import { getListFamilyId } from '../../utils/familyGroup';
import { getPackingListProgress } from '../../utils/packingLists';

const PARTICIPANT_AVATAR_CLASS = 'h-5 w-5';
const LIST_META_COLUMN = 'w-28';

function OwnerStarBadge() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[6px] font-bold leading-none text-white ring-2 ring-white">
      ★
    </span>
  );
}

function ParticipantAvatar({ author, className = PARTICIPANT_AVATAR_CLASS, isOwner = false, zIndex }) {
  if (!author) return null;

  const name = author.displayName || author.email?.split('@')[0] || 'Пользователь';
  const title = isOwner ? `${name} (создатель)` : name;

  const avatar = author.avatarUrl ? (
    <img
      src={author.avatarUrl}
      alt={name}
      className={`${className} rounded-full border border-white object-cover`}
    />
  ) : (
    <span
      className={`flex ${className} items-center justify-center rounded-full border border-white bg-gray-100 text-[10px] font-bold text-gray-600`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div
      className="relative shrink-0"
      style={{ zIndex: isOwner ? 10 : zIndex }}
      title={title}
    >
      {avatar}
      {isOwner && <OwnerStarBadge />}
    </div>
  );
}

function CrossFamilyShareMarker({ title = 'Совместный список с другой семьёй', className = '' }) {
  return (
    <span
      className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 ring-2 ring-white ${className}`}
      title={title}
      aria-label={title}
    >
      <Link2 className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
    </span>
  );
}

/** Участники карточки: members → авторы; при isPublic — вся семья из authorsById. */
export function getPackingParticipants(list, authorsById = {}) {
  const owner = authorsById[list.createdBy];

  if (list.isPublic !== false && Object.keys(authorsById).length > 0) {
    const familyMembers = Object.values(authorsById);
    if (!owner) return familyMembers;
    return [owner, ...familyMembers.filter((member) => member.id !== list.createdBy)];
  }

  const ids = [...new Set(
    Array.isArray(list.members) && list.members.length > 0
      ? list.members
      : [list.createdBy].filter(Boolean),
  )];
  const participants = ids.map((id) => authorsById[id]).filter(Boolean);

  if (participants.length <= 1) return participants;
  if (!owner) return participants;
  return [owner, ...participants.filter((p) => p.id !== list.createdBy)];
}

function MemberAvatarStack({ list, authorsById }) {
  const participants = getPackingParticipants(list, authorsById);
  if (participants.length === 0) return null;

  return (
    <div className="flex shrink-0 -space-x-1.5">
      {participants.slice(0, 4).map((participant, index) => {
        const isOwner = participant.id === list.createdBy;
        return (
          <ParticipantAvatar
            key={participant.id}
            author={participant}
            isOwner={isOwner}
            zIndex={isOwner ? undefined : index + 1}
          />
        );
      })}
    </div>
  );
}

function GuestCrossFamilyAvatars({ list, familiesById }) {
  const ownerFamily = getOwnerFamilyDisplay(list, familiesById);
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <FamilyAvatarBadge
        family={ownerFamily}
        className="h-5 w-5 border-2 border-white text-[8px] shadow-sm"
      />
      <CrossFamilyShareMarker title={`Список от семьи «${ownerFamily.familyName}»`} />
    </div>
  );
}

function OwnerCrossFamilyAvatars({ list, authorsById, familiesById }) {
  const participants = getPackingParticipants(list, authorsById);
  const ownerFamilyId = getListFamilyId(list);
  const externalFamilies = getExternalFamiliesList(list, familiesById).filter(
    (family) => family.id !== ownerFamilyId,
  );
  const externalLabel = externalFamilies.map((family) => family.familyName).join(', ');

  return (
    <div className="flex shrink-0 items-center">
      {participants.length > 0 && (
        <div className="flex -space-x-1.5">
          {participants.slice(0, 3).map((participant, index) => {
            const isOwner = participant.id === list.createdBy;
            return (
              <ParticipantAvatar
                key={participant.id}
                author={participant}
                isOwner={isOwner}
                zIndex={isOwner ? undefined : index + 1}
              />
            );
          })}
        </div>
      )}
      {externalFamilies.length > 0 && (
        <>
          <CrossFamilyShareMarker
            title={
              externalLabel
                ? `Совместно с: ${externalLabel}`
                : 'Совместный список с другой семьёй'
            }
            className={participants.length > 0 ? 'mx-0.5' : ''}
          />
          <div className="flex -space-x-1.5">
            {externalFamilies.slice(0, 2).map((family, index) => (
              <div key={family.id} style={{ zIndex: externalFamilies.length - index }}>
                <FamilyAvatarBadge
                  family={family}
                  className="h-5 w-5 border-2 border-white text-[8px] shadow-sm"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PackingAvatars({ list, authorsById, familiesById, viewerFamilyId }) {
  if (isCrossFamilySharedList(list)) {
    if (isExternalGuestList(list, viewerFamilyId)) {
      return <GuestCrossFamilyAvatars list={list} familiesById={familiesById} />;
    }
    return (
      <OwnerCrossFamilyAvatars
        list={list}
        authorsById={authorsById}
        familiesById={familiesById}
      />
    );
  }

  return <MemberAvatarStack list={list} authorsById={authorsById} />;
}

function TypeFallbackIcon({ isTemplate }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
        isTemplate ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'
      }`}
      aria-hidden
    >
      {isTemplate ? (
        <LayoutTemplate className="h-3 w-3" strokeWidth={2.25} />
      ) : (
        <Briefcase className="h-3 w-3" strokeWidth={2.25} />
      )}
    </span>
  );
}

function RepeatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function PackingListCard({
  list,
  currentUserId,
  authorsById = {},
  familiesById = {},
  viewerFamilyId,
  accentBarClassName = 'bg-indigo-600',
  archived = false,
  dimmed = false,
  onRepeat = null,
  onDelete = null,
  busy = false,
}) {
  const progress = getPackingListProgress(list, currentUserId);
  const itemCount = Array.isArray(list.items) ? list.items.length : 0;
  const isTemplate = Boolean(list.isTemplate);
  const isArchivedList = archived || list.archived || list.status === 'archived';
  const participants = getPackingParticipants(list, authorsById);
  const showAvatarStack = !isTemplate && (
    participants.length > 0 || isCrossFamilySharedList(list)
  );
  const showAccessIcon = !isTemplate && (showAvatarStack || list.isPublic !== undefined);
  const hasActions = Boolean(onRepeat || onDelete);

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <div className="min-w-0 flex-1">
          <h3 className={`${CARD_TITLE} truncate`}>{list.title}</h3>
          {isTemplate && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {itemCount === 0 ? 'Пустой шаблон' : `${itemCount} пунктов`}
            </p>
          )}
        </div>

        <div className={`flex shrink-0 items-center justify-end gap-1.5 ${LIST_META_COLUMN}`}>
          {isArchivedList ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              В архиве
            </span>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center justify-end">
                {showAvatarStack ? (
                  <PackingAvatars
                    list={list}
                    authorsById={authorsById}
                    familiesById={familiesById}
                    viewerFamilyId={viewerFamilyId}
                  />
                ) : (
                  <TypeFallbackIcon isTemplate={isTemplate} />
                )}
              </div>
              <div className="flex w-6 shrink-0 items-center justify-center">
                {showAccessIcon ? (
                  <ListAccessIcon
                    list={{
                      ...list,
                      isPublic: list.isPublic !== false || isCrossFamilySharedList(list),
                    }}
                  />
                ) : (
                  <span className="w-3.5" aria-hidden />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isTemplate && !isArchivedList && (
        <div className="mt-1.5 flex items-center px-1">
          <div
            className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
            role="progressbar"
            aria-valuenow={progress.checked}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label={`Собрано ${progress.checked} из ${progress.total}`}
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${accentBarClassName}`}
              style={{ width: `${itemCount > 0 ? progress.percent : 0}%` }}
            />
          </div>
          {itemCount > 0 ? (
            <span className="ml-1.5 shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-slate-400">
              {progress.checked}/{progress.total}
            </span>
          ) : (
            <span className="ml-1.5 shrink-0 text-xs font-medium text-slate-400">пусто</span>
          )}
        </div>
      )}
    </>
  );

  if (!hasActions) {
    return (
      <Link
        to={`/packing/${list.id}`}
        state={{ fromTravelDesktop: true }}
        className={`block ${CARD_SURFACE} ${CARD_PRESS} px-3 py-1.5 ${
          isArchivedList || dimmed ? 'opacity-70' : ''
        }`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className={`flex items-stretch ${CARD_SURFACE} px-3 py-1.5 ${
        isArchivedList || dimmed ? 'opacity-70' : ''
      }`}
    >
      <Link
        to={`/packing/${list.id}`}
        state={{ fromTravelDesktop: true }}
        className={`min-w-0 flex-1 px-1 py-1 ${CARD_PRESS}`}
      >
        {body}
      </Link>
      <div className="flex shrink-0 items-center justify-end gap-1 self-center border-l border-gray-100 pl-2.5">
        {onRepeat ? (
          <button
            type="button"
            title="Повторить список"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRepeat?.(list);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
          >
            <RepeatIcon />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            title="Удалить навсегда"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(list.id, list.title);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Calendar, Check, Clock, Flame } from 'lucide-react';
import {
  CARD_SURFACE,
  CARD_TITLE,
  CARD_BADGE,
  CARD_PRESS,
} from '../list/cardStyles';
import { getListProgressClass, getListTypeBadgeProps, isBuiltinListType } from '../../utils/listTypes';
import { formatCompletedListDateLabel } from '../../utils/groupCompletedLists';
import { getListScheduleBadgeProps, shouldShowScheduleBadge } from '../../utils/listSchedule';
import { isListUnviewedByUser } from '../../utils/listPermissions';
import { isCrossFamilySharedList, isExternalGuestList, isListOwnerFamily, getExternalFamiliesList, getOwnerFamilyDisplay } from '../../utils/listShare';
import { getListFamilyId } from '../../utils/familyGroup';
import { FamilyAvatarBadge } from '../list/ListExternalShareSection';
import { Link2 } from 'lucide-react';
import ListAccessIcon from './ListAccessIcon';

const TYPE_PROGRESS = {
  home: 'bg-emerald-500',
  cottage: 'bg-amber-500',
  trip: 'bg-sky-500',
};

const PARTICIPANT_AVATAR_CLASS = 'h-5 w-5';
const LIST_META_COLUMN = 'w-28';

function OwnerStarBadge() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[6px] font-bold leading-none text-white ring-2 ring-white">
      ★
    </span>
  );
}

function ListAuthorAvatar({ author, className = PARTICIPANT_AVATAR_CLASS, isOwner = false, zIndex }) {
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

function getListParticipants(list, authorsById = {}) {
  const owner = authorsById[list.createdBy];

  if (list.isPublic) {
    const familyMembers = Object.values(authorsById);
    if (familyMembers.length === 0) return [];
    if (!owner) return familyMembers;
    return [owner, ...familyMembers.filter((member) => member.id !== list.createdBy)];
  }

  const ids = [...new Set(list.allowedUsers || [list.createdBy])];
  const participants = ids.map((id) => authorsById[id]).filter(Boolean);

  if (participants.length <= 1) return participants;

  if (!owner) return participants;

  const others = participants.filter((p) => p.id !== list.createdBy);
  return [owner, ...others];
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
  const participants = getListParticipants(list, authorsById);
  const ownerFamilyId = getListFamilyId(list);
  const externalFamilies = getExternalFamiliesList(list, familiesById).filter((family) => family.id !== ownerFamilyId);
  const externalLabel = externalFamilies.map((family) => family.familyName).join(', ');

  return (
    <div className="flex shrink-0 items-center">
      {participants.length > 0 && (
        <div className="flex -space-x-1.5">
          {participants.slice(0, 3).map((participant, index) => {
            const isOwner = participant.id === list.createdBy;
            return (
              <ListAuthorAvatar
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

function CrossFamilyAvatars({ list, familiesById = {}, viewerFamilyId, authorsById }) {
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

function ListParticipantsAvatars({ list, authorsById, familiesById, viewerFamilyId }) {
  if (isCrossFamilySharedList(list)) {
    return (
      <CrossFamilyAvatars
        list={list}
        familiesById={familiesById}
        viewerFamilyId={viewerFamilyId}
        authorsById={authorsById}
      />
    );
  }

  const participants = getListParticipants(list, authorsById);

  if (participants.length === 0) return null;

  if (participants.length === 1) {
    return (
      <ListAuthorAvatar
        author={participants[0]}
        isOwner={participants[0].id === list.createdBy}
      />
    );
  }

  return (
    <div className="flex shrink-0 -space-x-1.5">
      {participants.slice(0, 4).map((participant, index) => {
        const isOwner = participant.id === list.createdBy;
        return (
          <ListAuthorAvatar
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

const SCHEDULE_BADGE_ICONS = {
  today: Flame,
  tomorrow: Clock,
  future: Calendar,
};

function ListScheduleDateBadge({ list }) {
  if (!shouldShowScheduleBadge(list)) return null;

  const badge = getListScheduleBadgeProps(list);
  if (!badge?.label) return null;

  const Icon = SCHEDULE_BADGE_ICONS[badge.urgency] || SCHEDULE_BADGE_ICONS.future;

  return (
    <span
      className={`ml-1.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}
      title={badge.label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{badge.label}</span>
    </span>
  );
}

function ListCompletionDateBadge({ completionDateLabel }) {
  if (!completionDateLabel) return null;

  return (
    <span
      className="ml-1.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
      title={`Завершено ${completionDateLabel}`}
    >
      <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="tabular-nums">{completionDateLabel}</span>
    </span>
  );
}

function ListProgressCounter({ checked, total }) {
  if (total <= 0) return null;

  return (
    <span className="ml-1.5 shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-slate-400">
      {checked}/{total}
    </span>
  );
}

function ListAvatarsBlock({ list, authorsById, familiesById, viewerFamilyId, creatorOnly, creator, creatorName }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-end">
      {creatorOnly ? (
        <div className="flex min-w-0 items-center justify-end gap-1">
          {creatorName && (
            <span className="max-w-[3rem] truncate text-[10px] font-medium text-slate-400">
              {creatorName.split(' ')[0]}
            </span>
          )}
          <ListAuthorAvatar author={creator} isOwner />
        </div>
      ) : (
        <ListParticipantsAvatars
          list={list}
          authorsById={authorsById}
          familiesById={familiesById}
          viewerFamilyId={viewerFamilyId}
        />
      )}
    </div>
  );
}

function ListAccessBlock({ list, customBadge, creatorOnly }) {
  if (creatorOnly) {
    return <div className="w-6 shrink-0" aria-hidden />;
  }

  return (
    <div className="flex w-6 shrink-0 items-center justify-center">
      {customBadge ? (
        <span
          className={`${CARD_BADGE} max-w-full truncate rounded-md px-1 py-0.5 text-[10px] ${customBadge.className}`}
          title={customBadge.label}
        >
          {customBadge.label}
        </span>
      ) : (
        <ListAccessIcon list={list} />
      )}
    </div>
  );
}

function ListTopMeta({
  list,
  customBadge,
  authorsById,
  familiesById,
  viewerFamilyId,
  creatorOnly = false,
}) {
  const creator = authorsById[list.createdBy];
  const creatorName = creator?.displayName || creator?.email?.split('@')[0] || null;

  return (
    <div className={`flex shrink-0 items-center justify-end gap-1.5 ${LIST_META_COLUMN}`}>
      <ListAvatarsBlock
        list={list}
        authorsById={authorsById}
        familiesById={familiesById}
        viewerFamilyId={viewerFamilyId}
        creatorOnly={creatorOnly}
        creator={creator}
        creatorName={creatorName}
      />
      <ListAccessBlock list={list} customBadge={customBadge} creatorOnly={creatorOnly} />
    </div>
  );
}

function ListProgressRow({ list, progress }) {
  const { total = 0, checked = 0 } = progress || {};

  return (
    <div className="mt-1.5 flex items-center">
      <ListProgress progress={progress} listType={list.type} className="flex-1" />
      <ListProgressCounter checked={checked} total={total} />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ListSubtitle({ description }) {
  if (!description?.trim()) return null;

  return (
    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
      {description}
    </p>
  );
}

function UnreadListBadge() {
  return (
    <span
      className="ml-1.5 shrink-0 rounded bg-emerald-500 px-1 py-px text-[9px] font-bold uppercase leading-none text-white"
      aria-label="Новый список"
    >
      NEW
    </span>
  );
}

function ListTitle({ title, showUnread, completionDateLabel, list }) {
  return (
    <span className={`${CARD_TITLE} inline-flex min-w-0 max-w-full items-center`}>
      <span className="truncate">{title}</span>
      {list && <ListScheduleDateBadge list={list} />}
      <ListCompletionDateBadge completionDateLabel={completionDateLabel} />
      {showUnread && <UnreadListBadge />}
    </span>
  );
}

function ListProgress({ progress, listType, className = '' }) {
  const { total = 0, checked = 0, percent = 0 } = progress || {};
  const fillClass = isBuiltinListType(listType)
    ? TYPE_PROGRESS[listType] || TYPE_PROGRESS.home
    : getListProgressClass(listType);
  const fillPercent = total > 0 ? percent : 0;

  return (
    <div
      className={`h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 ${className}`}
      role="progressbar"
      aria-valuenow={checked}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Куплено ${checked} из ${total}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${fillClass}`}
        style={{ width: `${fillPercent}%` }}
      />
    </div>
  );
}

function ActionButton({ title, disabled, onClick, className, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ListCard({
  list,
  progress,
  authorsById,
  familiesById = {},
  viewerFamilyId,
  currentUserId,
  archived = false,
  dimmed = false,
  onDelete,
  onRestore,
  onRepeat,
  busy = false,
  showCompletionDate = false,
  creatorOnly = false,
  to,
  linkState,
}) {
  const customBadge = !isBuiltinListType(list.type) ? getListTypeBadgeProps(list.type) : null;
  const hasActions = onRepeat || onRestore || onDelete;
  const isArchivedList = archived || list.archived || list.status === 'archived';
  const listHref = to ?? (isArchivedList ? `/list/${list.id}?archived=1` : `/list/${list.id}`);
  const showUnread = !isArchivedList && isListUnviewedByUser(list, currentUserId);
  const completionDateLabel = showCompletionDate ? formatCompletedListDateLabel(list) : null;

  return (
    <div
      className={`flex min-w-0 items-stretch gap-2 ${CARD_SURFACE} px-3 py-1.5 ${
        archived ? 'opacity-70' : ''
      } ${dimmed ? 'opacity-60' : ''}`}
    >
      {archived ? (
        <Link
          to={listHref}
          state={linkState}
          className={`min-w-0 flex-1 px-1 py-1 ${CARD_PRESS}`}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1 shrink">
              <ListTitle title={list.title} showUnread={showUnread} list={list} />
              <ListSubtitle description={list.description} />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5">
              <ListAuthorAvatar
                author={list.author}
                isOwner={list.author?.id === list.createdBy}
              />
              <span className={`${CARD_BADGE} shrink-0 text-slate-400`}>В архиве</span>
            </div>
          </div>
        </Link>
      ) : (
        <Link
          to={listHref}
          state={linkState}
          className={`min-w-0 flex-1 px-1 py-1 ${CARD_PRESS}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <ListTitle
                title={list.title}
                showUnread={showUnread}
                completionDateLabel={completionDateLabel}
                list={list}
              />
              <ListSubtitle description={list.description} />
            </div>
            <ListTopMeta
              list={list}
              customBadge={customBadge}
              authorsById={authorsById}
              familiesById={familiesById}
              viewerFamilyId={viewerFamilyId}
              creatorOnly={creatorOnly}
            />
          </div>
          <ListProgressRow list={list} progress={progress} />
        </Link>
      )}

      {hasActions && (
        <div className="flex shrink-0 items-center justify-end gap-1 self-center border-l border-gray-100 pl-2.5">
          {onRepeat && (
            <ActionButton
              title="Повторить список"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRepeat(list);
              }}
              className="text-slate-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <RepeatIcon />
            </ActionButton>
          )}
          {onRestore && (
            <ActionButton
              title="Восстановить"
              disabled={busy}
              onClick={() => onRestore(list.id)}
              className="text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
            >
              <RestoreIcon />
            </ActionButton>
          )}
          {onDelete && (
            <ActionButton
              title="Удалить навсегда"
              disabled={busy}
              onClick={() => onDelete(list.id, list.title)}
              className="text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <TrashIcon />
            </ActionButton>
          )}
        </div>
      )}
    </div>
  );
}

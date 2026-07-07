import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import {
  CARD_SURFACE,
  CARD_PAD,
  CARD_TITLE,
  CARD_BADGE,
  CARD_PRESS,
} from '../list/cardStyles';
import { getListProgressClass, getListTypeBadgeProps, isBuiltinListType } from '../../utils/listTypes';
import { formatCompletedListDateLabel } from '../../utils/groupCompletedLists';
import ListAccessIcon from './ListAccessIcon';

const TYPE_PROGRESS = {
  home: 'bg-emerald-500',
  cottage: 'bg-amber-500',
  trip: 'bg-sky-500',
};

const PARTICIPANT_AVATAR_CLASS = 'h-5 w-5';

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

function ListParticipantsAvatars({ list, authorsById }) {
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

function ListStatusMeta({ list, progress, customBadge, authorsById, showCompletionDate = false }) {
  const { total = 0, checked = 0 } = progress || {};
  const completionDateLabel = showCompletionDate ? formatCompletedListDateLabel(list) : null;

  return (
    <div className="flex shrink-0 items-center justify-end gap-2">
      {(completionDateLabel || total > 0) && (
        <span className="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap text-xs font-medium tabular-nums text-slate-400">
          {completionDateLabel && (
            <span
              className="inline-flex items-center gap-1"
              title={`Завершено ${completionDateLabel}`}
            >
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                strokeWidth={2}
                aria-hidden
              />
              <span>{completionDateLabel}</span>
            </span>
          )}
          {completionDateLabel && total > 0 && (
            <span className="text-slate-300" aria-hidden>
              •
            </span>
          )}
          {total > 0 && (
            <span>{checked}/{total}</span>
          )}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <ListParticipantsAvatars list={list} authorsById={authorsById} />
        {customBadge ? (
          <span className={`${CARD_BADGE} shrink-0 rounded-md px-2 py-0.5 ${customBadge.className}`}>
            {customBadge.label}
          </span>
        ) : (
          <ListAccessIcon list={list} />
        )}
      </div>
    </div>
  );
}

function ArchiveIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
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

function ListProgress({ progress, listType, className = '' }) {
  const { total = 0, checked = 0, percent = 0 } = progress || {};
  const fillClass = isBuiltinListType(listType)
    ? TYPE_PROGRESS[listType] || TYPE_PROGRESS.home
    : getListProgressClass(listType);
  const fillPercent = total > 0 ? percent : 0;

  return (
    <div
      className={`h-1.5 w-full min-w-[5rem] overflow-hidden rounded-full bg-gray-100 ${className}`}
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
  archived = false,
  dimmed = false,
  onArchive,
  canArchive = true,
  onArchiveDenied,
  onDelete,
  onRestore,
  onRepeat,
  busy = false,
  showCompletionDate = false,
}) {
  const customBadge = !isBuiltinListType(list.type) ? getListTypeBadgeProps(list.type) : null;
  const showArchive = onArchive || onArchiveDenied;
  const hasActions = onRepeat || showArchive || onRestore || onDelete;

  return (
    <div
      className={`flex min-w-0 items-stretch gap-2 ${CARD_SURFACE} ${CARD_PAD} ${
        archived ? 'opacity-70' : ''
      } ${dimmed ? 'opacity-60' : ''}`}
    >
      {archived ? (
        <Link
          to={`/list/${list.id}?archived=1`}
          className={`min-w-0 flex-1 px-1 py-1.5 ${CARD_PRESS}`}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1 shrink">
              <span className={`${CARD_TITLE} block truncate text-slate-600`}>{list.title}</span>
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
          to={`/list/${list.id}`}
          className={`min-w-0 flex-1 px-1 py-1.5 ${CARD_PRESS}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className={`${CARD_TITLE} block truncate`}>{list.title}</span>
              <ListSubtitle description={list.description} />
            </div>
            <ListStatusMeta
              list={list}
              progress={progress}
              customBadge={customBadge}
              authorsById={authorsById}
              showCompletionDate={showCompletionDate}
            />
          </div>
          <ListProgress progress={progress} listType={list.type} className="mt-1.5" />
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
          {showArchive && (
            <ActionButton
              title={canArchive ? 'В архив' : 'Нет прав на архивацию'}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canArchive) onArchive?.(list.id, list.title);
                else onArchiveDenied?.(list);
              }}
              className={
                canArchive
                  ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                  : 'text-slate-400 opacity-40 hover:opacity-50'
              }
            >
              <ArchiveIcon />
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

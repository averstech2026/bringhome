import { Link } from 'react-router-dom';
import {
  CARD_SURFACE,
  CARD_PAD,
  CARD_TITLE,
  CARD_BADGE,
  CARD_PRESS,
} from '../list/cardStyles';
import { getListProgressClass, getListTypeBadgeProps, isBuiltinListType } from '../../utils/listTypes';
import ListAccessIcon from './ListAccessIcon';

const TYPE_PROGRESS = {
  home: 'bg-emerald-500',
  cottage: 'bg-amber-500',
  trip: 'bg-sky-500',
};

function ListAuthorAvatar({ author, className = 'h-5 w-5' }) {
  if (!author) return null;

  const name = author.displayName || author.email?.split('@')[0] || 'Пользователь';

  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={name}
        title={name}
        className={`${className} shrink-0 rounded-full border border-white object-cover`}
      />
    );
  }

  return (
    <span
      title={name}
      className={`flex ${className} shrink-0 items-center justify-center rounded-full border border-white bg-gray-100 text-[10px] font-bold text-gray-600`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function getListParticipants(list, authorsById = {}) {
  if (list.isPublic) {
    const familyMembers = Object.values(authorsById);
    if (familyMembers.length > 0) return familyMembers;
  }

  const ids = [...new Set(list.allowedUsers || [list.createdBy])];
  const participants = ids.map((id) => authorsById[id]).filter(Boolean);

  if (participants.length <= 1) return participants;

  const owner = authorsById[list.createdBy];
  if (!owner) return participants;

  const others = participants.filter((p) => p.id !== list.createdBy);
  return [owner, ...others];
}

function ListParticipantsAvatars({ list, authorsById }) {
  const participants = getListParticipants(list, authorsById);

  if (participants.length === 0) return null;

  if (participants.length === 1) {
    return <ListAuthorAvatar author={participants[0]} />;
  }

  return (
    <div className="flex shrink-0 -space-x-1.5">
      {participants.slice(0, 4).map((participant) => (
        <ListAuthorAvatar key={participant.id} author={participant} />
      ))}
    </div>
  );
}

function ListStatusMeta({ list, progress, customBadge, authorsById }) {
  const { total = 0, checked = 0 } = progress || {};

  return (
    <div className="flex shrink-0 items-center justify-end gap-2">
      {total > 0 && (
        <span className="shrink-0 whitespace-nowrap text-[11px] font-medium tabular-nums text-slate-400">
          {checked}/{total}
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
  onDelete,
  onRestore,
  onRepeat,
  busy = false,
}) {
  const customBadge = !isBuiltinListType(list.type) ? getListTypeBadgeProps(list.type) : null;
  const hasActions = onRepeat || onArchive || onRestore || onDelete;

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
              <ListAuthorAvatar author={list.author} />
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
          {onArchive && (
            <ActionButton
              title="В архив"
              disabled={busy}
              onClick={() => onArchive(list.id, list.title)}
              className="text-slate-400 hover:bg-amber-50 hover:text-amber-600"
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

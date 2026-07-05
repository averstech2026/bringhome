import { Link } from 'react-router-dom';
import {
  CARD_SURFACE,
  CARD_PAD,
  CARD_TITLE,
  CARD_BADGE,
  CARD_PRESS,
} from '../list/cardStyles';
import { getListProgressClass, getListTypeBadgeProps, isBuiltinListType } from '../../utils/listTypes';

const TYPE_BADGE = {
  home: 'text-emerald-600/80',
  cottage: 'text-amber-700/80',
  trip: 'text-violet-600/80',
};

const TYPE_PROGRESS = {
  home: 'bg-emerald-500',
  cottage: 'bg-amber-500',
  trip: 'bg-violet-500',
};

function ListAuthorAvatar({ author }) {
  if (!author) return null;

  const name = author.displayName || author.email?.split('@')[0] || 'Пользователь';

  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={name}
        title={name}
        className="h-5 w-5 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      title={name}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ListStatusMeta({ list, progress, badgeClass, customBadge }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ListProgress progress={progress} listType={list.type} showLabel />
      <div className="flex items-center gap-1.5">
        <ListAuthorAvatar author={list.author} />
        {customBadge ? (
          <span className={`${CARD_BADGE} rounded-md px-2 py-0.5 ${customBadge.className}`}>
            {customBadge.label}
          </span>
        ) : (
          <span className={`${CARD_BADGE} ${badgeClass}`}>
            {list.isPublic ? 'Общий' : 'Приватный'}
          </span>
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

function ListProgress({ progress, listType, showLabel = false }) {
  const { total = 0, checked = 0, percent = 0 } = progress || {};
  const fillClass = isBuiltinListType(listType)
    ? TYPE_PROGRESS[listType] || TYPE_PROGRESS.home
    : getListProgressClass(listType);

  if (showLabel) {
    return total > 0 ? (
      <span className="text-[11px] font-medium tabular-nums text-slate-400">
        {checked}/{total}
      </span>
    ) : null;
  }

  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
      {total > 0 && (
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillClass}`}
          style={{ width: `${percent}%` }}
        />
      )}
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
      className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ListCard({
  list,
  progress,
  archived = false,
  dimmed = false,
  onArchive,
  onDelete,
  onRestore,
  onRepeat,
  busy = false,
}) {
  const badgeClass = isBuiltinListType(list.type)
    ? TYPE_BADGE[list.type] || 'text-slate-400'
    : 'text-slate-400';
  const customBadge = !isBuiltinListType(list.type) ? getListTypeBadgeProps(list.type) : null;
  const hasActions = onRepeat || onArchive || onRestore || onDelete;

  return (
    <div
      className={`flex items-center gap-2 ${CARD_SURFACE} ${CARD_PAD} ${
        archived ? 'opacity-70' : ''
      } ${dimmed ? 'opacity-60' : ''}`}
    >
      {archived ? (
        <Link
          to={`/list/${list.id}?archived=1`}
          className={`min-w-0 flex-1 px-1 py-1.5 ${CARD_PRESS} ${hasActions ? 'pr-1' : ''}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`${CARD_TITLE} min-w-0 text-slate-600`}>{list.title}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <ListAuthorAvatar author={list.author} />
              <span className={`${CARD_BADGE} text-slate-400`}>В архиве</span>
            </div>
          </div>
        </Link>
      ) : (
        <Link
          to={`/list/${list.id}`}
          className={`min-w-0 flex-1 px-1 py-1.5 ${CARD_PRESS} ${hasActions ? 'pr-1' : ''}`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className={`${CARD_TITLE} min-w-0`}>{list.title}</span>
            <ListStatusMeta
              list={list}
              progress={progress}
              badgeClass={badgeClass}
              customBadge={customBadge}
            />
          </div>
          <ListProgress progress={progress} listType={list.type} />
        </Link>
      )}

      {hasActions && (
        <div className="flex shrink-0 items-center gap-1 border-l border-gray-100 pl-2.5">
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

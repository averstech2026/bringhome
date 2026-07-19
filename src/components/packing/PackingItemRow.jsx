import { useEffect, useRef, useState } from 'react';
import {
  Briefcase,
  Calendar,
  ClipboardList,
  ExternalLink,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import ItemCheckbox from '../list/ItemCheckbox';
import { UserAvatar } from '../profile/UserAvatar';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_SHEET } from '../ui/AppModal';
import {
  PACKING_ITEM_TYPE,
  packingQuantityLabel,
} from '../../utils/packingLists';
import { formatBookerLabel } from '../../utils/booking';
import { resolveCheckerPhotoUrl } from '../../utils/userPhoto';
import {
  getPackingTypeAccent,
  PACKING_ACCENT,
} from '../../utils/contextAccents';

function TypeBadge({ type }) {
  const isTodo = type === PACKING_ITEM_TYPE.TODO;
  const Icon = isTodo ? ClipboardList : Briefcase;
  return (
      <Icon
      className={`mr-1.5 inline-block h-3 w-3 shrink-0 translate-y-[-1px] align-middle ${
        isTodo ? 'text-emerald-600/70' : 'text-indigo-500/70'
      }`}
      strokeWidth={2}
      aria-label={isTodo ? 'Дело' : 'Вещь'}
    />
  );
}

function AssigneeMeta({
  assignee,
  assigneeName,
  currentUserId,
  onClick,
  disabled = false,
}) {
  const isMine = Boolean(assignee?.id && currentUserId && assignee.id === currentUserId);
  const label = assignee
    ? (isMine ? '✨ Вы' : formatBookerLabel(assigneeName))
    : 'Назначить';

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-400">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pr-1.5 text-left transition hover:bg-slate-100 disabled:opacity-50"
        aria-label={assignee ? `Ответственный: ${label}. Сменить` : 'Назначить ответственного'}
      >
        {assignee ? (
          <UserAvatar
            photoUrl={assignee.avatarUrl}
            name={assigneeName}
            className="h-4 w-4 text-[8px] opacity-70"
            variant="soft"
          />
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-slate-300 text-[9px] text-slate-400">
            +
          </span>
        )}
        <span className={`whitespace-nowrap ${assignee ? '' : 'text-indigo-600'}`}>
          {label}
        </span>
      </button>
    </div>
  );
}

function AssigneePickerModal({
  open,
  members = [],
  selectedId = null,
  currentUserId = null,
  onSelect,
  onClose,
}) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="packing-assignee-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_SHEET} max-h-[70vh] overflow-y-auto p-4 sm:p-5`}
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
      <h2 id="packing-assignee-title" className="text-base font-bold text-slate-900">
        Кто отвечает
      </h2>
      <p className="mt-1 text-sm text-slate-500">Выберите члена семьи для этого пункта</p>

      <ul className="mt-4 space-y-1">
        <li>
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
              !selectedId ? `${PACKING_ACCENT.solid} text-white` : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
              !selectedId ? 'bg-white/20' : 'bg-slate-100 text-slate-400'
            }`}
            >
              —
            </span>
            <span className="text-sm font-medium">Без назначения</span>
          </button>
        </li>
        {members.map((member) => {
          const selected = selectedId === member.id;
          const name = member.displayName || member.email?.split('@')[0] || 'Участник';
          const isMine = member.id === currentUserId;
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onSelect?.(member.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                  selected ? `${PACKING_ACCENT.solid} text-white` : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <UserAvatar
                  photoUrl={member.avatarUrl}
                  name={name}
                  className="h-9 w-9 text-sm"
                  variant="vivid"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {isMine ? '✨ Вы' : formatBookerLabel(name)}
                  </span>
                  {isMine && (
                    <span className={`block text-[11px] ${selected ? 'text-white/75' : 'text-slate-400'}`}>
                      {name}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </AppModal>
  );
}

function normalizeExternalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export default function PackingItemRow({
  item,
  mode = 'common',
  currentUserId,
  currentUserName = '',
  currentUserPhotoUrl = null,
  membersById = {},
  members = [],
  onToggle,
  onAssign,
  onOpenDetails,
  onRemove = null,
  onSyncStateChange = null,
  cloudSync = false,
  busy = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [localChecked, setLocalChecked] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncSuccessPulse, setSyncSuccessPulse] = useState(false);
  const syncTimerRef = useRef(null);
  const assignee = item.assignedTo ? membersById[item.assignedTo] : null;
  const checked = localChecked !== null ? localChecked : Boolean(item.checked);

  const assigneeName = assignee?.displayName
    || assignee?.email?.split('@')[0]
    || null;

  const checkedByName = checked
    ? (item.checkedBy || currentUserName || 'Участник')
    : null;

  const checkedByPhotoUrl = checked
    ? resolveCheckerPhotoUrl({
      checkedByName,
      checkedByUid: item.checkedByUid || currentUserId,
      checkedByPhotoUrl: item.checkedByPhotoUrl || currentUserPhotoUrl,
      membersById,
      currentDisplayName: currentUserName,
      currentUserPhotoUrl,
    })
    : null;

  const isTodo = item.type === PACKING_ITEM_TYPE.TODO;
  const typeAccent = getPackingTypeAccent(item.type);
  const bookingUrl = normalizeExternalUrl(item.bookingUrl);
  const hasDueDate = Boolean(String(item.dueDate || '').trim());
  const hasNote = Boolean(String(item.note || '').trim());
  const showLinkIndicator = isTodo && Boolean(bookingUrl);
  const showDateIndicator = isTodo && hasDueDate;
  const showNoteIndicator = hasNote;
  const canAssign = mode === 'common' && typeof onAssign === 'function';
  const canOpenDetails = typeof onOpenDetails === 'function';
  const canRemove = typeof onRemove === 'function';
  const pickerMembers = members.length > 0
    ? members
    : Object.values(membersById || {});

  const indicatorBtnClass = (active) => (
    `mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40 ${
      active
        ? `${typeAccent.softBg} ${typeAccent.icon} ${typeAccent.softHover}`
        : 'text-slate-400 hover:bg-slate-100'
    }`
  );

  const openDetails = () => {
    if (!canOpenDetails || busy) return;
    onOpenDetails?.(item);
  };

  const handleOpenLink = (event) => {
    event.stopPropagation();
    if (!bookingUrl || busy) return;
    window.open(bookingUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => () => {
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
  }, []);

  useEffect(() => {
    setLocalChecked(null);
  }, [item.id, item.checked]);

  const scheduleSyncTimer = (fn, ms) => {
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(fn, ms);
  };

  const handleToggle = async () => {
    if (busy || isSyncing) return;
    const nextChecked = !checked;

    if (!cloudSync) {
      onToggle?.(nextChecked);
      return;
    }

    setLocalChecked(nextChecked);
    setIsSyncing(true);
    setSyncFailed(false);
    setSyncSuccessPulse(false);
    onSyncStateChange?.({ itemId: item.id, syncing: true });

    try {
      await onToggle?.(nextChecked);
      setIsSyncing(false);
      onSyncStateChange?.({
        itemId: item.id,
        syncing: false,
        confirmed: true,
        checked: nextChecked,
      });
      if (nextChecked) {
        setSyncSuccessPulse(true);
        scheduleSyncTimer(() => setSyncSuccessPulse(false), 220);
      }
    } catch {
      setIsSyncing(false);
      onSyncStateChange?.({ itemId: item.id, syncing: false, confirmed: false });
      setLocalChecked(null);
      setSyncFailed(true);
      scheduleSyncTimer(() => setSyncFailed(false), 1200);
    }
  };

  const handleRemoveClick = () => {
    if (busy || !canRemove) return;
    setConfirmRemove(true);
  };

  const handleConfirmRemove = () => {
    setConfirmRemove(false);
    onRemove?.(item);
  };

  const quantityLabel = packingQuantityLabel(item.quantity);

  return (
    <>
      <li className="flex w-full items-start gap-2 px-3 py-2">
        <div className={`min-w-0 flex-1 pr-1 ${checked ? 'opacity-60' : ''}`}>
          <button
            type="button"
            disabled={!canOpenDetails || busy}
            onClick={openDetails}
            className={`block w-full break-words text-left text-sm font-medium leading-snug text-slate-700 transition hover:text-slate-900 disabled:cursor-default ${
              checked ? 'line-through' : ''
            }`}
          >
            <TypeBadge type={item.type} />
            {item.name}
            {quantityLabel ? (
              <span className="ml-1.5 inline-flex translate-y-[-1px] items-center rounded-full bg-slate-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold tabular-nums text-slate-500">
                ×{quantityLabel}
              </span>
            ) : null}
          </button>
          {mode === 'common' ? (
            <AssigneeMeta
              assignee={assignee}
              assigneeName={assigneeName}
              currentUserId={currentUserId}
              disabled={busy || !canAssign}
              onClick={() => canAssign && setPickerOpen(true)}
            />
          ) : null}
        </div>

        {showLinkIndicator && (
          <button
            type="button"
            disabled={busy || checked}
            onClick={handleOpenLink}
            title="Открыть ссылку"
            aria-label="Открыть ссылку на бронь"
            className={indicatorBtnClass(true)}
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        )}

        {showDateIndicator && (
          <button
            type="button"
            disabled={busy || checked || !canOpenDetails}
            onClick={openDetails}
            title={item.dueDate ? `Дата: ${item.dueDate}` : 'Дата'}
            aria-label={item.dueDate ? `Дедлайн ${item.dueDate}` : 'Открыть дату дела'}
            className={indicatorBtnClass(true)}
          >
            <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        )}

        {showNoteIndicator && (
          <button
            type="button"
            disabled={busy || checked || !canOpenDetails}
            onClick={openDetails}
            title="Есть примечание"
            aria-label="Открыть примечание"
            className={indicatorBtnClass(true)}
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        )}

        {canRemove && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRemoveClick}
            title="Удалить пункт"
            aria-label={`Удалить «${item.name}»`}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </button>
        )}

        <ItemCheckbox
          className={`ml-1 mt-0.5 shrink-0 ${syncFailed ? 'ring-2 ring-red-300' : ''}`}
          tone="packing"
          checked={checked}
          disabled={busy}
          isSyncing={isSyncing}
          syncSuccessPulse={syncSuccessPulse}
          checkedByName={checkedByName}
          checkedByPhotoUrl={checkedByPhotoUrl}
          ariaLabel={checked && checkedByName ? `Собрано: ${checkedByName}` : 'Отметить'}
          onChange={handleToggle}
        />
      </li>

      {canAssign && (
        <AssigneePickerModal
          open={pickerOpen}
          members={pickerMembers}
          selectedId={item.assignedTo || null}
          currentUserId={currentUserId}
          onClose={() => setPickerOpen(false)}
          onSelect={(userId) => {
            onAssign?.(userId);
            setPickerOpen(false);
          }}
        />
      )}

      <AppModal
        open={confirmRemove}
        onClose={() => !busy && setConfirmRemove(false)}
        labelledBy="packing-remove-item-title"
        overlayClassName={MODAL_OVERLAY_SHEET}
        panelClassName={`${MODAL_PANEL_SHEET} p-5`}
      >
        <h2 id="packing-remove-item-title" className="text-base font-bold text-slate-900">
          Удалить пункт?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          «{item.name}» будет убран из списка.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirmRemove}
            className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 active:scale-[0.98] disabled:opacity-50"
          >
            Удалить
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmRemove(false)}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </AppModal>
    </>
  );
}

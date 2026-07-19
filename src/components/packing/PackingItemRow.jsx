import { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Briefcase,
  Calendar,
  Check,
  ClipboardList,
  ExternalLink,
  FolderInput,
  Trash2,
  Users,
} from 'lucide-react';
import ItemCheckbox from '../list/ItemCheckbox';
import { UserAvatar } from '../profile/UserAvatar';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_SHEET } from '../ui/AppModal';
import {
  formatPackingCategoryLabel,
  packingItemMatchesCategory,
  PACKING_ITEM_TYPE,
} from '../../utils/packingLists';
import { formatBookerLabel } from '../../utils/booking';
import { resolveCheckerPhotoUrl } from '../../utils/userPhoto';
import {
  getPackingTypeAccent,
  PACKING_ACCENT,
} from '../../utils/contextAccents';

function TypeIcon({ type, className = '' }) {
  const accent = getPackingTypeAccent(type);
  if (type === PACKING_ITEM_TYPE.TODO) {
    return (
      <ClipboardList
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent.icon} ${className}`}
        strokeWidth={2.25}
        aria-hidden
      />
    );
  }
  return (
    <Briefcase
      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent.icon} ${className}`}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}

function AssigneeMeta({
  assignee,
  assigneeName,
  currentUserId,
  typeLabel,
  typeLabelClassName = 'text-slate-400',
  note,
  onClick,
  disabled = false,
}) {
  const isMine = Boolean(assignee?.id && currentUserId && assignee.id === currentUserId);
  const label = assignee
    ? (isMine ? '✨ Вы' : formatBookerLabel(assigneeName))
    : 'Назначить';

  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-400">
      <span className={`font-medium ${typeLabelClassName}`}>{typeLabel}</span>
      <span className="text-slate-300" aria-hidden>·</span>
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
            className="h-4 w-4 text-[8px]"
            variant="vivid"
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
      {note ? (
        <>
          <span className="text-slate-300" aria-hidden>·</span>
          <span className="truncate">{note}</span>
        </>
      ) : null}
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

function ItemActionsModal({
  open,
  itemName = '',
  categoryOptions = [],
  currentCategory = '',
  canCopyToPersonal = false,
  canMoveToCommon = false,
  onCopyToPersonal,
  onMoveToCommon,
  onMoveToCategory,
  onClose,
}) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="packing-item-actions-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_SHEET} max-h-[70vh] overflow-y-auto p-4 sm:p-5`}
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
      <h2 id="packing-item-actions-title" className="text-base font-bold text-slate-900">
        Действия с пунктом
      </h2>
      <p className="mt-1 truncate text-sm text-slate-500">«{itemName}»</p>

      {canCopyToPersonal && (
        <button
          type="button"
          onClick={() => {
            onCopyToPersonal?.();
            onClose?.();
          }}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Backpack className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">Скопировать в мой рюкзак</span>
            <span className="block text-[11px] text-slate-400">Личная копия для вас</span>
          </span>
        </button>
      )}

      {canMoveToCommon && (
        <button
          type="button"
          onClick={() => {
            onMoveToCommon?.();
            onClose?.();
          }}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">Перенести в общие</span>
            <span className="block text-[11px] text-slate-400">Пункт увидит вся семья</span>
          </span>
        </button>
      )}

      <p className="mt-4 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Перенести в раздел
      </p>
      <ul className="mt-1.5 space-y-1">
        {categoryOptions.map((option) => {
          const isCurrent = packingItemMatchesCategory(
            { category: currentCategory },
            option.category,
          );
          const label = option.label
            || formatPackingCategoryLabel(option.category, option.categoryIcon);
          return (
            <li key={option.category || '__uncategorized'}>
              <button
                type="button"
                disabled={isCurrent}
                onClick={() => {
                  onMoveToCategory?.(option);
                  onClose?.();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                  isCurrent
                    ? `${PACKING_ACCENT.solid} text-white`
                    : 'text-slate-700 hover:bg-slate-50'
                } disabled:cursor-default disabled:opacity-100`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
                  isCurrent ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}
                >
                  {option.categoryIcon || (isCurrent ? <Check className="h-4 w-4" aria-hidden /> : '📁')}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                {isCurrent && (
                  <span className="shrink-0 text-[11px] text-white/80">
                    Сейчас
                  </span>
                )}
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
  categoryOptions = [],
  onToggle,
  onAssign,
  onOpenBooking,
  onRemove = null,
  onCopyToPersonal = null,
  onMoveToCommon = null,
  onMoveToCategory = null,
  onSyncStateChange = null,
  cloudSync = false,
  busy = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
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
  const typeLabel = isTodo ? 'Дело' : 'Вещь';
  const bookingUrl = normalizeExternalUrl(item.bookingUrl);
  const hasBooking = Boolean(bookingUrl || item.note);
  const canAssign = mode === 'common' && typeof onAssign === 'function';
  const canRemove = typeof onRemove === 'function';
  const canCopyToPersonal = mode === 'common' && typeof onCopyToPersonal === 'function';
  const canMoveToCommon = mode === 'personal' && typeof onMoveToCommon === 'function';
  const canMove = typeof onMoveToCategory === 'function';
  const canOpenActions = canMove || canCopyToPersonal || canMoveToCommon;
  const pickerMembers = members.length > 0
    ? members
    : Object.values(membersById || {});

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

  return (
    <>
      <li className="flex w-full items-start gap-2 px-3 py-2">
        <div className={`min-w-0 flex-1 pr-1 ${checked ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-1.5">
            <TypeIcon type={item.type} />
            <div className="min-w-0 flex-1">
              <p
                className={`break-words text-sm font-medium leading-snug text-slate-700 ${
                  checked ? 'line-through' : ''
                }`}
              >
                {item.name}
              </p>
              {mode === 'common' ? (
                <AssigneeMeta
                  assignee={assignee}
                  assigneeName={assigneeName}
                  currentUserId={currentUserId}
                  typeLabel={typeLabel}
                  typeLabelClassName={typeAccent.label}
                  note={item.note}
                  disabled={busy || !canAssign}
                  onClick={() => canAssign && setPickerOpen(true)}
                />
              ) : (
                <p className={`mt-0.5 text-[11px] font-medium ${typeAccent.label}`}>
                  {typeLabel}
                </p>
              )}
            </div>
          </div>
        </div>

        {isTodo && (
          <button
            type="button"
            disabled={busy || checked}
            onClick={() => onOpenBooking?.(item)}
            title={hasBooking ? 'Бронь / детали дела' : 'Привязать бронь'}
            aria-label={hasBooking ? 'Бронь / детали дела' : 'Привязать бронь'}
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40 ${
              hasBooking
                ? `${typeAccent.softBg} ${typeAccent.icon} ${typeAccent.softHover}`
                : `text-slate-400 hover:bg-slate-100 ${typeAccent.iconHover}`
            }`}
          >
            {bookingUrl ? (
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            )}
          </button>
        )}

        {canOpenActions && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setActionsOpen(true)}
            title="Перенести или скопировать"
            aria-label={`Действия с «${item.name}»`}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 disabled:opacity-40"
          >
            <FolderInput className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
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

      {canOpenActions && (
        <ItemActionsModal
          open={actionsOpen}
          itemName={item.name}
          categoryOptions={categoryOptions}
          currentCategory={item.category || ''}
          canCopyToPersonal={canCopyToPersonal}
          canMoveToCommon={canMoveToCommon}
          onCopyToPersonal={() => onCopyToPersonal?.(item)}
          onMoveToCommon={() => onMoveToCommon?.(item)}
          onMoveToCategory={(option) => onMoveToCategory?.(item, option)}
          onClose={() => setActionsOpen(false)}
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

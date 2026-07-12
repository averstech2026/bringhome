import { useEffect, useRef, useState } from 'react';
import ItemCheckbox from './ItemCheckbox';
import { isPendingListItem } from '../../hooks/usePendingListItems';
import ItemDetailsModal from './ItemDetailsModal';
import QuantityStepper from './QuantityStepper';
import BookingBadge from './BookingBadge';
import { getQuantityDisplay } from '../../utils/quantity';
import { learnProducts } from '../../utils/productLearning';
import {
  isItemBookedByMe,
  isItemBookedByOtherFamily,
  buildBookingPayload,
} from '../../utils/booking';
import {
  toggleItem,
  updateItemQuantity,
  updateItemCategory,
  updateItemComment,
  updateItemBooking,
  deleteItem,
} from '../../services/listsService';

export default function ItemRow({
  item,
  displayName,
  userPhotoUrl,
  bookingContext,
  externalFamilies = {},
  ownerFamily = null,
  membersById = {},
  onToggle,
  onQuantityChange,
  onRemove,
  onCategoryChange,
  onCommentChange,
  onBookingToggle,
  onSyncStateChange,
  disabled = false,
  readOnly = false,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [localChecked, setLocalChecked] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncSuccessPulse, setSyncSuccessPulse] = useState(false);
  const syncTimersRef = useRef([]);

  const ctx = bookingContext || { displayName, userPhotoUrl, familyId: null };
  const displayChecked = localChecked !== null ? localChecked : item.checked;
  const requiresCloudSync = !readOnly && !isPendingListItem(item.id);
  const isBooked = Boolean(item.bookedBy);
  const rowMuted = isBooked && !displayChecked;
  const isMyBooking = isItemBookedByMe(item, ctx);
  const blockedByOtherFamily = isItemBookedByOtherFamily(item, ctx.familyId);
  const bookingDisabled = disabled || (blockedByOtherFamily && !isMyBooking);

  useEffect(() => {
    if (localChecked !== null && item.checked === localChecked && !isSyncing) {
      setLocalChecked(null);
    }
  }, [item.checked, localChecked, isSyncing]);

  useEffect(() => {
    return () => {
      syncTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  const scheduleSyncTimer = (callback, delay) => {
    const timerId = window.setTimeout(() => {
      syncTimersRef.current = syncTimersRef.current.filter((id) => id !== timerId);
      callback();
    }, delay);
    syncTimersRef.current.push(timerId);
  };

  const handleToggle = async () => {
    if (readOnly || disabled || isSyncing) return;

    const newChecked = !displayChecked;

    if (!requiresCloudSync) {
      if (onToggle) {
        onToggle(item.id, displayName);
      } else {
        await toggleItem(item.id, {
          checked: newChecked,
          checkedBy: displayName,
        });
      }
      return;
    }

    setLocalChecked(newChecked);
    setIsSyncing(true);
    setSyncFailed(false);
    setSyncSuccessPulse(false);
    onSyncStateChange?.({ itemId: item.id, syncing: true });

    try {
      if (onToggle) {
        await onToggle(item.id, displayName, newChecked);
      } else {
        await toggleItem(item.id, {
          checked: newChecked,
          checkedBy: displayName,
        });
      }

      setIsSyncing(false);
      onSyncStateChange?.({
        itemId: item.id,
        syncing: false,
        confirmed: true,
        checked: newChecked,
        bookedBy: newChecked ? null : (item.bookedBy ?? null),
      });
      if (newChecked) {
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

  const handleQuantityChange = async (newQuantity) => {
    if (onQuantityChange) {
      onQuantityChange(item.id, newQuantity);
      return;
    }
    await updateItemQuantity(item.id, newQuantity);
  };

  const handleRemove = async () => {
    if (onRemove) {
      onRemove(item.id);
      return;
    }
    await deleteItem(item.id);
  };

  const handleDetailsSave = async ({ comment, bookedBy, bookingMeta, category, checked }) => {
    if (checked !== item.checked) {
      if (onToggle) {
        onToggle(item.id, displayName);
      } else {
        await toggleItem(item.id, {
          checked,
          checkedBy: displayName,
        });
      }
    }

    if (category && category !== item.category) {
      learnProducts([{ name: item.name, category, quantity: item.quantity }]).catch(() => {});
      if (onCategoryChange) {
        onCategoryChange(item.id, category);
      } else {
        await updateItemCategory(item.id, category);
      }
    }

    if (onCommentChange) {
      onCommentChange(item.id, comment);
    } else {
      await updateItemComment(item.id, comment);
    }

    const bookingPayload = buildBookingPayload(bookedBy, bookingMeta);
    if (onBookingToggle) {
      onBookingToggle(item.id, bookingPayload);
    } else {
      await updateItemBooking(item.id, bookingPayload);
    }
  };

  const displayCheckedBy = displayChecked
    ? (localChecked !== null ? displayName : item.checkedBy)
    : undefined;
  const checkerPhotoUrl =
    displayChecked && displayCheckedBy === displayName ? userPhotoUrl : undefined;
  const { label: quantityLabel } = getQuantityDisplay(item.quantity);
  const showMeta = Boolean(item.comment || item.bookedBy);

  return (
    <>
      <div
        className={`flex w-full items-center justify-between px-3 py-2 transition-opacity ${
          rowMuted ? 'bg-slate-50/60' : ''
        } ${blockedByOtherFamily && !displayChecked ? 'opacity-90' : ''} ${
          syncFailed ? 'animate-sync-error-flash' : ''
        }`}
      >
        <div className={`min-w-0 flex-1 pr-3 ${displayChecked ? 'opacity-60' : rowMuted ? 'opacity-75' : ''}`}>
          <div className="flex items-start gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDetailsOpen(true)}
              className={`min-w-0 flex-1 text-left text-sm font-medium text-slate-700 ${
                displayChecked ? 'line-through' : ''
              } cursor-pointer hover:text-slate-900`}
            >
              {item.name}
            </button>
          </div>

          {showMeta && (
            <div className="mt-0.5 space-y-0.5">
              {item.bookedBy && (
                <BookingBadge
                  item={item}
                  bookingContext={ctx}
                  externalFamilies={externalFamilies}
                  ownerFamily={ownerFamily}
                  membersById={membersById}
                />
              )}
              {item.comment && (
                <p className="text-xs text-slate-400">{item.comment}</p>
              )}
            </div>
          )}
        </div>

        {readOnly ? (
          <span className="ml-auto shrink-0 text-sm font-semibold text-gray-500">
            {quantityLabel}
          </span>
        ) : (
          <div
            className={`${displayChecked ? 'pointer-events-none opacity-60' : rowMuted ? 'opacity-75' : ''} ${
              bookingDisabled && !displayChecked ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <QuantityStepper
              quantity={item.quantity}
              disabled={bookingDisabled || displayChecked}
              onChange={handleQuantityChange}
              onRemove={handleRemove}
              itemName={item.name}
            />
          </div>
        )}

        <ItemCheckbox
          className="ml-3"
          checked={displayChecked}
          onChange={readOnly ? undefined : handleToggle}
          checkedByName={displayCheckedBy}
          checkedByPhotoUrl={checkerPhotoUrl}
          disabled={readOnly || disabled}
          isSyncing={isSyncing}
          syncSuccessPulse={syncSuccessPulse}
        />
      </div>

      <ItemDetailsModal
        open={detailsOpen}
        item={item}
        displayName={displayName}
        userPhotoUrl={userPhotoUrl}
        bookingContext={ctx}
        externalFamilies={externalFamilies}
        ownerFamily={ownerFamily}
        membersById={membersById}
        disabled={bookingDisabled}
        readOnly={readOnly}
        onClose={() => setDetailsOpen(false)}
        onSave={handleDetailsSave}
      />
    </>
  );
}

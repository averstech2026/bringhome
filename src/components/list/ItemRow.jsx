import { useState } from 'react';
import ItemCheckbox from './ItemCheckbox';
import ItemDetailsModal from './ItemDetailsModal';
import QuantityStepper from './QuantityStepper';
import { UserAvatar } from '../profile/UserAvatar';
import { getQuantityDisplay } from '../../utils/quantity';
import { learnProducts } from '../../utils/productLearning';
import { formatBookerLabel } from '../../utils/booking';
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
  onToggle,
  onQuantityChange,
  onRemove,
  onCategoryChange,
  onCommentChange,
  onBookingToggle,
  disabled = false,
  readOnly = false,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isBooked = Boolean(item.bookedBy);
  const rowMuted = isBooked && !item.checked;
  const isMyBooking = item.bookedBy === displayName;

  const handleToggle = async () => {
    if (onToggle) {
      onToggle(item.id, displayName);
      return;
    }
    await toggleItem(item.id, {
      checked: !item.checked,
      checkedBy: displayName,
    });
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

  const handleDetailsSave = async ({ comment, bookedBy, category, checked }) => {
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

    if (onBookingToggle) {
      onBookingToggle(item.id, bookedBy);
    } else {
      await updateItemBooking(item.id, bookedBy);
    }
  };

  const checkerPhotoUrl =
    item.checked && item.checkedBy === displayName ? userPhotoUrl : undefined;
  const bookerPhotoUrl = isMyBooking ? userPhotoUrl : undefined;
  const { label: quantityLabel } = getQuantityDisplay(item.quantity);
  const showMeta = Boolean(item.comment || item.bookedBy);

  return (
    <>
      <div
        className={`flex w-full items-center justify-between px-3 py-2 transition-opacity ${
          rowMuted ? 'bg-slate-50/60' : ''
        }`}
      >
        <div className={`min-w-0 flex-1 pr-3 ${item.checked ? 'opacity-60' : rowMuted ? 'opacity-75' : ''}`}>
          <div className="flex items-start gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setDetailsOpen(true)}
              className={`min-w-0 flex-1 text-left text-sm font-medium text-slate-700 ${
                item.checked ? 'line-through' : ''
              } cursor-pointer hover:text-slate-900`}
            >
              {item.name}
            </button>
          </div>

          {showMeta && (
            <div className="mt-0.5 space-y-0.5">
              {item.bookedBy && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <UserAvatar
                    photoUrl={bookerPhotoUrl}
                    name={item.bookedBy}
                    className="h-4 w-4 text-[8px]"
                    variant="vivid"
                  />
                  <span className="whitespace-nowrap">
                    {isMyBooking
                      ? '✨ Вы'
                      : `Купит ${formatBookerLabel(item.bookedBy)}`}
                  </span>
                </div>
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
          <div className={`${item.checked ? 'pointer-events-none opacity-60' : rowMuted ? 'opacity-75' : ''}`}>
            <QuantityStepper
              quantity={item.quantity}
              disabled={disabled || item.checked}
              onChange={handleQuantityChange}
              onRemove={handleRemove}
              itemName={item.name}
            />
          </div>
        )}

        <ItemCheckbox
          className="ml-3 shrink-0"
          checked={item.checked}
          onChange={readOnly ? undefined : handleToggle}
          checkedByName={item.checked ? item.checkedBy : undefined}
          checkedByPhotoUrl={checkerPhotoUrl}
          disabled={readOnly}
        />
      </div>

      <ItemDetailsModal
        open={detailsOpen}
        item={item}
        displayName={displayName}
        userPhotoUrl={userPhotoUrl}
        disabled={disabled}
        readOnly={readOnly}
        onClose={() => setDetailsOpen(false)}
        onSave={handleDetailsSave}
      />
    </>
  );
}

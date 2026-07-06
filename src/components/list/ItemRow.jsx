import { useState } from 'react';
import ItemCheckbox from './ItemCheckbox';
import ItemDetailsModal from './ItemDetailsModal';
import QuantityStepper from './QuantityStepper';
import { UserAvatar } from '../profile/UserAvatar';
import { getQuantityDisplay } from '../../utils/quantity';
import { saveLearnedCategory } from '../../utils/productCategoryMap';
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

  const handleDetailsSave = async ({ comment, bookedBy, category }) => {
    if (category && category !== item.category) {
      saveLearnedCategory(item.name, category);
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
          rowMuted ? 'bg-slate-50/60 opacity-75' : ''
        } ${item.checked ? 'opacity-60' : ''}`}
      >
        <div className="min-w-0 flex-1 pr-3">
          <div className="flex items-start gap-1">
            <button
              type="button"
              disabled={disabled || (item.checked && !readOnly)}
              onClick={() => setDetailsOpen(true)}
              className={`min-w-0 flex-1 text-left text-sm text-slate-600 ${
                item.checked ? 'line-through' : ''
              } ${!item.checked || readOnly ? 'cursor-pointer hover:text-slate-800' : ''}`}
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
                  <span>
                    {isMyBooking
                      ? 'Забронировано вами'
                      : `Забронировано · Купит ${formatBookerLabel(item.bookedBy)}`}
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
          <div className={item.checked ? 'pointer-events-none opacity-60' : ''}>
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
          className="ml-3"
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
        disabled={disabled || item.checked}
        readOnly={readOnly}
        onClose={() => setDetailsOpen(false)}
        onSave={handleDetailsSave}
      />
    </>
  );
}

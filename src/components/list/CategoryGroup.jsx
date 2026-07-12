import { Hand } from 'lucide-react';
import ItemRow from './ItemRow';
import { getCategoryLabel, getCategoryHeaderClass } from '../../utils/categories';
import { getCategoryBookingState, resolveCategoryBookingAction } from '../../utils/booking';

function CategoryBookButton({ items, bookingContext, disabled, onBookCategory }) {
  const { allMine, hasFree, activeCount, blockedByOtherFamily } = getCategoryBookingState(
    items,
    bookingContext,
  );
  const isCompleted = activeCount === 0;
  const canToggle = !isCompleted && (allMine || hasFree);
  const softDisabled = isCompleted || (blockedByOtherFamily && !canToggle);

  const handleClick = () => {
    if (!canToggle) return;
    const { booking, itemIds } = resolveCategoryBookingAction(items, bookingContext);
    onBookCategory?.(itemIds, booking);
  };

  return (
    <button
      type="button"
      disabled={disabled || !canToggle}
      onClick={handleClick}
      title={
        isCompleted
          ? 'Все позиции в отделе отмечены'
          : softDisabled
            ? 'Отдел забронирован другой семьёй'
            : allMine
              ? 'Снять бронь с отдела'
              : 'Забронировать весь отдел'
      }
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent shadow-sm transition-all duration-150 active:scale-95 disabled:opacity-40 ${
        softDisabled
          ? 'cursor-not-allowed bg-slate-100 text-slate-300'
          : allMine
            ? 'bg-indigo-500 text-white shadow-indigo-200/50 hover:bg-indigo-600'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
      }`}
      aria-disabled={!canToggle}
    >
      <Hand className="h-3.5 w-3.5" strokeWidth={allMine && !isCompleted ? 2.25 : 2} aria-hidden />
    </button>
  );
}

export default function CategoryGroup({
  category,
  items,
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
  onCategoryBooking,
  onSyncStateChange,
  disabled = false,
  readOnly = false,
  isFirst = false,
}) {
  const headerColor = getCategoryHeaderClass(category);
  const resolvedContext = bookingContext || { displayName, userPhotoUrl };

  const handleCategoryBook = (itemIds, booking) => {
    onCategoryBooking?.(category, itemIds, booking);
  };

  return (
    <section>
      <div
        className={`-mx-3 flex items-center justify-between gap-2 py-2 pl-3 pr-6 font-bold text-xs uppercase tracking-wider ${headerColor} ${
          isFirst ? 'mt-0 rounded-md' : 'mt-3 rounded-md'
        }`}
      >
        <span className="min-w-0 truncate">{getCategoryLabel(category)}</span>
        {!readOnly && (
          <CategoryBookButton
            items={items}
            bookingContext={resolvedContext}
            disabled={disabled}
            onBookCategory={handleCategoryBook}
          />
        )}
      </div>
      <div className="divide-y divide-gray-50">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            displayName={displayName}
            userPhotoUrl={userPhotoUrl}
            bookingContext={resolvedContext}
            externalFamilies={externalFamilies}
            ownerFamily={ownerFamily}
            membersById={membersById}
            onToggle={onToggle}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            onCategoryChange={onCategoryChange}
            onCommentChange={onCommentChange}
            onBookingToggle={onBookingToggle}
            onSyncStateChange={onSyncStateChange}
            disabled={disabled}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}

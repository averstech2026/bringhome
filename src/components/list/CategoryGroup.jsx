import { User } from 'lucide-react';
import ItemRow from './ItemRow';
import { getCategoryLabel, getCategoryHeaderClass } from '../../utils/categories';
import { getCategoryBookingState, resolveCategoryBookingAction } from '../../utils/booking';
function CategoryBookButton({ items, displayName, disabled, onBookCategory }) {
  const { allMine, hasFree, activeCount } = getCategoryBookingState(items, displayName);
  if (activeCount === 0) return null;

  const canToggle = allMine || hasFree;

  const handleClick = () => {
    const { bookedBy, itemIds } = resolveCategoryBookingAction(items, displayName);
    onBookCategory?.(itemIds, bookedBy);
  };

  return (
    <button
      type="button"
      disabled={disabled || !canToggle}
      onClick={handleClick}
      title={allMine ? 'Снять бронь с отдела' : 'Забронировать весь отдел'}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
        allMine
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
          : 'border-slate-200/80 bg-white/80 text-slate-500 hover:bg-white hover:text-emerald-600'
      }`}
    >
      <User className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export default function CategoryGroup({
  category,
  items,
  displayName,
  userPhotoUrl,
  onToggle,
  onQuantityChange,
  onRemove,
  onCategoryChange,
  onCommentChange,
  onBookingToggle,
  onCategoryBooking,
  disabled = false,
  readOnly = false,
  isFirst = false,
}) {
  const headerColor = getCategoryHeaderClass(category);

  const handleCategoryBook = (itemIds, bookedBy) => {
    onCategoryBooking?.(category, itemIds, bookedBy);
  };

  return (
    <section>
      <div
        className={`-mx-3 flex items-center justify-between gap-2 py-2 pl-3 pr-6 font-bold text-xs uppercase tracking-wider ${headerColor} ${
          isFirst ? 'mt-0 rounded-md' : 'mt-3 rounded-md'
        }`}
      >        <span className="min-w-0 truncate">{getCategoryLabel(category)}</span>
        {!readOnly && (
          <CategoryBookButton
            items={items}
            displayName={displayName}
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
            onToggle={onToggle}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
            onCategoryChange={onCategoryChange}
            onCommentChange={onCommentChange}
            onBookingToggle={onBookingToggle}
            disabled={disabled}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}

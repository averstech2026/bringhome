import ItemRow from './ItemRow';
import { getCategoryLabel, getCategoryHeaderClass } from '../../utils/categories';

export default function CategoryGroup({
  category,
  items,
  displayName,
  userPhotoUrl,
  onToggle,
  onQuantityChange,
  onRemove,
  disabled = false,
  readOnly = false,
  isFirst = false,
}) {
  const headerColor = getCategoryHeaderClass(category);

  return (
    <section>
      <div
        className={`-mx-3 px-3 py-2 font-bold text-xs uppercase tracking-wider ${headerColor} ${
          isFirst ? 'mt-0 rounded-md' : 'mt-3 rounded-md'
        }`}
      >
        {getCategoryLabel(category)}
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
            disabled={disabled}
            readOnly={readOnly}
          />
        ))}
      </div>
    </section>
  );
}

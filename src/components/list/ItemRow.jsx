import ItemCheckbox from './ItemCheckbox';
import QuantityStepper from './QuantityStepper';
import { getQuantityDisplay } from '../../utils/quantity';
import { toggleItem, updateItemQuantity, deleteItem } from '../../services/listsService';

export default function ItemRow({
  item,
  displayName,
  userPhotoUrl,
  onToggle,
  onQuantityChange,
  onRemove,
  disabled = false,
  readOnly = false,
}) {
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

  const checkerPhotoUrl =
    item.checked && item.checkedBy === displayName ? userPhotoUrl : undefined;
  const { label: quantityLabel } = getQuantityDisplay(item.quantity);

  return (
    <div className="flex items-center gap-2 py-3">
      <div className={`min-w-0 flex-1 pl-2 ${item.checked ? 'opacity-60' : ''}`}>
        <p className={`text-sm text-slate-600 ${item.checked ? 'line-through' : ''}`}>
          {item.name}
        </p>
        {item.comment && (
          <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
            {item.comment}
          </span>
        )}
      </div>

      {readOnly ? (
        <span className={`mr-4 shrink-0 text-sm font-semibold text-gray-500 ${item.checked ? 'opacity-60' : ''}`}>
          {quantityLabel}
        </span>
      ) : (
        <div className={item.checked ? 'opacity-60' : ''}>
          <QuantityStepper
            quantity={item.quantity}
            disabled={disabled || item.checked}
            onChange={handleQuantityChange}
            onRemove={handleRemove}
          />
        </div>
      )}

      <ItemCheckbox
        checked={item.checked}
        onChange={readOnly ? undefined : handleToggle}
        checkedByName={item.checked ? item.checkedBy : undefined}
        checkedByPhotoUrl={checkerPhotoUrl}
        disabled={readOnly}
      />
    </div>
  );
}

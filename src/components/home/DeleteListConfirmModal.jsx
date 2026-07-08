import ConfirmModal from '../ui/ConfirmModal';

export default function DeleteListConfirmModal({
  open,
  listTitle,
  deleting,
  onConfirm,
  onCancel,
}) {
  return (
    <ConfirmModal
      open={open}
      title="Удалить список?"
      titleId="delete-list-title"
      message={
        listTitle
          ? `Вы уверены, что хотите удалить «${listTitle}» навсегда? Это действие нельзя отменить.`
          : 'Вы уверены, что хотите удалить этот список навсегда? Это действие нельзя отменить.'
      }
      confirmLabel="Да, удалить"
      confirming={deleting}
      confirmingLabel="Удаляем…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      destructive
    />
  );
}

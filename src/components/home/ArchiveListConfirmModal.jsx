import ConfirmModal from '../ui/ConfirmModal';
import { PRIMARY_BTN } from '../list/cardStyles';

function resolveMessage(listTitle, creatorName, adminArchivingOthers) {
  if (adminArchivingOthers && listTitle) {
    const creator = creatorName || 'другим пользователем';
    return `Вы уверены, что хотите перенести в архив список «${listTitle}»? Этот список был создан пользователем ${creator}. Он перестанет отображаться на главном экране у всей семьи.`;
  }

  if (listTitle) {
    return `Вы уверены, что хотите перенести список «${listTitle}» в архив? Он перестанет отображаться на главном экране.`;
  }

  return 'Вы уверены, что хотите перенести этот список в архив? Он перестанет отображаться на главном экране.';
}

export default function ArchiveListConfirmModal({
  open,
  listTitle,
  creatorName,
  adminArchivingOthers = false,
  archiving,
  onConfirm,
  onCancel,
}) {
  const confirmClassName = adminArchivingOthers
    ? 'rounded-full bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100'
    : `${PRIMARY_BTN} !bg-amber-500 !py-3 text-sm shadow-[0_4px_14px_rgba(245,158,11,0.28)] hover:!bg-amber-600 hover:shadow-[0_6px_20px_rgba(245,158,11,0.34)] disabled:opacity-50`;

  return (
    <ConfirmModal
      open={open}
      title="Архивировать список?"
      titleId="archive-list-title"
      message={resolveMessage(listTitle, creatorName, adminArchivingOthers)}
      messageClassName={`mt-1.5 text-sm ${adminArchivingOthers ? 'text-slate-600' : 'text-slate-500'}`}
      confirmLabel="В архив"
      confirming={archiving}
      confirmingLabel="Архивируем…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmClassName={confirmClassName}
    />
  );
}

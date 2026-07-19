import AppModal from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import { UserAvatar } from '../profile/UserAvatar';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function ArchiveAccessModal({ open, contacts = [], onClose }) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="archive-access-title"
      panelClassName="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
    >
      <ModalCloseButton onClick={onClose} />
      <h2 id="archive-access-title" className="pr-10 text-base font-semibold text-slate-900">
        Доступ ограничен
      </h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Чтобы отправить список в архив, обратитесь к владельцу или администратору с доступом:
      </p>

      <ul className="mt-4 space-y-2">
        {contacts.length === 0 ? (
          <li className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
            Контакты не найдены
          </li>
        ) : (
          contacts.map((contact) => {
            const name = contact.displayName || contact.email?.split('@')[0] || 'Участник';
            return (
              <li
                key={contact.id}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"
              >
                <UserAvatar
                  photoUrl={contact.avatarUrl}
                  name={name}
                  className="h-8 w-8 text-xs"
                />
                <span className="truncate text-sm font-medium text-slate-800">{name}</span>
              </li>
            );
          })
        )}
      </ul>

      <button type="button" onClick={onClose} className={`mt-5 ${PRIMARY_BTN} !py-3 text-sm`}>
        Понятно
      </button>
    </AppModal>
  );
}

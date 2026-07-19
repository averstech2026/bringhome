import { useEffect, useState } from 'react';
import { getAdminUsers } from '../../services/usersService';
import { UserAvatar } from '../profile/UserAvatar';
import AppModal from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';

export default function RequestCustomTypeModal({ open, onClose }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    getAdminUsers()
      .then(setAdmins)
      .catch(() => setAdmins([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="request-custom-type-title"
      panelClassName="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
    >
      <ModalCloseButton onClick={onClose} />
      <h2 id="request-custom-type-title" className="pr-10 text-lg font-bold text-slate-900">
        Новый тип списка
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Попросите администраторов добавить нужный вам тип списка — только они могут создавать
        новые шаблоны.
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Администраторы
        </p>

        {loading ? (
          <div className="mt-3 flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : admins.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Администраторы не найдены</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {admins.map((admin) => (
              <li
                key={admin.id}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"
              >
                <UserAvatar
                  photoUrl={admin.avatarUrl}
                  name={admin.displayName || admin.email}
                  className="h-10 w-10 text-sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {admin.displayName || 'Администратор'}
                  </p>
                  {admin.email && (
                    <p className="truncate text-xs text-slate-400">{admin.email}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50"
      >
        Понятно
      </button>
    </AppModal>
  );
}

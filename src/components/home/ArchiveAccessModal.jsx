import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserAvatar } from '../profile/UserAvatar';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function ArchiveAccessModal({ open, admins = [], onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-access-title"
      >
        <h2 id="archive-access-title" className="text-base font-semibold text-slate-900">
          Доступ ограничен
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Чтобы отправить список в архив, обратитесь к администраторам:
        </p>

        <ul className="mt-4 space-y-2">
          {admins.length === 0 ? (
            <li className="rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
              Администраторы не найдены
            </li>
          ) : (
            admins.map((admin) => {
              const name = admin.displayName || admin.email?.split('@')[0] || 'Администратор';
              return (
                <li
                  key={admin.id}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"
                >
                  <UserAvatar
                    photoUrl={admin.avatarUrl}
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
      </div>
    </div>,
    document.body,
  );
}

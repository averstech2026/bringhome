import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import { formatNotificationBody } from '../../utils/onboardingContent';

function formatFullDate(createdAt) {
  if (!createdAt?.toDate) return '';
  return createdAt.toDate().toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationDetailModal({
  open,
  notification,
  onClose,
  onNavigate,
}) {
  if (!notification) return null;

  const hasLink = Boolean(notification.link && notification.link !== '/');

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="notification-detail-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} p-5 sm:p-6`}
    >
      <ModalCloseButton onClick={onClose} />
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-xs text-slate-400">
          {formatFullDate(notification.createdAt)}
        </p>
        <h2 id="notification-detail-title" className="mt-2 pr-10 text-xl font-bold leading-snug text-slate-900">
          {notification.title || 'Уведомление'}
        </h2>
        <div
          className="mt-4 flex-1 overflow-y-auto text-[15px] leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{
            __html: formatNotificationBody(notification.body),
          }}
        />
        <div className="mt-5 flex gap-2">
          {hasLink && (
            <button
              type="button"
              onClick={() => {
                onNavigate?.(notification.link);
                onClose?.();
              }}
              className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition hover:bg-emerald-600"
            >
              Перейти
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
              hasLink ? 'flex-1' : 'w-full'
            }`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </AppModal>
  );
}

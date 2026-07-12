import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Megaphone, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useNotifications } from '../../hooks/useNotifications';
import CreateAnnouncementModal from './CreateAnnouncementModal';
import HintGuideModal from '../hints/HintGuideModal';
import NotificationDetailModal from '../notifications/NotificationDetailModal';
import { canSendFamilyAnnouncement } from '../../utils/notificationAdmin';
import { getFamily } from '../../services/familiesService';
import { setOnboardingCompleted } from '../../services/usersService';
import {
  filterVisibleHints,
  getNotificationHintId,
  isHintNotification,
  withVirtualWelcomeHint,
} from '../../utils/onboardingContent';

const APP_ICON = `${import.meta.env.BASE_URL || '/'}icons/logo.png`;
const PAGE_SIZE = 20;

function NotificationFilterTabs({ value, onChange }) {
  const tabs = [
    { id: 'all', label: 'Все' },
    { id: 'incoming', label: 'Входящие' },
    { id: 'outgoing', label: 'Исходящие' },
  ];

  return (
    <div className="inline-flex h-9 items-center rounded-full bg-slate-100/80 p-1">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex h-full items-center justify-center rounded-full px-3 text-sm transition-colors ${
              active
                ? 'bg-white font-semibold text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function formatNotificationTime(createdAt) {
  if (!createdAt?.toDate) return '';
  const date = createdAt.toDate();
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function getAnnouncementLabel(notification) {
  const name = notification.senderDisplayName?.trim();
  if (name) return `Объявление от ${name}`;
  return 'Объявление от администратора';
}

function DirectionBadge({ direction }) {
  if (direction === 'outgoing') {
    return (
      <span className="rounded bg-emerald-50/50 px-2 py-0.5 text-xs text-emerald-600">
        Исходящее
      </span>
    );
  }

  return (
    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
      Входящее
    </span>
  );
}

function HintBadge() {
  return (
    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-100">
      Подсказка
    </span>
  );
}

function NotificationIcon({ notification, read }) {
  if (isHintNotification(notification)) {
    return (
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          read
            ? 'bg-violet-50/80'
            : 'bg-gradient-to-br from-violet-100 to-indigo-100 shadow-sm shadow-violet-200/50'
        }`}
        aria-hidden
      >
        <BookOpen
          className={`h-4 w-4 ${read ? 'text-violet-400' : 'text-violet-600'}`}
          strokeWidth={2}
        />
      </span>
    );
  }

  if (notification.type === 'admin_announcement') {
    return (
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          read ? 'bg-slate-100' : 'bg-emerald-100'
        }`}
        aria-hidden
      >
        <Megaphone
          className={`h-4 w-4 ${read ? 'text-slate-400' : 'text-emerald-600'}`}
          strokeWidth={2}
        />
      </span>
    );
  }

  if (!read) {
    return (
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
        aria-hidden
      />
    );
  }

  return <span className="w-2 shrink-0" aria-hidden />;
}

function IncomingNotificationItem({ notification, read, onSelect, showDirectionBadge }) {
  const isAnnouncement = notification.type === 'admin_announcement';
  const isHint = isHintNotification(notification);

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`flex w-full gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-sm transition active:bg-slate-100/80 ${
        isHint
          ? `border-violet-100/80 bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30 hover:from-violet-50/60 ${read ? 'opacity-80' : ''}`
          : `border-slate-100 bg-white hover:bg-slate-50 ${read ? 'opacity-75' : 'bg-emerald-50/40'}`
      }`}
    >
      <NotificationIcon notification={notification} read={read} />
      <div className="min-w-0 flex-1">
        {isHint && (
          <div className="mb-1">
            <HintBadge />
          </div>
        )}
        {(isAnnouncement || isHint) && notification.title && (
          <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
        )}
        {isAnnouncement && (
          <p className={`text-xs font-semibold text-emerald-700 ${notification.title ? 'mt-1' : ''}`}>
            {getAnnouncementLabel(notification)}
          </p>
        )}
        <p className={`text-sm leading-snug text-slate-800 ${(isAnnouncement || isHint) && notification.title ? 'mt-1' : ''}`}>
          {notification.body}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          {formatNotificationTime(notification.createdAt)}
          {showDirectionBadge && <DirectionBadge direction="incoming" />}
        </p>
      </div>
    </button>
  );
}

function OutgoingNotificationItem({ notification, showDirectionBadge, onSelect }) {
  const recipientLabel = notification.familyId === 'global'
    ? 'Всем пользователям'
    : (notification.familyName?.trim() || 'Семья');
  const legacyRecipientCount = notification.receiverIds?.length || 0;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(notification)}
      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 active:bg-slate-100/80"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <img src={APP_ICON} alt="" className="h-5 w-5 rounded-md object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          {notification.title && (
            <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
          )}
          <p className={`text-sm leading-snug text-slate-800 ${notification.title ? 'mt-1' : ''}`}>
            {notification.body}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            {formatNotificationTime(notification.createdAt)}
            {showDirectionBadge && <DirectionBadge direction="outgoing" />}
            {(notification.familyId || legacyRecipientCount > 0) && (
              <span className="text-slate-300"> · </span>
            )}
            {notification.familyId ? (
              <span>{recipientLabel}</span>
            ) : legacyRecipientCount > 0 ? (
              <span>
                {legacyRecipientCount}
                {' '}
                {legacyRecipientCount === 1 ? 'получатель' : legacyRecipientCount < 5 ? 'получателя' : 'получателей'}
              </span>
            ) : null}
            {notification.sendAsPush && (
              <>
                <span className="text-slate-300"> · </span>
                <span>Push</span>
              </>
            )}
          </p>
        </div>
      </div>
    </button>
  );
}

function FamilyAnnouncementHint() {
  return (
    <div className="mb-4 w-full">
      <p className="text-xs font-medium text-slate-700">
        <span aria-hidden className="mr-1">📢</span>
        Объявления для семьи
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
        Сообщение появится в ленте семьи, Push — на устройства.
      </p>
    </div>
  );
}

export default function NotificationsList({ userId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { familyId, profile, isSuperAdmin, platformAdminUid, reload: reloadProfile } = useUserProfile(user);
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [detailNotification, setDetailNotification] = useState(null);
  const [activeHintId, setActiveHintId] = useState(null);

  const canSendAnnouncement = canSendFamilyAnnouncement({ profile, platformAdminUid });
  const senderDisplayName = profile?.displayName || user?.displayName || 'Администратор';
  const announcementScope = isSuperAdmin ? 'platform' : 'family';

  useEffect(() => {
    if (!familyId) {
      setFamilyName('');
      return undefined;
    }

    let active = true;
    getFamily(familyId)
      .then((family) => {
        if (active) setFamilyName(family?.name?.trim() || '');
      })
      .catch(() => {
        if (active) setFamilyName('');
      });

    return () => {
      active = false;
    };
  }, [familyId]);

  const mode = filter === 'all'
    ? 'all'
    : filter === 'outgoing'
      ? 'outgoing'
      : 'incoming';

  const { notifications, loading, markRead, isRead } = useNotifications(userId, { mode, familyId, profile });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const visibleNotifications = useMemo(() => {
    if (filter === 'outgoing') {
      return notifications.filter((notification) => notification.senderId === userId);
    }

    const withWelcome = withVirtualWelcomeHint(notifications, userId, {
      createdAt: profile?.createdAt ?? null,
    });

    return filterVisibleHints(withWelcome, userId, profile);
  }, [notifications, filter, userId, profile]);

  const displayedNotifications = visibleNotifications.slice(0, visibleCount);
  const hasMore = visibleNotifications.length > visibleCount;
  const showDirectionBadge = filter === 'all';

  const handleSelect = (notification) => {
    if (!notification.isVirtual && !isRead(notification)) {
      markRead(notification.id, notification).catch(() => {});
    }

    if (isHintNotification(notification)) {
      const hintId = getNotificationHintId(notification);
      if (hintId) {
        setActiveHintId(hintId);
      }
      return;
    }

    setDetailNotification(notification);
  };

  const handleHintComplete = async () => {
    if (!userId || !activeHintId) return;
    if (activeHintId !== 'welcome') return;
    try {
      await setOnboardingCompleted(userId, true);
      reloadProfile();
    } catch {
      // modal still closes
    }
  };

  const emptyMessage = filter === 'outgoing'
    ? 'Исходящих уведомлений пока нет'
    : 'Пока нет уведомлений';

  return (
    <div>
      {canSendAnnouncement && <FamilyAnnouncementHint />}

      <div className="mb-4 flex items-center justify-between">
        <NotificationFilterTabs value={filter} onChange={setFilter} />
        {canSendAnnouncement && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            Создать
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : visibleNotifications.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {displayedNotifications.map((notification) => {
              const isOutgoing = filter === 'outgoing' || notification.direction === 'outgoing';

              return (
                <li key={notification.id}>
                  {isOutgoing ? (
                    <OutgoingNotificationItem
                      notification={notification}
                      showDirectionBadge={showDirectionBadge}
                      onSelect={handleSelect}
                    />
                  ) : (
                    <IncomingNotificationItem
                      notification={notification}
                      read={isRead(notification)}
                      onSelect={handleSelect}
                      showDirectionBadge={showDirectionBadge}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="flex h-9 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Показать еще
              </button>
            </div>
          )}
        </>
      )}

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        senderId={userId}
        senderDisplayName={senderDisplayName}
        scope={announcementScope}
        familyId={familyId}
        familyName={familyName}
      />

      <NotificationDetailModal
        open={Boolean(detailNotification)}
        notification={detailNotification}
        onClose={() => setDetailNotification(null)}
        onNavigate={navigate}
      />

      <HintGuideModal
        open={Boolean(activeHintId)}
        hintId={activeHintId || 'welcome'}
        onClose={() => setActiveHintId(null)}
        onComplete={handleHintComplete}
        mode="review"
      />
    </div>
  );
}

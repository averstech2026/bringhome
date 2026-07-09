import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToNotifications,
  subscribeToSentNotifications,
  markNotificationRead,
  isNotificationRead,
} from '../services/notificationsService';

function sortByCreatedAt(items) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

export function useNotifications(userId, { mode = 'incoming' } = {}) {
  const [incomingNotifications, setIncomingNotifications] = useState([]);
  const [outgoingNotifications, setOutgoingNotifications] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [loadingOutgoing, setLoadingOutgoing] = useState(true);

  const needsIncoming = mode === 'incoming' || mode === 'all';
  const needsOutgoing = mode === 'outgoing' || mode === 'all';

  useEffect(() => {
    if (!userId || !needsIncoming) {
      setIncomingNotifications([]);
      setLoadingIncoming(false);
      return undefined;
    }

    setLoadingIncoming(true);
    return subscribeToNotifications(userId, (items) => {
      setIncomingNotifications(items);
      setLoadingIncoming(false);
    });
  }, [userId, needsIncoming]);

  useEffect(() => {
    if (!userId || !needsOutgoing) {
      setOutgoingNotifications([]);
      setLoadingOutgoing(false);
      return undefined;
    }

    setLoadingOutgoing(true);
    return subscribeToSentNotifications(userId, (items) => {
      setOutgoingNotifications(items);
      setLoadingOutgoing(false);
    });
  }, [userId, needsOutgoing]);

  const notifications = useMemo(() => {
    if (mode === 'incoming') return incomingNotifications;
    if (mode === 'outgoing') return outgoingNotifications;

    const byId = new Map();
    for (const item of outgoingNotifications) {
      if (item.senderId === userId) {
        byId.set(item.id, { ...item, direction: 'outgoing' });
      }
    }
    for (const item of incomingNotifications) {
      if (!byId.has(item.id)) {
        byId.set(item.id, { ...item, direction: 'incoming' });
      }
    }
    return sortByCreatedAt([...byId.values()]);
  }, [mode, incomingNotifications, outgoingNotifications, userId]);

  const loading = (needsIncoming && loadingIncoming) || (needsOutgoing && loadingOutgoing);

  const unreadCount = incomingNotifications.filter((n) => !isNotificationRead(n, userId)).length;

  const markRead = (notificationId, notification) =>
    markNotificationRead(notificationId, { userId, notification });

  return {
    notifications,
    unreadCount,
    loading,
    markRead,
    isRead: (notification) => isNotificationRead(notification, userId),
  };
}

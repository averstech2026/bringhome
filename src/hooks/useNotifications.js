import { useEffect, useState } from 'react';
import {
  subscribeToNotifications,
  subscribeToSentNotifications,
  markNotificationRead,
  isNotificationRead,
} from '../services/notificationsService';

export function useNotifications(userId, { mode = 'incoming' } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const subscribe = mode === 'outgoing' ? subscribeToSentNotifications : subscribeToNotifications;

    return subscribe(userId, (items) => {
      setNotifications(items);
      setLoading(false);
    });
  }, [userId, mode]);

  const unreadCount = mode === 'incoming'
    ? notifications.filter((n) => !isNotificationRead(n, userId)).length
    : 0;

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

import { useEffect, useState } from 'react';
import {
  subscribeToNotifications,
  markNotificationRead,
} from '../services/notificationsService';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToNotifications(userId, (items) => {
      setNotifications(items);
      setLoading(false);
    });
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    markRead: markNotificationRead,
  };
}

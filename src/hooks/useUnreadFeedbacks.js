import { useEffect, useState } from 'react';
import { subscribeToUnreadFeedbacks } from '../services/feedbacksService';

export function useUnreadFeedbacks(enabled) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setFeedbacks([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToUnreadFeedbacks((items) => {
      setFeedbacks(items);
      setLoading(false);
    });
  }, [enabled]);

  return {
    unreadFeedbacks: feedbacks,
    unreadCount: feedbacks.length,
    loading,
  };
}

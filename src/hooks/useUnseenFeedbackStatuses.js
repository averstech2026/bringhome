import { useEffect, useState } from 'react';
import { subscribeToUnseenUserFeedbackStatuses } from '../services/feedbacksService';

export function useUnseenFeedbackStatuses(userId, enabled = true) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && userId));

  useEffect(() => {
    if (!enabled || !userId) {
      setFeedbacks([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    return subscribeToUnseenUserFeedbackStatuses(userId, (items) => {
      setFeedbacks(items);
      setLoading(false);
    });
  }, [enabled, userId]);

  return {
    unseenFeedbacks: feedbacks,
    unseenCount: feedbacks.length,
    loading,
  };
}

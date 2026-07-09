export const FEEDBACK_STATUSES = {
  new: {
    value: 'new',
    label: 'Новый',
    badgeClass: 'bg-slate-100 text-slate-600 ring-slate-200/80',
  },
  read: {
    value: 'read',
    label: 'Прочитано',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  },
  noted: {
    value: 'noted',
    label: 'Принято к сведению',
    badgeClass: 'bg-violet-50 text-violet-700 ring-violet-200/80',
  },
  backlog: {
    value: 'backlog',
    label: 'В очереди на разработку',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  },
  completed: {
    value: 'completed',
    label: 'Реализовано',
    badgeClass: 'bg-green-100 text-green-800 ring-green-200/80',
  },
};

export const ADMIN_STATUS_OPTIONS = ['noted', 'backlog', 'completed'];

export function resolveFeedbackStatus(feedback) {
  if (feedback?.status && FEEDBACK_STATUSES[feedback.status]) {
    return feedback.status;
  }
  if (feedback?.isRead === true) {
    return 'read';
  }
  return 'new';
}

export function isFeedbackUnread(feedback) {
  return resolveFeedbackStatus(feedback) === 'new';
}

/** Автор ещё не видел обновление статуса от команды разработки. */
export function isFeedbackStatusUnseen(feedback) {
  return feedback?.statusSeenByAuthor === false;
}

export function getFeedbackStatusMeta(feedback) {
  const status = resolveFeedbackStatus(feedback);
  return FEEDBACK_STATUSES[status] || FEEDBACK_STATUSES.new;
}

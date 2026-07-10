const WEEKDAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function getToday(now = new Date()) {
  return startOfDay(now);
}

export function addDays(date, days) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Ближайшие выходные: суббота текущей или следующей недели. */
export function getNextWeekend(now = new Date()) {
  const day = startOfDay(now);
  const dayOfWeek = day.getDay();

  if (dayOfWeek === 6 || dayOfWeek === 0) return day;

  return addDays(day, 6 - dayOfWeek);
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isToday(date, now = new Date()) {
  return isSameDay(date, now);
}

export function isTomorrow(date, now = new Date()) {
  return isSameDay(date, addDays(now, 1));
}

export function isFutureDay(date, now = new Date()) {
  return startOfDay(date) > startOfDay(now);
}

export function isPastOrToday(date, now = new Date()) {
  return startOfDay(date) <= startOfDay(now);
}

export function parseListScheduledFor(list, now = new Date()) {
  if (!list?.scheduledFor) return null;

  const ts = list.scheduledFor;
  if (typeof ts?.toDate === 'function') return startOfDay(ts.toDate());
  if (ts instanceof Date) return startOfDay(ts);
  if (typeof ts === 'number') return startOfDay(new Date(ts));

  return null;
}

export function getScheduleUrgency(scheduledFor, now = new Date()) {
  if (!scheduledFor) return null;

  if (isPastOrToday(scheduledFor, now)) return 'today';
  if (isTomorrow(scheduledFor, now)) return 'tomorrow';
  return 'future';
}

export function formatScheduleBadgeLabel(scheduledFor, now = new Date()) {
  if (!scheduledFor) return null;

  const urgency = getScheduleUrgency(scheduledFor, now);
  if (urgency === 'today') return '🔥 Сегодня';
  if (urgency === 'tomorrow') return '⚠️ Завтра';

  const day = startOfDay(scheduledFor);
  const today = startOfDay(now);
  const diffDays = Math.round((day - today) / (24 * 60 * 60 * 1000));

  if (diffDays > 0 && diffDays <= 6) {
    return `🗓️ ${WEEKDAYS[day.getDay()]}`;
  }

  return `🗓️ ${day.getDate()} ${MONTHS_GENITIVE[day.getMonth()]}`;
}

export function getScheduleBadgeClasses(urgency) {
  switch (urgency) {
    case 'today':
      return 'bg-emerald-50 text-emerald-700';
    case 'tomorrow':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function getListScheduleBadgeProps(list, now = new Date()) {
  const scheduledFor = parseListScheduledFor(list, now);
  if (!scheduledFor) return null;

  const urgency = getScheduleUrgency(scheduledFor, now);
  const label = formatScheduleBadgeLabel(scheduledFor, now);

  return {
    label,
    className: getScheduleBadgeClasses(urgency),
    urgency,
  };
}

export function shouldShowScheduleBadge(list, now = new Date()) {
  if (!list?.scheduledFor) return false;
  return Boolean(parseListScheduledFor(list, now));
}

export function getListScheduleSortKey(list, now = new Date()) {
  const scheduledFor = parseListScheduledFor(list, now);
  const today = startOfDay(now);

  if (!scheduledFor || scheduledFor <= today) {
    return { group: 0, date: scheduledFor || today };
  }

  return { group: 1, date: scheduledFor };
}

export function sortActiveListsBySchedule(lists, now = new Date()) {
  return [...lists].sort((a, b) => {
    const keyA = getListScheduleSortKey(a, now);
    const keyB = getListScheduleSortKey(b, now);

    if (keyA.group !== keyB.group) return keyA.group - keyB.group;
    if (keyA.date.getTime() !== keyB.date.getTime()) {
      return keyA.date - keyB.date;
    }

    const createdA =
      a.createdAt?.toMillis?.() ??
      a.updatedAt?.toMillis?.() ??
      0;
    const createdB =
      b.createdAt?.toMillis?.() ??
      b.updatedAt?.toMillis?.() ??
      0;

    return createdB - createdA;
  });
}

export function getReminderFireAt(scheduledFor) {
  const fireAt = startOfDay(scheduledFor);
  fireAt.setHours(9, 0, 0, 0);
  return fireAt.getTime();
}

export function formatSchedulePresetLabel(date, now = new Date()) {
  if (isToday(date, now)) return 'Сегодня';
  if (isTomorrow(date, now)) return 'Завтра';

  const weekend = getNextWeekend(now);
  if (isSameDay(date, weekend)) return 'В выходные';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

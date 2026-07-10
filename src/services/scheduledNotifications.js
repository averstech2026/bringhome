import { getReminderFireAt, parseListScheduledFor } from '../utils/listSchedule';

const STORAGE_KEY = 'bringhome_list_reminders';

function readStoredReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredReminders(reminders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

function upsertStoredReminder(reminder) {
  const reminders = readStoredReminders().filter((entry) => entry.listId !== reminder.listId);
  reminders.push(reminder);
  writeStoredReminders(reminders);
}

function removeStoredReminder(listId) {
  writeStoredReminders(readStoredReminders().filter((entry) => entry.listId !== listId));
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.ready;
}

async function postToServiceWorker(message) {
  const registration = await getServiceWorkerRegistration();
  const worker = registration?.active || navigator.serviceWorker.controller;
  if (!worker) return false;
  worker.postMessage(message);
  return true;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function scheduleListReminder({ listId, listTitle, scheduledFor, remindOnDay }) {
  if (!listId) return { ok: false, reason: 'missing_list' };

  if (!remindOnDay || !scheduledFor) {
    await cancelListReminder(listId);
    return { ok: true, scheduled: false };
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }

  const fireAtMs = getReminderFireAt(scheduledFor);
  if (fireAtMs <= Date.now()) {
    await cancelListReminder(listId);
    return { ok: true, scheduled: false, reason: 'past' };
  }

  upsertStoredReminder({ listId, listTitle, fireAtMs });

  const delivered = await postToServiceWorker({
    type: 'SCHEDULE_REMINDER',
    listId,
    title: listTitle,
    fireAtMs,
  });

  return { ok: true, scheduled: true, delivered };
}

export async function cancelListReminder(listId) {
  if (!listId) return;
  removeStoredReminder(listId);
  await postToServiceWorker({ type: 'CANCEL_REMINDER', listId });
}

export async function syncStoredRemindersWithServiceWorker() {
  const reminders = readStoredReminders().filter((entry) => entry.fireAtMs > Date.now());
  writeStoredReminders(reminders);

  if (reminders.length === 0) return;

  await postToServiceWorker({
    type: 'SYNC_REMINDERS',
    reminders,
  });
}

export async function syncListReminderFromDoc(list) {
  if (!list?.id) return;

  if (!list.remindOnDay) {
    await cancelListReminder(list.id);
    return;
  }

  const scheduledFor = parseListScheduledFor(list);
  if (!scheduledFor) {
    await cancelListReminder(list.id);
    return;
  }

  await scheduleListReminder({
    listId: list.id,
    listTitle: list.title,
    scheduledFor,
    remindOnDay: true,
  });
}

export async function syncRemindersForLists(lists, userId) {
  if (!userId || !Array.isArray(lists)) return;

  const ownedWithReminders = lists.filter(
    (list) => list.createdBy === userId && list.remindOnDay,
  );
  const ownedIds = new Set(ownedWithReminders.map((list) => list.id));

  for (const list of ownedWithReminders) {
    await syncListReminderFromDoc(list);
  }

  for (const entry of readStoredReminders()) {
    if (!ownedIds.has(entry.listId)) {
      await cancelListReminder(entry.listId);
    }
  }
}

export function pruneExpiredStoredReminders() {
  const reminders = readStoredReminders().filter((entry) => entry.fireAtMs > Date.now());
  writeStoredReminders(reminders);
}

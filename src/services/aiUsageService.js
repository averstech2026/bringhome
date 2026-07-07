import { doc, getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import {
  buildNextAiUsage,
  checkAiUsageAllowed,
  isUnlimitedAiUser,
  normalizeAiUsage,
} from '../utils/aiLimits';

/** Учёт лимитов через Firestore (Spark / бесплатный план, без Cloud Functions). */

export async function getAiUsageStatus(userId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  if (!snapshot.exists()) {
    return { allowed: false, reason: 'missing_user', limits: null, usage: null };
  }

  const profile = { id: snapshot.id, ...snapshot.data() };
  return { ...checkAiUsageAllowed(profile), profile };
}

export async function recordAiUsage(userId) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error('Пользователь не найден');

    const data = snapshot.data();
    const unlimited = isUnlimitedAiUser(data);

    if (!unlimited) {
      const profile = { ...data, aiUsage: normalizeAiUsage(data.aiUsage) };
      const status = checkAiUsageAllowed(profile);
      if (!status.allowed) {
        throw new Error('Лимит запросов ИИ исчерпан');
      }
    }

    transaction.update(userRef, {
      aiUsage: buildNextAiUsage(data.aiUsage),
    });
  });
}

export async function setUserAiLimits(userId, limits) {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    aiLimits: {
      daily: Math.max(0, Number(limits.daily)),
      weekly: Math.max(0, Number(limits.weekly)),
      monthly: Math.max(0, Number(limits.monthly)),
    },
  });
}

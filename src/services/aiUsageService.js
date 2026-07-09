import { doc, getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { getFamily } from './familiesService';
import {
  buildNextAiUsage,
  buildResetDailyAiUsage,
  checkAiUsageAllowed,
  DEFAULT_AI_LIMITS,
  isUnlimitedAiUser,
  normalizeAiUsage,
} from '../utils/aiLimits';
import { deleteField } from 'firebase/firestore';

/** Учёт лимитов через Firestore (Spark / бесплатный план, без Cloud Functions). */

async function loadFamilyForProfile(profile) {
  const familyId = profile?.familyId || profile?.groupId;
  if (!familyId) return null;
  return getFamily(familyId);
}

export async function getAiUsageStatus(userId) {
  const snapshot = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  if (!snapshot.exists()) {
    return { allowed: false, reason: 'missing_user', limitMonth: null, usage: null };
  }

  const profile = { id: snapshot.id, ...snapshot.data() };
  const family = await loadFamilyForProfile(profile);
  return { ...checkAiUsageAllowed(profile, family), profile, family };
}

export async function recordAiUsage(userId) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error('Пользователь не найден');

    const data = snapshot.data();
    const unlimited = isUnlimitedAiUser(data);

    if (!unlimited) {
      const familyId = data.familyId || data.groupId;
      let family = null;
      if (familyId) {
        const familySnap = await transaction.get(doc(db, COLLECTIONS.FAMILIES, familyId));
        if (familySnap.exists()) {
          family = { id: familySnap.id, ...familySnap.data() };
        }
      }

      const profile = { ...data, aiUsage: normalizeAiUsage(data.aiUsage) };
      const status = checkAiUsageAllowed(profile, family);
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
      daily: Math.max(0, Number(limits.daily ?? DEFAULT_AI_LIMITS.daily)),
      weekly: Math.max(0, Number(limits.weekly ?? DEFAULT_AI_LIMITS.weekly)),
      monthly: Math.max(0, Number(limits.monthly ?? limits.aiLimitMonth ?? DEFAULT_AI_LIMITS.monthly)),
    },
    aiLimitMonth: deleteField(),
  });
}

export async function resetTodayAiUsage(userId) {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    throw new Error('Пользователь не найден');
  }

  const aiUsage = buildResetDailyAiUsage(snapshot.data().aiUsage);
  await updateDoc(userRef, { aiUsage });
  return aiUsage;
}

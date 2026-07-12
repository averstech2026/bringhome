import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'bringhome-rules-test';

const FAMILIES = {
  DENIS: 'denis-family',
  RICHARD: 'richard-family',
};

const USERS = {
  denis: { familyId: FAMILIES.DENIS, role: 'member', disabled: false },
  wife: { familyId: FAMILIES.DENIS, role: 'member', disabled: false },
  daughter: { familyId: FAMILIES.DENIS, role: 'member', disabled: false },
  richard: { familyId: FAMILIES.RICHARD, role: 'member', disabled: false },
};

const LIST_ID = 'denis-grocery-list';

/** Firestore client SDK throws permission-denied (эквивалент HTTP 403). */
async function expectPermissionDenied(promise) {
  await expect(assertFails(promise)).resolves.toBeDefined();
}

function userContext(testEnv, uid) {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@test.local`,
  });
}

function listRef(db) {
  return doc(db, 'lists', LIST_ID);
}

function itemRef(db, itemId = 'milk-item') {
  return doc(collection(db, 'items'), itemId);
}

describe('Multi-tenancy & internal list access (Firestore rules)', () => {
  /** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await setDoc(doc(db, 'config', 'setup'), {
        initialized: true,
        adminUid: '__no_platform_admin__',
      });

      for (const [uid, profile] of Object.entries(USERS)) {
        await setDoc(doc(db, 'users', uid), {
          email: `${uid}@test.local`,
          displayName: uid,
          ...profile,
        });
      }

      await setDoc(listRef(db), {
        title: 'Список семьи Дениса',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isPublic: false,
        allowedUsers: ['denis', 'wife'],
        createdAt: new Date(),
      });

      await setDoc(itemRef(db), {
        listId: LIST_ID,
        name: 'Молоко',
        quantity: 1,
        category: 'dairy',
        checked: false,
        checkedBy: null,
        checkedAt: null,
      });
    });
  });

  describe('1. Tenant isolation — no external sharing', () => {
    it('denies read of another family list (permission-denied / 403)', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await expectPermissionDenied(getDoc(listRef(db)));
    });

    it('denies read of items in another family list', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await expectPermissionDenied(getDoc(itemRef(db)));
    });

    it('denies update of another family list', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await expectPermissionDenied(
        updateDoc(listRef(db), { title: 'Взломанный список' }),
      );
    });

    it('denies creating items in another family list', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await expectPermissionDenied(
        setDoc(doc(collection(db, 'items'), 'intruder-item'), {
          listId: LIST_ID,
          name: 'Хлеб',
          quantity: 1,
          category: 'bakery',
          checked: false,
          checkedBy: null,
          checkedAt: null,
        }),
      );
    });

    it('allows owner from the same family to read and write', async () => {
      const db = userContext(testEnv, 'denis').firestore();
      await assertSucceeds(getDoc(listRef(db)));
      await assertSucceeds(updateDoc(listRef(db), { title: 'Обновлённый список' }));
    });
  });

  describe('2. Internal privacy (restricted / lock icon)', () => {
    it('hides restricted list from same-family member not in allowedUsers', async () => {
      const db = userContext(testEnv, 'daughter').firestore();
      await expectPermissionDenied(getDoc(listRef(db)));
    });

    it('hides items of restricted list from excluded family member', async () => {
      const db = userContext(testEnv, 'daughter').firestore();
      await expectPermissionDenied(getDoc(itemRef(db)));
    });

    it('denies daughter from mutating a restricted list she cannot read', async () => {
      const db = userContext(testEnv, 'daughter').firestore();
      await expectPermissionDenied(
        updateDoc(listRef(db), { viewedBy: { daughter: true } }),
      );
    });

    it('allows explicitly allowed family member (wife) to read', async () => {
      const db = userContext(testEnv, 'wife').firestore();
      await assertSucceeds(getDoc(listRef(db)));
    });

    it('allows list owner (denis) to read restricted list', async () => {
      const db = userContext(testEnv, 'denis').firestore();
      await assertSucceeds(getDoc(listRef(db)));
    });
  });

  describe('3. External sharing with a specific tenant', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await updateDoc(listRef(db), {
          sharedWithFamilyIds: [FAMILIES.RICHARD],
          externalFamilies: {
            [FAMILIES.RICHARD]: {
              familyName: 'Семья Ричарда',
              joinedAt: new Date(),
              joinedBy: 'richard',
            },
          },
        });
      });
    });

    it('opens read access for guest tenant member (richard)', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      const snapshot = await assertSucceeds(getDoc(listRef(db)));
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data().familyId).toBe(FAMILIES.DENIS);
    });

    it('allows guest tenant to read items in shared list', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await assertSucceeds(getDoc(itemRef(db)));
    });

    it('denies guest tenant from mutating list metadata (read-only share)', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await expectPermissionDenied(
        updateDoc(listRef(db), { title: 'Переименовано гостем' }),
      );
    });

    it('allows guest tenant to add items (canAccessList follows read rules)', async () => {
      const db = userContext(testEnv, 'richard').firestore();
      await assertSucceeds(
        setDoc(doc(collection(db, 'items'), 'guest-bread'), {
          listId: LIST_ID,
          name: 'Хлеб',
          quantity: 2,
          category: 'bakery',
          checked: false,
          checkedBy: null,
          checkedAt: null,
        }),
      );
    });

    it('still hides restricted list from non-guest external tenant', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'stranger'), {
          email: 'stranger@test.local',
          familyId: 'other-family',
          role: 'member',
          disabled: false,
        });
      });

      const db = userContext(testEnv, 'stranger').firestore();
      await expectPermissionDenied(getDoc(listRef(db)));
    });

    it('still hides restricted list from excluded same-family member (daughter)', async () => {
      const db = userContext(testEnv, 'daughter').firestore();
      await expectPermissionDenied(getDoc(listRef(db)));
    });
  });
});

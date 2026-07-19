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
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
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

describe('Packing lists (packing_lists) — family scope', () => {
  /** @type {import('@firebase/rules-unit-testing').RulesTestEnvironment} */
  let testEnv;
  const PACKING_ID = 'denis-packing-trip';

  function packingRef(db) {
    return doc(db, 'packing_lists', PACKING_ID);
  }

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: `${PROJECT_ID}-packing`,
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

      await setDoc(packingRef(db), {
        title: 'Сочи',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        items: [
          {
            id: 'passport',
            name: 'Паспорт',
            scope: 'common',
            type: 'item',
            assignedTo: 'denis',
            checked: false,
            statusMap: {},
          },
        ],
        createdAt: new Date(),
      });
    });
  });

  it('allows same-family member to read packing list', async () => {
    const db = userContext(testEnv, 'wife').firestore();
    await assertSucceeds(getDoc(packingRef(db)));
  });

  it('allows same-family member to update personal statusMap', async () => {
    const db = userContext(testEnv, 'wife').firestore();
    await assertSucceeds(
      updateDoc(packingRef(db), {
        items: [
          {
            id: 'passport',
            name: 'Паспорт',
            scope: 'personal',
            type: 'item',
            assignedTo: null,
            checked: false,
            statusMap: { wife: true },
          },
        ],
      }),
    );
  });

  it('denies other tenant from reading packing list', async () => {
    const db = userContext(testEnv, 'richard').firestore();
    await expectPermissionDenied(getDoc(packingRef(db)));
  });

  it('denies other tenant from updating packing list', async () => {
    const db = userContext(testEnv, 'richard').firestore();
    await expectPermissionDenied(
      updateDoc(packingRef(db), { title: 'Взлом' }),
    );
  });

  it('allows owner to delete packing list', async () => {
    const db = userContext(testEnv, 'denis').firestore();
    await assertSucceeds(deleteDoc(packingRef(db)));
  });

  it('denies non-owner family member from deleting packing list', async () => {
    const db = userContext(testEnv, 'wife').firestore();
    await expectPermissionDenied(deleteDoc(packingRef(db)));
  });

  it('denies family member not in members when list is private', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(packingRef(context.firestore()), {
        title: 'Секретная поездка',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: false,
        members: ['denis'],
        items: [],
        createdAt: new Date(),
      });
    });

    const db = userContext(testEnv, 'wife').firestore();
    await expectPermissionDenied(getDoc(packingRef(db)));
  });

  it('allows family member listed in members to read private packing list', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(packingRef(context.firestore()), {
        title: 'Вдвоём',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: false,
        members: ['denis', 'wife'],
        items: [],
        createdAt: new Date(),
      });
    });

    const db = userContext(testEnv, 'wife').firestore();
    await assertSucceeds(getDoc(packingRef(db)));
  });

  it('allows external user in members to read packing list', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(packingRef(context.firestore()), {
        title: 'Совместный выезд',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: false,
        members: ['denis', 'richard'],
        items: [],
        createdAt: new Date(),
      });
    });

    const db = userContext(testEnv, 'richard').firestore();
    await assertSucceeds(getDoc(packingRef(db)));
  });

  it('allows guest family via sharedWithFamilyIds to read packing list', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(packingRef(context.firestore()), {
        title: 'Общий выезд семей',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: true,
        members: ['denis', 'wife'],
        sharedWithFamilyIds: [FAMILIES.RICHARD],
        items: [],
        createdAt: new Date(),
      });
    });

    const db = userContext(testEnv, 'richard').firestore();
    await assertSucceeds(getDoc(packingRef(db)));
  });

  it('denies familyId-only query when private packing list exists (yellow zone)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'packing_lists', 'public-trip'), {
        title: 'Публичная',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: true,
        members: ['denis', 'wife', 'daughter'],
        items: [],
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'packing_lists', 'private-trip'), {
        title: 'Секретная',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: false,
        members: ['denis'],
        items: [],
        createdAt: new Date(),
      });
    });

    const db = userContext(testEnv, 'wife').firestore();
    await expectPermissionDenied(
      getDocs(query(collection(db, 'packing_lists'), where('familyId', '==', FAMILIES.DENIS))),
    );
  });

  it('allows query-safe packing list queries for non-admin family member', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'packing_lists', 'public-trip'), {
        title: 'Публичная',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: true,
        members: ['denis', 'wife', 'daughter'],
        items: [],
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'packing_lists', 'private-trip'), {
        title: 'Секретная',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: false,
        members: ['denis'],
        items: [],
        createdAt: new Date(),
      });
      await setDoc(doc(db, 'packing_lists', 'shared-with-wife'), {
        title: 'С женой',
        familyId: FAMILIES.DENIS,
        createdBy: 'denis',
        isTemplate: false,
        isPublic: false,
        members: ['denis', 'wife'],
        items: [],
        createdAt: new Date(),
      });
    });

    const db = userContext(testEnv, 'wife').firestore();
    const publicSnap = await assertSucceeds(
      getDocs(query(
        collection(db, 'packing_lists'),
        where('familyId', '==', FAMILIES.DENIS),
        where('isPublic', '==', true),
      )),
    );
    const memberSnap = await assertSucceeds(
      getDocs(query(
        collection(db, 'packing_lists'),
        where('members', 'array-contains', 'wife'),
      )),
    );

    expect(publicSnap.docs.map((d) => d.id)).toEqual(['public-trip']);
    expect(memberSnap.docs.map((d) => d.id).sort()).toEqual(['public-trip', 'shared-with-wife']);
  });
});

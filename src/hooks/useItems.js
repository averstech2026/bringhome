import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export function useItems(listId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listId || listId === 'new') {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, COLLECTIONS.ITEMS),
      where('listId', '==', listId),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        next.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'ru'));
        setItems(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [listId]);

  return { items, loading, error };
}

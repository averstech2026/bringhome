import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export function useList(listId) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!listId || listId === 'new') {
      setList(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.LISTS, listId),
      (snapshot) => {
        if (snapshot.exists()) {
          setList({ id: snapshot.id, ...snapshot.data() });
          setError(null);
        } else {
          setList(null);
          setError('Список не найден');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [listId]);

  return { list, loading, error };
}

import { useEffect, useState } from 'react';
import { ensureDictionaryLoaded } from '../services/customProductsDictionaryService';

export function useCustomProductsDictionary() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ensureDictionaryLoaded()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready };
}

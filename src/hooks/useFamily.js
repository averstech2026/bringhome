import { useCallback, useEffect, useState } from 'react';
import { getFamily } from '../services/familiesService';

export function useFamily(familyId) {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(Boolean(familyId));
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!familyId) {
      setFamily(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    getFamily(familyId)
      .then((data) => {
        if (active) setFamily(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [familyId, reloadKey]);

  const familyName = family?.name?.trim() || null;

  return { family, familyName, loading, reload };
}

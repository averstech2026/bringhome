import { useEffect, useState, useCallback } from 'react';
import { getUserProfile } from '../services/usersService';

export function useUserProfile(user) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    getUserProfile(user.uid)
      .then((data) => {
        if (active) setProfile(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, reloadKey]);

  return {
    profile,
    loading,
    reload,
    isAdmin: profile?.role === 'admin' && !profile?.disabled,
    isDisabled: profile?.disabled === true,
  };
}

import { useEffect, useState, useCallback } from 'react';
import { getUserProfile, isOwnerEmail, getPlatformAdminUid } from '../services/usersService';
import {
  isSuperAdmin,
  isFamilyAdmin,
  isAnyAdmin,
  isPlatformAdmin,
  normalizeRole,
} from '../utils/roles';
import { getFamilyId } from '../utils/familyGroup';

export function useUserProfile(user) {
  const [profile, setProfile] = useState(null);
  const [platformAdminUid, setPlatformAdminUid] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    getPlatformAdminUid().then((uid) => {
      if (active) setPlatformAdminUid(uid);
    });
    return () => {
      active = false;
    };
  }, []);

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
    platformAdminUid,
    familyId: profile ? getFamilyId(profile) : null,
    role: profile ? normalizeRole(profile.role) : null,
    isSuperAdmin: isSuperAdmin(profile, platformAdminUid),
    isFamilyAdmin: isFamilyAdmin(profile, platformAdminUid),
    isAnyAdmin: isAnyAdmin(profile, platformAdminUid),
    /** @deprecated используйте isSuperAdmin или isAnyAdmin */
    isAdmin: isPlatformAdmin(profile, platformAdminUid),
    isOwner: profile ? isOwnerEmail(profile.email) : false,
    isDisabled: profile?.disabled === true,
  };
}

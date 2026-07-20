import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAppSettings, setAppSetting } from '../utils/appSettings';
import { HOME_DESKTOP, normalizeHomeDesktop, resolveDefaultHomeDesktop } from '../utils/homeDesktops';
import { updateOwnDefaultHomeDesktop } from '../services/usersService';

function buildSettings(profile, userId) {
  const local = getAppSettings();
  return {
    ...local,
    defaultHomeDesktop: resolveDefaultHomeDesktop(profile, userId),
  };
}

export function useAppSettings({ user, profile } = {}) {
  const userId = user?.uid;
  const [localRevision, setLocalRevision] = useState(0);
  const [desktopOverride, setDesktopOverride] = useState(null);

  const settings = useMemo(
    () => ({
      ...buildSettings(profile, userId),
      defaultHomeDesktop: desktopOverride ?? resolveDefaultHomeDesktop(profile, userId),
    }),
    [profile, userId, localRevision, desktopOverride],
  );

  useEffect(() => {
    if (desktopOverride == null || profile?.defaultHomeDesktop == null) return;
    if (normalizeHomeDesktop(profile.defaultHomeDesktop) === desktopOverride) {
      setDesktopOverride(null);
    }
  }, [profile?.defaultHomeDesktop, desktopOverride]);

  useEffect(() => {
    const sync = () => setLocalRevision((revision) => revision + 1);
    window.addEventListener('app-settings-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('app-settings-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!userId || !profile || profile.defaultHomeDesktop != null) return;

    const legacy = normalizeHomeDesktop(getAppSettings().defaultHomeDesktop);
    if (legacy === HOME_DESKTOP.TRAVEL) {
      updateOwnDefaultHomeDesktop(userId, legacy).catch(() => {});
    }
  }, [userId, profile?.id, profile?.defaultHomeDesktop]);

  const updateSetting = useCallback(async (key, value) => {
    if (key === 'defaultHomeDesktop') {
      const normalized = normalizeHomeDesktop(value);
      const previousOverride = desktopOverride;
      setDesktopOverride(normalized);
      setAppSetting('defaultHomeDesktop', normalized);
      try {
        if (userId) {
          await updateOwnDefaultHomeDesktop(userId, normalized);
        }
        setLocalRevision((revision) => revision + 1);
      } catch (err) {
        setDesktopOverride(previousOverride);
        throw err;
      }
      return;
    }

    setAppSetting(key, value);
    setLocalRevision((revision) => revision + 1);
  }, [userId, desktopOverride]);

  return { settings, updateSetting };
}

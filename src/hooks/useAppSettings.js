import { useCallback, useEffect, useState } from 'react';
import { getAppSettings, setAppSetting } from '../utils/appSettings';

export function useAppSettings() {
  const [settings, setSettings] = useState(getAppSettings);

  useEffect(() => {
    const sync = () => setSettings(getAppSettings());
    window.addEventListener('app-settings-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('app-settings-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings(setAppSetting(key, value));
  }, []);

  return { settings, updateSetting };
}

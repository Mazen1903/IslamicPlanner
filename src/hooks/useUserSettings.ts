import { useState, useCallback, useEffect } from 'react';
import {
  userSettingsRepository,
  UserSettingsRepository,
  type UserSettingsRow,
  type UserSettingsPatch,
} from '@/data/repositories/UserSettingsRepository';

export interface UseUserSettingsResult {
  settings: UserSettingsRow | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateSettings?: (patch: UserSettingsPatch) => Promise<UserSettingsRow>;
}

export function useUserSettings(
  repo: UserSettingsRepository = userSettingsRepository
): UseUserSettingsResult {
  const [settings, setSettings] = useState<UserSettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repo.get();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load user settings');
    } finally {
      setIsLoading(false);
    }
  }, [repo]);

  const updateSettings = useCallback(
    async (patch: UserSettingsPatch): Promise<UserSettingsRow> => {
      const updated = await repo.upsert(patch);
      setSettings(updated);
      return updated;
    },
    [repo]
  );

  useEffect(() => {
    let active = true;
    repo
      .get()
      .then(data => {
        if (active) {
          setSettings(data);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (active) {
          setError(err?.message ?? 'Failed to load user settings');
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [repo]);

  return {
    settings,
    isLoading,
    error,
    reload: loadSettings,
    updateSettings,
  };
}

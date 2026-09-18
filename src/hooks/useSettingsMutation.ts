import { useState, useCallback } from 'react';
import {
  settingsMutationCoordinator,
  SettingsMutationCoordinator,
  type MutationCategory,
  type SettingsMutationResult,
} from '@/services/SettingsMutationCoordinator';
import type { UserSettingsPatch } from '@/data/repositories/UserSettingsRepository';

export interface UseSettingsMutationResult {
  isSaving: boolean;
  error: string | null;
  lastResult: SettingsMutationResult | null;
  applyTemporalSettings: (patch: UserSettingsPatch) => Promise<SettingsMutationResult>;
  applyPresentationSettings: (patch: UserSettingsPatch) => Promise<SettingsMutationResult>;
  setHijriGlobalAdjustment: (days: number) => Promise<SettingsMutationResult>;
  upsertHijriMonthOverride: (
    year: number,
    month: number,
    days: number
  ) => Promise<SettingsMutationResult>;
  deleteHijriMonthOverride: (year: number, month: number) => Promise<SettingsMutationResult>;
  applySettingsChange: (
    patch: UserSettingsPatch,
    category: MutationCategory
  ) => Promise<SettingsMutationResult>;
}

export function useSettingsMutation(
  coordinator: SettingsMutationCoordinator = settingsMutationCoordinator
): UseSettingsMutationResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SettingsMutationResult | null>(null);

  const handleResult = useCallback((result: SettingsMutationResult): SettingsMutationResult => {
    setLastResult(result);
    if (result.status === 'FAILED') {
      setError(result.error);
    } else if (result.status === 'PERSISTED_REFRESH_FAILED') {
      setError(result.error);
    } else {
      setError(null);
    }
    return result;
  }, []);

  const applyTemporalSettings = useCallback(
    async (patch: UserSettingsPatch) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await coordinator.applyTemporalSettings(patch);
        return handleResult(res);
      } finally {
        setIsSaving(false);
      }
    },
    [coordinator, handleResult]
  );

  const applyPresentationSettings = useCallback(
    async (patch: UserSettingsPatch) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await coordinator.applyPresentationSettings(patch);
        return handleResult(res);
      } finally {
        setIsSaving(false);
      }
    },
    [coordinator, handleResult]
  );

  const setHijriGlobalAdjustment = useCallback(
    async (days: number) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await coordinator.setHijriGlobalAdjustment(days);
        return handleResult(res);
      } finally {
        setIsSaving(false);
      }
    },
    [coordinator, handleResult]
  );

  const upsertHijriMonthOverride = useCallback(
    async (year: number, month: number, days: number) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await coordinator.upsertHijriMonthOverride(year, month, days);
        return handleResult(res);
      } finally {
        setIsSaving(false);
      }
    },
    [coordinator, handleResult]
  );

  const deleteHijriMonthOverride = useCallback(
    async (year: number, month: number) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await coordinator.deleteHijriMonthOverride(year, month);
        return handleResult(res);
      } finally {
        setIsSaving(false);
      }
    },
    [coordinator, handleResult]
  );

  const applySettingsChange = useCallback(
    async (patch: UserSettingsPatch, category: MutationCategory) => {
      setIsSaving(true);
      setError(null);
      try {
        const res = await coordinator.applySettingsChange(patch, category);
        return handleResult(res);
      } finally {
        setIsSaving(false);
      }
    },
    [coordinator, handleResult]
  );

  return {
    isSaving,
    error,
    lastResult,
    applyTemporalSettings,
    applyPresentationSettings,
    setHijriGlobalAdjustment,
    upsertHijriMonthOverride,
    deleteHijriMonthOverride,
    applySettingsChange,
  };
}

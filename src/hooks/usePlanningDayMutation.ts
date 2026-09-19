import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PlanningDayMutationCoordinator,
  planningDayMutationCoordinator,
  type PlanningDayMutationResult,
} from '@/services/PlanningDayMutationCoordinator';

export interface UsePlanningDayMutationResult {
  isSaving: boolean;
  error: string | null;
  setPlanningDayStart(value: string): Promise<PlanningDayMutationResult>;
}

export function usePlanningDayMutation(
  coordinator: PlanningDayMutationCoordinator = planningDayMutationCoordinator
): UsePlanningDayMutationResult {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setPlanningDayStart = useCallback(
    async (value: string): Promise<PlanningDayMutationResult> => {
      setIsSaving(true);
      setError(null);
      try {
        const result = await coordinator.setPlanningDayStart(value);
        if (!isMountedRef.current) return result;

        if (result.status === 'FAILED') {
          setError(result.error);
        } else if (result.status === 'PERSISTED_REFRESH_FAILED') {
          setError(result.error);
        }
        return result;
      } catch (err: any) {
        const errMsg = err?.message ?? 'Failed to update planning day start';
        if (isMountedRef.current) {
          setError(errMsg);
        }
        return {
          status: 'FAILED',
          stage: 'PERSISTENCE',
          reason: 'PERSISTENCE_FAILED',
          error: errMsg,
        };
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
      }
    },
    [coordinator]
  );

  return {
    isSaving,
    error,
    setPlanningDayStart,
  };
}

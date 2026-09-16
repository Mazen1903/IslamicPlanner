import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { DateTime } from 'luxon';
import { TaskFormScreen } from '@/components/task-form/TaskFormScreen';
import { useToday } from '@/hooks/useToday';
import { useTodayStore } from '@/stores/useTodayStore';
import type { Prayer } from '@/constants/prayers';

export default function TaskAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ prayer?: string; date?: string }>();
  const { refresh } = useToday();
  const viewModel = useTodayStore(s => s.viewModel);

  const civilToday = DateTime.now().toFormat('yyyy-MM-dd');
  const planningDayKey = viewModel?.planningDayKey ?? civilToday;

  const initialPrayerTab = params.prayer ? (params.prayer.toUpperCase() as Prayer) : undefined;
  const initialCivilSeedDate = params.date || civilToday;

  const handleSuccess = async () => {
    await refresh();
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <TaskFormScreen
      initialCivilSeedDate={initialCivilSeedDate}
      initialPlanningDayDate={planningDayKey}
      initialPrayerTab={initialPrayerTab}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}

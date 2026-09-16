import React from 'react';
import { useRouter } from 'expo-router';
import { DateTime } from 'luxon';
import { TaskFormScreen } from '@/components/task-form/TaskFormScreen';
import { useToday } from '@/hooks/useToday';
import { useTodayStore } from '@/stores/useTodayStore';

export default function TabAddScreen() {
  const router = useRouter();
  const { refresh } = useToday();
  const viewModel = useTodayStore(s => s.viewModel);

  const civilToday = DateTime.now().toFormat('yyyy-MM-dd');
  const planningDayKey = viewModel?.planningDayKey ?? civilToday;

  const handleSuccess = async () => {
    await refresh();
    router.replace('/(tabs)/today');
  };

  const handleCancel = () => {
    router.replace('/(tabs)/today');
  };

  return (
    <TaskFormScreen
      initialCivilSeedDate={civilToday}
      initialPlanningDayDate={planningDayKey}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}

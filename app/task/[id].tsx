import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TaskFormScreen } from '@/components/task-form/TaskFormScreen';
import { useToday } from '@/hooks/useToday';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';

export default function TaskEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const { refresh } = useToday();

  const [loading, setLoading] = useState(true);
  const [definition, setDefinition] = useState<TaskDefinition | null>(null);
  const [occurrence, setOccurrence] = useState<TaskOccurrence | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTask() {
      if (!id) {
        setError('No task ID specified');
        setLoading(false);
        return;
      }
      try {
        // Try occurrence lookup first
        const occ = await taskOccurrenceRepository.findById(id);
        if (occ) {
          const def = await taskDefinitionRepository.findById(occ.taskDefinitionId);
          if (isMounted) {
            setOccurrence(occ);
            setDefinition(def);
            setLoading(false);
          }
          return;
        }

        // Try direct definition lookup
        const def = await taskDefinitionRepository.findById(id);
        if (def && isMounted) {
          setDefinition(def);
          setLoading(false);
          return;
        }

        if (isMounted) {
          setError('Task not found');
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load task');
          setLoading(false);
        }
      }
    }
    loadTask();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !definition) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Text style={[typography.headlineMedium, { color: colors.danger, marginBottom: spacing.sm }]}>
          Unable to edit task
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>
          {error ?? 'Task could not be found.'}
        </Text>
      </SafeAreaView>
    );
  }

  const handleSuccess = async () => {
    await refresh();
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <TaskFormScreen
      initialDefinition={definition}
      initialOccurrence={occurrence ?? undefined}
      initialCivilSeedDate={occurrence?.localDate ?? definition.startDate}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

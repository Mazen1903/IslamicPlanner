import React, { useEffect, useState } from 'react';
import { Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TaskFormScreen } from '@/components/task-form/TaskFormScreen';
import { TaskDetailScreen } from '@/components/task-detail/TaskDetailScreen';
import { useToday } from '@/hooks/useToday';
import { taskOccurrenceRepository } from '@/data/repositories/TaskOccurrenceRepository';
import { taskDefinitionRepository } from '@/data/repositories/TaskDefinitionRepository';
import { taskEngine } from '@/domain/task/TaskEngine';
import { generateUuid } from '@/utils/uuid';
import type { TaskDefinition, TaskOccurrence } from '@/domain/task/types';

export default function TaskEditScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { colors, typography, spacing } = useTheme();
  const { refresh, toggleSubtask } = useToday();

  const [loading, setLoading] = useState(true);
  const [definition, setDefinition] = useState<TaskDefinition | null>(null);
  const [occurrence, setOccurrence] = useState<TaskOccurrence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditingFull, setIsEditingFull] = useState(mode === 'full');

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
    if (mode === 'full') {
      router.back();
      return;
    }
    // Reload definition and occurrence
    const updatedDef = await taskDefinitionRepository.findById(definition.id);
    if (updatedDef) setDefinition(updatedDef);
    if (occurrence) {
      const updatedOcc = await taskOccurrenceRepository.findById(occurrence.id);
      if (updatedOcc) setOccurrence(updatedOcc);
    }
    setIsEditingFull(false);
  };

  const handleToggleSubtask = async (occId: string, subtaskId: string) => {
    await toggleSubtask(occId, subtaskId);
    const updatedOcc = await taskOccurrenceRepository.findById(occId);
    if (updatedOcc) setOccurrence(updatedOcc);
  };

  const handleAddSubtask = async (title: string) => {
    const newSubtask = { id: generateUuid(), title };
    const updatedSubtasks = [...(definition.subtasks ?? []), newSubtask];
    await taskDefinitionRepository.update(definition.id, { subtasks: updatedSubtasks });
    setDefinition(prev => prev ? { ...prev, subtasks: updatedSubtasks } : null);
    await refresh();
  };

  const handleUpdateSubtask = async (subtaskId: string, newTitle: string) => {
    const updatedSubtasks = (definition.subtasks ?? []).map(s =>
      s.id === subtaskId ? { ...s, title: newTitle } : s
    );
    await taskDefinitionRepository.update(definition.id, { subtasks: updatedSubtasks });
    setDefinition(prev => prev ? { ...prev, subtasks: updatedSubtasks } : null);
    await refresh();
  };

  const handleReorderSubtasks = async (reordered: any[]) => {
    await taskDefinitionRepository.update(definition.id, { subtasks: reordered });
    setDefinition(prev => prev ? { ...prev, subtasks: reordered } : null);
    await refresh();
  };

  const handleUpdateNotes = async (newNotes: string) => {
    if (occurrence) {
      await taskEngine.updateOccurrenceOverride(occurrence.id, {
        ...(occurrence.overrideData ?? {}),
        notes: newNotes,
      });
      const updatedOcc = await taskOccurrenceRepository.findById(occurrence.id);
      if (updatedOcc) setOccurrence(updatedOcc);
    } else {
      await taskDefinitionRepository.update(definition.id, { notes: newNotes });
      setDefinition(prev => prev ? { ...prev, notes: newNotes } : null);
    }
    await refresh();
  };

  const handleDelete = async (scope: 'THIS_OCCURRENCE' | 'ALL_OCCURRENCES' = 'ALL_OCCURRENCES') => {
    try {
      await taskEngine.deleteTask({
        occurrenceId: occurrence?.id,
        definitionId: definition.id,
        scope,
      });
      await refresh();
      router.back();
    } catch (err: any) {
      console.warn('Delete error:', err);
      Alert.alert("Couldn't delete task", 'Please try again.');
    }
  };

  if (isEditingFull) {
    return (
      <TaskFormScreen
        initialDefinition={definition}
        initialOccurrence={occurrence ?? undefined}
        initialCivilSeedDate={occurrence?.localDate ?? definition.startDate}
        onSuccess={handleSuccess}
        onCancel={() => {
          if (mode === 'full') {
            router.back();
          } else {
            setIsEditingFull(false);
          }
        }}
      />
    );
  }

  return (
    <TaskDetailScreen
      definition={definition}
      occurrence={occurrence}
      onEditFull={() => setIsEditingFull(true)}
      onDelete={handleDelete}
      onBack={() => router.back()}
      onToggleSubtask={handleToggleSubtask}
      onAddSubtask={handleAddSubtask}
      onUpdateSubtask={handleUpdateSubtask}
      onReorderSubtasks={handleReorderSubtasks}
      onUpdateNotes={handleUpdateNotes}
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

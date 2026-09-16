import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { TaskCardViewModel } from '@/services/types';
import { TaskCard } from './TaskCard';

export interface MissedTaskRowProps {
  task: TaskCardViewModel;
}

export function MissedTaskRow({ task }: MissedTaskRowProps) {
  return (
    <View style={styles.container} testID={`missed-task-${task.occurrenceId}`}>
      <TaskCard task={task} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    opacity: 0.85,
  },
});

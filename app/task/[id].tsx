import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TaskDetailScreen() {
  return (
    <View style={styles.container}>
      <Text>Task Detail Placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text>Add Task Placeholder</Text>
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

import { View, Text, StyleSheet } from 'react-native';

export default function Screen() {
  return (
    <View style={styles.container}>
      <Text>Placeholder</Text>
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

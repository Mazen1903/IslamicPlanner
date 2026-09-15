import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface SafeAreaProps {
  children: React.ReactNode;
  edges?: readonly Edge[];
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SafeArea({
  children,
  edges = ['top', 'left', 'right'],
  backgroundColor,
  style,
  testID,
}: SafeAreaProps) {
  const theme = useTheme();

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={[
        styles.container,
        { backgroundColor: backgroundColor ?? theme.colors.background },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
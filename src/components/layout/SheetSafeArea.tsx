import React, { useContext } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';

export interface SheetSafeAreaProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  minBottomPadding?: number;
  testID?: string;
}

/**
 * Ensures modal bottom sheets and overlays pad above the system navigation bar
 * on Android edge-to-edge and iOS home indicator, preventing content from bleeding under it,
 * while painting the background color behind the transparent bar.
 */
export function SheetSafeArea({
  children,
  style,
  backgroundColor,
  minBottomPadding = 16,
  testID,
}: SheetSafeAreaProps) {
  const insets = useContext(SafeAreaInsetsContext);
  const bottomInset = insets?.bottom ?? initialWindowMetrics?.insets?.bottom ?? 0;
  const paddingBottom = Math.max(bottomInset, minBottomPadding);

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        backgroundColor ? { backgroundColor } : null,
        { paddingBottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});


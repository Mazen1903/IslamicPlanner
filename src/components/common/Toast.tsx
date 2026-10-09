import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useTheme } from '@/theme';
import { useToastStore } from '@/stores/useToastStore';

export function Toast() {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  const currentToast = useToastStore(s => s.currentToast);
  const performAction = useToastStore(s => s.performAction);
  const hideToast = useToastStore(s => s.hideToast);

  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentToast) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 30,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentToast, translateY, opacity]);

  if (!currentToast) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        shadows.elevated,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          borderRadius: radii.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      testID="app-toast"
      pointerEvents="box-none"
    >
      <View style={styles.contentRow}>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.textPrimary, flex: 1, marginEnd: spacing.sm, fontWeight: '500' },
          ]}
          numberOfLines={2}
          testID="app-toast-message"
        >
          {currentToast.message}
        </Text>

        {currentToast.action && (
          <Pressable
            onPress={performAction}
            accessibilityRole="button"
            accessibilityLabel={currentToast.action.label}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.primaryLight,
                borderRadius: radii.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
              },
            ]}
            testID="app-toast-action-btn"
          >
            <Text style={[typography.labelMedium, { color: colors.primaryDark, fontWeight: '700' }]}>
              {currentToast.action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 84,
    left: 16,
    right: 16,
    borderWidth: 1,
    zIndex: 99999,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

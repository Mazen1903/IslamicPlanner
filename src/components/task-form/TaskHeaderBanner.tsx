import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';

interface TaskHeaderBannerProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  backTestID?: string;
}

export function TaskHeaderBanner({
  title,
  subtitle,
  onBack,
  backTestID = 'task-form-back-button',
}: TaskHeaderBannerProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left: Back button, Title & Subtitle */}
        <View style={styles.leftColumn}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID={backTestID}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-left" size={24} color={colors.primary} directional />
          </Pressable>

          <Text style={[typography.headlineLarge, styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>

          <Text style={[typography.bodyMedium, styles.subtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>

        {/* Right: Mosque skyline illustration */}
        <View
          style={styles.artworkContainer}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        >
          <Image
            source={require('../../../assets/task_header_art.png')}
            style={styles.headerArt}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 8,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  title: {
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  artworkContainer: {
    width: 140,
    height: 105,
    overflow: 'hidden',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  headerArt: {
    width: 155,
    height: 110,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/theme';

export interface SettingsQuoteCardProps {
  quote?: string;
  citation?: string;
  testID?: string;
}

export function SettingsQuoteCard({
  quote = '“And whoever relies upon Allah then He is sufficient for him.”',
  citation = 'Surah At-Talaq (65:3)',
  testID = 'settings-quote-card',
}: SettingsQuoteCardProps) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: colors.primaryLight,
          borderColor: colors.border,
          borderRadius: radii.card,
          padding: spacing.md,
          marginTop: spacing.sm,
          marginBottom: spacing.md,
        },
        shadows.card,
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[typography.bodyMedium, styles.quoteText, { color: colors.primaryDark }]}>
          {quote}
        </Text>
        <Text style={[typography.caption, styles.citationText, { color: colors.primary }]}>
          {citation}
        </Text>
      </View>
      <View style={styles.imageCol}>
        <Image
          source={require('../../../assets/illustrations/settings_leaf_art.png')}
          style={styles.leafArt}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Green leaf botanical illustration"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  textCol: {
    flex: 1,
    paddingRight: 12,
  },
  quoteText: {
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 20,
  },
  citationText: {
    marginTop: 6,
    fontWeight: '600',
  },
  imageCol: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafArt: {
    width: 55,
    height: 55,
  },
});

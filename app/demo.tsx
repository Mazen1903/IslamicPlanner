import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Icon, type IconName } from '@/components/common/Icon';
import { Toggle } from '@/components/common/Toggle';
import { SafeArea } from '@/components/layout/SafeArea';
import { useTheme, type ThemeMode } from '@/theme';

export default function DesignSystemDemoScreen() {
  const theme = useTheme();
  const [toggleVal1, setToggleVal1] = useState(false);
  const [toggleVal2, setToggleVal2] = useState(true);
  const [cardPressCount, setCardPressCount] = useState(0);

  const icons: IconName[] = [
    'prayer',
    'calendar',
    'clock',
    'bell',
    'location',
    'check',
    'plus',
    'settings',
    'moon',
    'sun',
    'alert',
    'info',
    'trash',
    'user',
    'star',
  ];

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={[styles.container, { padding: theme.spacing.lg }]}>
        <Text style={[theme.typography.displayMedium, { color: theme.colors.textPrimary }]}>
          Design System & Tokens
        </Text>
        <Text style={[theme.typography.bodyMedium, { color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }]}>
          M1 Component & Token Verification Demo
        </Text>

        {/* Section: Theme Controls */}
        <Card variant="elevated" style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.sm }]}>
            Theme Mode (Active: {theme.themeMode} - {theme.isDark ? 'Dark' : 'Light'})
          </Text>
          <View style={styles.row}>
            {(['LIGHT', 'DARK', 'SYSTEM'] as ThemeMode[]).map((mode) => (
              <Button
                key={mode}
                title={mode}
                size="sm"
                variant={theme.themeMode === mode ? 'primary' : 'secondary'}
                onPress={() => theme.setThemeMode(mode)}
                style={{ marginRight: theme.spacing.xs, marginBottom: theme.spacing.xs }}
              />
            ))}
          </View>
        </Card>

        {/* Section: Color Palette Swatches */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.md }]}>
            Color Palette & Semantic Tokens
          </Text>

          <Text style={[theme.typography.labelMedium, { color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }]}>
            Brand & Backgrounds
          </Text>
          <View style={styles.colorRow}>
            <ColorSwatch name="primary" color={theme.colors.primary} text={theme.colors.textOnPrimary} />
            <ColorSwatch name="primaryLight" color={theme.colors.primaryLight} text={theme.colors.primary} />
            <ColorSwatch name="primaryDark" color={theme.colors.primaryDark} text={theme.colors.textOnPrimary} />
            <ColorSwatch name="surface" color={theme.colors.surface} text={theme.colors.textPrimary} border />
            <ColorSwatch name="surfaceSec" color={theme.colors.surfaceSecondary} text={theme.colors.textPrimary} border />
          </View>

          <Text style={[theme.typography.labelMedium, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }]}>
            Prayer Identity Tints
          </Text>
          <View style={styles.colorRow}>
            <ColorSwatch name="Fajr" color={theme.colors.prayerFajr} text={theme.colors.textPrimary} border />
            <ColorSwatch name="Dhuhr" color={theme.colors.prayerDhuhr} text={theme.colors.textPrimary} border />
            <ColorSwatch name="Asr" color={theme.colors.prayerAsr} text={theme.colors.textPrimary} border />
            <ColorSwatch name="Maghrib" color={theme.colors.prayerMaghrib} text={theme.colors.textPrimary} border />
            <ColorSwatch name="Isha" color={theme.colors.prayerIsha} text={theme.colors.textPrimary} border />
          </View>

          <Text style={[theme.typography.labelMedium, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs }]}>
            Status Colors
          </Text>
          <View style={styles.colorRow}>
            <ColorSwatch name="success" color={theme.colors.success} text={theme.colors.textOnPrimary} />
            <ColorSwatch name="warning" color={theme.colors.warning} text={theme.colors.textOnPrimary} />
            <ColorSwatch name="danger" color={theme.colors.danger} text={theme.colors.textOnPrimary} />
            <ColorSwatch name="info" color={theme.colors.info} text={theme.colors.textOnPrimary} />
          </View>
        </Card>

        {/* Section: Typography Scale */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.md }]}>
            Typography Scale
          </Text>
          <Text style={[theme.typography.displayLarge, { color: theme.colors.textPrimary }]}>Display Large 32px</Text>
          <Text style={[theme.typography.displayMedium, { color: theme.colors.textPrimary }]}>Display Medium 24px</Text>
          <Text style={[theme.typography.displaySmall, { color: theme.colors.textPrimary }]}>Display Small 20px</Text>
          <Text style={[theme.typography.headlineLarge, { color: theme.colors.textPrimary }]}>Headline Large 18px</Text>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary }]}>Headline Medium 16px</Text>
          <Text style={[theme.typography.bodyLarge, { color: theme.colors.textPrimary }]}>Body Large 16px (Normal text)</Text>
          <Text style={[theme.typography.bodyMedium, { color: theme.colors.textSecondary }]}>Body Medium 14px (Secondary)</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textTertiary }]}>Body Small 12px (Tertiary hint)</Text>
          <Text style={[theme.typography.labelLarge, { color: theme.colors.primary }]}>Label Large 14px (Medium weight)</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>Caption 11px</Text>
        </Card>

        {/* Section: Buttons */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.md }]}>
            Buttons
          </Text>

          <View style={styles.buttonStack}>
            <Button
              title="Primary Button"
              variant="primary"
              onPress={() => undefined}
              leftIcon={<Icon name="check" color={theme.colors.textOnPrimary} size="sm" />}
            />
            <Button
              title="Secondary Button"
              variant="secondary"
              onPress={() => undefined}
              rightIcon={<Icon name="chevron-right" color={theme.colors.primary} size="sm" />}
            />
            <Button
              title="Ghost Button"
              variant="ghost"
              onPress={() => undefined}
            />
            <Button
              title="Destructive Button"
              variant="destructive"
              onPress={() => undefined}
              leftIcon={<Icon name="trash" color={theme.colors.textOnPrimary} size="sm" />}
            />
            <View style={styles.row}>
              <Button title="Small" size="sm" style={{ marginRight: theme.spacing.sm }} />
              <Button title="Medium" size="md" style={{ marginRight: theme.spacing.sm }} />
              <Button title="Large" size="lg" />
            </View>
            <View style={styles.row}>
              <Button title="Disabled" disabled style={{ marginRight: theme.spacing.sm }} />
              <Button title="Loading" loading />
            </View>
          </View>
        </Card>

        {/* Section: Cards */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.md }]}>
            Cards
          </Text>
          <Card variant="default" style={{ marginBottom: theme.spacing.sm }}>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}>Default Surface Card</Text>
          </Card>
          <Card variant="elevated" style={{ marginBottom: theme.spacing.sm }}>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}>Elevated Card with Deeper Shadow</Text>
          </Card>
          <Card variant="outlined" style={{ marginBottom: theme.spacing.sm }}>
            <Text style={[theme.typography.bodyMedium, { color: theme.colors.textPrimary }]}>Outlined Card with Border</Text>
          </Card>
          <Card
            onPress={() => setCardPressCount((c) => c + 1)}
            style={{ backgroundColor: theme.colors.primaryLight }}
          >
            <Text style={[theme.typography.labelLarge, { color: theme.colors.primary }]}>
              Pressable Card (Tapped: {cardPressCount} times)
            </Text>
          </Card>
        </Card>

        {/* Section: Toggles */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.md }]}>
            Toggles
          </Text>
          <Toggle
            label="Prayer Reminders"
            description="Play notification sound at prayer times"
            checked={toggleVal1}
            onCheckedChange={setToggleVal1}
            style={{ marginBottom: theme.spacing.md }}
          />
          <Toggle
            label="Worship Suggestions"
            description="Include Sunnah and voluntary worship reminders"
            checked={toggleVal2}
            onCheckedChange={setToggleVal2}
            style={{ marginBottom: theme.spacing.md }}
          />
          <Toggle
            label="Disabled Setting"
            description="This option cannot currently be toggled"
            checked={false}
            disabled
            onCheckedChange={() => undefined}
          />
        </Card>

        {/* Section: Icons */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.headlineMedium, { color: theme.colors.textPrimary, marginBottom: theme.spacing.md }]}>
            Icon Abstraction Gallery
          </Text>
          <View style={styles.iconGrid}>
            {icons.map((iconName) => (
              <View key={iconName} style={styles.iconCell}>
                <Icon name={iconName} size="md" color={theme.colors.primary} />
                <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: theme.spacing.xxs }]}>
                  {iconName}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeArea>
  );
}

function ColorSwatch({
  name,
  color,
  text,
  border = false,
}: {
  name: string;
  color: string;
  text: string;
  border?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.swatch,
        {
          backgroundColor: color,
          borderColor: border ? theme.colors.border : 'transparent',
          borderWidth: border ? 1 : 0,
        },
      ]}
    >
      <Text style={[theme.typography.caption, { color: text, fontSize: 10, textAlign: 'center' }]}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  swatch: {
    width: 60,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  buttonStack: {
    gap: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconCell: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});

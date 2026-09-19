import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';

export interface BottomNavBarRoute {
  key: string;
  name: string;
  params?: any;
}

export interface BottomNavBarProps {
  state?: any;
  navigation?: any;
  descriptors?: any;
  insets?: any;
}

const TAB_CONFIG: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Today', icon: 'sun' },
  calendar: { label: 'Calendar', icon: 'calendar' },
  add: { label: 'Add', icon: 'plus' },
  journal: { label: 'Journal', icon: 'journal' },
  settings: { label: 'Settings', icon: 'settings' },
};

export function BottomNavBar(props: BottomNavBarProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();

  const routes = props.state?.routes ?? [
    { key: 'today', name: 'today' },
    { key: 'calendar', name: 'calendar' },
    { key: 'add', name: 'add' },
    { key: 'journal', name: 'journal' },
    { key: 'settings', name: 'settings' },
  ];

  const activeIndex = props.state?.index ?? 0;

  return (
    <View
      style={[
        styles.container,
        shadows.bottomBar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      ]}
      accessibilityRole="tablist"
      testID="bottom-nav-bar"
    >
      {routes.map((route: BottomNavBarRoute, index: number) => {
        const isFocused = activeIndex === index;
        const isAdd = route.name === 'add';
        const config = TAB_CONFIG[route.name] ?? { label: route.name, icon: 'info' };

        const onPress = () => {
          if (props.navigation) {
            const event = props.navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              props.navigation.navigate(route.name);
            }
          }
        };

        if (isAdd) {
          return (
            <View key={route.key} style={styles.addTabWrapper}>
              <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel="Add task"
                style={({ pressed }) => [
                  styles.addButton,
                  shadows.elevated,
                  {
                    backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                    minWidth: touchTargets.comfortable,
                    minHeight: touchTargets.comfortable,
                    borderRadius: radii.pill,
                  },
                ]}
                testID="bottom-nav-add"
              >
                <Icon name="plus" size={24} color={colors.textOnPrimary} decorative />
              </Pressable>
            </View>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={config.label}
            style={[
              styles.tab,
              {
                minHeight: touchTargets.min,
                paddingVertical: spacing.xs,
              },
            ]}
            testID={`bottom-nav-${route.name}`}
          >
            <Icon
              name={config.icon}
              size={22}
              color={isFocused ? colors.tabActive : colors.tabInactive}
              decorative
            />
            <Text
              style={[
                typography.caption,
                {
                  color: isFocused ? colors.tabActive : colors.tabInactive,
                  fontWeight: isFocused ? '700' : '500',
                  marginTop: spacing.xxs,
                },
              ]}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
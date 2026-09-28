import React, { useContext, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';
import { NavHomeIcon, NavCalendarIcon, NavLibraryIcon, NavMoreIcon } from '@/components/settings/SettingsIcons';
import { useAddTaskModalStore, type FabOrigin } from '@/stores/useAddTaskModalStore';

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
  today: { label: 'Today', icon: 'home' },
  calendar: { label: 'Calendar', icon: 'calendar' },
  add: { label: 'Add', icon: 'plus' },
  journal: { label: 'Journal', icon: 'journal' },
  settings: { label: 'More', icon: 'more' },
};

export function BottomNavBar(props: BottomNavBarProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets } = useTheme();
  const insetsContext = useContext(SafeAreaInsetsContext);
  const bottomInset = props.insets?.bottom ?? insetsContext?.bottom ?? 0;

  const addButtonRef = useRef<View>(null);
  const screenDimensions = Dimensions.get('window');
  const defaultOrigin: FabOrigin = {
    x: (screenDimensions.width - 48) / 2,
    y: screenDimensions.height - (bottomInset > 0 ? bottomInset + 54 : 58),
    width: 48,
    height: 48,
  };

  const measureAddButton = useCallback(() => {
    if (addButtonRef.current && typeof addButtonRef.current.measureInWindow === 'function') {
      addButtonRef.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          useAddTaskModalStore.getState().setOrigin({ x, y, width, height });
        }
      });
    }
  }, []);

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
          paddingBottom: bottomInset > 0 ? bottomInset + 4 : 8,
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
          const handleAddPress = () => {
            if (props.navigation) {
              props.navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
            }

            const currentOrigin = useAddTaskModalStore.getState().origin || defaultOrigin;
            useAddTaskModalStore.getState().openModal(currentOrigin);

            if (addButtonRef.current && typeof addButtonRef.current.measureInWindow === 'function') {
              addButtonRef.current.measureInWindow((x, y, width, height) => {
                if (width > 0 && height > 0) {
                  useAddTaskModalStore.getState().setOrigin({ x, y, width, height });
                }
              });
            }
          };

          return (
            <View key={route.key} style={styles.addTabWrapper}>
              <View
                ref={addButtonRef}
                collapsable={false}
                onLayout={measureAddButton}
              >
                <Pressable
                  onPress={handleAddPress}
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
            <View
              style={[
                styles.iconContainer,
                isFocused && [
                  styles.activeIconPill,
                  {
                    backgroundColor: colors.primaryLight,
                    borderRadius: radii.pill,
                  },
                ],
              ]}
            >
              {route.name === 'today' ? (
                <NavHomeIcon size={22} color={isFocused ? colors.tabActive : colors.tabInactive} />
              ) : route.name === 'calendar' ? (
                <NavCalendarIcon size={22} color={isFocused ? colors.tabActive : colors.tabInactive} />
              ) : route.name === 'journal' ? (
                <NavLibraryIcon size={22} color={isFocused ? colors.tabActive : colors.tabInactive} />
              ) : route.name === 'settings' ? (
                <NavMoreIcon size={22} color={isFocused ? colors.tabActive : colors.tabInactive} />
              ) : (
                <Icon
                  name={config.icon}
                  size={22}
                  color={isFocused ? colors.tabActive : colors.tabInactive}
                  decorative
                />
              )}
            </View>
            <Text
              style={[
                typography.caption,
                {
                  color: isFocused ? colors.tabActive : colors.tabInactive,
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
  iconContainer: {
    height: 32,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  activeIconPill: {
    paddingHorizontal: 14,
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
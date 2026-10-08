import React, { useContext, useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Animated, Image } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/components/common/Icon';
import { PlannerNavIcon, CalendarNavIcon, JournalNavIcon, MoreNavIcon } from './navIcons';
import { useAddTaskModalStore, type FabOrigin } from '@/stores/useAddTaskModalStore';
import { JOURNAL_NAV_ASSETS } from '@/constants/journalIconAssets';

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
  planner: { label: 'Planner', icon: 'clipboard' },
  today: { label: 'Planner', icon: 'clipboard' },
  calendar: { label: 'Calendar', icon: 'calendar' },
  add: { label: 'Add', icon: 'plus' },
  journal: { label: 'Journal', icon: 'journal' },
  settings: { label: 'More', icon: 'more' },
};

export function BottomNavBar(props: BottomNavBarProps) {
  const { colors, spacing, radii, typography, shadows, touchTargets, isDark } = useTheme();
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
    { key: 'planner', name: 'planner' },
    { key: 'calendar', name: 'calendar' },
    { key: 'add', name: 'add' },
    { key: 'journal', name: 'journal' },
    { key: 'settings', name: 'settings' },
  ];

  const activeIndex = props.state?.index ?? 0;
  const activeRoute = routes[activeIndex]?.name;

  // Track layout coordinates for the active tab pill
  const [tabLayouts, setTabLayouts] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});
  const [iconLayouts, setIconLayouts] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const indicatorHeight = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const isInitializedRef = useRef(false);
  const prevIndexRef = useRef(activeIndex);

  useEffect(() => {
    if (prevIndexRef.current !== activeIndex) {
      prevIndexRef.current = activeIndex;
      iconScale.setValue(0.86);
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, iconScale]);

  const handlePressableLayout = useCallback(
    (name: string, layout: { x: number; y: number; width: number; height: number }) => {
      setTabLayouts(prev => {
        if (
          prev[name]?.x === layout.x &&
          prev[name]?.y === layout.y &&
          prev[name]?.width === layout.width &&
          prev[name]?.height === layout.height
        ) {
          return prev;
        }
        return { ...prev, [name]: layout };
      });
    },
    []
  );

  const handleIconLayout = useCallback(
    (name: string, layout: { x: number; y: number; width: number; height: number }) => {
      setIconLayouts(prev => {
        if (
          prev[name]?.x === layout.x &&
          prev[name]?.y === layout.y &&
          prev[name]?.width === layout.width &&
          prev[name]?.height === layout.height
        ) {
          return prev;
        }
        return { ...prev, [name]: layout };
      });
    },
    []
  );

  const hasPillLayout = Boolean(activeRoute && tabLayouts[activeRoute] && iconLayouts[activeRoute]);

  useEffect(() => {
    if (!activeRoute || activeRoute === 'add' || !tabLayouts[activeRoute] || !iconLayouts[activeRoute]) {
      return;
    }

    const tLayout = tabLayouts[activeRoute];
    const iLayout = iconLayouts[activeRoute];
    const targetX = tLayout.x + iLayout.x;
    const targetY = tLayout.y + iLayout.y;
    const targetWidth = iLayout.width;
    const targetHeight = iLayout.height;

    if (!isInitializedRef.current) {
      translateX.setValue(targetX);
      translateY.setValue(targetY);
      indicatorWidth.setValue(targetWidth);
      indicatorHeight.setValue(targetHeight);
      indicatorOpacity.setValue(1);
      isInitializedRef.current = true;
      return;
    }

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: targetX,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.spring(translateY, {
        toValue: targetY,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorWidth, {
        toValue: targetWidth,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.spring(indicatorHeight, {
        toValue: targetHeight,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.timing(indicatorOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeRoute, tabLayouts, iconLayouts, translateX, translateY, indicatorWidth, indicatorHeight, indicatorOpacity]);

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
      {/* Smooth Sliding Pill Indicator */}
      {hasPillLayout ? (
        <Animated.View
          pointerEvents="none"
          testID="bottom-nav-sliding-pill"
          style={[
            styles.slidingPill,
            {
              transform: [{ translateX }, { translateY }],
              width: indicatorWidth,
              height: indicatorHeight,
              opacity: indicatorOpacity,
              backgroundColor: colors.primaryLight,
              borderRadius: radii.pill,
            },
          ]}
        />
      ) : null}

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
              if (props.state?.key) {
                props.navigation.dispatch({
                  type: 'NAVIGATE',
                  payload: {
                    name: route.name,
                    key: route.key,
                  },
                  target: props.state.key,
                });
              } else {
                props.navigation.navigate(route.name);
              }
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
            <View
              key={route.key}
              style={styles.addTabWrapper}
              onLayout={e => handlePressableLayout('add', e.nativeEvent.layout)}
            >
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
                  <Image
                    source={JOURNAL_NAV_ASSETS.plusButton}
                    style={{ width: 28, height: 28 }}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>
            </View>
          );
        }

        const activeColor = colors.tabActive;
        const inactiveColor = colors.tabInactive;

        return (
          <Pressable
            key={route.key}
            onLayout={e => handlePressableLayout(route.name, e.nativeEvent.layout)}
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
            <Animated.View
              onLayout={e => handleIconLayout(route.name, e.nativeEvent.layout)}
              style={[
                styles.iconContainer,
                isFocused && !hasPillLayout && [
                  styles.activeIconPill,
                  {
                    backgroundColor: colors.primaryLight,
                    borderRadius: radii.pill,
                  },
                ],
                { transform: [{ scale: isFocused ? iconScale : 1 }] },
              ]}
              testID={`bottom-nav-icon-${route.name}`}
            >
              {route.name === 'planner' || route.name === 'today' ? (
                <PlannerNavIcon size={24} color={isFocused ? activeColor : inactiveColor} active={isFocused} decorative />
              ) : route.name === 'calendar' ? (
                <CalendarNavIcon size={24} color={isFocused ? activeColor : inactiveColor} active={isFocused} decorative />
              ) : route.name === 'journal' ? (
                <JournalNavIcon size={24} color={isFocused ? activeColor : inactiveColor} active={isFocused} decorative />
              ) : route.name === 'settings' ? (
                <MoreNavIcon size={24} color={isFocused ? activeColor : inactiveColor} active={isFocused} decorative />
              ) : (
                <Icon
                  name={config.icon}
                  size={24}
                  color={isFocused ? activeColor : inactiveColor}
                  decorative
                />
              )}
            </Animated.View>
            <Text
              style={[
                typography.caption,
                {
                  color: isFocused ? activeColor : inactiveColor,
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
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    height: 32,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  activeIconPill: {
    paddingHorizontal: 12,
  },
  addTabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { ExpandingAddTaskModal } from '@/components/task-form/ExpandingAddTaskModal';
import { useAddTaskModalStore, type FabOrigin } from '@/stores/useAddTaskModalStore';
import { useTodayStore } from '@/stores/useTodayStore';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { LocationAwareTodayTemporalInputProvider } from '@/services/TodayTemporalInputProvider';
import { todayOrchestrator } from '@/services/TodayOrchestrator';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const { colors } = useTheme();
  const isOpen = useAddTaskModalStore(s => s.isOpen);
  const origin = useAddTaskModalStore(s => s.origin);
  const initialPrayer = useAddTaskModalStore(s => s.initialPrayer);
  const closeModal = useAddTaskModalStore(s => s.closeModal);
  const insets = useSafeAreaInsets();

  // Track the container's own window-y so we can subtract it from the
  // measureInWindow result (which is screen-absolute) before passing it as
  // a position:absolute `top` value inside this same container.
  const [containerY, setContainerY] = useState(0);
  const containerRef = useRef<View>(null);

  const onContainerLayout = useCallback(() => {
    containerRef.current?.measureInWindow((_x, y) => {
      setContainerY(y);
    });
  }, []);

  const screenDimensions = Dimensions.get('window');
  const defaultOrigin: FabOrigin = {
    x: (screenDimensions.width - 48) / 2,
    y: screenDimensions.height - (insets.bottom > 0 ? insets.bottom + 54 : 58),
    width: 48,
    height: 48,
  };

  // Adjust origin to container-relative coordinates
  const adjustedOrigin: FabOrigin | null = origin
    ? { ...origin, y: origin.y - containerY }
    : null;

  const handleSuccess = useCallback(async () => {
    try {
      const token = useTodayStore.getState().startRefresh();
      const coordinator = new PlannerRefreshCoordinator(
        new LocationAwareTodayTemporalInputProvider(),
        todayOrchestrator
      );
      const res = await coordinator.fullRefresh(DateTime.now());
      if (res.status === 'READY') {
        useTodayStore.getState().commitRefresh(token, {
          viewModel: res.viewModel,
          runtime: res.runtime,
        });
      }
    } catch {
      // Non-blocking refresh
    }
  }, []);

  return (
    <View ref={containerRef} style={[styles.container, { backgroundColor: colors.background }]} onLayout={onContainerLayout}>
      <Tabs
        tabBar={props => <BottomNavBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'Journal',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'More',
          }}
        />
      </Tabs>

      <ExpandingAddTaskModal
        visible={isOpen}
        origin={adjustedOrigin ?? defaultOrigin}
        initialPrayerTab={initialPrayer ?? undefined}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

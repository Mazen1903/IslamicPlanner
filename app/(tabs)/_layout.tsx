import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Easing } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '@/components/layout/BottomNavBar';
import { ExpandingAddTaskModal } from '@/components/task-form/ExpandingAddTaskModal';
import { useAddTaskModalStore, type FabOrigin } from '@/stores/useAddTaskModalStore';
import { useTodayStore } from '@/stores/useTodayStore';
import { useToastStore } from '@/stores/useToastStore';
import { usePlannerUiStore } from '@/stores/usePlannerUiStore';
import { PlannerRefreshCoordinator } from '@/services/PlannerRefreshCoordinator';
import { Toast } from '@/components/common/Toast';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const screenDimensions = useWindowDimensions();
  const isOpen = useAddTaskModalStore(s => s.isOpen);
  const origin = useAddTaskModalStore(s => s.origin);
  const initialPrayer = useAddTaskModalStore(s => s.initialPrayer);
  const initialDate = useAddTaskModalStore(s => s.initialDate);
  const initialTitle = useAddTaskModalStore(s => s.initialTitle);
  const closeModal = useAddTaskModalStore(s => s.closeModal);
  const insets = useSafeAreaInsets();
  const coordinatorRef = useRef(new PlannerRefreshCoordinator());

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

  const handleSuccess = useCallback(async (info?: { definitionId?: string; targetPrayer?: any; isSyncIncomplete?: boolean }) => {
    closeModal();
    const store = useTodayStore.getState();
    const token = store.startRefresh();
    try {
      const now = DateTime.now();
      const result = await coordinatorRef.current.fullRefresh(now);
      if (result.status === 'READY') {
        store.commitRefresh(
          token,
          { viewModel: result.viewModel, runtime: result.runtime },
          false
        );
      }
    } catch (err) {
      console.warn('[TabLayout] Failed to refresh Planner after adding task:', err);
    }

    if (info?.targetPrayer) {
      useTodayStore.getState().setSelectedPrayer(info.targetPrayer);
    }

    if (info?.definitionId) {
      usePlannerUiStore.getState().setHighlightedOccurrenceId(info.definitionId);
      setTimeout(() => {
        usePlannerUiStore.getState().setHighlightedOccurrenceId(null);
      }, 1200);
    }

    if (!info?.isSyncIncomplete) {
      useToastStore.getState().showToast({ message: 'Task added' });
    }

    router.navigate('/(tabs)/planner');
  }, [closeModal, router]);

  return (
    <View ref={containerRef} style={[styles.container, { backgroundColor: colors.background }]} onLayout={onContainerLayout}>
      <Tabs
        detachInactiveScreens={false}
        tabBar={props => <BottomNavBar {...props} />}
        screenOptions={{
          headerShown: false,
          freezeOnBlur: false,
          transitionSpec: {
            animation: 'timing',
            config: {
              duration: 380,
              easing: Easing.inOut(Easing.ease),
            },
          },
          sceneStyleInterpolator: ({ current }) => {
            const screenWidth = screenDimensions.width || 390;
            return {
              sceneStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [-screenWidth, 0, screenWidth],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        <Tabs.Screen
          name="planner"
          options={{
            title: 'Planner',
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
            lazy: false,
            freezeOnBlur: false,
          }}
        />
      </Tabs>

      <ExpandingAddTaskModal
        visible={isOpen}
        origin={adjustedOrigin ?? defaultOrigin}
        initialPrayerTab={initialPrayer ?? undefined}
        initialDate={initialDate}
        initialTitle={initialTitle}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

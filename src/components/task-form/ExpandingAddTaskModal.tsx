import React, { useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  StatusBar,
  BackHandler,
} from 'react-native';
import { DateTime } from 'luxon';
import { useContext } from 'react';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TaskFormScreen } from '@/components/task-form/TaskFormScreen';
import { useTodayStore } from '@/stores/useTodayStore';
import type { FabOrigin } from '@/stores/useAddTaskModalStore';
import type { Prayer } from '@/constants/prayers';

export type { FabOrigin };

export interface ExpandingAddTaskModalProps {
  visible: boolean;
  origin?: FabOrigin;
  initialPrayerTab?: Prayer;
  initialDate?: string | null;
  initialTitle?: string | null;
  onClose: () => void;
  onSuccess: (info?: any) => void | Promise<void>;
}

export function ExpandingAddTaskModal({
  visible,
  initialPrayerTab,
  initialDate,
  initialTitle,
  onClose,
  onSuccess,
}: ExpandingAddTaskModalProps) {
  const { colors, isDark } = useTheme();
  const insetsContext = useContext(SafeAreaInsetsContext);
  const bottomInset = insetsContext?.bottom ?? initialWindowMetrics?.insets?.bottom ?? 0;

  const hasSavedRef = useRef(false);
  const savedInfoRef = useRef<any>(null);

  const civilToday = DateTime.now().toFormat('yyyy-MM-dd');
  const viewModel = useTodayStore(s => s.viewModel);
  const planningDayKey = initialDate ?? viewModel?.planningDayKey ?? civilToday;
  const currentPrayer = initialPrayerTab ?? viewModel?.currentPrayer;

  const handleClose = useCallback(() => {
    if (hasSavedRef.current) {
      onSuccess(savedInfoRef.current);
      hasSavedRef.current = false;
      savedInfoRef.current = null;
    }
    onClose();
  }, [onClose, onSuccess]);

  const handleSaved = useCallback(() => {
    hasSavedRef.current = true;
    onSuccess(savedInfoRef.current);
  }, [onSuccess]);

  const handleSuccess = useCallback(async (info?: any) => {
    hasSavedRef.current = false;
    savedInfoRef.current = null;
    await onSuccess(info);
    handleClose();
  }, [onSuccess, handleClose]);

  // Hardware back press on Android
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, [visible, handleClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      testID="expanding-add-task-modal"
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <View
        testID="expanding-add-task-container"
        accessibilityViewIsModal={true}
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(bottomInset, 16),
          },
        ]}
      >
        <View testID="expanding-add-task-content" style={styles.content}>
          <TaskFormScreen
            initialCivilSeedDate={initialDate ?? civilToday}
            initialPlanningDayDate={planningDayKey}
            initialPrayerTab={currentPrayer}
            initialTitle={initialTitle ?? undefined}
            onSuccess={handleSuccess}
            onCancel={handleClose}
            onSaved={handleSaved}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

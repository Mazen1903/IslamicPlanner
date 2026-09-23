import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  BackHandler,
  PanResponder,
  Animated,
  Easing,
  type LayoutChangeEvent,
} from 'react-native';
import { DateTime } from 'luxon';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { TaskFormScreen } from '@/components/task-form/TaskFormScreen';
import { useTodayStore } from '@/stores/useTodayStore';
import type { FabOrigin } from '@/stores/useAddTaskModalStore';
import type { Prayer } from '@/constants/prayers';

export type { FabOrigin };

export interface ExpandingAddTaskModalProps {
  visible: boolean;
  origin: FabOrigin;
  initialPrayerTab?: Prayer;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpandingAddTaskModal({
  visible,
  origin,
  initialPrayerTab,
  onClose,
  onSuccess,
}: ExpandingAddTaskModalProps) {
  const { colors } = useTheme();
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;

  const [backdropSize, setBackdropSize] = useState({
    width: screenWidth,
    height: screenHeight,
  });

  const onBackdropLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBackdropSize({ width, height });
    }
  }, []);

  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);

  // Cache the origin when becoming visible to avoid any mid-animation origin shifts
  const activeOriginRef = useRef<FabOrigin>(origin);
  useEffect(() => {
    if (visible && !isClosingRef.current) {
      activeOriginRef.current = origin;
    }
  }, [visible, origin]);

  // Single Animated.Value: 0 = button origin, 1 = full screen
  // useNativeDriver: false EVERYWHERE — no mixing allowed
  const morphAnim = useRef(new Animated.Value(0)).current;
  const dragAnim = useRef(new Animated.Value(0)).current;

  const activeOrigin = visible || isClosing ? activeOriginRef.current : origin;
  const screenW = backdropSize.width;
  const screenH = backdropSize.height;

  // Center math
  const panelCenterX = screenW / 2;
  const panelCenterY = screenH / 2;

  const btnX = activeOrigin.x + activeOrigin.width / 2;
  const btnY = activeOrigin.y + activeOrigin.height / 2;

  const startOffsetX = btnX - panelCenterX;
  const startOffsetY = btnY - panelCenterY;

  const initialScaleX = Math.max(activeOrigin.width / screenW, 0.08);
  const initialScaleY = Math.max(activeOrigin.height / screenH, 0.04);

  const civilToday = DateTime.now().toFormat('yyyy-MM-dd');
  const viewModel = useTodayStore(s => s.viewModel);
  const planningDayKey = viewModel?.planningDayKey ?? civilToday;
  const currentPrayer = initialPrayerTab ?? viewModel?.currentPrayer;

  // Composite morph fraction = morphAnim * (1 - dragFrac)
  // Non-linear drag fraction with cushion at gesture onset
  const dragFrac = dragAnim.interpolate({
    inputRange: [0, 84, 252, 420],
    outputRange: [0, 0.10, 0.50, 1],
    extrapolate: 'clamp',
  });
  // morphFraction = morphAnim - morphAnim * dragFrac
  const morphFraction = Animated.subtract(
    morphAnim,
    Animated.multiply(morphAnim, dragFrac)
  );

  // ─── Dismiss handler ─────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);

    // Read current values and calculate precise in-flight progress
    const morphVal = (morphAnim as any)._value as number ?? 1;
    const dragVal  = (dragAnim  as any)._value as number ?? 0;
    const rawDrag = Math.min(Math.max(dragVal / 420, 0), 1);

    let computedDragFrac = 0;
    if (rawDrag <= 0.20) {
      computedDragFrac = (rawDrag / 0.20) * 0.10;
    } else if (rawDrag <= 0.60) {
      computedDragFrac = 0.10 + ((rawDrag - 0.20) / 0.40) * 0.40;
    } else {
      computedDragFrac = 0.50 + ((rawDrag - 0.60) / 0.40) * 0.50;
    }
    const currentProgress = Math.min(Math.max(morphVal * (1 - computedDragFrac), 0), 1);

    dragAnim.setValue(0);
    morphAnim.setValue(currentProgress);

    if (currentProgress <= 0.04) {
      setIsClosing(false);
      morphAnim.setValue(0);
      isClosingRef.current = false;
      onClose();
      return;
    }

    // Shrink back to origin.
    // Easing.bezier(0.2, 0.85, 0.32, 1) starts closing immediately and decelerates softly into the button.
    const closeDuration = Math.max(Math.round(750 * currentProgress), 350);

    Animated.timing(morphAnim, {
      toValue: 0,
      duration: closeDuration,
      easing: Easing.bezier(0.2, 0.85, 0.32, 1),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsClosing(false);
        isClosingRef.current = false;
        onClose();
      }
    });
  }, [morphAnim, dragAnim, onClose]);

  const handleSuccess = useCallback(async () => {
    onSuccess();
    handleClose();
  }, [onSuccess, handleClose]);

  // ─── Expand on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      activeOriginRef.current = origin;
      isClosingRef.current = false;
      dragAnim.setValue(0);
      morphAnim.setValue(0);

      // Fluid deceleration curve: launches swiftly and glides effortlessly into full screen
      Animated.timing(morphAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: false,
      }).start();
    }
  }, [visible, origin, morphAnim, dragAnim]);

  // ─── Hardware back ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible && !isClosing) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, [visible, isClosing, handleClose]);

  // ─── Drag-to-dismiss ──────────────────────────────────────────────────────────
  const dragPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 12 && Math.abs(g.dx) < 20,
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) {
            dragAnim.setValue(g.dy);
            if (g.dy >= 420) handleClose();
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 90 || g.vy > 0.35) {
            handleClose();
          } else {
            Animated.spring(dragAnim, {
              toValue: 0,
              damping: 26,
              stiffness: 160,
              mass: 1,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [dragAnim, handleClose]
  );

  // ─── Derived animated styles ──────────────────────────────────────────────────

  // Backdrop opacity
  const backdropOpacity = morphFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Card transforms
  const cardScaleX = morphFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [initialScaleX, 1],
    extrapolate: 'clamp',
  });
  const cardScaleY = morphFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [initialScaleY, 1],
    extrapolate: 'clamp',
  });
  const cardTranslateX = morphFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [startOffsetX, 0],
    extrapolate: 'clamp',
  });
  const cardTranslateYBase = morphFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [startOffsetY, 0],
    extrapolate: 'clamp',
  });
  // Natural drag follow with cushion (up to 40px)
  const dragFollowY = dragAnim.interpolate({
    inputRange: [0, 126, 294, 420],
    outputRange: [0, 40, 16, 0],
    extrapolate: 'clamp',
  });
  const cardTranslateY = Animated.add(cardTranslateYBase, dragFollowY);

  // Dissolve into origin button at the very end
  const cardOpacity = morphFraction.interpolate({
    inputRange: [0, 0.06, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  // Corner radius: capsule pill (180) until 0.35, then smoothly shapes into full screen
  const cardBorderTL = morphFraction.interpolate({
    inputRange: [0, 0.35, 0.70, 1],
    outputRange: [180, 60, 24, 0],
    extrapolate: 'clamp',
  });
  const cardBorderTR = morphFraction.interpolate({
    inputRange: [0, 0.35, 0.70, 1],
    outputRange: [180, 60, 24, 0],
    extrapolate: 'clamp',
  });
  const cardBorderBL = morphFraction.interpolate({
    inputRange: [0, 0.30, 0.70, 1],
    outputRange: [180, 40, 12, 0],
    extrapolate: 'clamp',
  });
  const cardBorderBR = morphFraction.interpolate({
    inputRange: [0, 0.30, 0.70, 1],
    outputRange: [180, 40, 12, 0],
    extrapolate: 'clamp',
  });

  // Background color: stays primary button color through initial expansion, then blooms into clean background
  const cardBgColor = morphFraction.interpolate({
    inputRange: [0, 0.25, 0.65, 1],
    outputRange: [colors.primary, colors.primary, colors.background, colors.background],
    extrapolate: 'clamp',
  });

  // ─── 100% Distortion-Free Counter-Scaled Icon ─────────────────────────────────
  // Evaluates 1 / cardScale(t) at keyframes so cardScale(t) * iconScale(t) === 1.000 EXACTLY.
  // This eliminates any stretching or squashing of the '+' icon.
  const iconKeyframes = [0, 0.05, 0.10, 0.16, 0.22, 0.28, 1];
  const iconScaleXOutput = iconKeyframes.map(t =>
    t <= 0.25 ? 1 / (initialScaleX + t * (1 - initialScaleX)) : 1
  );
  const iconScaleYOutput = iconKeyframes.map(t =>
    t <= 0.25 ? 1 / (initialScaleY + t * (1 - initialScaleY)) : 1
  );

  const iconScaleX = morphFraction.interpolate({
    inputRange: iconKeyframes,
    outputRange: iconScaleXOutput,
    extrapolate: 'clamp',
  });
  const iconScaleY = morphFraction.interpolate({
    inputRange: iconKeyframes,
    outputRange: iconScaleYOutput,
    extrapolate: 'clamp',
  });

  // Icon Opacity: crisp 1.0 at origin, stays clear through 0.12, then gently dissolves by 0.25
  const iconOpacity = morphFraction.interpolate({
    inputRange: [0, 0.12, 0.25],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp',
  });

  // Content Cross-Fade: cleanly emerges after icon dissolves, reaching full opacity by 0.55
  const contentOpacity = morphFraction.interpolate({
    inputRange: [0.20, 0.55, 1],
    outputRange: [0, 0.85, 1],
    extrapolate: 'clamp',
  });

  const shouldRender = visible || isClosing;

  if (!shouldRender) {
    return null;
  }

  return (
    <View
      style={styles.modalBackdrop}
      testID="expanding-add-task-modal"
      accessibilityViewIsModal={true}
      pointerEvents={isClosing ? 'none' : 'auto'}
      onLayout={onBackdropLayout}
      {...dragPanResponder.panHandlers}
    >
      {/* 1. Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* 2. Morphing Card */}
      <Animated.View
        testID="expanding-add-task-container"
        style={[
          styles.morphCard,
          {
            top: 0,
            left: 0,
            width: screenW,
            height: screenH,
            shadowColor: colors.shadowElevated,
            backgroundColor: cardBgColor,
            opacity: cardOpacity,
            borderTopLeftRadius: cardBorderTL,
            borderTopRightRadius: cardBorderTR,
            borderBottomLeftRadius: cardBorderBL,
            borderBottomRightRadius: cardBorderBR,
            transform: [
              { translateX: cardTranslateX },
              { translateY: cardTranslateY },
              { scaleX: cardScaleX },
              { scaleY: cardScaleY },
            ],
          },
        ]}
      >
        {/* 3. Counter-Scaled Icon */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.morphIconContainer,
            {
              opacity: iconOpacity,
              transform: [{ scaleX: iconScaleX }, { scaleY: iconScaleY }],
            },
          ]}
        >
          <Icon name="plus" size={24} color={colors.textOnPrimary} decorative />
        </Animated.View>

        {/* 4. Full Sheet Content */}
        <Animated.View
          testID="expanding-add-task-content"
          style={{ opacity: contentOpacity, flex: 1 }}
        >
          <TaskFormScreen
            initialCivilSeedDate={civilToday}
            initialPlanningDayDate={planningDayKey}
            initialPrayerTab={currentPrayer}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  morphCard: {
    position: 'absolute',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  morphIconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

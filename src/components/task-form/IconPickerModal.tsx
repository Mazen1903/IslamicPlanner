import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Easing,
  BackHandler,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  searchTaskIcons,
  type TaskIconDef,
} from '@/constants/taskIcons';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { useTheme } from '@/theme';

export interface IconPickerOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IconPickerModalProps {
  visible: boolean;
  selectedIconId?: string | null;
  origin?: IconPickerOrigin;
  onSelectIcon: (iconId: string) => void;
  onClose: () => void;
}

export function IconPickerModal({
  visible,
  selectedIconId,
  origin,
  onSelectIcon,
  onClose,
}: IconPickerModalProps) {
  const { colors, spacing, typography, radii, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');

  const screenDimensions = Dimensions.get('window');
  const [backdropSize, setBackdropSize] = useState({
    width: screenDimensions.width,
    height: screenDimensions.height,
  });

  const onBackdropLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBackdropSize({ width, height });
    }
  }, []);

  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  // Tracks icon selected mid-animation so we call onSelectIcon only after close finishes
  const pendingSelectRef = useRef<string | null>(null);

  const defaultOrigin = useMemo(
    () => ({
      x: backdropSize.width / 2 - 25,
      y: backdropSize.height / 4,
      width: 50,
      height: 50,
    }),
    [backdropSize.width, backdropSize.height]
  );

  // Cache origin when becoming visible
  const activeOriginRef = useRef<IconPickerOrigin>(origin ?? defaultOrigin);
  useEffect(() => {
    if (visible && !isClosingRef.current) {
      activeOriginRef.current = origin ?? defaultOrigin;
    }
  }, [visible, origin, defaultOrigin]);

  // Animated values matching ExpandingAddTaskModal
  const morphAnim = useRef(new Animated.Value(0)).current;
  const dragAnim = useRef(new Animated.Value(0)).current;

  const activeOrigin = visible || isClosing ? activeOriginRef.current : (origin ?? defaultOrigin);
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
  const handleClose = useCallback((afterClose?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);

    // Read current values and calculate precise in-flight progress
    const morphVal = (morphAnim as any)._value as number ?? 1;
    const dragVal = (dragAnim as any)._value as number ?? 0;
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
      afterClose?.();
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
        afterClose?.();
      }
    });
  }, [morphAnim, dragAnim, onClose]);

  // ─── Expand on open ───────────────────────────────────────────────────────────
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      activeOriginRef.current = origin ?? defaultOrigin;
      isClosingRef.current = false;
      setIsClosing(false);
      dragAnim.setValue(0);
      morphAnim.setValue(0);

      // Fluid deceleration curve: launches swiftly and glides effortlessly into full screen
      Animated.timing(morphAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: false,
      }).start();
    } else if (!visible && wasVisible) {
      if (!isClosingRef.current) {
        handleClose();
      }
    }
  }, [visible, origin, defaultOrigin, morphAnim, dragAnim, handleClose]);

  // ─── Android hardware back ────────────────────────────────────────────────────
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
  const backdropOpacity = morphFraction.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

  // Content Cross-Fade: cleanly emerges as card expands, reaching full opacity by 0.55
  const contentOpacity = morphFraction.interpolate({
    inputRange: [0.20, 0.55, 1],
    outputRange: [0, 0.85, 1],
    extrapolate: 'clamp',
  });

  // ─── Icon list ───────────────────────────────────────────────────────────────
  const filteredIcons = useMemo(() => searchTaskIcons(searchQuery), [searchQuery]);

  const handleSelect = useCallback(
    (iconId: string) => {
      // Close the modal with its animation first, then notify the parent.
      // This prevents the parent's SET_ICON dispatch (which triggers async preview
      // re-computation) from competing with the shrink animation and causing a freeze.
      pendingSelectRef.current = iconId;
      handleClose(() => {
        const pending = pendingSelectRef.current;
        pendingSelectRef.current = null;
        if (pending !== null) {
          onSelectIcon(pending);
        }
      });
    },
    [handleClose, onSelectIcon]
  );

  const renderIconItem = useCallback(
    ({ item }: { item: TaskIconDef }) => {
      const isSelected = item.id === selectedIconId;
      return (
        <Pressable
          onPress={() => handleSelect(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Select icon: ${item.label}`}
          accessibilityState={{ selected: isSelected }}
          style={({ pressed }) => [
            styles.iconTile,
            {
              backgroundColor: isSelected
                ? isDark
                  ? 'rgba(56, 189, 248, 0.22)'
                  : 'rgba(2, 132, 199, 0.15)'
                : pressed
                ? isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.04)'
                : 'transparent',
              borderRadius: radii.md,
            },
          ]}
          testID={`icon-item-${item.id}`}
        >
          <TaskCategoryIcon
            iconId={item.id}
            size={48}
            color={isSelected ? colors.primary : colors.textPrimary}
          />
        </Pressable>
      );
    },
    [selectedIconId, isDark, radii.md, colors.primary, colors.textPrimary, handleSelect]
  );

  const shouldRender = visible || isClosing;

  if (!shouldRender) {
    return null;
  }

  return (
    <View
      style={styles.modalBackdrop}
      testID="icon-picker-modal"
      accessibilityViewIsModal={true}
      pointerEvents={isClosing ? 'none' : 'auto'}
      onLayout={onBackdropLayout}
      {...dragPanResponder.panHandlers}
    >
      {/* 1. Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => handleClose()} />
      </Animated.View>

      {/* 2. Morphing Card */}
      <Animated.View
        testID="icon-picker-container"
        style={[
          styles.morphCard,
          {
            top: 0,
            left: 0,
            width: screenW,
            height: screenH,
            shadowColor: colors.shadowElevated,
            backgroundColor: colors.background,
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
        <Animated.View style={[styles.contentContainer, { opacity: contentOpacity }]}>
          <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top', 'bottom']}
            testID="icon-picker-safe-area"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoid}
            >
              {/* Drag handle */}
              <View style={styles.dragHandleWrapper}>
                <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              </View>

              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[typography.headlineMedium, styles.title, { color: colors.textPrimary }]}>
                  Choose Task Icon
                </Text>
                <Pressable
                  onPress={() => handleClose()}
                  accessibilityRole="button"
                  accessibilityLabel="Close icon picker"
                  style={({ pressed }) => [
                    styles.closeButton,
                    {
                      backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                      borderRadius: radii.pill,
                    },
                  ]}
                  testID="close-icon-picker"
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Search bar */}
              <View style={[styles.searchContainer, { paddingHorizontal: spacing.lg }]}>
                <View
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: isDark
                        ? 'rgba(30, 41, 59, 0.8)'
                        : colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.textTertiary} style={styles.searchIcon} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search icons"
                    placeholderTextColor={colors.textTertiary}
                    style={[typography.bodyMedium, styles.searchInput, { color: colors.textPrimary }]}
                    clearButtonMode="while-editing"
                    testID="icon-search-input"
                  />
                  {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                      accessibilityLabel="Clear search"
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Icons grid */}
              <FlatList
                data={filteredIcons}
                keyExtractor={item => item.id}
                renderItem={renderIconItem}
                numColumns={5}
                contentContainerStyle={[styles.gridContainer, { paddingHorizontal: spacing.sm }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search" size={40} color={colors.textTertiary} />
                    <Text style={[typography.bodyMedium, styles.emptyText, { color: colors.textSecondary }]}>
                      No icons found matching &quot;{searchQuery}&quot;
                    </Text>
                  </View>
                }
              />
            </KeyboardAvoidingView>
          </SafeAreaView>
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
  contentContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
  },
  searchContainer: {
    marginTop: 10,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
  },
  searchIcon: {
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  gridContainer: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  iconTile: {
    flex: 1,
    margin: 3,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    maxWidth: '20%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    textAlign: 'center',
  },
});

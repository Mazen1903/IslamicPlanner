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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  searchTaskIcons,
  type TaskIconDef,
} from '@/constants/taskIcons';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { PremiumLanternIcon } from '@/components/common/PremiumLanternIcon';
import { useTheme } from '@/theme';
import { isFreeTaskIcon } from '@/domain/entitlement/freeTier';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { PaywallSheet } from '@/components/premium/PaywallSheet';
import { AppBackButton } from '@/components/common/AppBackButton';

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

interface IconTileProps {
  item: TaskIconDef;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: (id: string) => void;
  primaryColor: string;
  textPrimaryColor: string;
  surfaceColor: string;
  isDark: boolean;
  borderRadius: number;
  tileSize: number;
}

const IconTile = React.memo(function IconTile({
  item,
  isSelected,
  isLocked,
  onSelect,
  primaryColor,
  textPrimaryColor,
  surfaceColor,
  isDark,
  borderRadius,
  tileSize,
}: IconTileProps) {
  return (
    <Pressable
      onPress={() => onSelect(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Select icon: ${item.label}${isLocked ? ' (Premium)' : ''}`}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.iconTile,
        {
          width: tileSize,
          height: tileSize,
          backgroundColor: isSelected
            ? isDark
              ? 'rgba(56, 189, 248, 0.22)'
              : 'rgba(2, 132, 199, 0.15)'
            : pressed
            ? isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)'
            : 'transparent',
          borderRadius,
        },
      ]}
      testID={`icon-item-${item.id}`}
    >
      <TaskCategoryIcon
        iconId={item.id}
        size={44}
        color={isSelected ? primaryColor : textPrimaryColor}
      />
      {isLocked && (
        <View
          style={[
            styles.lockedBadge,
            {
              backgroundColor: surfaceColor,
              borderColor: primaryColor,
            },
          ]}
        >
          <PremiumLanternIcon size={11} />
        </View>
      )}
    </Pressable>
  );
});

export function IconPickerModal({
  visible,
  selectedIconId,
  origin: _origin,
  onSelectIcon,
  onClose,
}: IconPickerModalProps) {
  const { colors, spacing, typography, radii, isDark } = useTheme();
  const { gate, paywallVisible, closePaywall, onPurchaseSuccess, isPremium } = usePremiumGate();

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
  const pendingSelectRef = useRef<string | null>(null);

  const screenW = backdropSize.width;
  const screenH = backdropSize.height;

  // Snappy slide animation: starts offscreen on the LEFT (-screenW) and slides to 0
  const slideAnim = useRef(new Animated.Value(-screenDimensions.width)).current;

  // ─── Dismiss handler (slides back out to the LEFT: 0 -> -screenW) ──────────
  const handleClose = useCallback((afterClose?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);

    Animated.timing(slideAnim, {
      toValue: -screenW,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsClosing(false);
        isClosingRef.current = false;
        onClose();
        afterClose?.();
      }
    });
  }, [slideAnim, screenW, onClose]);

  // ─── Slide in on open (slides from LEFT to right: -screenW -> 0) ───────────
  const prevVisibleRef = useRef(false);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (visible && !wasVisible) {
      isClosingRef.current = false;
      setIsClosing(false);
      slideAnim.setValue(-screenW);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (!visible && wasVisible) {
      if (!isClosingRef.current) {
        handleClose();
      }
    }
  }, [visible, screenW, slideAnim, handleClose]);

  // ─── Android hardware back ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible && !isClosing) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, [visible, isClosing, handleClose]);

  // ─── Swipe-to-dismiss gesture (swiping leftwards back off to the left) ───────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => {
          // Require clear horizontal swipe to avoid stealing vertical scrolling from FlatList
          return g.dx < -18 && Math.abs(g.dx) > Math.abs(g.dy) * 2.5;
        },
        onPanResponderMove: (_, g) => {
          if (g.dx < 0) {
            slideAnim.setValue(g.dx);
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx < -70 || g.vx < -0.3) {
            handleClose();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              damping: 24,
              stiffness: 220,
              mass: 0.7,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [slideAnim, handleClose]
  );

  // Derived backdrop fade: 1 when at 0, 0 when slid to -screenW
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [-screenW, 0],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ─── Icon list & selection ───────────────────────────────────────────────────
  const filteredIcons = useMemo(() => searchTaskIcons(searchQuery), [searchQuery]);

  const doSelect = useCallback(
    (iconId: string) => {
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

  const handleSelect = useCallback(
    (iconId: string) => {
      if (isFreeTaskIcon(iconId)) {
        doSelect(iconId);
      } else {
        gate('TASK_ICONS_EXTENDED', () => doSelect(iconId));
      }
    },
    [doSelect, gate]
  );

  // Fixed 5-column geometry for tiles
  const totalHorizontalPadding = spacing.sm * 2; // 16px
  const columnWidth = Math.floor((screenW - totalHorizontalPadding) / 5);
  const tileInnerSize = columnWidth - 6;

  const renderIconItem = useCallback(
    ({ item }: { item: TaskIconDef }) => {
      const isSelected = item.id === selectedIconId;
      const isFree = isFreeTaskIcon(item.id);
      const isLocked = !isFree && !isPremium;

      return (
        <IconTile
          item={item}
          isSelected={isSelected}
          isLocked={isLocked}
          onSelect={handleSelect}
          primaryColor={colors.primary}
          textPrimaryColor={colors.textPrimary}
          surfaceColor={colors.surface}
          isDark={isDark}
          borderRadius={radii.md}
          tileSize={tileInnerSize}
        />
      );
    },
    [
      selectedIconId,
      isPremium,
      isDark,
      radii.md,
      colors.primary,
      colors.textPrimary,
      colors.surface,
      tileInnerSize,
      handleSelect,
    ]
  );

  const isShown = visible || isClosing;

  return (
    <View
      style={[
        styles.modalBackdrop,
        {
          opacity: isShown ? 1 : 0,
        },
      ]}
      testID="icon-picker-modal"
      accessibilityViewIsModal={isShown}
      pointerEvents={isShown && !isClosing ? 'auto' : 'none'}
      onLayout={onBackdropLayout}
      {...panResponder.panHandlers}
    >
      {/* 1. Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)' },
          ]}
          onPress={() => handleClose()}
        />
      </Animated.View>

      {/* 2. Snappy Horizontal Slide Panel (from LEFT: -screenW -> 0) */}
      <Animated.View
        testID="icon-picker-container"
        style={[
          styles.slidePanel,
          {
            width: screenW,
            height: screenH,
            backgroundColor: colors.background,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
          testID="icon-picker-safe-area"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            {/* Header: AppBackButton on left, title beside it */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <AppBackButton
                onPress={() => handleClose()}
                accessibilityLabel="Go back"
                testID="close-icon-picker"
                size={38}
                iconSize={22}
              />
              <Text
                style={[
                  typography.headlineMedium,
                  styles.title,
                  { color: colors.textPrimary, marginLeft: spacing.md },
                ]}
                numberOfLines={1}
              >
                Choose Task Icon
              </Text>
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

            {/* High-Performance Virtualized Icons Grid */}
            <FlatList
              data={filteredIcons}
              keyExtractor={item => item.id}
              renderItem={renderIconItem}
              numColumns={5}
              initialNumToRender={20}
              windowSize={7}
              maxToRenderPerBatch={20}
              removeClippedSubviews={false}
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

      <PaywallSheet
        visible={paywallVisible}
        onClose={closePaywall}
        onSuccess={onPurchaseSuccess}
        gatedFeature="TASK_ICONS_EXTENDED"
      />
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
  slidePanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
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
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  lockedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

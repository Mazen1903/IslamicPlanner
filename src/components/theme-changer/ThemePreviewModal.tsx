import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { PhonePreviewCard } from './PhonePreviewCard';
import {
  type ThemeGalleryItem,
  PURE_COLOR_THEMES,
} from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 268;
const CARD_MARGIN = 14;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

interface ThemePreviewModalProps {
  visible: boolean;
  initialItem?: ThemeGalleryItem | null;
  onClose: () => void;
  onApplyTheme: (item: ThemeGalleryItem) => void;
}

export function ThemePreviewModal({
  visible,
  initialItem,
  onClose,
  onApplyTheme,
}: ThemePreviewModalProps) {
  const { colors } = useTheme();

  const [selectedItem, setSelectedItem] = useState<ThemeGalleryItem>(
    initialItem ?? PURE_COLOR_THEMES[0],
  );

  const scrollRef = useRef<ScrollView>(null);

  // Sync when initialItem changes
  useEffect(() => {
    if (initialItem) {
      setSelectedItem(initialItem);
    }
  }, [initialItem]);

  // Auto-scroll phone carousel to selected item index
  useEffect(() => {
    const index = PURE_COLOR_THEMES.findIndex((i) => i.id === selectedItem.id);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * SNAP_INTERVAL,
        animated: true,
      });
    }
  }, [selectedItem.id]);

  const handleSelectSwatch = (item: ThemeGalleryItem) => {
    setSelectedItem(item);
  };

  const handleApply = () => {
    onApplyTheme(selectedItem);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        {/* Top Navigation Bar: [✕]   Tap to Choose a Theme   [✓] */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close theme preview"
            hitSlop={12}
            style={styles.headerButton}
            testID="theme-preview-close"
          >
            <Icon name="close" size={24} color={colors.textPrimary} decorative />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Tap to Choose a Theme
          </Text>

          <Pressable
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel="Apply theme"
            hitSlop={12}
            style={styles.headerButton}
            testID="theme-preview-apply"
          >
            <Icon name="check" size={26} color={colors.primary} decorative />
          </Pressable>
        </View>

        {/* Center: Interactive Phone Preview Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            contentContainerStyle={[
              styles.carouselScroll,
              { paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_MARGIN },
            ]}
          >
            {PURE_COLOR_THEMES.map((item) => {
              const isCurrent = item.id === selectedItem.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.cardWrapper,
                    {
                      opacity: isCurrent ? 1 : 0.72,
                      transform: [{ scale: isCurrent ? 1 : 0.95 }],
                    },
                  ]}
                >
                  <PhonePreviewCard
                    item={item}
                    testID={`preview-card-${item.id}`}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Section label */}
        <View style={styles.sectionLabelRow}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Pure Color
          </Text>
        </View>

        {/* Bottom Horizontal Swatch Strip */}
        <View style={styles.bottomSwatchSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchScrollContent}
          >
            {PURE_COLOR_THEMES.map((item) => {
              const isSelected = item.id === selectedItem.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectSwatch(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} theme`}
                  style={[
                    styles.swatchItem,
                    isSelected && styles.swatchItemSelected,
                  ]}
                  testID={`swatch-thumb-${item.id}`}
                >
                  <View
                    style={[
                      styles.colorSwatchBox,
                      {
                        backgroundColor: item.color,
                        borderColor: isSelected ? colors.primary : 'rgba(0,0,0,0.06)',
                        borderWidth: isSelected ? 2.5 : 1,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.checkmarkBadgeInner}>
                        <Icon name="check" size={16} color="#FFFFFF" decorative />
                      </View>
                    )}
                  </View>

                  {/* PRO Badge on top-left */}
                  {item.isPro && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselScroll: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cardWrapper: {
    marginHorizontal: CARD_MARGIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabelRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bottomSwatchSection: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  swatchScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  swatchItem: {
    position: 'relative',
    borderRadius: 16,
  },
  swatchItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  colorSwatchBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkBadgeInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(30, 30, 30, 0.72)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

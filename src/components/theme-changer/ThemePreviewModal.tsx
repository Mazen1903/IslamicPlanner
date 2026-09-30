import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { PhonePreviewCard } from './PhonePreviewCard';
import { DEFAULT_THEME_ITEM, type ThemeGalleryItem } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = 268;
const CARD_MARGIN = 14;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

export interface ThemePreviewModalProps {
  visible: boolean;
  initialItem?: ThemeGalleryItem | null;
  items: ThemeGalleryItem[];
  onClose: () => void;
  onApplyTheme: (item: ThemeGalleryItem) => void;
}

export function ThemePreviewModal({
  visible,
  initialItem,
  items,
  onClose,
  onApplyTheme,
}: ThemePreviewModalProps) {
  const { colors } = useTheme();

  const [selectedItem, setSelectedItem] = useState<ThemeGalleryItem>(
    initialItem ?? items[0] ?? DEFAULT_THEME_ITEM,
  );

  const scrollRef = useRef<ScrollView>(null);
  const bottomThumbScrollRef = useRef<ScrollView>(null);

  // Sync when initialItem or items change
  useEffect(() => {
    if (initialItem) {
      setSelectedItem(initialItem);
      const index = items.findIndex((i) => i.id === initialItem.id);
      if (index >= 0 && scrollRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            x: index * SNAP_INTERVAL,
            animated: false,
          });
        }, 60);
      }
    }
  }, [initialItem, items]);

  const handleSelectSwatch = (item: ThemeGalleryItem, index: number) => {
    setSelectedItem(item);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * SNAP_INTERVAL,
        animated: true,
      });
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SNAP_INTERVAL);
    if (index >= 0 && index < items.length) {
      const item = items[index];
      if (item && item.id !== selectedItem.id) {
        setSelectedItem(item);
        // Scroll bottom thumb to visible range if needed
        bottomThumbScrollRef.current?.scrollTo({
          x: Math.max(0, index * 78 - 60),
          animated: true,
        });
      }
    }
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

          <View style={styles.headerCenterCol}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Tap to Choose a Theme
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {selectedItem.name} {selectedItem.arabicName ? `• ${selectedItem.arabicName}` : ''}
            </Text>
          </View>

          <Pressable
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel="Apply theme"
            hitSlop={12}
            style={[styles.headerButton, styles.applyButton, { backgroundColor: colors.primary }]}
            testID="theme-preview-apply"
          >
            <Icon name="check" size={20} color="#FFFFFF" decorative />
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
            onMomentumScrollEnd={handleScrollEnd}
            contentContainerStyle={[
              styles.carouselScroll,
              { paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_MARGIN },
            ]}
          >
            {items.map((item) => {
              const isCurrent = item.id === selectedItem.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.cardWrapper,
                    {
                      opacity: isCurrent ? 1 : 0.65,
                      transform: [{ scale: isCurrent ? 1 : 0.94 }],
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
            Islamic Themes
          </Text>
        </View>

        {/* Bottom Swatch Strip: Thumbnail cards matching reference image */}
        <View style={styles.bottomSwatchSection}>
          <ScrollView
            ref={bottomThumbScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchScrollContent}
          >
            {items.map((item, index) => {
              const isSelected = item.id === selectedItem.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectSwatch(item, index)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} theme`}
                  style={[
                    styles.thumbCardContainer,
                    isSelected && styles.thumbCardSelected,
                  ]}
                  testID={`swatch-thumb-${item.id}`}
                >
                  <View
                    style={[
                      styles.thumbBox,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2.5 : 1,
                        backgroundColor: colors.surfaceElevated,
                      },
                    ]}
                  >
                    {item.wallpaperAsset ? (
                      <Image
                        source={item.wallpaperAsset}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          styles.defaultThumbCenter,
                          { backgroundColor: '#0E442B' },
                        ]}
                      >
                        <Icon name="mosque" size={18} color="#FFFFFF" decorative />
                      </View>
                    )}

                    {/* Active Checkmark Badge */}
                    {isSelected && (
                      <View
                        style={[
                          styles.thumbCheckmarkBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Icon name="check" size={10} color="#FFFFFF" decorative />
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.thumbCardTitle,
                      {
                        color: isSelected ? colors.primary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenterCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselScroll: {
    alignItems: 'center',
    paddingVertical: 10,
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bottomSwatchSection: {
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  swatchScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  thumbCardContainer: {
    width: 66,
    alignItems: 'center',
  },
  thumbCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  thumbBox: {
    width: 58,
    height: 74,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  defaultThumbCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCheckmarkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  thumbCardTitle: {
    fontSize: 9.5,
    marginTop: 5,
    textAlign: 'center',
  },
});

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/common/Icon';
import { PhonePreviewCard } from './PhonePreviewCard';
import {
  type ThemeGalleryItem,
  type ThemeCategory,
  PURE_COLOR_THEMES,
  TEXTURE_THEMES,
  SCENERY_THEMES,
  ALL_GALLERY_THEMES,
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
  const [selectedItem, setSelectedItem] = useState<ThemeGalleryItem>(
    initialItem ?? PURE_COLOR_THEMES[0],
  );
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>(
    initialItem?.category ?? 'pure_color',
  );

  const scrollRef = useRef<ScrollView>(null);

  // Sync when initialItem changes
  useEffect(() => {
    if (initialItem) {
      setSelectedItem(initialItem);
      setActiveCategory(initialItem.category);
    }
  }, [initialItem]);

  // Current items for the active category
  const currentCategoryItems =
    activeCategory === 'pure_color'
      ? PURE_COLOR_THEMES
      : activeCategory === 'texture'
      ? TEXTURE_THEMES
      : SCENERY_THEMES;

  // Auto-scroll phone carousel to selected item index
  useEffect(() => {
    const index = currentCategoryItems.findIndex((i) => i.id === selectedItem.id);
    if (index >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: index * SNAP_INTERVAL,
        animated: true,
      });
    }
  }, [selectedItem.id, activeCategory]);

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
      <SafeAreaView style={styles.safeArea}>
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
            <Icon name="close" size={24} color="#1E293B" decorative />
          </Pressable>

          <Text style={styles.headerTitle}>Tap to Choose a Theme</Text>

          <Pressable
            onPress={handleApply}
            accessibilityRole="button"
            accessibilityLabel="Apply theme"
            hitSlop={12}
            style={styles.headerButton}
            testID="theme-preview-apply"
          >
            <Icon name="check" size={26} color="#00A3FF" decorative />
          </Pressable>
        </View>

        {/* Center: Interactive Phone Preview Carousel with peeking edges */}
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
            {currentCategoryItems.map((item) => {
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

        {/* Category Switcher Tabs */}
        <View style={styles.categoryTabRow}>
          {(['pure_color', 'texture', 'scenery'] as ThemeCategory[]).map((cat) => {
            const isCatActive = activeCategory === cat;
            const label =
              cat === 'pure_color'
                ? 'Pure Color'
                : cat === 'texture'
                ? 'Texture 👑'
                : 'Scenery 👑';
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  setActiveCategory(cat);
                  const firstInCat =
                    cat === 'pure_color'
                      ? PURE_COLOR_THEMES[0]
                      : cat === 'texture'
                      ? TEXTURE_THEMES[0]
                      : SCENERY_THEMES[0];
                  setSelectedItem(firstInCat);
                }}
                style={[
                  styles.categoryTab,
                  isCatActive && styles.categoryTabActive,
                ]}
                testID={`category-tab-${cat}`}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    isCatActive && styles.categoryTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Bottom Horizontal Swatch Strip */}
        <View style={styles.bottomSwatchSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchScrollContent}
          >
            {currentCategoryItems.map((item) => {
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
                  {/* Swatch Content */}
                  {item.category === 'pure_color' ? (
                    <View
                      style={[
                        styles.colorSwatchBox,
                        { backgroundColor: item.color },
                      ]}
                    >
                      {/* Checkmark badge inside if selected */}
                      {isSelected && (
                        <View style={styles.checkmarkBadgeInner}>
                          <Icon name="check" size={16} color="#FFFFFF" decorative />
                        </View>
                      )}
                    </View>
                  ) : item.category === 'texture' ? (
                    <View style={styles.textureSwatchBox}>
                      {item.thumbnailAsset ? (
                        <Image
                          source={item.thumbnailAsset}
                          style={styles.textureSwatchImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.textureSwatchFallback,
                            { backgroundColor: item.background },
                          ]}
                        />
                      )}
                      {/* Accent center dot */}
                      <View
                        style={[
                          styles.textureDot,
                          { backgroundColor: item.dotColor ?? item.color },
                        ]}
                      />
                      {/* Checkmark badge inside if selected */}
                      {isSelected && (
                        <View style={styles.checkmarkBadgeCorner}>
                          <Icon name="check" size={12} color="#FFFFFF" decorative />
                        </View>
                      )}
                    </View>
                  ) : (
                    /* Scenery thumbnail */
                    <View style={styles.scenerySwatchBox}>
                      {item.thumbnailAsset && (
                        <Image
                          source={item.thumbnailAsset}
                          style={styles.scenerySwatchImage}
                          resizeMode="cover"
                        />
                      )}
                      {/* Checkmark badge at bottom-right corner if selected */}
                      {isSelected && (
                        <View style={styles.checkmarkBadgeCorner}>
                          <Icon name="check" size={12} color="#FFFFFF" decorative />
                        </View>
                      )}
                    </View>
                  )}

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
    backgroundColor: '#DDF2FB',
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
    color: '#1E293B',
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
  categoryTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  categoryTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  bottomSwatchSection: {
    paddingVertical: 12,
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  textureSwatchBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  textureSwatchImage: {
    width: '100%',
    height: '100%',
  },
  textureSwatchFallback: {
    width: '100%',
    height: '100%',
  },
  textureDot: {
    position: 'absolute',
    bottom: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scenerySwatchBox: {
    width: 76,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  scenerySwatchImage: {
    width: '100%',
    height: '100%',
  },
  checkmarkBadgeInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkBadgeCorner: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00A3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 10,
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

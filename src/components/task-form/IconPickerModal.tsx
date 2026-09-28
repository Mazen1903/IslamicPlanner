import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ALL_TASK_ICONS,
  TASK_ICON_CATEGORIES,
  searchTaskIcons,
  type TaskIconCategory,
  type TaskIconDef,
} from '@/constants/taskIcons';
import { TaskCategoryIcon } from '@/components/task/TaskCategoryIcon';
import { useTheme } from '@/theme';

export interface IconPickerModalProps {
  visible: boolean;
  selectedIconId?: string | null;
  onSelectIcon: (iconId: string) => void;
  onClose: () => void;
}

export function IconPickerModal({
  visible,
  selectedIconId,
  onSelectIcon,
  onClose,
}: IconPickerModalProps) {
  const { colors, spacing, typography, radii, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TaskIconCategory>('all');

  const filteredIcons = useMemo(() => {
    return searchTaskIcons(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const handleSelect = (iconId: string) => {
    onSelectIcon(iconId);
    onClose();
  };

  const renderIconItem = ({ item }: { item: TaskIconDef }) => {
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
              ? (isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.12)')
              : pressed
              ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
              : (isDark ? 'rgba(30, 41, 59, 0.7)' : colors.surface),
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
            borderRadius: radii.card,
          },
        ]}
        testID={`icon-item-${item.id}`}
      >
        <TaskCategoryIcon
          iconId={item.id}
          size={item.imageAsset ? 42 : 24}
          color={isSelected ? colors.primary : colors.textPrimary}
        />
        <Text
          style={[
            typography.caption,
            styles.iconLabel,
            {
              color: isSelected ? colors.primary : colors.textSecondary,
              fontWeight: isSelected ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="icon-picker-modal"
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
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[typography.headlineMedium, styles.title, { color: colors.textPrimary }]}>
              Choose Task Icon
            </Text>
            <Pressable
              onPress={onClose}
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

          {/* Search Bar */}
          <View style={[styles.searchContainer, { paddingHorizontal: spacing.lg }]}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={colors.textTertiary}
                style={styles.searchIcon}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search icons (e.g. quran, gym, work)..."
                placeholderTextColor={colors.textTertiary}
                style={[
                  typography.bodyMedium,
                  styles.searchInput,
                  { color: colors.textPrimary },
                ]}
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

          {/* Category Chips */}
          <View style={styles.categoriesWrapper}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={TASK_ICON_CATEGORIES}
              keyExtractor={item => item.key}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}
              renderItem={({ item }) => {
                const isSelected = selectedCategory === item.key;
                return (
                  <Pressable
                    onPress={() => setSelectedCategory(item.key)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : pressed
                          ? colors.surfaceSecondary
                          : isDark
                          ? 'rgba(30, 41, 59, 0.6)'
                          : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radii.pill,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    testID={`category-chip-${item.key}`}
                  >
                    <Text
                      style={[
                        typography.labelMedium,
                        {
                          color: isSelected ? colors.textOnPrimary : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Icons Grid */}
          <FlatList
            data={filteredIcons}
            keyExtractor={item => item.id}
            renderItem={renderIconItem}
            numColumns={4}
            contentContainerStyle={[styles.gridContainer, { paddingHorizontal: spacing.md }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={40} color={colors.textTertiary} />
                <Text
                  style={[
                    typography.bodyMedium,
                    styles.emptyText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No icons found matching &quot;{searchQuery}&quot;
                </Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    marginTop: 12,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
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
  categoriesWrapper: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginEnd: 8,
    borderWidth: 1,
  },
  gridContainer: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  iconTile: {
    flex: 1,
    margin: 6,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    maxWidth: '25%',
  },
  iconLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
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

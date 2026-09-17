import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Icon } from '@/components/common/Icon';
import { useLocation } from '@/hooks/useLocation';
import { loadCityDataset } from '@/domain/location/cityLoader';
import { searchCities } from '@/domain/location/citySearch';
import type { CityRecord } from '@/domain/location/types';

export default function PrayerLocationScreen() {
  const { colors, spacing, radii, typography, touchTargets } = useTheme();
  const router = useRouter();
  const {
    locationMode,
    latitude,
    longitude,
    locationName,
    timezone,
    isLoading,
    error,
    requestAutoLocation,
    setManualLocation,
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [cityDataset, setCityDataset] = useState<CityRecord[]>([]);

  // Lazy load cities on-demand when entering this screen
  useEffect(() => {
    let mounted = true;
    loadCityDataset().then(data => {
      if (mounted) {
        setCityDataset(data);
        setDatasetLoaded(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Debounced search results
  const searchResults = useMemo(() => {
    if (!datasetLoaded || searchQuery.trim().length < 2) {
      return [];
    }
    return searchCities(searchQuery, 20, cityDataset);
  }, [searchQuery, datasetLoaded, cityDataset]);

  const handleSelectCity = async (city: CityRecord) => {
    const success = await setManualLocation(city);
    if (success) {
      Alert.alert('Location Updated', `Prayer location set to ${city.name} (${city.countryCode}).`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleUseCurrentLocation = async () => {
    const success = await requestAutoLocation();
    if (success) {
      Alert.alert('Location Updated', 'Automatic location detection enabled and schedule refreshed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1, minHeight: touchTargets.min, minWidth: touchTargets.min },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="location-back-button"
        >
          <Icon name="chevron-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[typography.headlineMedium, { color: colors.textPrimary }]}>Prayer Location</Text>
        <View style={{ width: touchTargets.min }} />
      </View>

      <View style={{ padding: spacing.lg }}>
        {/* Mode Status Banner */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.lg,
              padding: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <Text style={[typography.labelMedium, { color: colors.textSecondary }]}>Active Mode:</Text>
            <View
              style={[
                styles.modeBadge,
                {
                  backgroundColor: locationMode === 'AUTO' ? colors.primaryLight : colors.surfaceSecondary,
                  borderRadius: radii.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelSmall,
                  { color: locationMode === 'AUTO' ? colors.primary : colors.textPrimary },
                ]}
              >
                {locationMode === 'AUTO' ? 'AUTOMATIC (GPS)' : 'MANUAL'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusRow, { marginTop: spacing.xs }]}>
            <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Location:</Text>
            <Text style={[typography.bodyMedium, { color: colors.textPrimary, fontWeight: '600' }]}>
              {locationName ? locationName : latitude != null ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : 'Unconfigured'}
            </Text>
          </View>

          {timezone && (
            <View style={[styles.statusRow, { marginTop: spacing.xs }]}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Timezone:</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary }]}>{timezone}</Text>
            </View>
          )}

          {error && (
            <Text style={[typography.bodySmall, { color: colors.danger, marginTop: spacing.sm }]}>
              {error}
            </Text>
          )}
        </View>

        {/* Automatic Location Button */}
        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.autoButton,
            {
              backgroundColor: pressed ? colors.primaryPressed : colors.primary,
              borderRadius: radii.pill,
              minHeight: touchTargets.comfortable,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xl,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Use Current Location"
          testID="auto-location-button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <Icon name="location" size={20} color={colors.textOnPrimary} style={{ marginRight: spacing.xs }} />
              <Text style={[typography.labelLarge, { color: colors.textOnPrimary }]}>
                {locationMode === 'AUTO' ? 'Update Current Location' : 'Switch to Automatic Location'}
              </Text>
            </>
          )}
        </Pressable>

        {/* Manual City Search Section */}
        <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '700', marginBottom: spacing.xs }]}>
          Manual Location Search
        </Text>
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Search offline cities (minimum 2 characters):
        </Text>

        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              paddingHorizontal: spacing.md,
              minHeight: touchTargets.comfortable,
            },
          ]}
        >
          <Icon name="search" size={20} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={[styles.searchInput, typography.bodyMedium, { color: colors.textPrimary }]}
            placeholder="Type city name (e.g. Makkah, London, Chicago)"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoCorrect={false}
            clearButtonMode="while-editing"
            testID="city-search-input"
          />
        </View>

        {!datasetLoaded && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginLeft: spacing.sm }]}>
              Loading offline city database...
            </Text>
          </View>
        )}
      </View>

      {/* Results List */}
      <FlatList
        data={searchResults}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelectCity(item)}
            style={({ pressed }) => [
              styles.cityRow,
              {
                backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                borderBottomColor: colors.border,
                paddingVertical: spacing.md,
              },
            ]}
            testID={`city-item-${item.id}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyLarge, { color: colors.textPrimary, fontWeight: '600' }]}>
                {item.name}
                {item.adminCode ? `, ${item.adminCode}` : ''} ({item.countryCode})
              </Text>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                {item.timezone} • {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        ListEmptyComponent={
          searchQuery.trim().length >= 2 && datasetLoaded ? (
            <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }]}>
              No matching cities found.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeBadge: {
    alignSelf: 'flex-start',
  },
  autoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
});

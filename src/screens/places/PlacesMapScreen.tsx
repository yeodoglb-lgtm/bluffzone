import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { PlacesStackParamList } from '../../navigation/types';
import type { Place } from '../../types/database';
import { usePlaces } from '../../hooks/usePlaces';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';

type Props = StackScreenProps<PlacesStackParamList, 'PlacesMap'>;

export default function PlacesMapScreen({ navigation }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: places, isLoading } = usePlaces(search);

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearch(text);
    }, 300);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Place }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PlaceDetail', { placeId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>⭐ 추천</Text>
            </View>
          )}
        </View>

        {(item.address || item.road_address) && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.road_address ?? item.address}
          </Text>
        )}

        {item.games && item.games.length > 0 && (
          <View style={styles.chipRow}>
            {item.games.map((game) => (
              <View key={game} style={styles.chip}>
                <Text style={styles.chipText}>{game}</Text>
              </View>
            ))}
          </View>
        )}

        {(item.min_buyin != null || item.max_buyin != null) && (
          <Text style={styles.buyinText}>
            바이인:{' '}
            {item.min_buyin != null && item.max_buyin != null
              ? `${item.min_buyin.toLocaleString()} ~ ${item.max_buyin.toLocaleString()}`
              : item.min_buyin != null
              ? `${item.min_buyin.toLocaleString()}~`
              : `~${item.max_buyin!.toLocaleString()}`}
          </Text>
        )}
      </TouchableOpacity>
    ),
    [navigation],
  );

  const listEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {search.length > 0 ? '검색 결과가 없습니다' : '등록된 플레이스가 없습니다'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>홀덤 플레이스</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={inputValue}
          onChangeText={handleChangeText}
          placeholder="플레이스 검색"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.mapBanner}>
        <Text style={styles.mapBannerText}>
          📍 지도는 네이티브 앱에서 이용 가능합니다
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: {
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  mapBanner: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  mapBannerText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  featuredBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  featuredBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  cardAddress: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  buyinText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
});

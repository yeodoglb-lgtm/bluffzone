import React, { useState, useCallback, useMemo } from 'react';
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
import { useUserLocation, calcDistanceKm, formatDistance } from '../../hooks/useUserLocation';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';

type Props = StackScreenProps<PlacesStackParamList, 'PlacesMap'>;
type SortMode = 'distance' | 'name';

export default function PlacesMapScreen({ navigation }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: places, isLoading } = usePlaces(search);
  // 진입 시 자동으로 위치 권한 요청
  const userLocation = useUserLocation(true);

  // 거리 계산 + 정렬
  const placesWithDistance = useMemo(() => {
    if (!places) return [];
    const list = places.map((p) => {
      const lat = (p as any).lat;
      const lng = (p as any).lng;
      const distKm =
        userLocation.location && lat != null && lng != null
          ? calcDistanceKm(userLocation.location, { lat, lng })
          : null;
      return { ...p, _distKm: distKm };
    });
    if (sortMode === 'distance' && userLocation.location) {
      list.sort((a, b) => {
        if (a._distKm == null) return 1;
        if (b._distKm == null) return -1;
        return a._distKm - b._distKm;
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [places, userLocation.location, sortMode]);

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSearch(text);
    }, 300);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Place & { _distKm?: number | null } }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PlaceDetail', { placeId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {item._distKm != null && (
            <View style={styles.distBadge}>
              <Text style={styles.distBadgeText}>📍 {formatDistance(item._distKm)}</Text>
            </View>
          )}
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
          placeholder="펍명, 지역, 주소 검색"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* 위치 권한 상태 배너 */}
      {userLocation.status === 'loading' && (
        <View style={styles.locBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.locBannerText}>위치 정보를 받는 중…</Text>
        </View>
      )}
      {userLocation.status === 'denied' && (
        <View style={[styles.locBanner, styles.locBannerWarn]}>
          <Text style={styles.locBannerEmoji}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.locBannerText}>
              위치 권한이 거부되어 거리순 정렬이 안 돼요
            </Text>
            <Text style={styles.locBannerSub}>
              브라우저 주소창 옆 자물쇠 아이콘 → 위치 허용
            </Text>
          </View>
          <TouchableOpacity onPress={userLocation.request} style={styles.locBannerBtn}>
            <Text style={styles.locBannerBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}
      {userLocation.status === 'unsupported' && (
        <View style={[styles.locBanner, styles.locBannerWarn]}>
          <Text style={styles.locBannerEmoji}>⚠️</Text>
          <Text style={styles.locBannerText}>이 환경에선 위치 정보 미지원</Text>
        </View>
      )}

      {/* 정렬 토글 */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.sortBtn, sortMode === 'distance' && styles.sortBtnActive]}
          onPress={() => setSortMode('distance')}
          disabled={!userLocation.location}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.sortBtnText,
              sortMode === 'distance' && styles.sortBtnTextActive,
              !userLocation.location && styles.sortBtnDisabled,
            ]}
          >
            📍 거리순
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortBtn, sortMode === 'name' && styles.sortBtnActive]}
          onPress={() => setSortMode('name')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortBtnText, sortMode === 'name' && styles.sortBtnTextActive]}>
            🔤 이름순
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={styles.totalText}>총 {placesWithDistance.length}곳</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={placesWithDistance}
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
  locBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  locBannerWarn: {
    backgroundColor: `${colors.warning}11`,
    borderColor: `${colors.warning}55`,
  },
  locBannerEmoji: { fontSize: 18 },
  locBannerText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  locBannerSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  locBannerBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locBannerBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  sortBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortBtnText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  sortBtnTextActive: { color: colors.bg, fontWeight: fontWeight.bold },
  sortBtnDisabled: { opacity: 0.4 },
  totalText: { fontSize: fontSize.xs, color: colors.textMuted },
  distBadge: {
    backgroundColor: `${colors.primary}22`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  distBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
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

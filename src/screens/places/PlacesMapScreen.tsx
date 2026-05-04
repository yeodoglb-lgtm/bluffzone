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
import KakaoMap from '../../components/KakaoMap';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';

type Props = StackScreenProps<PlacesStackParamList, 'PlacesMap'>;
type ViewMode = 'map' | 'list';
type SortMode = 'distance' | 'name';

export default function PlacesMapScreen({ navigation }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: places, isLoading } = usePlaces(search);
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

  const selectedPlace = useMemo(
    () => placesWithDistance.find((p) => p.id === selectedId),
    [placesWithDistance, selectedId]
  );

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(text), 300);
  }, []);

  const formatBuyin = (p: Place) => {
    if (p.min_buyin == null && p.max_buyin == null) return '';
    if (p.min_buyin != null && p.max_buyin != null) {
      return `${(p.min_buyin / 1000).toFixed(0)}k~${(p.max_buyin / 1000).toFixed(0)}k`;
    }
    return p.min_buyin != null ? `${(p.min_buyin / 1000).toFixed(0)}k~` : `~${(p.max_buyin! / 1000).toFixed(0)}k`;
  };

  const renderListItem = useCallback(
    ({ item }: { item: Place & { _distKm?: number | null } }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PlaceDetail', { placeId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
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
          <Text style={styles.cardAddress} numberOfLines={1}>{item.road_address ?? item.address}</Text>
        )}
        {item.games && item.games.length > 0 && (
          <View style={styles.chipRow}>
            {item.games.map((g) => (
              <View key={g} style={styles.chip}>
                <Text style={styles.chipText}>{g}</Text>
              </View>
            ))}
          </View>
        )}
        {(item.min_buyin != null || item.max_buyin != null) && (
          <Text style={styles.buyinText}>바이인: {formatBuyin(item)}</Text>
        )}
      </TouchableOpacity>
    ),
    [navigation]
  );

  const markers = useMemo(
    () =>
      placesWithDistance
        .filter((p) => (p as any).lat != null && (p as any).lng != null)
        .map((p) => ({
          id: p.id,
          lat: (p as any).lat,
          lng: (p as any).lng,
          name: p.name,
          subtitle: formatBuyin(p),
          selected: p.id === selectedId,
        })),
    [placesWithDistance, selectedId]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 + 검색 */}
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

      {viewMode === 'map' ? (
        // ── 지도 모드 ─────────────────────────────────────
        <View style={styles.mapWrap}>
          <KakaoMap
            height={9999} // flex 채움
            center={userLocation.location ?? { lat: 37.5665, lng: 126.9780 }}
            userLocation={userLocation.location}
            markers={markers}
            onMarkerClick={(id) => setSelectedId(id)}
          />

          {/* 우측 하단 플로팅 — 내 위치 / 목록 보기 */}
          <View style={styles.fabCol}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => userLocation.request()}
              activeOpacity={0.8}
            >
              <Text style={styles.fabIcon}>🎯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
            >
              <Text style={styles.fabIcon}>☰</Text>
              <Text style={styles.fabLabel}>목록</Text>
            </TouchableOpacity>
          </View>

          {/* 위치 권한 거부 안내 */}
          {userLocation.status === 'denied' && (
            <View style={styles.locTopBanner}>
              <Text style={styles.locTopBannerText}>📍 위치 권한 거부됨</Text>
              <TouchableOpacity onPress={userLocation.request} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 선택된 펍 하단 카드 */}
          {selectedPlace && (
            <View style={styles.bottomCard}>
              <View style={styles.bottomCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bottomCardName} numberOfLines={1}>{selectedPlace.name}</Text>
                  {(selectedPlace.address || selectedPlace.road_address) && (
                    <Text style={styles.bottomCardAddr} numberOfLines={1}>
                      {selectedPlace.road_address ?? selectedPlace.address}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bottomCardMeta}>
                {selectedPlace._distKm != null && (
                  <Text style={styles.bottomCardMetaText}>
                    📍 내 위치 {formatDistance(selectedPlace._distKm)}
                  </Text>
                )}
                {(selectedPlace.min_buyin != null || selectedPlace.max_buyin != null) && (
                  <Text style={styles.bottomCardMetaText}>
                    바이인 {formatBuyin(selectedPlace)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.bottomCardBtn}
                onPress={() => navigation.navigate('PlaceDetail', { placeId: selectedPlace.id })}
                activeOpacity={0.85}
              >
                <Text style={styles.bottomCardBtnText}>상세보기 →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        // ── 목록 모드 ─────────────────────────────────────
        <View style={{ flex: 1 }}>
          <View style={styles.listToolbar}>
            <TouchableOpacity
              style={[styles.sortBtn, sortMode === 'distance' && styles.sortBtnActive]}
              onPress={() => setSortMode('distance')}
              disabled={!userLocation.location}
            >
              <Text style={[
                styles.sortBtnText,
                sortMode === 'distance' && styles.sortBtnTextActive,
                !userLocation.location && styles.sortBtnDisabled,
              ]}>📍 거리순</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, sortMode === 'name' && styles.sortBtnActive]}
              onPress={() => setSortMode('name')}
            >
              <Text style={[styles.sortBtnText, sortMode === 'name' && styles.sortBtnTextActive]}>🔤 이름순</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={styles.totalText}>총 {placesWithDistance.length}곳</Text>
            <TouchableOpacity style={styles.mapToggleBtn} onPress={() => setViewMode('map')}>
              <Text style={styles.mapToggleText}>🗺️ 지도</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={placesWithDistance}
              keyExtractor={(item) => item.id}
              renderItem={renderListItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {search.length > 0 ? '검색 결과가 없습니다' : '등록된 플레이스가 없습니다'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
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
  searchIcon: { fontSize: fontSize.base, marginRight: spacing.sm },
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: fontSize.base, color: colors.text },

  // 지도 영역
  mapWrap: { flex: 1, position: 'relative' },
  fabCol: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    gap: spacing.sm,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fabIcon: { fontSize: 18 },
  fabLabel: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  locTopBanner: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.warning}55`,
  },
  locTopBannerText: { fontSize: fontSize.xs, color: colors.text, flex: 1 },
  retryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  bottomCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: spacing.sm,
  },
  bottomCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bottomCardName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  bottomCardAddr: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.textMuted },
  bottomCardMeta: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  bottomCardMetaText: { fontSize: fontSize.xs, color: colors.textMuted },
  bottomCardBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  bottomCardBtnText: { fontSize: fontSize.sm, color: colors.bg, fontWeight: fontWeight.bold },

  // 목록 모드
  listToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sortBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  sortBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortBtnText: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium },
  sortBtnTextActive: { color: colors.bg, fontWeight: fontWeight.bold },
  sortBtnDisabled: { opacity: 0.4 },
  totalText: { fontSize: fontSize.xs, color: colors.textMuted },
  mapToggleBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mapToggleText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.base, paddingBottom: spacing.xl, flexGrow: 1 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardName: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  featuredBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  featuredBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  cardAddress: { fontSize: fontSize.sm, color: colors.textMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textMuted },
  buyinText: { fontSize: fontSize.sm, color: colors.textMuted },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl * 2 },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted },
  distBadge: {
    backgroundColor: `${colors.primary}22`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  distBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
});

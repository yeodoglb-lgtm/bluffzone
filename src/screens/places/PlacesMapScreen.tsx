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
type SortMode = 'distance' | 'name';

export default function PlacesMapScreen({ navigation }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: places, isLoading } = usePlaces(search);
  const userLocation = useUserLocation(true);

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

  // 마커 선택 시 해당 위치로 지도 이동
  React.useEffect(() => {
    if (!selectedPlace) return;
    const lat = (selectedPlace as any).lat;
    const lng = (selectedPlace as any).lng;
    if (lat != null && lng != null) {
      setPanTarget({ lat, lng, ts: Date.now() });
    }
  }, [selectedId]);

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

  const renderListItem = useCallback(
    ({ item }: { item: Place & { _distKm?: number | null } }) => (
      <TouchableOpacity
        style={[styles.card, item.id === selectedId && styles.cardSelected]}
        activeOpacity={0.7}
        onPress={() => setSelectedId(item.id)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {item._distKm != null && (
            <View style={styles.distBadge}>
              <Text style={styles.distBadgeText}>📍 {formatDistance(item._distKm)}</Text>
            </View>
          )}
        </View>
        {(item.address || item.road_address) && (
          <Text style={styles.cardAddress} numberOfLines={1}>{item.road_address ?? item.address}</Text>
        )}
        <View style={styles.cardMetaRow}>
          {(item.min_buyin != null || item.max_buyin != null) && (
            <Text style={styles.cardMetaText}>💰 {formatBuyin(item)}</Text>
          )}
          {item.games && item.games.length > 0 && (
            <Text style={styles.cardMetaText}>🃏 {item.games.join(' / ')}</Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [selectedId]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>플레이스</Text>
      </View>
      {/* 검색 */}
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

      {/* 위치 권한 거부 안내 */}
      {userLocation.status === 'denied' && (
        <View style={styles.locWarn}>
          <Text style={styles.locWarnText}>📍 위치 권한 거부됨 — 거리순 정렬 사용 불가</Text>
          <TouchableOpacity onPress={userLocation.request} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 지도 영역 (상단 50%) */}
      <View style={styles.mapWrap}>
        <KakaoMap
          center={userLocation.location ?? { lat: 37.5665, lng: 126.9780 }}
          userLocation={userLocation.location}
          markers={markers}
          onMarkerClick={(id) => setSelectedId(id)}
          panTarget={panTarget}
        />
        {/* 내 위치 플로팅 버튼 */}
        <TouchableOpacity
          style={styles.locFab}
          onPress={() => {
            if (userLocation.location) {
              // 이미 받은 위치로 즉시 지도 이동
              setPanTarget({ ...userLocation.location, ts: Date.now() });
            }
            // 최신 위치 다시 요청 (받아지면 status가 granted로 갱신됨)
            userLocation.request();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.locFabIcon}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 영역 — 선택된 펍이 있으면 카드, 없으면 리스트 */}
      <View style={styles.bottomArea}>
        {selectedPlace ? (
          // 선택된 펍 카드
          <View style={styles.selectedCard}>
            <View style={styles.selectedHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName} numberOfLines={1}>{selectedPlace.name}</Text>
                {(selectedPlace.address || selectedPlace.road_address) && (
                  <Text style={styles.selectedAddr} numberOfLines={1}>
                    {selectedPlace.road_address ?? selectedPlace.address}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedId(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectedMetaRow}>
              {selectedPlace._distKm != null && (
                <Text style={styles.selectedMeta}>📍 {formatDistance(selectedPlace._distKm)}</Text>
              )}
              {(selectedPlace.min_buyin != null || selectedPlace.max_buyin != null) && (
                <Text style={styles.selectedMeta}>💰 {formatBuyin(selectedPlace)}</Text>
              )}
              {selectedPlace.games && selectedPlace.games.length > 0 && (
                <Text style={styles.selectedMeta}>🃏 {selectedPlace.games.join(' / ')}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.selectedBtn}
              onPress={() => navigation.navigate('PlaceDetail', { placeId: selectedPlace.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.selectedBtnText}>상세보기 →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // 펍 리스트 (정렬 토글 포함)
          <>
            <View style={styles.toolbar}>
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
            </View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.primary} />
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
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: { fontSize: fontSize.base, marginRight: spacing.sm },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.base, color: colors.text },

  // 위치 권한 경고 배너
  locWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.warning}11`,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.warning}55`,
  },
  locWarnText: { flex: 1, fontSize: fontSize.xs, color: colors.text },
  retryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },

  // 지도 영역 (상단 50%)
  mapWrap: { flex: 1, position: 'relative', minHeight: 200 },
  locFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  locFabIcon: { fontSize: 18 },

  // 하단 영역
  bottomArea: { flex: 1, borderTopWidth: 1, borderTopColor: colors.line },

  // 선택된 펍 카드
  selectedCard: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  selectedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  selectedName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  selectedAddr: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.textMuted },
  selectedMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  selectedMeta: { fontSize: fontSize.sm, color: colors.text },
  selectedBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: 4,
  },
  selectedBtnText: { fontSize: fontSize.sm, color: colors.bg, fontWeight: fontWeight.bold },

  // 리스트 정렬 툴바
  toolbar: {
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

  loadingContainer: { padding: spacing.lg, alignItems: 'center' },
  listContent: { padding: spacing.base, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.sm,
    gap: 4,
  },
  cardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardName: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  cardAddress: { fontSize: fontSize.xs, color: colors.textMuted },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 2 },
  cardMetaText: { fontSize: fontSize.xs, color: colors.textMuted },

  emptyContainer: { padding: spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted },

  distBadge: {
    backgroundColor: `${colors.primary}22`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  distBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary },
});

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { PlacesStackParamList } from '../../navigation/types';
import { usePlace } from '../../hooks/usePlaces';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';

type Props = StackScreenProps<PlacesStackParamList, 'PlaceDetail'>;

const DAY_KO: Record<string, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function PlaceDetailScreen({ route, navigation }: Props) {
  const { placeId } = route.params;
  const { data: place, isLoading } = usePlace(placeId);

  if (isLoading) {
    return (
      <View style={styles.fullLoading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!place) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>플레이스</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.fullLoading}>
          <Text style={styles.notFoundText}>플레이스를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedDays = place.hours
    ? DAY_ORDER.filter((d) => place.hours![d])
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.placeName}>{place.name}</Text>
          {place.featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>⭐ 추천</Text>
            </View>
          )}
        </View>

        {(place.address || place.road_address) && (
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>
              {place.road_address ?? place.address}
            </Text>
          </View>
        )}

        {place.phone && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${place.phone!.replace(/-/g, '')}`)}
            activeOpacity={0.6}
          >
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={[styles.infoText, styles.infoTextLink]}>{place.phone}</Text>
            <Text style={styles.callBtn}>전화걸기</Text>
          </TouchableOpacity>
        )}

        {/* 길찾기 / 카카오맵 연동 — 좌표 있으면 노출 */}
        {((place as any).lat != null && (place as any).lng != null) && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const lat = (place as any).lat;
                const lng = (place as any).lng;
                const name = encodeURIComponent(place.name);
                // 카카오맵: https://map.kakao.com/link/to/{name},{lat},{lng}
                const url = `https://map.kakao.com/link/to/${name},${lat},${lng}`;
                Linking.openURL(url);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>🗺️ 카카오맵 길찾기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const lat = (place as any).lat;
                const lng = (place as any).lng;
                const name = encodeURIComponent(place.name);
                // 네이버맵: nmap://place?lat=...&lng=...&name=...
                const naverUrl = Platform.OS === 'web'
                  ? `https://map.naver.com/p/search/${name}`
                  : `nmap://place?lat=${lat}&lng=${lng}&name=${name}&appname=bluffzone.kr`;
                Linking.openURL(naverUrl);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>🌍 네이버맵</Text>
            </TouchableOpacity>
          </View>
        )}

        {place.games && place.games.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>게임 종류</Text>
            <View style={styles.chipRow}>
              {place.games.map((game) => (
                <View key={game} style={styles.chip}>
                  <Text style={styles.chipText}>{game}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(place.min_buyin != null || place.max_buyin != null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>바이인</Text>
            <Text style={styles.buyinText}>
              {place.min_buyin != null && place.max_buyin != null
                ? `${place.min_buyin.toLocaleString()} ~ ${place.max_buyin.toLocaleString()}`
                : place.min_buyin != null
                ? `${place.min_buyin.toLocaleString()} ~`
                : `~ ${place.max_buyin!.toLocaleString()}`}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>영업시간</Text>
          {sortedDays.length > 0 ? (
            <View style={styles.hoursContainer}>
              {sortedDays.map((day) => {
                const slot = place.hours![day];
                return (
                  <View key={day} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{DAY_KO[day] ?? day}</Text>
                    <Text style={styles.hoursTime}>
                      {slot.open} ~ {slot.close}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHours}>
              영업시간 정보 없음 — {place.phone ? '전화 문의' : '문의 필요'}
            </Text>
          )}
        </View>

        {place.amenities && place.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>편의시설</Text>
            <View style={styles.chipRow}>
              {place.amenities.map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {place.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>소개</Text>
            <Text style={styles.descriptionText}>{place.description}</Text>
          </View>
        )}

        {/* 사진 — 있으면 가로 스크롤, 없으면 안내 */}
        {(place as any).photos && (place as any).photos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>사진</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {((place as any).photos as string[]).map((url, i) => (
                <View key={i} style={styles.photoItem}>
                  <Text style={styles.photoPlaceholder}>📷</Text>
                  <Text style={styles.photoUrl} numberOfLines={1}>{url}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* 면책 고지 — 회색지대 회피, 매장 자율 운영 명시 */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>ⓘ 안내</Text>
          <Text style={styles.disclaimerText}>
            본 정보는 매장이 직접 제공한 토너먼트 및 운영 정보만 표시합니다.
            그 외 운영 사항은 각 매장에 직접 문의해주세요.
            {'\n\n'}
            블러프존은 매장 운영에 관여하지 않으며,
            불법 사행행위를 권장하거나 중개하지 않습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fullLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  notFoundText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: fontSize.xl,
    color: colors.text,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  placeName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flexShrink: 1,
  },
  featuredBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  featuredBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.5,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: fontSize.base * 1.5,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  buyinText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  hoursContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  hoursDay: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    width: 24,
  },
  hoursTime: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  descriptionText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    lineHeight: fontSize.base * 1.6,
  },
  infoTextLink: { color: colors.primary, textDecorationLine: 'underline' },
  callBtn: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold },
  emptyHours: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
  },
  photoScroll: { flexDirection: 'row' },
  photoItem: {
    width: 120,
    height: 90,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  photoPlaceholder: { fontSize: 24 },
  photoUrl: { fontSize: 9, color: colors.textMuted, marginTop: 4 },

  disclaimer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.xs,
  },
  disclaimerTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: fontSize.xs * 1.7,
  },
});

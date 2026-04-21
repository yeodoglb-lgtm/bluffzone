import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
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
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={styles.infoText}>{place.phone}</Text>
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

        {sortedDays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>영업시간</Text>
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
          </View>
        )}

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
});

// /home 경로 자동 리다이렉트 → / (메인 대시보드)
//
// 과거에 /home을 별도 미리보기 페이지로 운영했으나, /와 통합.
// 구글 광고 등 외부 링크가 /home을 참조할 수 있어 호환성 유지를 위해
// 라우트는 살아있되 즉시 / 로 리다이렉트.

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<RootStackParamList>;

export default function PreviewHomeScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    // 웹: URL을 / 로 바꾸기 (히스토리에도 반영, 뒤로가기 시 /home으로 안 돌아옴)
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, '', '/');
      } catch { /* ignore */ }
    }
    // 네비게이션 스택: Main(Dashboard)으로 즉시 이동
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' as const }],
    } as any);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

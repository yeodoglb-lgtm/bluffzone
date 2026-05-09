// react-native-calendars Calendar를 lazy load로 감싸는 래퍼
// 메인 번들에 포함되지 않고 BankrollCalendar 진입 시 다운로드 → 첫 페이지 LCP 개선

import React, { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';

const Calendar = React.lazy(() =>
  import('react-native-calendars').then(m => ({ default: m.Calendar as any }))
);

function CalendarFallback() {
  return (
    <View style={{ height: 350, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} size="small" />
    </View>
  );
}

export default function LazyCalendar(props: any) {
  return (
    <Suspense fallback={<CalendarFallback />}>
      <Calendar {...props} />
    </Suspense>
  );
}

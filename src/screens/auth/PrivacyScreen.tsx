import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

export default function PrivacyScreen() {
  const navigation = useNavigation();
  const { height: viewportHeight } = useWindowDimensions();
  // 웹에서 ScrollView 높이 계산이 불안정해 내부 스크롤 발동 안 하던 이슈 회피.
  const webScrollStyle = Platform.OS === 'web' ? { height: viewportHeight - 60 } : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>개인정보처리방침</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={webScrollStyle} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>최종 업데이트: 2026년 4월 26일</Text>

        <Text style={styles.intro}>
          BluffZone(이하 "회사")은 정보주체의 개인정보를 매우 중요시하며, 「개인정보 보호법」 및 관련 법령을 준수합니다. 본 방침은 회사가 처리하는 개인정보의 항목·목적·보유기간·제3자 제공 등 처리 전반에 관한 사항을 안내합니다.
        </Text>

        <Text style={styles.h2}>1. 수집하는 개인정보 항목</Text>
        <Text style={styles.p}>
          회사는 회원가입 및 서비스 제공을 위해 다음 정보를 수집합니다.{'\n\n'}
          <Text style={styles.bold}>[필수]</Text>{'\n'}
          • 이메일 주소 (계정 식별 및 로그인){'\n'}
          • 비밀번호 (암호화되어 저장됨){'\n'}
          • 닉네임 (서비스 내 표시){'\n\n'}
          <Text style={styles.bold}>[서비스 이용 과정에서 자동 생성]</Text>{'\n'}
          • 핸드 기록 데이터 (포지션·카드·액션·금액·메모 등){'\n'}
          • 뱅크롤(자금) 입출금 기록{'\n'}
          • 음성 데이터 (음성 입력 기능 사용 시 일시 처리){'\n'}
          • AI 채팅·리뷰 요청 텍스트 및 응답{'\n'}
          • 서비스 이용 로그 및 사용량 통계{'\n'}
          • 기기 정보 (OS, 브라우저, IP 주소)
        </Text>

        <Text style={styles.h2}>2. 개인정보 처리 목적</Text>
        <Text style={styles.p}>
          회사는 수집한 개인정보를 다음 목적에 한해 처리하며, 목적이 변경되는 경우 사전 동의를 받습니다.{'\n\n'}
          • 회원 식별 및 로그인 인증{'\n'}
          • 서비스 제공(핸드 기록·뱅크롤 관리·AI 분석 등){'\n'}
          • 서비스 개선 및 신규 기능 개발{'\n'}
          • 사용량 한도 관리 및 부정 이용 방지{'\n'}
          • 고객 문의·민원 처리{'\n'}
          • 통계 분석(비식별 처리){'\n'}
          • 법령상 의무 이행
        </Text>

        <Text style={styles.h2}>3. 개인정보 보유 및 이용 기간</Text>
        <Text style={styles.p}>
          • 회원 정보: 회원 탈퇴 시까지 보유. 탈퇴 시 즉시 파기.{'\n'}
          • 핸드/뱅크롤 콘텐츠: 회원 탈퇴 시 즉시 파기.{'\n'}
          • 음성 데이터: AI 변환 처리 직후 즉시 파기. 별도 저장하지 않음.{'\n'}
          • AI 채팅·리뷰 텍스트: 회원이 직접 삭제하거나 탈퇴 시 파기.{'\n'}
          • 사용량 로그: 부정 이용 방지 및 통계 목적으로 1년간 보유.{'\n'}
          • 단, 「전자상거래법」 등 관련 법령에서 보존을 요구하는 경우 해당 기간 동안 보존합니다.
        </Text>

        <Text style={styles.h2}>4. 개인정보의 제3자 제공</Text>
        <Text style={styles.p}>
          회사는 회원의 개인정보를 별도 동의 없이 제3자에게 제공·판매하지 않습니다. 다만 다음의 경우는 예외입니다.{'\n\n'}
          • 회원이 사전에 동의한 경우{'\n'}
          • 법령에 의거하거나 수사기관의 적법한 요청이 있는 경우
        </Text>

        <Text style={styles.h2}>5. 개인정보 처리 위탁</Text>
        <Text style={styles.p}>
          회사는 서비스 제공을 위해 다음 업체에 개인정보 처리를 위탁하고 있습니다. 처리 위탁은 「개인정보 보호법」에 따른 위탁 계약에 의거하여 안전하게 관리됩니다.{'\n\n'}
          <Text style={styles.bold}>[위탁 업체 및 위탁 업무]</Text>
        </Text>

        <View style={styles.tableBox}>
          <Text style={styles.tableHead}>● Supabase, Inc. (미국)</Text>
          <Text style={styles.tableBody}>위탁 업무: 회원 인증, 데이터베이스 호스팅, 서버 운영{'\n'}처리 항목: 이메일·암호화된 비밀번호·핸드/뱅크롤 데이터·AI 사용 로그</Text>
        </View>

        <View style={styles.tableBox}>
          <Text style={styles.tableHead}>● OpenAI, Inc. (미국)</Text>
          <Text style={styles.tableBody}>위탁 업무: AI 핸드 리뷰, AI 채팅, 음성 → 텍스트 변환(Whisper), 음성 → 핸드 자동 변환{'\n'}처리 항목: 회원이 입력한 텍스트·음성 데이터, 핸드 기록 일부{'\n'}처리 위치: OpenAI 서버 (미국){'\n'}{'\n'}<Text style={styles.bold}>※ OpenAI는 API로 전송된 데이터를 모델 학습에 사용하지 않습니다.</Text>{'\n'}자세한 내용: https://openai.com/policies/api-data-usage-policies</Text>
        </View>

        <View style={styles.tableBox}>
          <Text style={styles.tableHead}>● Vercel, Inc. (미국)</Text>
          <Text style={styles.tableBody}>위탁 업무: 웹 서비스 호스팅 및 배포{'\n'}처리 항목: 접속 로그·IP 주소</Text>
        </View>

        <Text style={styles.p}>
          {'\n'}
          위탁받은 업체는 위탁 목적 외 사용이 금지되며, 회사는 위탁 업체의 개인정보 보호 조치를 정기적으로 점검합니다.
        </Text>

        <Text style={styles.h2}>6. 국외 이전 안내</Text>
        <Text style={styles.p}>
          위 위탁 업체들은 미국에 위치한 서버에서 데이터를 처리합니다. 회원이 본 방침에 동의함으로써 다음 국외 이전에 동의한 것으로 간주됩니다.{'\n\n'}
          • 이전 국가: 미국{'\n'}
          • 이전 항목: 위 5번에 명시한 항목{'\n'}
          • 이전 시점: 서비스 이용 시 실시간{'\n'}
          • 이전 방법: HTTPS 암호화 통신{'\n'}
          • 이전받는 자: 위 5번에 명시한 위탁 업체
        </Text>

        <Text style={styles.h2}>7. 정보주체의 권리</Text>
        <Text style={styles.p}>
          회원은 언제든 다음 권리를 행사할 수 있습니다.{'\n\n'}
          • 개인정보 열람·정정·삭제 요청 (앱 내 설정 화면){'\n'}
          • 개인정보 처리 정지 요청{'\n'}
          • 회원 탈퇴 (앱 내 설정 → 탈퇴){'\n'}
          • 본 방침 변경에 대한 거부권 행사{'\n\n'}
          위 권리는 앱 내 기능 또는 고객 문의를 통해 행사할 수 있으며, 회사는 정당한 사유 없이 즉시 처리합니다.
        </Text>

        <Text style={styles.h2}>8. 개인정보의 안전성 확보 조치</Text>
        <Text style={styles.p}>
          • 비밀번호 단방향 암호화 저장 (bcrypt){'\n'}
          • HTTPS(TLS) 암호화 통신{'\n'}
          • 데이터베이스 행 단위 접근 제어(RLS, Row Level Security){'\n'}
          • 정기적 접근 권한 검토 및 보안 패치 적용{'\n'}
          • 인가받지 않은 자의 접근 차단
        </Text>

        <Text style={styles.h2}>9. 쿠키 사용</Text>
        <Text style={styles.p}>
          회사는 로그인 세션 유지를 위한 쿠키만 사용하며, 광고 추적용 쿠키는 사용하지 않습니다.
        </Text>

        <Text style={styles.h2}>10. 만 14세 미만 아동의 개인정보</Text>
        <Text style={styles.p}>
          회사는 만 14세 미만 아동의 회원가입을 허용하지 않습니다. 본 서비스는 만 19세 이상만 이용 가능합니다.
        </Text>

        <Text style={styles.h2}>11. 개인정보 보호책임자</Text>
        <Text style={styles.p}>
          회사는 개인정보 처리에 관한 책임자를 다음과 같이 지정하고 있습니다.{'\n\n'}
          • 책임자: BluffZone 운영팀{'\n'}
          • 연락처: 앱 내 "설정 → 문의하기" 메뉴{'\n\n'}
          개인정보 침해 신고는 다음 기관에 접수할 수 있습니다.{'\n'}
          • 개인정보침해신고센터: privacy.kisa.or.kr / 국번 없이 118{'\n'}
          • 개인정보분쟁조정위원회: kopico.go.kr / 1833-6972{'\n'}
          • 대검찰청 사이버범죄수사단: 02-3480-3573{'\n'}
          • 경찰청 사이버안전국: cyberbureau.police.go.kr / 국번 없이 182
        </Text>

        <Text style={styles.h2}>12. 방침 변경</Text>
        <Text style={styles.p}>
          본 방침은 법령·정책 변경에 따라 수정될 수 있으며, 변경 시 앱 내 공지를 통해 안내합니다. 회원에게 불리한 변경의 경우 30일 전 공지합니다.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  backBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  backText: { color: colors.primary, fontSize: fontSize.base },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  content: { padding: spacing.base },
  lastUpdated: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.lg },
  intro: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22, marginBottom: spacing.md },
  h2: {
    fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  p: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  bold: { fontWeight: fontWeight.bold, color: colors.text },
  tableBox: {
    backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line,
    padding: spacing.sm, marginTop: spacing.sm,
  },
  tableHead: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: spacing.xs },
  tableBody: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
});

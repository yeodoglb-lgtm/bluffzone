import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

export default function TermsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>이용약관</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>최종 업데이트: 2026년 4월 26일</Text>

        <Text style={styles.h2}>제1조 (목적)</Text>
        <Text style={styles.p}>
          본 약관은 BluffZone(이하 "회사")이 제공하는 모바일/웹 애플리케이션 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 회원 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </Text>

        <Text style={styles.h2}>제2조 (용어의 정의)</Text>
        <Text style={styles.p}>
          1. "서비스"란 회사가 제공하는 포커 핸드 기록, 뱅크롤 관리, AI 기반 핸드 리뷰 및 채팅 등 모든 기능을 의미합니다.{'\n'}
          2. "회원"이란 본 약관에 동의하고 서비스 이용 자격을 부여받은 자를 말합니다.{'\n'}
          3. "콘텐츠"란 회원이 서비스 내에 입력·기록한 핸드 정보, 음성 데이터, 텍스트 메모, 통계 데이터 등을 포함합니다.
        </Text>

        <Text style={styles.h2}>제3조 (약관의 효력 및 변경)</Text>
        <Text style={styles.p}>
          1. 본 약관은 회원이 가입 시 동의함으로써 효력이 발생합니다.{'\n'}
          2. 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 최소 7일 전 공지합니다. 회원에게 불리한 변경의 경우 30일 전 공지합니다.{'\n'}
          3. 회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.
        </Text>

        <Text style={styles.h2}>제4조 (회원가입)</Text>
        <Text style={styles.p}>
          1. 회원가입은 만 19세 이상만 가능합니다.{'\n'}
          2. 회원은 가입 시 정확하고 진실된 정보를 제공해야 하며, 허위 정보 제공으로 발생한 불이익은 회원 본인이 책임집니다.{'\n'}
          3. 회사는 다음 각 호에 해당하는 신청에 대해 가입을 거절하거나 사후 해지할 수 있습니다.{'\n'}
          {'  '}- 타인의 명의를 도용한 경우{'\n'}
          {'  '}- 본 약관 또는 관련 법령을 위반한 경우{'\n'}
          {'  '}- 만 19세 미만인 경우
        </Text>

        <Text style={styles.h2}>제5조 (서비스의 제공 및 변경)</Text>
        <Text style={styles.p}>
          1. 회사는 다음과 같은 서비스를 제공합니다.{'\n'}
          {'  '}- 포커 핸드 기록 및 분석{'\n'}
          {'  '}- 뱅크롤(자금) 관리 및 통계{'\n'}
          {'  '}- AI 기반 핸드 리뷰 및 채팅 (OpenAI API 연동){'\n'}
          {'  '}- 음성 입력 자동 변환 (OpenAI Whisper API 연동){'\n'}
          {'  '}- 홀덤 플레이스 정보 제공{'\n'}
          2. 회사는 운영상·기술상 필요에 따라 서비스 내용을 변경할 수 있으며, 변경 시 사전 공지합니다.{'\n'}
          3. AI 기능은 월별 무료 사용 한도가 적용되며, 한도 초과 시 다음 달까지 해당 기능을 이용할 수 없습니다.
        </Text>

        <Text style={styles.h2}>제6조 (서비스 이용 시간)</Text>
        <Text style={styles.p}>
          서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 점검·교체·서버 장애 등 부득이한 경우 일시 중단될 수 있으며, 가능한 한 사전 공지합니다.
        </Text>

        <Text style={styles.h2}>제7조 (회원의 의무)</Text>
        <Text style={styles.p}>
          회원은 다음 행위를 해서는 안 됩니다.{'\n'}
          1. 타인의 정보 도용{'\n'}
          2. 서비스를 이용한 불법 도박 또는 사행 행위{'\n'}
          3. 회사의 서비스 정보를 무단 복제·배포{'\n'}
          4. 자동화된 수단(봇·크롤러 등)을 통한 비정상적 서비스 이용{'\n'}
          5. AI 기능을 악의적·반복적으로 호출하여 시스템에 부하를 주는 행위{'\n'}
          6. 기타 관련 법령에 위배되는 행위
        </Text>

        <Text style={styles.h2}>제8조 (회사의 의무)</Text>
        <Text style={styles.p}>
          1. 회사는 안정적·지속적 서비스 제공을 위해 노력합니다.{'\n'}
          2. 회사는 회원의 개인정보 보호를 위해 보안 시스템을 갖추고 개인정보처리방침을 준수합니다.{'\n'}
          3. 회사는 서비스 이용과 관련한 회원의 의견·불만에 합리적 기간 내 처리합니다.
        </Text>

        <Text style={styles.h2}>제9조 (콘텐츠의 권리)</Text>
        <Text style={styles.p}>
          1. 회원이 입력한 콘텐츠(핸드 기록, 음성, 메모 등)의 저작권은 회원에게 귀속됩니다.{'\n'}
          2. 회원은 회사가 서비스 운영·개선·통계 분석 목적으로 콘텐츠를 비식별 처리하여 활용하는 것에 동의합니다.{'\n'}
          3. 회사는 회원 동의 없이 콘텐츠를 제3자에게 제공하지 않습니다. 단, AI 기능 제공을 위한 OpenAI 등 처리 위탁은 개인정보처리방침에 따라 진행됩니다.
        </Text>

        <Text style={styles.h2}>제10조 (서비스 이용의 제한)</Text>
        <Text style={styles.p}>
          회사는 회원이 본 약관 또는 관련 법령을 위반한 경우 사전 통지 없이 서비스 이용을 제한·정지하거나 회원 자격을 박탈할 수 있습니다.
        </Text>

        <Text style={styles.h2}>제11조 (계약 해지 및 탈퇴)</Text>
        <Text style={styles.p}>
          1. 회원은 언제든 설정 화면을 통해 탈퇴할 수 있습니다.{'\n'}
          2. 탈퇴 시 회원의 모든 콘텐츠는 즉시 삭제되며, 복구되지 않습니다.{'\n'}
          3. 단, 관련 법령에서 보존을 요구하는 정보는 해당 법령에서 정한 기간 동안 보존됩니다.
        </Text>

        <Text style={styles.h2}>제12조 (면책)</Text>
        <Text style={styles.p}>
          1. 회사는 천재지변, 전쟁, 정전, 통신장애 등 불가항력 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.{'\n'}
          2. AI 기반 핸드 리뷰는 학습 모델의 일반적 분석이며, 그 결과의 정확성·완전성·실전 적용 결과를 회사가 보증하지 않습니다.{'\n'}
          3. 회사는 회원 본인의 부주의로 인한 계정 정보 유출·금전적 손실에 대해 책임을 지지 않습니다.{'\n'}
          4. 본 서비스는 도박·사행 행위를 권장하거나 조장하지 않으며, 회원의 도박 행위로 인한 손해에 대해 회사는 어떠한 책임도 부담하지 않습니다.
        </Text>

        <Text style={styles.h2}>제13조 (분쟁 해결 및 관할)</Text>
        <Text style={styles.p}>
          1. 본 약관과 관련된 분쟁은 대한민국 법령을 준거법으로 합니다.{'\n'}
          2. 분쟁 발생 시 양 당사자는 우선 협의를 통해 해결을 시도하며, 협의가 이루어지지 않을 경우 민사소송법에 따른 관할 법원에 소를 제기할 수 있습니다.
        </Text>

        <Text style={styles.h2}>제14조 (문의)</Text>
        <Text style={styles.p}>
          서비스 이용 관련 문의는 앱 내 설정 → 문의하기 메뉴를 이용하시기 바랍니다.
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
  scroll: { flex: 1 },
  content: { padding: spacing.base },
  lastUpdated: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.lg },
  h2: {
    fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.primary,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  p: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
});

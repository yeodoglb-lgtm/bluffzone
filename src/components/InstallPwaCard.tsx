import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal, Image } from 'react-native';
import { showAlert } from '../utils/alert';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

// 앱 아이콘 (검정 배경 + 주황 스페이드)
const APP_ICON = require('../../assets/icon.png');

// 'beforeinstallprompt' 이벤트 객체 타입 (Chrome 안드로이드/데스크톱)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// ── 환경 감지 유틸 ─────────────────────────────────────────────────────────
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

// 한국 인앱 브라우저 (PWA 설치 불가)
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /KAKAOTALK/i.test(ua) ||      // 카카오톡
    /KAKAOSTORY/i.test(ua) ||     // 카카오스토리
    /NAVER\(inapp/i.test(ua) ||   // 네이버 앱
    /Instagram/i.test(ua) ||       // 인스타그램
    /FB[AI]V/i.test(ua) ||         // 페이스북 / 메신저
    /FBAN/i.test(ua) ||
    /Twitter/i.test(ua) ||         // X(트위터)
    /Line\//i.test(ua) ||          // 라인
    /; wv\)/i.test(ua)             // Android WebView (대부분 인앱)
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function InstallPwaCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showInAppModal, setShowInAppModal] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 웹이 아니거나 이미 PWA로 실행 중이면 숨김
  if (Platform.OS !== 'web') return null;
  if (isStandalone()) return null;

  // 인앱 브라우저: 친근한 "Chrome으로 접속해보세요" 안내
  if (isInAppBrowser()) {
    return (
      <>
        <TouchableOpacity
          style={[styles.card, styles.inAppCard]}
          onPress={() => setShowInAppModal(true)}
          activeOpacity={0.85}
        >
          <Image source={APP_ICON} style={styles.iconImage} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>이제 블러프존 앱으로 편하게 이용하세요</Text>
            <Text style={styles.desc}>Chrome으로 접속하시면 앱을 설치하실 수 있습니다</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <Modal visible={showInAppModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Image source={APP_ICON} style={styles.modalIcon} resizeMode="contain" />
              <Text style={styles.modalTitle}>블러프존 앱 설치하기</Text>
              <Text style={styles.modalText}>
                지금은 카톡·네이버 인앱 브라우저로 보고 계세요.{'\n'}
                Chrome으로 다시 열면 홈 화면에 앱처럼 설치할 수 있어요.
              </Text>
              <View style={styles.stepBox}>
                <Text style={styles.step}><Text style={styles.stepNum}>1.</Text> 화면 우상단 ⋮ 점 3개 메뉴 탭</Text>
                <Text style={styles.step}><Text style={styles.stepNum}>2.</Text> "다른 브라우저로 열기" 또는 "Chrome으로 열기" 선택</Text>
                <Text style={styles.step}><Text style={styles.stepNum}>3.</Text> Chrome에서 열린 후 다시 이 화면에서 설치</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={async () => {
                  try {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      await navigator.clipboard.writeText(window.location.href);
                      showAlert('복사됨', '주소가 클립보드에 복사됐어요. Chrome 주소창에 붙여넣으세요.');
                    }
                  } catch {
                    showAlert('알림', '클립보드 접근 실패. 직접 주소를 복사해주세요.');
                  }
                }}
              >
                <Text style={styles.copyBtnText}>주소 복사하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowInAppModal(false)}
              >
                <Text style={styles.closeBtnText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // Android Chrome (이벤트 받은 상태)
  if (installEvent && isAndroid()) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={async () => {
          await installEvent.prompt();
          const { outcome } = await installEvent.userChoice;
          if (outcome === 'accepted') setInstallEvent(null);
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>📲</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>홈 화면에 앱 설치</Text>
          <Text style={styles.desc}>탭 한 번으로 풀스크린 앱처럼 사용</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  }

  // iOS Safari
  if (isIOS()) {
    return (
      <>
        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowIosModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.icon}>📲</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>홈 화면에 앱 설치</Text>
            <Text style={styles.desc}>Safari 공유 메뉴에서 추가하세요</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <Modal visible={showIosModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>📱 홈 화면에 추가하기</Text>
              <View style={styles.stepBox}>
                <Text style={styles.step}><Text style={styles.stepNum}>1.</Text> Safari 하단의 공유 버튼(⬆️) 탭</Text>
                <Text style={styles.step}><Text style={styles.stepNum}>2.</Text> "홈 화면에 추가" 선택</Text>
                <Text style={styles.step}><Text style={styles.stepNum}>3.</Text> 우측 상단 "추가" 탭</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setShowIosModal(false)}
              >
                <Text style={styles.closeBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // 기타 (데스크톱 등): 자체 설치 가능 신호 없으면 숨김
  return null;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inAppCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  icon: { fontSize: 24 },
  iconImage: { width: 40, height: 40, borderRadius: 8 },
  modalIcon: { width: 64, height: 64, borderRadius: 12, alignSelf: 'center', marginBottom: spacing.sm },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  desc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 20, color: colors.textMuted },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stepBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.base,
    gap: spacing.sm,
  },
  step: { fontSize: fontSize.sm, color: colors.text, lineHeight: 22 },
  stepNum: { color: colors.primary, fontWeight: fontWeight.bold },
  copyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  copyBtnText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  closeBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
});

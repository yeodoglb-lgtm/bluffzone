import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

// 'beforeinstallprompt' 이벤트 객체 타입 (Chrome 안드로이드/데스크톱)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pwa_install_banner_dismissed';
// 24시간 동안 다시 안 보임
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const ts = window.localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

// 이미 PWA로 실행 중인지 (display-mode: standalone)
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function InstallPwaBanner() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isStandalone()) return; // 이미 설치된 PWA에서 실행 중이면 노출 X
    if (isDismissed()) return;
    if (!isMobile()) return; // 모바일에서만 노출

    // Android Chrome: beforeinstallprompt 이벤트 잡기
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS는 beforeinstallprompt 미지원 → 약간의 딜레이 후 안내 표시
    if (isIOS()) {
      const timer = setTimeout(() => setVisible(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      // Android: 네이티브 설치 다이얼로그
      await installEvent.prompt();
      await installEvent.userChoice;
      setVisible(false);
      markDismissed();
    } else if (isIOS()) {
      // iOS: 안내 모달 표시
      setShowIosInstructions(true);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    markDismissed();
  };

  if (!visible) return null;

  if (showIosInstructions) {
    return (
      <View style={styles.iosOverlay}>
        <View style={styles.iosCard}>
          <Text style={styles.iosTitle}>📱 홈 화면에 추가하기</Text>
          <Text style={styles.iosStep}>① Safari 하단의 공유 버튼 탭</Text>
          <View style={styles.shareRow}>
            <Text style={styles.shareIcon}>⬆️</Text>
            <Text style={styles.iosHint}>(브라우저 하단 가운데)</Text>
          </View>
          <Text style={styles.iosStep}>② "홈 화면에 추가" 선택</Text>
          <Text style={styles.iosStep}>③ 우측 상단 "추가" 탭</Text>
          <TouchableOpacity
            style={styles.iosCloseBtn}
            onPress={() => { setShowIosInstructions(false); setVisible(false); markDismissed(); }}
          >
            <Text style={styles.iosCloseText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerEmoji}>📲</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>홈 화면에 추가하세요</Text>
          <Text style={styles.bannerDesc}>
            앱처럼 빠르게 실행되고 풀스크린으로 사용할 수 있어요
          </Text>
        </View>
        <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
          <Text style={styles.installBtnText}>설치</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <Text style={styles.dismissBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: colors.primary,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 9999,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  bannerEmoji: { fontSize: 24 },
  bannerTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.bg },
  bannerDesc: { fontSize: fontSize.xs, color: colors.bg, opacity: 0.9, marginTop: 1 },
  installBtn: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radius.button,
  },
  installBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
  dismissBtn: { padding: 6 },
  dismissBtnText: { fontSize: fontSize.lg, color: colors.bg, fontWeight: fontWeight.bold },
  iosOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
    padding: spacing.lg,
  },
  iosCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
  },
  iosTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  iosStep: { fontSize: fontSize.base, color: colors.text, lineHeight: 24 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: spacing.base },
  shareIcon: { fontSize: 20 },
  iosHint: { fontSize: fontSize.sm, color: colors.textMuted },
  iosCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.button,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  iosCloseText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
});

// PWA 설치 후 알림 권한 요청 모달
//
// 동작:
//   - PWA standalone 모드(설치된 상태)에서만 노출
//   - localStorage 'bz.notif.asked' 플래그로 1회만 노출
//   - 거부 시 다시 안 묻고, 수락 시 Notification.requestPermission() 호출
//   - 데스크톱·모바일 PWA 둘 다 작동

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';

const STORAGE_KEY = 'bz.notif.asked';

function isStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  // iOS Safari (legacy)
  if ((navigator as any).standalone === true) return true;
  // Android Chrome / Desktop Chrome — display-mode media query
  try {
    return window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function alreadyAsked(): boolean {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === '1';
    }
  } catch {}
  return false;
}

function markAsked() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  } catch {}
}

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!notificationsSupported()) return;
    if (alreadyAsked()) return;
    if (!isStandalone()) return;
    // 권한 이미 결정된 상태(granted/denied)면 묻지 않음
    if ((window as any).Notification?.permission !== 'default') {
      markAsked();
      return;
    }
    // 약간 지연 후 노출 (앱 로딩 후)
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  async function handleAccept() {
    markAsked();
    setVisible(false);
    try {
      const result = await (window as any).Notification.requestPermission();
      console.log('[Notification permission]', result);
    } catch (e) {
      console.warn('[Notification] permission request failed', e);
    }
  }

  function handleDecline() {
    markAsked();
    setVisible(false);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDecline}>
      <Pressable style={styles.backdrop} onPress={handleDecline}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.emoji}>🔔</Text>
          <Text style={styles.title}>알림 받으시겠어요?</Text>
          <Text style={styles.desc}>
            세션 기록·핸드 리뷰 알림을{'\n'}
            놓치지 않게 도와드려요.{'\n\n'}
            • 매일 세션 기록 리마인더{'\n'}
            • 신규 매장 등록 소식{'\n'}
            • 주간 통계 요약
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.7}>
              <Text style={styles.declineText}>나중에</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.85}>
              <Text style={styles.acceptText}>알림 켜기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  desc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.6,
  },
  btnRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.sm },
  declineBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  declineText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: fontWeight.medium },
  acceptBtn: {
    flex: 1.5,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  acceptText: { fontSize: fontSize.sm, color: colors.bg, fontWeight: fontWeight.bold },
});

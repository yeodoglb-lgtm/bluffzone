import { Alert, Platform } from 'react-native';

// ── 크로스 플랫폼 Alert 헬퍼 ────────────────────────────────────────────────
// React Native Web에서는 Alert.alert가 작동하지 않으므로
// 웹에서는 window.alert / window.confirm으로 폴백한다.

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * "확인 / 취소" 2버튼 다이얼로그. 웹/앱 모두 작동.
 */
export function showConfirm(opts: ConfirmOptions): void {
  const {
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    destructive = false,
    onConfirm,
    onCancel,
  } = opts;

  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(
      message ? `${title}\n\n${message}` : title
    );
    if (ok) onConfirm();
    else onCancel?.();
    return;
  }

  Alert.alert(
    title,
    message,
    [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]
  );
}

/**
 * 단순 알림 1버튼. 웹/앱 모두 작동.
 */
export function showAlert(title: string, message?: string, onClose?: () => void): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    onClose?.();
    return;
  }
  Alert.alert(title, message, [{ text: '확인', onPress: onClose }]);
}

// 비로그인 사용자가 액션을 시도할 때 노출되는 글로벌 로그인 유도 모달
// useLoginPrompt() 훅으로 어디서든 호출 가능

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Modal, Pressable, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, radius } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';

type Nav = StackNavigationProp<RootStackParamList>;

interface LoginPromptContextValue {
  // 인증 필요 액션 — 비로그인이면 모달 노출, 로그인이면 onAuth 실행
  requireAuth: (onAuth: () => void) => void;
  // 직접 모달 열기 (커스텀 메시지)
  show: (opts?: { title?: string; desc?: string }) => void;
}

const Ctx = createContext<LoginPromptContextValue | null>(null);

export function useLoginPrompt() {
  const v = useContext(Ctx);
  if (!v) throw new Error('LoginPromptProvider 안에서만 사용 가능');
  return v;
}

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('로그인이 필요해요');
  const [desc, setDesc] = useState('이 기능은 가입 후 이용 가능합니다.');
  const navigation = useNavigation<Nav>();
  const { session } = useAuthStore();

  const requireAuth = useCallback(
    (onAuth: () => void) => {
      if (session) {
        onAuth();
        return;
      }
      setTitle('로그인이 필요해요');
      setDesc('핸드 기록·뱅크롤 같은 개인 데이터 기능은\n가입 후 이용 가능합니다.');
      setOpen(true);
    },
    [session]
  );

  const show = useCallback((opts?: { title?: string; desc?: string }) => {
    if (opts?.title) setTitle(opts.title);
    if (opts?.desc) setDesc(opts.desc);
    setOpen(true);
  }, []);

  const goToAuth = () => {
    setOpen(false);
    navigation.navigate('Auth');
  };

  return (
    <Ctx.Provider value={{ requireAuth, show }}>
      {children}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
            <TouchableOpacity style={styles.close} onPress={() => setOpen(false)}>
              <X color={colors.textMuted} size={20} />
            </TouchableOpacity>

            <Text style={styles.emoji}>🔑</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.desc}>{desc}</Text>
            <Text style={styles.sub}>📌 무료 · 가입 30초</Text>

            <TouchableOpacity style={styles.primary} onPress={goToAuth} activeOpacity={0.85}>
              <Text style={styles.primaryText}>가입 / 로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setOpen(false)}>
              <Text style={styles.secondaryText}>둘러보기 계속</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  close: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.xs },
  emoji: { fontSize: 40, marginBottom: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  desc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.lg,
  },
  primary: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.button,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryText: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.bg },
  secondary: { paddingVertical: spacing.sm },
  secondaryText: { fontSize: fontSize.sm, color: colors.textMuted },
});

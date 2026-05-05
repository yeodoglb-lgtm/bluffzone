// 신규 유저 환영 모달 — 가입 직후 또는 처음 대시보드 진입 시 1회 노출
//
// 3 슬라이드:
//  1. 음성 30초로 핸드 기록
//  2. AI가 GTO 기반으로 자동 분석
//  3. 뱅크롤·핸드 통계 한눈에
//
// 동작:
//  - localStorage 'bz.welcome.seen' 플래그로 1회만 노출
//  - "건너뛰기" 또는 "시작하기" 클릭 시 닫고 플래그 저장

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

const STORAGE_KEY = 'bz.welcome.seen';

interface Slide {
  emoji: string;
  title: string;
  desc: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🎙',
    title: '음성으로 30초 기록',
    desc: '핸드를 자연스럽게 말하면\nAI가 자동으로 정리합니다.\n타이핑 X, 빠르고 간편하게.',
  },
  {
    emoji: '🤖',
    title: 'GTO 기반 AI 리뷰',
    desc: '솔버·푸시폴드·프리플랍 차트로\n내 액션을 분석하고\n실수를 짚어드려요.',
  },
  {
    emoji: '📊',
    title: '뱅크롤 + 통계 한눈에',
    desc: '세션·수익·핸드 기록을\n한 곳에서 관리.\n실력 향상이 보여요.',
  },
];

function safeGetItem(key: string): string | null {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}
function safeSetItem(key: string, value: string) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
}

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // 마운트 후 1회 체크 — 안 본 유저면 노출
    const seen = safeGetItem(STORAGE_KEY);
    if (!seen) {
      // 약간 지연 → 화면 부드럽게 뜨도록
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function close() {
    safeSetItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function next() {
    if (idx < SLIDES.length - 1) {
      setIdx(idx + 1);
    } else {
      close();
    }
  }

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation?.()}>
          {/* 건너뛰기 */}
          <TouchableOpacity onPress={close} style={styles.skipBtn}>
            <Text style={styles.skipText}>건너뛰기</Text>
          </TouchableOpacity>

          <View style={styles.body}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.desc}>{slide.desc}</Text>
          </View>

          {/* 페이지 인디케이터 */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === idx && styles.dotActive]}
              />
            ))}
          </View>

          {/* CTA 버튼 */}
          <TouchableOpacity onPress={next} style={styles.cta} activeOpacity={0.85}>
            <Text style={styles.ctaText}>
              {isLast ? '시작하기' : '다음'}
            </Text>
          </TouchableOpacity>
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
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: spacing.sm,
  },
  skipText: { fontSize: fontSize.xs, color: colors.textMuted },
  body: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.6,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ctaText: {
    fontSize: fontSize.base,
    color: colors.bg,
    fontWeight: fontWeight.bold,
  },
});

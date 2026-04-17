import { View, Text, StyleSheet } from 'react-native';
import { colors, fontWeight } from '../../theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'wordmark' | 'full';
}

const sizes = {
  sm: { icon: 32, spade: 16, text: 14, sub: 8 },
  md: { icon: 48, spade: 24, text: 20, sub: 10 },
  lg: { icon: 72, spade: 36, text: 30, sub: 14 },
};

export default function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const s = sizes[size];

  const icon = (
    <View style={[styles.icon, { width: s.icon, height: s.icon, borderRadius: s.icon * 0.22 }]}>
      <Text style={[styles.spade, { fontSize: s.spade }]}>♠</Text>
    </View>
  );

  if (variant === 'icon') return icon;

  const wordmark = (
    <View style={styles.wordmark}>
      <Text style={[styles.brand, { fontSize: s.text }]}>BluffZone</Text>
      <Text style={[styles.sub, { fontSize: s.sub }]}>블러프존</Text>
    </View>
  );

  if (variant === 'wordmark') return wordmark;

  return (
    <View style={styles.full}>
      {icon}
      {wordmark}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spade: {
    color: colors.bg,
    fontWeight: fontWeight.extrabold,
  },
  wordmark: {
    justifyContent: 'center',
  },
  brand: {
    color: colors.primary,
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    letterSpacing: 3,
    marginTop: -2,
  },
  full: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

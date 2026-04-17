import { Platform } from 'react-native';

export const fontFamily = {
  korean: Platform.select({
    ios: 'Pretendard-Variable',
    android: 'Pretendard-Variable',
    default: 'System',
  }),
  latin: Platform.select({
    ios: 'Inter',
    android: 'Inter',
    default: 'System',
  }),
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const colors = {
  bg: '#0d1b2a',
  surface: '#162336',
  surfaceAlt: '#1a2b40',
  line: '#2a3d52',
  text: '#FFFFFF',
  textMuted: '#8fa8c0',
  primary: '#FF6B00',
  primaryHi: '#FF8A3D',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export type ColorKey = keyof typeof colors;

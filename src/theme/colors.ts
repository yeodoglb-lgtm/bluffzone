export const colors = {
  bg: '#0A0A0A',
  surface: '#141414',
  surfaceAlt: '#1C1C1C',
  line: '#2A2A2A',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryHi: '#FF8A3D',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export type ColorKey = keyof typeof colors;

import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  primary: '#3B82F6',
  green: '#10B981',
  dark: '#1F2937',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  pitch: '#22C55E',
  pitchDark: '#16A34A',
  danger: '#EF4444',
  warning: '#F59E0B',
  purple: '#8B5CF6',
  orange: '#F97316',
  cyan: '#06B6D4',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'Arial, sans-serif',
}) as string;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: {
    elevation: 3,
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
}) ?? {};

export const SharedStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...cardShadow,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

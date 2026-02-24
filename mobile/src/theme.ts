import { StyleSheet, Dimensions, Platform, useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');

// Wealthsimple-inspired forest green dark theme
const themeColors = {
  primary: '#0F5C2E',
  primaryBright: '#1A7A42',
  primaryMuted: 'rgba(15,92,46,0.15)',
  primaryGlow: 'rgba(15,92,46,0.35)',
  secondary: '#1A7A42',
  success: '#1A7A42',
  successLight: 'rgba(26,122,66,0.15)',
  danger: '#A63D40',
  dangerLight: 'rgba(166,61,64,0.15)',
  warning: '#C49032',
  warningLight: 'rgba(196,144,50,0.15)',
  background: '#090B0A',
  surface: '#111513',
  surfaceElevated: '#1A1F1C',
  surfaceAlt: '#1A1F1C',
  surfaceHover: '#232924',
  text: '#E8EBE9',
  textSecondary: '#7E8A82',
  textMuted: '#4A5550',
  border: '#2A312D',
  borderLight: '#1A1F1C',
  accent: '#C49032',
};

// Backward compatibility export
export const colors = themeColors;

// Hook — always returns the same dark theme (no light mode)
export function useThemeColors() {
  return themeColors;
}

export type ThemeColors = typeof themeColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  textSecondary: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primaryBright,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonTextOutline: {
    color: colors.primaryBright,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
  },
  badgeText: {
    color: colors.primaryBright,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: spacing.md,
    lineHeight: 24,
  },
});

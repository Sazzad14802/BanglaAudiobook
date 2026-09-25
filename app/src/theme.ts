/**
 * App-wide design tokens.
 * Colors, typography, spacing – referenced by all components.
 */

export const Colors = {
  // Brand: vibrant royal indigo-purple
  primary: '#5B2EE8',
  primaryLight: '#7C52F5',
  primaryDark: '#4319BD',
  primarySurface: '#EEF0FD',

  // Accent: warm amber
  accent: '#D97706',
  accentLight: '#FEF3C7',

  // Background shades (Clean light theme)
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceElevated: '#EDF1F7',
  surfaceBorder: '#E2E6EF',

  // Text (High contrast, crystal clear readability for Bangla)
  textPrimary: '#131825',
  textSecondary: '#4A5568',
  textMuted: '#8C96A8',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  // Transparent overlays
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayLight: 'rgba(0, 0, 0, 0.08)',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 36,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

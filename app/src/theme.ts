/**
 * App-wide design tokens matching Figma design specification.
 * Colors, typography, spacing, and radii.
 */

export const Colors = {
  // Brand: Warm terracotta / brick orange
  primary: '#CE5337',
  primaryDark: '#B8452B',
  primaryLight: '#E26D52',
  primarySurface: '#FBEBE7',

  // Canvas & background
  background: '#FAF6F0', // Warm cream paper background
  surface: '#FFFFFF',
  surfaceDark: '#19181B', // Dark charcoal used in splash, active filter, mini player
  surfaceElevated: '#F4EFEA', // Soft warm beige container
  surfaceBorder: '#E7E1D8',

  // Accent tints (from Figma plates)
  tintCoral: '#F8E5E1', // Notifications & alert banners
  tintPeachActive: '#FCEBE7', // Active now-playing chapter
  tintGreen: '#E2F5EA', // Free badge & verified email
  tintGreenText: '#18794E',
  tintBlue: '#E4F1F8', // Suggestions, queue preview, mixed language
  tintBlueText: '#1B658A',
  tintPurple: '#F2ECFA', // Premium badge & preview banner
  tintPurpleText: '#6937A1',
  tintAmber: '#FBF1DC', // Offline notice
  tintAmberText: '#8C5E14',
  tintError: '#FCE7E7', // Validation error
  tintErrorText: '#B91C1C',

  // Text
  textPrimary: '#1C1917',
  textSecondary: '#6B665E',
  textMuted: '#9E988F',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FAF6F0',

  // Badges & Pills
  badgeFreeBg: '#E2F5EA',
  badgeFreeText: '#18794E',
  badgePremiumBg: '#F2ECFA',
  badgePremiumText: '#6937A1',
  badgeNeutralBg: '#EAE3D9',
  badgeNeutralText: '#555047',

  // Semantic
  success: '#18794E',
  warning: '#D97706',
  error: '#DC2626',
  info: '#1B658A',

  // Overlays
  overlay: 'rgba(25, 24, 27, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.06)',
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 40,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;


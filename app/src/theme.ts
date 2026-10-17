/**
 * BornoVerse design tokens: colors, typography, spacing and radii.
 *
 * Palette derived from the logo (#13AD81 deep green, #56DDA4 mint).
 * `primary` is a darker shade of the brand green so white text on buttons
 * meets WCAG AA (4.98:1); the logo green itself is `brand`, used for accents.
 */

export const Colors = {
  // Brand
  primary: '#0C7F5F', // buttons, links, selected states (AA with white text)
  primaryDark: '#0A6B50', // pressed states
  primaryLight: '#13AD81', // logo green: highlights, borders
  primarySurface: '#E6F7F0', // selected option background
  brand: '#13AD81', // progress bars, active indicators, icons
  brandLight: '#56DDA4', // mint accent
  brandSoft: '#D5F3E6', // play buttons, soft fills
  brandSoftPressed: '#B9EAD4',

  // Canvas & background
  background: '#F5FAF7', // app canvas (very light mint)
  surface: '#FFFFFF',
  surfaceDark: '#0F2A22', // deep green-black: splash, mini player, dark cards
  surfaceDarkElevated: '#183A30',
  surfaceElevated: '#EDF5F1', // inputs, chips, secondary containers
  surfaceBorder: '#DCE8E2',
  track: '#DCE8E2', // empty part of progress bars

  // Accent tints
  tintBrand: '#E6F7F0', // highlight banners, notification prompts
  tintActive: '#DDF5EA', // now-playing chapter
  tintGreen: '#E2F5EA', // success
  tintGreenText: '#18794E',
  tintBlue: '#E4F1F8', // info, playlists
  tintBlueText: '#1B658A',
  tintPurple: '#F2ECFA', // premium
  tintPurpleText: '#6937A1',
  tintAmber: '#FBF1DC', // warnings / pending work
  tintAmberText: '#8C5E14',
  tintError: '#FCE7E7',
  tintErrorText: '#B91C1C',

  // Text
  textPrimary: '#10231C',
  textSecondary: '#55675F',
  textMuted: '#8A9A93',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#F2FAF6',
  textOnDarkSecondary: '#A9C2B8',
  textOnDarkAccent: '#7EE6B8',

  // Badges
  badgeFreeBg: '#E4F1F8',
  badgeFreeText: '#1B658A',
  badgePremiumBg: '#F2ECFA',
  badgePremiumText: '#6937A1',
  badgeNeutralBg: '#E3EDE8',
  badgeNeutralText: '#3F5149',

  // Semantic
  success: '#18794E',
  warning: '#D97706',
  error: '#DC2626',
  info: '#1B658A',

  // Overlays
  overlay: 'rgba(15, 42, 34, 0.5)',
  overlayLight: 'rgba(15, 42, 34, 0.06)',
  scrim: 'rgba(15, 42, 34, 0.45)',
  darkGlass: 'rgba(15, 42, 34, 0.88)',
  onDarkHairline: 'rgba(255, 255, 255, 0.12)',
  onDarkFill: 'rgba(255, 255, 255, 0.08)',
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

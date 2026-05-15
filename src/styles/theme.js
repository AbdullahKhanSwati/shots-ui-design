// Shots — Light Reddish + Black design system

export const colors = {
  // Brand
  primary: '#E53E3E',          // Vibrant red
  primaryDark: '#B91C2C',      // Deep red
  primaryDarker: '#7F1318',    // Wine
  primarySoft: '#FFE5E5',      // Light reddish tint (backgrounds)
  primaryGlow: 'rgba(229, 62, 62, 0.18)',

  // Accents
  accent: '#FF6B6B',           // Light coral red
  accentSoft: '#FFF0F0',
  gold: '#F4B860',             // Subtle gold highlight

  // Neutrals
  black: '#0A0A0A',
  charcoal: '#1A1A1A',
  graphite: '#2A2A2A',
  text: '#1A1A1A',
  textLight: '#6B6B6B',
  textMuted: '#9CA3AF',

  background: '#FFF8F8',       // Soft reddish white
  surface: '#FFFFFF',
  surfaceAlt: '#FFF1F1',
  divider: '#F1D7D7',
  border: '#FEE2E2',

  // Status
  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  error: '#EF4444',
  errorSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',

  white: '#FFFFFF',
  overlay: 'rgba(10, 10, 10, 0.55)',
};

export const gradients = {
  brand: ['#FF6B6B', '#E53E3E', '#B91C2C'],
  brandSoft: ['#FFE5E5', '#FFF8F8'],
  card: ['#1A1A1A', '#3B0A0A'],
  cardRed: ['#B91C2C', '#7F1318'],
  cardDark: ['#2A2A2A', '#0A0A0A'],
  membershipCard: ['#1A1A1A', '#3B0A0A', '#7F1318'],
  splash: ['#0A0A0A', '#3B0A0A', '#7F1318'],
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const typography = {
  display: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  h4: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mono: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  round: 9999,
};

export const shadows = {
  xs: {
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0A0A0A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  red: {
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  redSoft: {
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const animation = {
  fast: 180,
  normal: 280,
  slow: 420,
};

export default { colors, gradients, spacing, typography, borderRadius, shadows, animation };

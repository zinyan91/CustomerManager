export const Theme = {
  colors: {
    // Brand
    brandPrimary: '#2563EB',
    brandDark: '#0B1120',
    brandSurfaceDark: '#131D31',
    brandAccent: '#38BDF8',
    brandEmerald: '#10B981',
    brandPurple: '#8B5CF6',
    brandAmber: '#F59E0B',
    brandRose: '#F43F5E',

    // Neutral Surfaces
    background: '#F8FAFC',
    cardBg: '#FFFFFF',
    surfaceSubtle: '#F1F5F9',
    surfaceBorder: '#E2E8F0',
    surfaceBorderHighlight: '#CBD5E1',

    // Text Hierarchy
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textWhite: '#FFFFFF',
    textLightMuted: '#94A3B8',

    // Financial Badges
    debt1Bg: '#ECFDF5',
    debt1Text: '#059669',
    debt1Dot: '#10B981',

    debt2Bg: '#FFFBEB',
    debt2Text: '#D97706',
    debt2Dot: '#F59E0B',

    debt3Bg: '#FEF2F2',
    debt3Text: '#DC2626',
    debt3Dot: '#EF4444',

    debt4Bg: '#FEF2F2',
    debt4Text: '#B91C1C',
    debt4Dot: '#DC2626',

    debt5Bg: '#450A0A',
    debt5Text: '#FECACA',
    debt5Dot: '#EF4444',
  },
  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    full: 9999,
  },
  shadows: {
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 8,
    },
    floatingBar: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 12,
    },
  },
};

/**
 * VJIT Design System Tokens
 * Derived from UI-SPEC-1.0 and calibrated from official emblem (VJITLOGO.png)
 */

export const VJIT_COLORS = {
  // Brand Anchors
  brandRed: '#E51F35',
  brandRedDark: '#B91C1C',
  brandRedLight: '#FEE2E2',

  brandNavy: '#103754',
  brandNavySub: '#1E4E79',
  brandNavyDark: '#0A2335',
  brandNavyLight: '#E0F2FE',

  // Surfaces & Canvas
  canvasWhite: '#FFFFFF',
  canvasLight: '#F8FAFC',
  canvasCard: '#FFFFFF',

  // Borders & Dividers
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Text Hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Tracking Integrity States (UI-SPEC-1.0 Section 5)
  stateLive: '#16A34A',      // Green-600
  stateLiveLight: '#DCFCE7', // Green-100
  stateStale: '#64748B',     // Slate-500
  stateStaleLight: '#F1F5F9',// Slate-100
  stateUnavail: '#DC2626',   // Red-600
  stateUnavailLight: '#FEE2E2',
  stateIdle: '#D97706',      // Amber-600
  stateIdleLight: '#FEF3C7',
} as const;

export const VJIT_DARK_COLORS = {
  // Brand Anchors (adjusted for dark backgrounds to ensure contrast)
  brandRed: '#EF4444',       // Red-500
  brandRedDark: '#DC2626',   // Red-600
  brandRedLight: '#7F1D1D',  // Red-900

  brandNavy: '#38BDF8',      // Sky-400 accent for dark surfaces
  brandNavySub: '#60A5FA',   // Blue-400
  brandNavyDark: '#0B132B',  // Deep rich background
  brandNavyLight: '#1E3A8A', // Blue-900

  // Surfaces & Canvas
  canvasWhite: '#1E293B',    // Slate-800 card surface
  canvasLight: '#0F172A',    // Slate-900 page background
  canvasCard: '#1E293B',     // Slate-800
  canvasElevated: '#243247', // Elevated popover/modal

  // Borders & Dividers
  borderSubtle: '#334155',   // Slate-700
  borderStrong: '#475569',   // Slate-600

  // Text Hierarchy
  textPrimary: '#F8FAFC',    // Slate-50 (contrast > 13:1 on Slate-900)
  textSecondary: '#CBD5E1',  // Slate-300 (contrast > 8:1)
  textMuted: '#94A3B8',      // Slate-400 (contrast > 4.6:1)
  textInverse: '#0F172A',

  // Tracking Integrity States (Calibrated for dark mode contrast)
  stateLive: '#22C55E',      // Green-500
  stateLiveLight: '#052E16', // Green-950
  stateLiveBorder: '#166534',// Green-800
  stateStale: '#F59E0B',     // Amber-500
  stateStaleLight: '#451A03',// Amber-950
  stateStaleBorder: '#78350F',
  stateUnavail: '#EF4444',   // Red-500
  stateUnavailLight: '#450A0A',
  stateUnavailBorder: '#7F1D1D',
  stateIdle: '#94A3B8',      // Slate-400
  stateIdleLight: '#1E293B', // Slate-800
  stateIdleBorder: '#475569',
} as const;

export const VJIT_TYPOGRAPHY = {
  fontFamilySans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyHeading: 'Inter, Outfit, sans-serif',
  fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',

  sizes: {
    hero: { fontSize: '32px', lineHeight: '40px', fontWeight: '700' },
    title1: { fontSize: '24px', lineHeight: '32px', fontWeight: '600' },
    title2: { fontSize: '20px', lineHeight: '28px', fontWeight: '600' },
    title3: { fontSize: '18px', lineHeight: '26px', fontWeight: '600' },
    body: { fontSize: '15px', lineHeight: '22px', fontWeight: '400' },
    bodyMedium: { fontSize: '15px', lineHeight: '22px', fontWeight: '500' },
    caption: { fontSize: '13px', lineHeight: '18px', fontWeight: '400' },
    micro: { fontSize: '11px', lineHeight: '14px', fontWeight: '600' },
  },
} as const;

export const VJIT_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  section: '48px',
} as const;

export const VJIT_RADII = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const VJIT_SHADOWS = {
  sm: '0 1px 2px 0 rgba(16, 55, 84, 0.05)',
  md: '0 4px 6px -1px rgba(16, 55, 84, 0.08), 0 2px 4px -1px rgba(16, 55, 84, 0.04)',
  lg: '0 10px 15px -3px rgba(16, 55, 84, 0.1), 0 4px 6px -2px rgba(16, 55, 84, 0.05)',
} as const;

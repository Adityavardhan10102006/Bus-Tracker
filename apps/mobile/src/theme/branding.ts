import { VJIT_COLORS, VJIT_TYPOGRAPHY, VJIT_SPACING, VJIT_RADII, calculateContrastRatio } from '@vjit/ui';

/**
 * VJIT Official Logo Specifications
 * Source asset: docs/specifications/assets/vjit-logo.png
 * Native dimensions: 241 x 194 pixels
 * Aspect Ratio: Exact 1.242268:1 (Proportions strictly preserved per UI-SPEC-1.0)
 */
export const VJIT_LOGO_METRICS = {
  assetPath: 'assets/vjit-logo.png',
  nativeWidth: 241,
  nativeHeight: 194,
  aspectRatio: 241 / 194, // 1.242268
} as const;

/**
 * Computes logo dimensions that preserve exact aspect ratio
 */
export function getPreservedLogoDimensions(targetHeight: number): { width: number; height: number; aspectRatio: number } {
  const height = Math.max(16, targetHeight);
  const width = Math.round(height * VJIT_LOGO_METRICS.aspectRatio);
  return {
    width,
    height,
    aspectRatio: VJIT_LOGO_METRICS.aspectRatio,
  };
}

/**
 * Validates brand color pairing against WCAG 2.1 AA (Rule 1: No red on navy)
 */
export function assertAccessibleBranding(foreground: string, background: string): { valid: boolean; ratio: number; error?: string } {
  const ratio = calculateContrastRatio(foreground, background);
  
  // Prohibit direct layering of VJIT Red on Deep Navy
  if (
    (foreground.toUpperCase() === VJIT_COLORS.brandRed.toUpperCase() && background.toUpperCase() === VJIT_COLORS.brandNavy.toUpperCase()) ||
    (foreground.toUpperCase() === VJIT_COLORS.brandNavy.toUpperCase() && background.toUpperCase() === VJIT_COLORS.brandRed.toUpperCase())
  ) {
    return {
      valid: false,
      ratio,
      error: 'Prohibited branding combination: VJIT Red and Deep Navy must never be layered directly (contrast 2.70:1 fails WCAG AA).',
    };
  }

  if (ratio < 4.5) {
    return {
      valid: false,
      ratio,
      error: `Contrast ratio ${ratio.toFixed(2)}:1 does not meet WCAG AA minimum 4.5:1.`,
    };
  }

  return { valid: true, ratio };
}

export { VJIT_COLORS, VJIT_TYPOGRAPHY, VJIT_SPACING, VJIT_RADII };

/**
 * WCAG 2.1 Contrast & Accessibility Enforcement
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (a[0] ?? 0) + 0.7152 * (a[1] ?? 0) + 0.0722 * (a[2] ?? 0);
}

/**
 * Calculates contrast ratio between two hex colors per W3C WCAG 2.1
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Validates pairing against WCAG 2.1 AA standard (4.5:1 for normal text, 3.0:1 for large text)
 * Enforces the strict VJIT rule: Red on Navy is prohibited.
 */
export function validateColorPairing(
  foregroundHex: string,
  backgroundHex: string,
  isLargeText = false,
): { passes: boolean; ratio: number; warning?: string } {
  const ratio = calculateContrastRatio(foregroundHex, backgroundHex);
  const minRatio = isLargeText ? 3.0 : 4.5;

  // Specific check for VJIT Red on Deep Navy
  const isRed = foregroundHex.toUpperCase() === '#E51F35' || backgroundHex.toUpperCase() === '#E51F35';
  const isNavy = foregroundHex.toUpperCase() === '#103754' || backgroundHex.toUpperCase() === '#103754';

  if (isRed && isNavy) {
    return {
      passes: false,
      ratio: Number(ratio.toFixed(2)),
      warning:
        'PROHIBITED LAYER: VJIT Red (#E51F35) and Deep Navy (#103754) cannot be directly layered. Contrast ratio is 2.70:1 which fails WCAG AA.',
    };
  }

  return {
    passes: ratio >= minRatio,
    ratio: Number(ratio.toFixed(2)),
  };
}

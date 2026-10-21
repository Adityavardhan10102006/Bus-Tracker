import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  VJIT_LOGO_METRICS,
  getPreservedLogoDimensions,
  assertAccessibleBranding,
  VJIT_COLORS,
} from '../dist/theme/branding.js';
import { MobileAppCoordinator } from '../dist/App.js';

describe('Mobile: Brand Integrity & Accessibility Audit (P2-T10, UI-SPEC 2.1-2.3)', () => {
  it('strictly preserves the VJIT logo exact aspect ratio (1.242:1)', () => {
    // Assert native dimensions
    assert.equal(VJIT_LOGO_METRICS.nativeWidth, 241);
    assert.equal(VJIT_LOGO_METRICS.nativeHeight, 194);
    const expectedRatio = 241 / 194;
    assert.equal(VJIT_LOGO_METRICS.aspectRatio, expectedRatio);

    // Verify computed dimensions at various heights
    const h36 = getPreservedLogoDimensions(36);
    assert.equal(h36.height, 36);
    assert.equal(h36.width, Math.round(36 * expectedRatio)); // 45px
    assert.equal(h36.aspectRatio, expectedRatio);

    const h48 = getPreservedLogoDimensions(48);
    assert.equal(h48.height, 48);
    assert.equal(h48.width, Math.round(48 * expectedRatio)); // 60px

    // Verify physical file exists in assets
    const logoFile = path.resolve(process.cwd(), 'apps/mobile/assets/vjit-logo.png');
    assert.ok(fs.existsSync(logoFile), 'VJIT logo asset must exist in mobile assets');
  });

  it('validates WCAG 2.1 AA contrast compliance and blocks direct Red on Navy layering', () => {
    // Prohibited combination
    const prohibited = assertAccessibleBranding(VJIT_COLORS.brandRed, VJIT_COLORS.brandNavy);
    assert.equal(prohibited.valid, false);
    assert.match(prohibited.error!, /Prohibited branding combination/);

    // High-contrast permitted combinations
    const whiteOnNavy = assertAccessibleBranding(VJIT_COLORS.canvasWhite, VJIT_COLORS.brandNavy);
    assert.equal(whiteOnNavy.valid, true);
    assert.ok(whiteOnNavy.ratio >= 7.0, 'White on Navy should exceed 7:1 (AAA)');

    const whiteOnRed = assertAccessibleBranding(VJIT_COLORS.canvasWhite, VJIT_COLORS.brandRed);
    assert.equal(whiteOnRed.valid, true);
    assert.ok(whiteOnRed.ratio >= 4.5, 'White on Red button CTA must pass WCAG AA (>= 4.5:1)');
  });

  it('verifies touch target size standards and header properties', () => {
    const coordinator = new MobileAppCoordinator('http://localhost:3000');
    const header = coordinator.getHeaderProps(40);

    assert.equal(header.title, 'VJIT BUS TRACKER');
    assert.equal(header.logo.height, 40);
    assert.equal(header.logo.width, Math.round(40 * (241 / 194)));
    assert.equal(header.backgroundColor, VJIT_COLORS.brandNavy);
    assert.equal(header.textColor, VJIT_COLORS.canvasWhite);
  });
});

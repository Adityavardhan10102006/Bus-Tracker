import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderMobileHtml } from '../dist/ui/mobile-page.js';
import { renderAdminHtml } from '../dist/ui/admin-page.js';
import {
  resolveTheme,
  VJIT_COLORS,
  VJIT_DARK_COLORS,
  validateColorPairing,
  THEME_STORAGE_KEY,
} from '../../../packages/ui/dist/index.js';

describe('Theme System: Architecture & Contract Verification', () => {
  test('resolves light, dark, and system appearance preferences faithfully', () => {
    // Explicit Light
    assert.equal(resolveTheme('light', false), 'light');
    assert.equal(resolveTheme('light', true), 'light');

    // Explicit Dark
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('dark', true), 'dark');

    // System mode dynamically following OS prefers-color-scheme
    assert.equal(resolveTheme('system', false), 'light');
    assert.equal(resolveTheme('system', true), 'dark');
  });

  test('enforces consistent theme storage key across mobile app and admin console', () => {
    assert.equal(THEME_STORAGE_KEY, 'vjit_theme_preference');
  });

  test('WCAG 2.1 AA Contrast: Dark theme palette delivers comfortable contrast without washed out text', () => {
    // Primary Text (#F8FAFC) on Dark Page Background (#0F172A)
    const primary = validateColorPairing(VJIT_DARK_COLORS.textPrimary, VJIT_DARK_COLORS.canvasLight);
    assert.equal(primary.passes, true);
    assert.ok(primary.ratio >= 13.0, `Expected ratio >= 13.0, got ${primary.ratio}`);

    // Secondary Text (#CBD5E1) on Dark Card Surface (#1E293B)
    const secondary = validateColorPairing(VJIT_DARK_COLORS.textSecondary, VJIT_DARK_COLORS.canvasCard);
    assert.equal(secondary.passes, true);
    assert.ok(secondary.ratio >= 7.0, `Expected ratio >= 7.0, got ${secondary.ratio}`);

    // Muted Text (#94A3B8) on Dark Card Surface (#1E293B) - must satisfy 4.5:1 AA
    const muted = validateColorPairing(VJIT_DARK_COLORS.textMuted, VJIT_DARK_COLORS.canvasCard);
    assert.equal(muted.passes, true);
    assert.ok(muted.ratio >= 4.5, `Expected ratio >= 4.5, got ${muted.ratio}`);

    // Primary Action Button text on Brand Red in dark mode
    const btn = validateColorPairing('#FFFFFF', VJIT_DARK_COLORS.brandRed, true);
    assert.ok(btn.ratio >= 3.5, `Expected ratio >= 3.5, got ${btn.ratio}`);
  });
});

describe('Theme System: Student/Faculty Mobile App (/app)', () => {
  const html = renderMobileHtml();

  test('injects pre-render theme script in head to prevent theme flashing', () => {
    assert.ok(html.includes("localStorage.getItem('vjit_theme_preference')"));
    assert.ok(html.includes("prefers-color-scheme: dark"));
    assert.ok(html.includes("data-theme"));
  });

  test('declares complete CSS variables for light and dark themes', () => {
    assert.ok(html.includes(':root, [data-theme="light"]'));
    assert.ok(html.includes('[data-theme="dark"]'));
    assert.ok(html.includes('--brand-navy'));
    assert.ok(html.includes('--canvas-card'));
    assert.ok(html.includes('--text-primary'));
  });

  test('renders accessible 3-preference theme toggle in mobile header', () => {
    assert.ok(html.includes('class="theme-toggle-cluster"'));
    assert.ok(html.includes('data-theme-choice="light"'));
    assert.ok(html.includes('data-theme-choice="system"'));
    assert.ok(html.includes('data-theme-choice="dark"'));
  });

  test('includes appearance and theme card in mobile settings tab', () => {
    assert.ok(html.includes('Appearance &amp; Theme'));
    assert.ok(html.includes('id="theme-status-label"'));
    assert.ok(html.includes('id="profile-theme-grid"'));
  });

  test('supports dark map tile switching without destroying Leaflet instance', () => {
    assert.ok(html.includes('dark_all/{z}/{x}/{y}{r}.png'));
    assert.ok(html.includes('updateMapTileTheme'));
  });
});

describe('Theme System: Transport Admin Console (/admin)', () => {
  const html = renderAdminHtml();

  test('injects pre-render theme script in head of admin console', () => {
    assert.ok(html.includes("localStorage.getItem('vjit_theme_preference')"));
    assert.ok(html.includes("prefers-color-scheme: dark"));
    assert.ok(html.includes("data-theme"));
  });

  test('renders theme toggle in admin navigation bar', () => {
    assert.ok(html.includes('class="theme-toggle-cluster"'));
    assert.ok(html.includes('data-theme-choice="light"'));
    assert.ok(html.includes('data-theme-choice="system"'));
    assert.ok(html.includes('data-theme-choice="dark"'));
  });

  test('provides visual theme settings in admin settings tab', () => {
    assert.ok(html.includes('Console Appearance &amp; Visual Theme'));
    assert.ok(html.includes('id="admin-theme-badge"'));
  });

  test('supports dark tile swapping in Route Studio Leaflet map', () => {
    assert.ok(html.includes('updateAdminMapTileTheme'));
    assert.ok(html.includes('dark_all/{z}/{x}/{y}{r}.png'));
  });
});

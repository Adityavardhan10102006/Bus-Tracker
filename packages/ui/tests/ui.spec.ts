import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateContrastRatio,
  validateColorPairing,
  getNavigationForRole,
  ALL_NAVIGATION_ITEMS,
  getStateBadgeDescriptor,
  VJIT_COLORS,
  VJIT_DARK_COLORS,
  resolveTheme,
} from '../dist/index.js';

describe('UI: WCAG 2.1 Contrast Rules & Institutional Colors', () => {
  test('prohibits direct layering of VJIT Red (#E51F35) on Deep Navy (#103754)', () => {
    const check = validateColorPairing(VJIT_COLORS.brandRed, VJIT_COLORS.brandNavy);
    assert.equal(check.passes, false);
    assert.ok(check.warning?.includes('PROHIBITED LAYER'));
    assert.equal(check.ratio, 2.7);
  });

  test('verifies high contrast for Text on Canvas surfaces', () => {
    // Primary Text (#0F172A) on White (#FFFFFF)
    const textCheck = validateColorPairing(VJIT_COLORS.textPrimary, VJIT_COLORS.canvasWhite);
    assert.equal(textCheck.passes, true);
    assert.ok(textCheck.ratio > 15);
  });

  test('verifies white text on Brand Red passes WCAG AA for buttons', () => {
    const btnCheck = validateColorPairing(VJIT_COLORS.canvasWhite, VJIT_COLORS.brandRed, true);
    assert.ok(btnCheck.ratio >= 4.0, `Expected ratio >= 4.0, got ${btnCheck.ratio}`);
  });
});

describe('UI: Role-Appropriate Navigation Separation', () => {
  test('restricts student navigation to mobile surface and approved routes', () => {
    const studentNav = getNavigationForRole('STU', 'MOBILE');
    const ids = studentNav.map(item => item.id);

    assert.ok(ids.includes('mob-map'));
    assert.ok(ids.includes('mob-routes'));
    assert.ok(ids.includes('mob-alerts'));
    assert.ok(ids.includes('mob-profile'));

    // Students have NO access to web console
    const studentWeb = getNavigationForRole('STU', 'WEB_CONSOLE');
    assert.equal(studentWeb.length, 0);
  });

  test('provides full console navigation to Super Admin (SAD)', () => {
    const sadNav = getNavigationForRole('SAD', 'WEB_CONSOLE');
    const paths = sadNav.map(item => item.path);

    assert.ok(paths.includes('/console/fleet'));
    assert.ok(paths.includes('/console/map'));
    assert.ok(paths.includes('/console/routes'));
    assert.ok(paths.includes('/console/devices'));
    assert.ok(paths.includes('/console/audit'));
    assert.ok(paths.includes('/console/settings'));
  });

  test('restricts Technician (TEC) navigation to hardware and maintenance views', () => {
    const tecNav = getNavigationForRole('TEC', 'WEB_CONSOLE');
    const paths = tecNav.map(item => item.path);

    assert.ok(paths.includes('/console/devices'));
    assert.ok(paths.includes('/console/maintenance'));
    assert.equal(paths.includes('/console/settings'), false); // No access to system settings
    assert.equal(paths.includes('/console/audit'), false); // No access to audit logs
  });
});

describe('UI: Tracking Integrity State Badges', () => {
  test('returns non-color indicator and text label for all states (Rule R-20)', () => {
    const liveHw = getStateBadgeDescriptor('LIVE_HW');
    assert.equal(liveHw.label, 'Live • Bus Tracker');
    assert.ok(liveHw.accessibilityLabel.length > 0);

    const stale = getStateBadgeDescriptor('STALE', 80);
    assert.equal(stale.label, 'Updated 80s ago');
    assert.ok(stale.accessibilityLabel.includes('80 seconds ago'));

    const notRunning = getStateBadgeDescriptor('NOT_RUNNING');
    assert.equal(notRunning.label, 'Not running');
  });
});

describe('UI: Dark Mode & Light Mode Theme System', () => {
  test('resolves light, dark, and system theme preferences accurately', () => {
    // Explicit preferences
    assert.equal(resolveTheme('light', false), 'light');
    assert.equal(resolveTheme('light', true), 'light');
    assert.equal(resolveTheme('dark', false), 'dark');
    assert.equal(resolveTheme('dark', true), 'dark');

    // System mode follows OS appearance
    assert.equal(resolveTheme('system', false), 'light');
    assert.equal(resolveTheme('system', true), 'dark');
  });

  test('verifies WCAG 2.1 AA high contrast for Dark Mode text and surfaces', () => {
    // Primary Text (#F8FAFC) on Dark Page Canvas (#0F172A)
    const primaryCheck = validateColorPairing(VJIT_DARK_COLORS.textPrimary, VJIT_DARK_COLORS.canvasLight);
    assert.equal(primaryCheck.passes, true);
    assert.ok(primaryCheck.ratio >= 13.0, `Expected ratio >= 13.0, got ${primaryCheck.ratio}`);

    // Secondary Text (#CBD5E1) on Dark Card Surface (#1E293B)
    const secondaryCheck = validateColorPairing(VJIT_DARK_COLORS.textSecondary, VJIT_DARK_COLORS.canvasCard);
    assert.equal(secondaryCheck.passes, true);
    assert.ok(secondaryCheck.ratio >= 7.0, `Expected ratio >= 7.0, got ${secondaryCheck.ratio}`);

    // Muted Text (#94A3B8) on Dark Card Surface (#1E293B) - must meet 4.5:1 AA
    const mutedCheck = validateColorPairing(VJIT_DARK_COLORS.textMuted, VJIT_DARK_COLORS.canvasCard);
    assert.equal(mutedCheck.passes, true);
    assert.ok(mutedCheck.ratio >= 4.5, `Expected ratio >= 4.5, got ${mutedCheck.ratio}`);
  });

  test('verifies button text contrast in dark theme', () => {
    // White text on dark mode brand red (#EF4444)
    const redBtnCheck = validateColorPairing('#FFFFFF', VJIT_DARK_COLORS.brandRed, true);
    assert.ok(redBtnCheck.ratio >= 3.5, `Expected button ratio >= 3.5, got ${redBtnCheck.ratio}`);
  });
});

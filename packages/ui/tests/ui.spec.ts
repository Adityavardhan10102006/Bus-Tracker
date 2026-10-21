import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateContrastRatio,
  validateColorPairing,
  getNavigationForRole,
  ALL_NAVIGATION_ITEMS,
  getStateBadgeDescriptor,
  VJIT_COLORS,
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

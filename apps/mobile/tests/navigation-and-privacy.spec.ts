import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MOBILE_NAVIGATION_TABS, validateStudentFacultyNavigation } from '../dist/navigation/types.js';

describe('Mobile: Navigation Scope & Privacy Verification (P2-T11, Rule R-19, UI-SPEC 3.3)', () => {
  it('exclusively defines exactly four bottom navigation tabs: Map, Routes, Alerts, Profile', () => {
    assert.equal(MOBILE_NAVIGATION_TABS.length, 4);
    const tabIds = MOBILE_NAVIGATION_TABS.map(t => t.id);
    assert.deepEqual(tabIds, ['MAP', 'ROUTES', 'ALERTS', 'PROFILE']);
  });

  it('verifies zero driver navigation items or driver roles in mobile application', () => {
    const isValid = validateStudentFacultyNavigation(MOBILE_NAVIGATION_TABS);
    assert.equal(isValid, true, 'Zero driver roles allowed in mobile navigation');

    for (const tab of MOBILE_NAVIGATION_TABS) {
      assert.equal(tab.allowedRoles.includes('STU'), true);
      assert.equal(tab.allowedRoles.includes('FAC'), true);
      assert.ok(!tab.title.toLowerCase().includes('driver'));
      assert.ok(!tab.routePath.toLowerCase().includes('shift'));
    }
  });

  it('enforces Rule R-19: Mobile package contains zero background location tracking dependencies or permissions', () => {
    const mobilePkgPath = path.resolve(process.cwd(), 'apps/mobile/package.json');
    assert.ok(fs.existsSync(mobilePkgPath), 'apps/mobile/package.json must exist');

    const pkgContent = fs.readFileSync(mobilePkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    // Assert absence of background location libraries in student app
    const bannedLibs = [
      'react-native-background-geolocation',
      'react-native-geolocation-service',
      '@react-native-community/geolocation',
    ];

    for (const lib of bannedLibs) {
      assert.equal(lib in allDeps, false, `Forbidden background location dependency ${lib} found in student app (Rule R-19)`);
    }
  });
});

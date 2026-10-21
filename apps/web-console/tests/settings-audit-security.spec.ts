import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuditLogRecord, SystemSettingRecord } from '@vjit/contracts';
import {
  buildSettingsAndAuditViewModel,
  sanitizeCsvCell,
} from '../dist/screens/SettingsAndAuditScreen.js';
import { canAccessAdminPage, isReadOnlyForRole } from '../dist/auth/authorization.js';
import { WebConsoleCoordinator } from '../dist/App.js';

describe('Web Console: Settings, Audit Logs & Access Control (P4-T13, P4-T14, P4-T15)', () => {
  const sampleSetting: SystemSettingRecord = {
    key: 'app.poll_foreground_s',
    default_value: 10,
    current_value: 10,
    section: '17.2',
    description: 'Foreground polling interval in seconds',
    last_modified_by: 'admin@vjit.ac.in',
    last_modified_at: new Date().toISOString(),
    change_reason: 'System initialization',
  };

  const sampleAudit: AuditLogRecord = {
    id: '11111111-1111-4111-8111-111111111111',
    actor_id: 'admin-01',
    actor_email: 'admin@vjit.ac.in',
    actor_role: 'SAD',
    action: 'UPDATE_SETTING',
    entity_type: 'SETTING',
    entity_id: 'app.poll_foreground_s',
    old_value: { value: 15 },
    new_value: { value: 10 },
    reason: 'Reduced latency target',
    ip_address: '10.0.1.25',
    recorded_at: new Date().toISOString(),
  };

  it('restricts setting modifications to Super Admin (SAD) and keeps Coordinator (COR) read-only', () => {
    const filters = { actorSearch: '', entityTypeFilter: null, page: 1, pageSize: 50 };

    const vmCor = buildSettingsAndAuditViewModel([sampleSetting], [sampleAudit], filters, 'COR');
    assert.equal(vmCor.canEditSettings, false);
    assert.equal(vmCor.canExportAudit, false);

    const vmSad = buildSettingsAndAuditViewModel([sampleSetting], [sampleAudit], filters, 'SAD');
    assert.equal(vmSad.canEditSettings, true);
    assert.equal(vmSad.canExportAudit, true);

    assert.equal(isReadOnlyForRole('COR', 'SETTINGS'), true);
    assert.equal(isReadOnlyForRole('SAD', 'SETTINGS'), false);
  });

  it('sanitizes CSV cells starting with formula characters against injection attacks (Spec 36, P6-T2)', () => {
    assert.equal(sanitizeCsvCell('=cmd|/c calc'), "'=cmd|/c calc");
    assert.equal(sanitizeCsvCell('+12345'), "'+12345");
    assert.equal(sanitizeCsvCell('-50.2'), "'-50.2");
    assert.equal(sanitizeCsvCell('@SUM(A1:A10)'), "'@SUM(A1:A10)");
    assert.equal(sanitizeCsvCell('Normal Text'), 'Normal Text');
    assert.equal(sanitizeCsvCell(123), '123');
  });

  it('enforces non-discoverability and blocks unauthorized page routes per role (Spec 24, Task P4-T15)', () => {
    // Technicians cannot access Linking (Rule E.6)
    assert.equal(canAccessAdminPage('TEC', 'LINKING'), false);

    // Students and Faculty have zero access to Admin Console
    assert.equal(canAccessAdminPage('STU', 'FLEET_DECK'), false);
    assert.equal(canAccessAdminPage('FAC', 'SETTINGS'), false);

    // Super Admin has access to all pages
    assert.equal(canAccessAdminPage('SAD', 'FLEET_DECK'), true);
    assert.equal(canAccessAdminPage('SAD', 'SETTINGS'), true);
    assert.equal(canAccessAdminPage('SAD', 'AUDIT_LOG'), true);
  });

  it('coordinates navigation state and preserves VJIT logo aspect ratio (1.242:1)', () => {
    const coordinator = new WebConsoleCoordinator('COR');
    const header = coordinator.getHeaderProps();

    assert.equal(header.title, 'VJIT FLEET OPERATIONS DESK');
    assert.equal(header.logoDimensions.aspectRatio, 241 / 194);
    assert.equal(header.logoDimensions.width, 45);
    assert.equal(header.logoDimensions.height, 36);

    // Coordinator navigation
    const navItems = coordinator.getSidebarNavigation();
    assert.ok(navItems.length >= 8);
    const linkingItem = navItems.find(i => i.id === 'LINKING');
    assert.ok(linkingItem, 'Coordinator must see Linking page');

    // Switch to Technician role
    coordinator.setRole('TEC');
    const tecNav = coordinator.getSidebarNavigation();
    const tecLinking = tecNav.find(i => i.id === 'LINKING');
    assert.equal(tecLinking, undefined, 'Technician must not see Linking page');
  });
});

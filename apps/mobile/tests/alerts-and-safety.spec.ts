import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ServiceAlert } from '@vjit/contracts';
import { shouldDeliverNotification } from '@vjit/domain';
import { buildAlertsScreenViewModel, type AlertsScreenState } from '../dist/screens/AlertsScreen.js';

describe('Mobile: Service Alerts & Emergency Lock (P2-T8, Rule R-11)', () => {
  const safetyAlert: ServiceAlert = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Emergency Route Diverted',
    message: 'Bus 14 route diverted due to waterlogging near Appa Junction.',
    category: 'SAFETY',
    priority: 'HIGH',
    created_at: new Date().toISOString(),
    read: false,
  };

  const delayAlert: ServiceAlert = {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Traffic Delay',
    message: 'Route 06 running 10 minutes behind schedule.',
    category: 'DELAY',
    priority: 'MEDIUM',
    created_at: new Date().toISOString(),
    read: false,
  };

  it('unconditionally delivers SAFETY alerts even during quiet hours (Rule R-11)', () => {
    // Current hour 23 (11 PM) is within quiet hours (22:00 -> 06:00)
    const options = {
      quietHoursEnabled: true,
      quietStartHour: 22,
      quietEndHour: 6,
      currentHourCampus: 23,
    };

    const safetyDeliver = shouldDeliverNotification(safetyAlert, options);
    assert.equal(safetyDeliver, true, 'Safety alert must be delivered regardless of quiet hours');

    const delayDeliver = shouldDeliverNotification(delayAlert, options);
    assert.equal(delayDeliver, false, 'Non-safety alert must be suppressed during quiet hours');
  });

  it('prioritizes SAFETY alerts at the top of the alerts feed and displays safety lock notice', () => {
    const state: AlertsScreenState = {
      alerts: [delayAlert, safetyAlert],
      activeCategory: 'ALL',
      filterUnreadOnly: false,
      isLoading: false,
    };

    const vm = buildAlertsScreenViewModel(state);
    assert.equal(vm.alerts.length, 2);
    assert.equal(vm.alerts[0].alert.category, 'SAFETY');
    assert.equal(vm.alerts[0].isSafety, true);
    assert.match(vm.safetyLockedNotice, /Rule R-11/);
  });
});

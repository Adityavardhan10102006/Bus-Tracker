import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { renderMobileHtml } from '../dist/ui/mobile-page.js';
import { renderAdminHtml } from '../dist/ui/admin-page.js';
import { getServiceWorkerJs } from '../dist/ui/pwa.js';
import { fleetDataStore } from '../dist/store/fleet-data-store.js';

describe('Product Quality: Student Commute Favorites & Personalization (/app)', () => {
  const html = renderMobileHtml();

  test('declares responsive star button styling for commute favorites', () => {
    assert.ok(html.includes('.btn-star-bus'), 'Must define .btn-star-bus CSS class');
    assert.ok(html.includes('.btn-star-bus.starred'), 'Must define .starred modifier styling');
  });

  test('includes Starred filter chip in route corridors scroll bar', () => {
    assert.ok(html.includes('id="chip-filter-favorites"'), 'Must render chip-filter-favorites element');
    assert.ok(html.includes('data-route="FAVORITES"'), 'Must have data-route="FAVORITES" attribute');
  });

  test('implements localStorage favorite buses persistence', () => {
    assert.ok(html.includes('vjit_favorite_buses'), 'Must persist favorite bus IDs in localStorage');
    assert.ok(html.includes('window.toggleFavoriteBus'), 'Must expose window.toggleFavoriteBus handler');
  });

  test('provides helpful empty state when no buses are starred', () => {
    assert.ok(html.includes('No Starred Buses'), 'Must present dedicated empty state for Starred filter');
  });
});

describe('Product Quality: Interactive Map Stop Geofence Visualizer (/app)', () => {
  const html = renderMobileHtml();

  test('draws authentic 100m circular geofence on stop inspection', () => {
    assert.ok(html.includes('L.circle([stop.latitude, stop.longitude]'), 'Must instantiate L.circle at stop coordinates');
    assert.ok(html.includes('radius: 100'), 'Must enforce authentic 100-meter radius per Spec 10');
  });

  test('binds arrival geofence popup and centers map on stop', () => {
    assert.ok(html.includes('Arrival Geofence (100m)'), 'Must bind descriptive popup text to geofence circle');
    assert.ok(html.includes('appState.mapInstance.setView([stop.latitude, stop.longitude]'), 'Must pan camera to inspected stop');
  });

  test('cleans up geofence layer on modal dismissal', () => {
    assert.ok(html.includes('window.closeStopModal'), 'Must declare window.closeStopModal handler');
    assert.ok(html.includes('appState.mapInstance.removeLayer(appState.activeStopGeofence)'), 'Must remove geofence layer cleanly');
  });
});

describe('Product Quality: GPS Tracker Lifecycle & Audit Logging (/admin)', () => {
  test('updates device status and generates immutable audit log record', () => {
    const devId = 'HW_3045';
    const result = fleetDataStore.updateDeviceStatus(devId, 'ACTIVE', 'admin@vjit.ac.in');
    assert.equal(result.success, true);
    assert.equal(result.device?.status, 'ACTIVE');

    // Verify audit record was created
    const auditLogs = fleetDataStore.getAuditLogs(10);
    const log = auditLogs.find(l => l.action === 'UPDATE_DEVICE_STATUS' && l.entity_id === devId);
    assert.ok(log, 'Audit log must record device status change');
    assert.equal(log?.actor_email, 'admin@vjit.ac.in');
    assert.equal(log?.entity_type, 'DEVICE');
  });

  test('renders lifecycle action buttons and confirmation in admin console', () => {
    const adminHtml = renderAdminHtml();
    assert.ok(adminHtml.includes('window.updateDeviceStatus'), 'Must expose window.updateDeviceStatus handler');
    assert.ok(adminHtml.includes('updateDeviceStatus('), 'Must render status action buttons');
    assert.ok(adminHtml.includes('/api/v1/devices/'), 'Must invoke /api/v1/devices/:id/status endpoint');
  });
});

describe('Product Quality: PWA Service Worker Security Boundary', () => {
  const sw = getServiceWorkerJs();

  test('strictly protects /admin and /console from service worker caching', () => {
    assert.ok(sw.includes("url.pathname.startsWith('/admin')"), 'Must bypass service worker for /admin');
    assert.ok(sw.includes("url.pathname.startsWith('/console')"), 'Must bypass service worker for /console');
    assert.ok(sw.includes("url.pathname.startsWith('/api/')"), 'Must bypass service worker for /api/');
  });
});

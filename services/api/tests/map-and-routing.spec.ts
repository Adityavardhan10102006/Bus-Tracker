import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateRouteStops,
  calculatePolylineDistanceMeters,
  generateStraightLineFallback,
  calculateRouteGeometry,
} from '@vjit/domain';
import { FleetDataStore } from '../dist/store/fleet-data-store.js';

describe('Map & Route Management: Domain Stop & Geometry Validation (Phase P7)', () => {
  const validStops = [
    {
      id: 'stop-1',
      name: 'Mehdipatnam Rethi Bowli',
      sequence: 1,
      latitude: 17.3916,
      longitude: 78.4416,
      scheduled_time: '07:45 AM',
    },
    {
      id: 'stop-2',
      name: 'Attapur Pillar 143',
      sequence: 2,
      latitude: 17.3750,
      longitude: 78.4320,
      scheduled_time: '08:00 AM',
    },
    {
      id: 'stop-3',
      name: 'Sun City Bandlaguda',
      sequence: 3,
      latitude: 17.3590,
      longitude: 78.3850,
      scheduled_time: '08:15 AM',
    },
    {
      id: 'stop-4',
      name: 'VJIT Main Campus',
      sequence: 4,
      latitude: 17.3616,
      longitude: 78.3245,
      scheduled_time: '08:30 AM',
    },
  ];

  test('validates correct route stops within geographic boundaries and sequences', () => {
    const result = validateRouteStops(validStops);
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
  });

  test('rejects route stops with invalid latitude or longitude', () => {
    const invalidCoordsStops = [
      {
        id: 'stop-bad-1',
        name: 'Invalid Latitude Stop',
        sequence: 1,
        latitude: 95.0, // Exceeds latitude max
        longitude: 78.4416,
      },
      {
        id: 'stop-bad-2',
        name: 'Invalid Longitude Stop',
        sequence: 2,
        latitude: 17.3750,
        longitude: 200.0, // Exceeds longitude max
      },
    ];

    const result = validateRouteStops(invalidCoordsStops);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.length >= 2);
    assert.ok(result.problematicStopIds.includes('stop-bad-1'));
    assert.ok(result.problematicStopIds.includes('stop-bad-2'));
  });

  test('detects duplicate stop names and duplicate coordinates', () => {
    const duplicateStops = [
      {
        id: 'stop-d1',
        name: 'Attapur Junction',
        sequence: 1,
        latitude: 17.3750,
        longitude: 78.4320,
      },
      {
        id: 'stop-d2',
        name: 'Attapur Junction', // Duplicate name
        sequence: 2,
        latitude: 17.3750, // Duplicate coordinate
        longitude: 78.4320,
      },
    ];

    const result = validateRouteStops(duplicateStops);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Duplicate stop name')));
    assert.ok(result.errors.some(e => e.includes('identical coordinates')));
  });

  test('rejects broken sequence numbering or missing sequence steps', () => {
    const brokenSeqStops = [
      { id: 'stop-s1', name: 'Stop A', sequence: 1, latitude: 17.3916, longitude: 78.4416 },
      { id: 'stop-s2', name: 'Stop B', sequence: 4, latitude: 17.3750, longitude: 78.4320 }, // Gap in sequence
    ];

    const result = validateRouteStops(brokenSeqStops);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Sequence error')));
  });
});

describe('Map & Route Management: Distance & Routing Provider Boundary', () => {
  const corridorCoords: [number, number][] = [
    [17.3916, 78.4416], // Mehdipatnam
    [17.3750, 78.4320], // Attapur
    [17.3590, 78.3850], // Sun City
    [17.3616, 78.3245], // VJIT Main Campus
  ];

  test('accurately calculates polyline distance in meters', () => {
    const distanceMeters = calculatePolylineDistanceMeters(corridorCoords);
    assert.ok(distanceMeters > 10000, `Distance ${distanceMeters}m should be > 10 km`);
    assert.ok(distanceMeters < 30000, `Distance ${distanceMeters}m should be < 30 km`);
  });

  test('generates straight-line fallback geometry connecting ordered stops', () => {
    const stops = [
      { id: 's1', name: 'Stop 1', sequence: 1, latitude: 17.3916, longitude: 78.4416 },
      { id: 's2', name: 'Stop 2', sequence: 2, latitude: 17.3750, longitude: 78.4320 },
    ];

    const fallback = generateStraightLineFallback(stops);
    assert.equal(fallback.polyline.length, 2);
    assert.equal(fallback.source, 'STRAIGHT_LINE_FALLBACK');
    assert.ok(fallback.distanceMeters > 0);
  });

  test('preserves verified saved geometry when existing polyline is supplied', async () => {
    const stops = [
      { id: 's1', name: 'Stop 1', sequence: 1, latitude: 17.3916, longitude: 78.4416 },
      { id: 's2', name: 'Stop 2', sequence: 2, latitude: 17.3750, longitude: 78.4320 },
    ];
    const savedPolyline: [number, number][] = [
      [17.3916, 78.4416],
      [17.3850, 78.4390],
      [17.3750, 78.4320],
    ];

    // Force failure of routing provider to verify saved geometry fallback behavior
    const result = await calculateRouteGeometry(stops, {
      routingServiceUrl: 'http://127.0.0.1:59999', // unreachable URL
      existingPolyline: savedPolyline,
    });

    assert.equal(result.source, 'SAVED_GEOMETRY');
    assert.equal(result.polyline.length, 3);
    assert.ok(result.distanceMeters > 0);
  });
});

describe('Map & Route Management: Persistence Across Restarts (Rule B.6 & P0-T6)', () => {
  const testPersistenceFile = path.resolve(process.cwd(), 'tmp/test-route-persistence-restart.json');

  test('newly created route with ordered stops and road geometry survives store restart', () => {
    if (fs.existsSync(testPersistenceFile)) {
      fs.unlinkSync(testPersistenceFile);
    }
    process.env.PERSISTENCE_FILE_PATH = testPersistenceFile;

    try {
      // 1. Session 1: Create Route
      const session1 = new FleetDataStore();
      const customRoute = session1.createRoute({
        code: 'R99',
        name: 'Gachibowli Outer Ring Express',
        origin: 'Gachibowli Stadium',
        destination: 'VJIT Main Campus',
      });
      assert.ok(customRoute.id);
      assert.equal(customRoute.code, 'R99');

      // Add ordered stops to route
      const s1 = session1.addStopToRoute(customRoute.id, {
        name: 'Gachibowli Stadium',
        sequence: 1,
        latitude: 17.4435,
        longitude: 78.3489,
        scheduled_time: '07:30 AM',
      });
      assert.ok(s1);

      const s2 = session1.addStopToRoute(customRoute.id, {
        name: 'Financial District Wipro Circle',
        sequence: 2,
        latitude: 17.4165,
        longitude: 78.3421,
        scheduled_time: '07:45 AM',
      });
      assert.ok(s2);

      const s3 = session1.addStopToRoute(customRoute.id, {
        name: 'VJIT Main Gate',
        sequence: 3,
        latitude: 17.3616,
        longitude: 78.3245,
        scheduled_time: '08:15 AM',
      });
      assert.ok(s3);

      // Update route with verified road polyline
      const samplePolyline: [number, number][] = [
        [17.4435, 78.3489],
        [17.4300, 78.3450],
        [17.4165, 78.3421],
        [17.3800, 78.3300],
        [17.3616, 78.3245],
      ];
      const updatedRoute = session1.updateRoute(customRoute.id, {
        polyline: samplePolyline,
        geometry_source: 'SAVED_GEOMETRY',
        distance_meters: 12500,
      });
      assert.equal(updatedRoute?.geometry_source, 'SAVED_GEOMETRY');
      assert.equal(updatedRoute?.distance_meters, 12500);

      // Verify file written
      assert.ok(fs.existsSync(testPersistenceFile), 'Disk store file must exist');

      // 2. Session 2: Fresh Store Instance simulates application restart
      const session2 = new FleetDataStore();
      const restored = session2.getRouteById(customRoute.id);
      assert.ok(restored, 'Route R99 must be restored after store restart');
      assert.equal(restored?.code, 'R99');
      assert.equal(restored?.name, 'Gachibowli Outer Ring Express');
      assert.equal(restored?.stops.length, 3, 'Must restore all 3 ordered stops');
      assert.equal(restored?.stops[0].name, 'Gachibowli Stadium');
      assert.equal(restored?.stops[1].name, 'Financial District Wipro Circle');
      assert.equal(restored?.stops[2].name, 'VJIT Main Gate');
      assert.equal(restored?.geometry_source, 'SAVED_GEOMETRY');
      assert.equal(restored?.distance_meters, 12500);
      assert.equal(restored?.polyline?.length, 5);
    } finally {
      if (fs.existsSync(testPersistenceFile)) {
        fs.unlinkSync(testPersistenceFile);
      }
      delete process.env.PERSISTENCE_FILE_PATH;
    }
  });

  test('stop reordering and removal persists across restart', () => {
    if (fs.existsSync(testPersistenceFile)) {
      fs.unlinkSync(testPersistenceFile);
    }
    process.env.PERSISTENCE_FILE_PATH = testPersistenceFile;

    try {
      const session1 = new FleetDataStore();
      const route = session1.createRoute({
        code: 'R88',
        name: 'Kothaguda Corridor',
        origin: 'Kothaguda X Road',
        destination: 'VJIT Main Campus',
      });

      session1.addStopToRoute(route.id, { name: 'Stop 1', sequence: 1, latitude: 17.46, longitude: 78.36 });
      session1.addStopToRoute(route.id, { name: 'Stop 2', sequence: 2, latitude: 17.42, longitude: 78.34 });
      session1.addStopToRoute(route.id, { name: 'Stop 3', sequence: 3, latitude: 17.36, longitude: 78.32 });

      // Reorder stops
      session1.updateRoute(route.id, {
        stops: [
          { name: 'Stop 2 (Promoted to 1)', sequence: 1, latitude: 17.42, longitude: 78.34 },
          { name: 'Stop 1 (Moved to 2)', sequence: 2, latitude: 17.46, longitude: 78.36 },
          { name: 'Stop 3', sequence: 3, latitude: 17.36, longitude: 78.32 },
        ],
      });

      // Session 2: Reload
      const session2 = new FleetDataStore();
      const restored = session2.getRouteById(route.id);
      assert.ok(restored);
      assert.equal(restored?.stops.length, 3);
      assert.equal(restored?.stops[0].name, 'Stop 2 (Promoted to 1)');
      assert.equal(restored?.stops[1].name, 'Stop 1 (Moved to 2)');
    } finally {
      if (fs.existsSync(testPersistenceFile)) {
        fs.unlinkSync(testPersistenceFile);
      }
      delete process.env.PERSISTENCE_FILE_PATH;
    }
  });
});

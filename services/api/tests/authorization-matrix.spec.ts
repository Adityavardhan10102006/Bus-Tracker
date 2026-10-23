import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { checkRole, ROLE_GROUPS } from '../dist/middleware/auth.js';
import type { UserRole } from '@vjit/contracts';

// Mock ServerResponse for unit testing checkRole
function createMockResponse() {
  let statusCode = 200;
  let headers: Record<string, string> = {};
  let body = '';

  return {
    writeHead(code: number, hdrs?: Record<string, string>) {
      statusCode = code;
      if (hdrs) headers = { ...headers, ...hdrs };
      return this;
    },
    setHeader(name: string, val: string) {
      headers[name] = val;
    },
    end(chunk?: string) {
      if (chunk) body = chunk;
    },
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getBody: () => body,
    getParsedBody: () => {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    },
  };
}

describe('Authorization & Role Matrix Unit Tests (Spec Section 5 & Part E)', () => {
  const allRoles: UserRole[] = ['STU', 'FAC', 'COR', 'TEC', 'SAD', 'MGT', 'SEC'];

  describe('checkRole Unit Verification', () => {
    test('checkRole allows role in allowed list and does not modify response', () => {
      const res = createMockResponse();
      const authorized = checkRole('COR', ['COR', 'SAD'], res as any, 'req-001');

      assert.strictEqual(authorized, true);
      assert.strictEqual(res.getStatusCode(), 200);
      assert.strictEqual(res.getBody(), '');
    });

    test('checkRole rejects unauthorized role with 403 FORBIDDEN and Part I.3 envelope', () => {
      const res = createMockResponse();
      const authorized = checkRole('STU', ['COR', 'SAD'], res as any, 'req-002', 'Route modification prohibited');

      assert.strictEqual(authorized, false);
      assert.strictEqual(res.getStatusCode(), 403);
      const parsed = res.getParsedBody();
      assert.strictEqual(parsed.error.code, 'FORBIDDEN');
      assert.ok(parsed.error.message.includes('Route modification prohibited'));
      assert.strictEqual(parsed.error.request_id, 'req-002');
      assert.ok(Array.isArray(parsed.error.details));
      assert.strictEqual(parsed.error.details[0].field, 'role');
      assert.ok(parsed.error.details[0].issue.includes('STU'));
    });
  });

  describe('Role Group Boundary Assertions', () => {
    test('COORDINATORS_AND_ADMINS permits COR and SAD, blocks all other roles', () => {
      for (const role of allRoles) {
        const res = createMockResponse();
        const allowed = checkRole(role, ROLE_GROUPS.COORDINATORS_AND_ADMINS, res as any, 'req-id');
        if (role === 'COR' || role === 'SAD') {
          assert.strictEqual(allowed, true, `Role ${role} should be permitted`);
        } else {
          assert.strictEqual(allowed, false, `Role ${role} should be blocked`);
          assert.strictEqual(res.getStatusCode(), 403);
        }
      }
    });

    test('DEVICE_MANAGERS permits COR, TEC, and SAD, blocks STU, FAC, MGT, SEC', () => {
      for (const role of allRoles) {
        const res = createMockResponse();
        const allowed = checkRole(role, ROLE_GROUPS.DEVICE_MANAGERS, res as any, 'req-id');
        if (role === 'COR' || role === 'TEC' || role === 'SAD') {
          assert.strictEqual(allowed, true, `Role ${role} should be permitted`);
        } else {
          assert.strictEqual(allowed, false, `Role ${role} should be blocked`);
          assert.strictEqual(res.getStatusCode(), 403);
        }
      }
    });

    test('SUPER_ADMINS_ONLY permits only SAD, blocks all 6 other roles', () => {
      for (const role of allRoles) {
        const res = createMockResponse();
        const allowed = checkRole(role, ROLE_GROUPS.SUPER_ADMINS_ONLY, res as any, 'req-id');
        if (role === 'SAD') {
          assert.strictEqual(allowed, true, 'SAD should be permitted');
        } else {
          assert.strictEqual(allowed, false, `Role ${role} should be blocked`);
          assert.strictEqual(res.getStatusCode(), 403);
        }
      }
    });

    test('STAFF_MEMBERS permits COR, SAD, MGT, SEC, FAC, blocks STU and TEC', () => {
      for (const role of allRoles) {
        const res = createMockResponse();
        const allowed = checkRole(role, ROLE_GROUPS.STAFF_MEMBERS, res as any, 'req-id');
        if (['COR', 'SAD', 'MGT', 'SEC', 'FAC'].includes(role)) {
          assert.strictEqual(allowed, true, `Role ${role} should be permitted`);
        } else {
          assert.strictEqual(allowed, false, `Role ${role} should be blocked`);
          assert.strictEqual(res.getStatusCode(), 403);
        }
      }
    });

    test('MAINTENANCE_DESK permits COR, TEC, SAD, MGT, blocks STU, FAC, SEC', () => {
      for (const role of allRoles) {
        const res = createMockResponse();
        const allowed = checkRole(role, ROLE_GROUPS.MAINTENANCE_DESK, res as any, 'req-id');
        if (['COR', 'TEC', 'SAD', 'MGT'].includes(role)) {
          assert.strictEqual(allowed, true, `Role ${role} should be permitted`);
        } else {
          assert.strictEqual(allowed, false, `Role ${role} should be blocked`);
          assert.strictEqual(res.getStatusCode(), 403);
        }
      }
    });
  });
});

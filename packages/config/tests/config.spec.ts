import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OPERATIONAL_CONFIG,
  getOperationalDefault,
  envSchema,
  loadAndValidateConfig,
} from '../dist/index.js';

describe('Config: Operational Defaults (Part I.5)', () => {
  test('contains all operational defaults per Master Plan Part I.5', () => {
    const keys = Object.keys(DEFAULT_OPERATIONAL_CONFIG);
    assert.ok(keys.length >= 72, `Expected at least 72 operational defaults, got ${keys.length}`);
  });

  test('verifies critical tracking and security defaults', () => {
    assert.equal(getOperationalDefault('hw.moving_interval_s'), 10);
    assert.equal(getOperationalDefault('hw.stale_after_s'), 60);
    assert.equal(getOperationalDefault('ingest.body_max_kb'), 8);
    assert.equal(getOperationalDefault('ingest.batch_max'), 50);
    assert.equal(getOperationalDefault('otp.ttl_min'), 10);
    assert.equal(getOperationalDefault('otp.attempts'), 5);
    assert.equal(getOperationalDefault('otp.lock_min'), 15);
  });
});

describe('Config: Environment Variable Validation (Part I.4 & Task P0-T2)', () => {
  const validMockEnv = {
    NODE_ENV: 'development',
    APP_ENV: 'local',
    PORT: '3000',
    DATABASE_URL: 'postgresql://app_runtime:runtime_pass_cluster_vjit_2026@localhost:5432/vjit_db',
    API_PUBLIC_HOST: 'localhost:3000',
    INGEST_PUBLIC_HOST: 'localhost:3000',
    ADMIN_PUBLIC_HOST: 'localhost:5173',
    JWT_SECRET: 'vjit_jwt_signing_key_production_grade_entropy_2026_x89a',
    DEVICE_TOKEN_HMAC_KEYS: JSON.stringify({ v1: 'vjit_device_token_hmac_entropy_cluster_987' }),
    QR_HMAC_KEYS: JSON.stringify({ v1: 'vjit_qr_signature_hmac_entropy_cluster_456' }),
    AWS_REGION: 'ap-south-1',
  };

  test('accepts valid environment variables configuration', () => {
    const parsed = loadAndValidateConfig(validMockEnv as any);
    assert.equal(parsed.APP_ENV, 'local');
    assert.equal(parsed.PORT, 3000);
  });

  test('refuses to start when NODE_ENV is production while APP_ENV is local', () => {
    const invalidEnv = {
      ...validMockEnv,
      NODE_ENV: 'production',
      APP_ENV: 'local',
    };

    assert.throws(
      () => loadAndValidateConfig(invalidEnv as any),
      /Incompatible environment configuration/,
    );
  });

  test('refuses secrets that contain known placeholder strings', () => {
    const placeholderSecretEnv = {
      ...validMockEnv,
      JWT_SECRET: 'changeme_this_is_too_short_placeholder',
    };

    assert.throws(
      () => loadAndValidateConfig(placeholderSecretEnv as any),
      /JWT_SECRET contains an insecure placeholder value/,
    );
  });

  test('refuses invalid JSON in HMAC key rotation maps', () => {
    const invalidJsonEnv = {
      ...validMockEnv,
      DEVICE_TOKEN_HMAC_KEYS: 'not-valid-json',
    };

    assert.throws(
      () => loadAndValidateConfig(invalidJsonEnv as any),
      /DEVICE_TOKEN_HMAC_KEYS must be a valid JSON map/,
    );
  });
});

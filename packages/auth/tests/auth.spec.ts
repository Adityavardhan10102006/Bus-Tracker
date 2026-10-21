import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateNumericOtp,
  validateOtpAttempt,
  generateRefreshToken,
  isSessionIdleTimedOut,
  generateTotpCode,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
  createTotpEnrollment,
  isMfaRequiredForRole,
  generatePkceParameters,
  isPermittedCollegeDomain,
  evaluateOidcUserMatch,
} from '../dist/index.js';
import { hashTokenHmac } from '@vjit/domain';

describe('Auth: Email OTP Flow (F-AUTH-02 & Task P0-T10)', () => {
  const secretKey = 'test_otp_hmac_secret_key_123';

  test('generates 6-digit numeric OTP', () => {
    const otp = generateNumericOtp();
    assert.match(otp, /^\d{6}$/);
  });

  test('validates correct OTP code within TTL', () => {
    const rawOtp = '123456';
    const storedHash = hashTokenHmac(rawOtp, secretKey);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min TTL

    const result = validateOtpAttempt(
      rawOtp,
      storedHash,
      secretKey,
      { attempts: 0, expiresAt },
      now,
    );

    assert.equal(result.valid, true);
  });

  test('rejects expired OTP', () => {
    const rawOtp = '123456';
    const storedHash = hashTokenHmac(rawOtp, secretKey);
    const now = new Date();
    const expiresAt = new Date(now.getTime() - 1000); // Expired 1 second ago

    const result = validateOtpAttempt(
      rawOtp,
      storedHash,
      secretKey,
      { attempts: 0, expiresAt },
      now,
    );

    assert.equal(result.valid, false);
    assert.equal(result.reason, 'EXPIRED');
  });

  test('enforces max 5 attempts and triggers lockout', () => {
    const rawOtp = '123456';
    const storedHash = hashTokenHmac(rawOtp, secretKey);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const result = validateOtpAttempt(
      '000000', // Wrong code
      storedHash,
      secretKey,
      { attempts: 4, expiresAt },
      now,
    );

    assert.equal(result.valid, false);
    assert.equal(result.reason, 'MAX_ATTEMPTS_EXCEEDED');
    assert.ok(result.lockedUntil);
  });
});

describe('Auth: Session Manager & Idle Timeout (F-AUTH-04 & Task P0-T11)', () => {
  test('generates opaque 32-byte refresh token with SHA-256 hash', () => {
    const token = generateRefreshToken();
    assert.ok(token.refreshTokenPlaintext.length >= 40);
    assert.equal(token.refreshTokenHash.length, 64);
  });

  test('enforces 30-minute idle timeout for regular users and 15-minute for SEC', () => {
    const now = new Date();
    const twentyMinsAgo = new Date(now.getTime() - 20 * 60 * 1000);

    // Student at 20 mins is not timed out (limit 30 mins)
    assert.equal(isSessionIdleTimedOut(twentyMinsAgo, 'STU', now), false);

    // Security Staff (SEC) at 20 mins is timed out (limit 15 mins)
    assert.equal(isSessionIdleTimedOut(twentyMinsAgo, 'SEC', now), true);
  });
});

describe('Auth: MFA, TOTP & Recovery Codes (F-AUTH-05 & Task P0-T12)', () => {
  test('generates and verifies RFC 6238 TOTP code', () => {
    const enrollment = createTotpEnrollment('admin@vjit.ac.in');
    assert.ok(enrollment.secretBase32.length >= 24);
    assert.ok(enrollment.otpauthUri.startsWith('otpauth://totp/'));

    const currentCounter = Math.floor(Date.now() / 1000 / 30);
    const code = generateTotpCode(enrollment.secretBase32, currentCounter);

    const isValid = verifyTotpCode(code, enrollment.secretBase32);
    assert.equal(isValid, true);

    const isWrong = verifyTotpCode('999999', enrollment.secretBase32);
    // Unless code happened to be 999999
    if (code !== '999999') {
      assert.equal(isWrong, false);
    }
  });

  test('generates 10 single-use recovery codes and verifies hashes', () => {
    const { codes, hashes } = generateRecoveryCodes(10);
    assert.equal(codes.length, 10);
    assert.equal(hashes.length, 10);

    const firstCode = codes[0];
    assert.ok(firstCode);
    const verifyResult = verifyRecoveryCode(firstCode, hashes);
    assert.equal(verifyResult.valid, true);
    assert.equal(verifyResult.matchingIndex, 0);

    const invalidResult = verifyRecoveryCode('AAAAA-BBBBB', hashes);
    assert.equal(invalidResult.valid, false);
  });

  test('verifies staff role MFA requirements', () => {
    assert.equal(isMfaRequiredForRole('SAD'), true);
    assert.equal(isMfaRequiredForRole('COR'), true);
    assert.equal(isMfaRequiredForRole('TEC'), true);
    assert.equal(isMfaRequiredForRole('MGT'), true);
    assert.equal(isMfaRequiredForRole('SEC'), true);
    assert.equal(isMfaRequiredForRole('STU'), false);
    assert.equal(isMfaRequiredForRole('FAC'), false);
  });
});

describe('Auth: OIDC & Domain Verification (F-AUTH-01 & Task P0-T9)', () => {
  test('generates cryptographic PKCE parameters', () => {
    const pkce = generatePkceParameters();
    assert.ok(pkce.codeVerifier.length >= 40);
    assert.ok(pkce.codeChallenge.length >= 40);
    assert.ok(pkce.state.length >= 20);
    assert.ok(pkce.nonce.length >= 20);
  });

  test('accepts only allowed institutional email domains', () => {
    const allowed = ['vjit.ac.in'];
    assert.equal(isPermittedCollegeDomain('student@vjit.ac.in', allowed), true);
    assert.equal(isPermittedCollegeDomain('faculty@vjit.ac.in', allowed), true);
    assert.equal(isPermittedCollegeDomain('external@gmail.com', allowed), false);
  });

  test('enforces F-AUTH-01: unlisted email instructs user to contact transport office', () => {
    const allowed = ['vjit.ac.in'];

    // Unregistered user
    const unregResult = evaluateOidcUserMatch('newstudent@vjit.ac.in', allowed, null);
    assert.equal(unregResult.allowed, false);
    assert.equal(unregResult.errorReason, 'USER_NOT_REGISTERED');
    assert.equal(unregResult.message, 'Contact the transport office.');

    // Registered user
    const regResult = evaluateOidcUserMatch('student@vjit.ac.in', allowed, {
      id: 'user-1',
      role: 'STU',
      isActive: true,
    });
    assert.equal(regResult.allowed, true);
  });
});

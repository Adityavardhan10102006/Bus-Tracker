import crypto from 'node:crypto';
import { hashTokenHmac, timingSafeEqualString } from '@vjit/domain';

export interface OtpValidationResult {
  valid: boolean;
  reason?: 'EXPIRED' | 'LOCKED' | 'MAX_ATTEMPTS_EXCEEDED' | 'INVALID_CODE' | 'ALREADY_CONSUMED';
  remainingAttempts?: number;
  lockedUntil?: Date;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 * Per Specification Section 8 & Task P0-T10
 */
export function generateNumericOtp(): string {
  // Generate random integer in range [100000, 999999]
  const val = crypto.randomInt(100000, 1000000);
  return val.toString();
}

/**
 * Validates an entered OTP against database state
 * Enforces:
 * - TTL 10 minutes (otp.ttl_min = 10)
 * - Max 5 attempts (otp.attempts = 5)
 * - Lockout 15 minutes (otp.lock_min = 15)
 * - Single-use consumption
 */
export function validateOtpAttempt(
  enteredOtp: string,
  storedHash: string,
  secretKey: string,
  state: {
    attempts: number;
    expiresAt: Date;
    lockedUntil?: Date | null;
    consumedAt?: Date | null;
  },
  now = new Date(),
): OtpValidationResult {
  if (state.consumedAt) {
    return { valid: false, reason: 'ALREADY_CONSUMED' };
  }

  if (state.lockedUntil && state.lockedUntil.getTime() > now.getTime()) {
    return { valid: false, reason: 'LOCKED', lockedUntil: state.lockedUntil };
  }

  if (now.getTime() > state.expiresAt.getTime()) {
    return { valid: false, reason: 'EXPIRED' };
  }

  if (state.attempts >= 5) {
    const lockUntil = new Date(now.getTime() + 15 * 60 * 1000);
    return { valid: false, reason: 'MAX_ATTEMPTS_EXCEEDED', lockedUntil: lockUntil };
  }

  const enteredHash = hashTokenHmac(enteredOtp, secretKey);
  const isMatch = timingSafeEqualString(enteredHash, storedHash);

  if (isMatch) {
    return { valid: true };
  }

  const newAttempts = state.attempts + 1;
  if (newAttempts >= 5) {
    const lockUntil = new Date(now.getTime() + 15 * 60 * 1000);
    return {
      valid: false,
      reason: 'MAX_ATTEMPTS_EXCEEDED',
      remainingAttempts: 0,
      lockedUntil: lockUntil,
    };
  }

  return {
    valid: false,
    reason: 'INVALID_CODE',
    remainingAttempts: 5 - newAttempts,
  };
}

import crypto from 'node:crypto';
import type { UserRole } from '@vjit/contracts';

export interface SessionTokenPair {
  refreshTokenPlaintext: string;
  refreshTokenHash: string;
}

/**
 * Generates an opaque cryptographically secure refresh token and its SHA-256 hash
 * Per Specification Section 7 & Task P0-T11
 */
export function generateRefreshToken(): SessionTokenPair {
  const bytes = crypto.randomBytes(32);
  const refreshTokenPlaintext = bytes.toString('base64url');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenPlaintext).digest('hex');

  return {
    refreshTokenPlaintext,
    refreshTokenHash,
  };
}

/**
 * Evaluates session idle timeout
 * Per Part I.5: 30 minutes default; 15 minutes for SEC role
 */
export function isSessionIdleTimedOut(
  lastActivityAt: Date,
  userRole: UserRole,
  now = new Date(),
): boolean {
  const timeoutMinutes = userRole === 'SEC' ? 15 : 30;
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const elapsedMs = now.getTime() - lastActivityAt.getTime();

  return elapsedMs > timeoutMs;
}

import crypto from 'node:crypto';

export interface TokenRotationInitiation {
  plaintextNewToken: string;
  newTokenHash: string;
  keyVersion: string;
  expiresAt: Date;
}

/**
 * Generates a new cryptographically secure 43-character base64url token and hash
 * Implements Specification 11.1 & Task P1-T9
 */
export function initiateDeviceTokenRotation(
  currentKeyVersion = 'v1',
  secretKey: string,
  ttlHours = 24,
): TokenRotationInitiation {
  // Generate 32 bytes (256 bits) of random entropy
  const bytes = crypto.randomBytes(32);
  const plaintextNewToken = bytes.toString('base64url'); // exactly 43 characters

  const newTokenHash = crypto.createHmac('sha256', secretKey).update(plaintextNewToken).digest('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  return {
    plaintextNewToken,
    newTokenHash,
    keyVersion: currentKeyVersion,
    expiresAt,
  };
}

/**
 * Validates pending token activation on first successful use
 */
export function validatePendingTokenActivation(
  pendingToken: {
    token_hash: string;
    expires_at: Date;
    is_active: boolean;
  },
  now = new Date(),
): { valid: boolean; error?: 'TOKEN_EXPIRED' | 'ALREADY_ACTIVE' } {
  if (pendingToken.is_active) {
    return { valid: true };
  }

  if (now.getTime() > pendingToken.expires_at.getTime()) {
    return { valid: false, error: 'TOKEN_EXPIRED' };
  }

  return { valid: true };
}

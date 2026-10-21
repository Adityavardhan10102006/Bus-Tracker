import crypto from 'node:crypto';

export type DeviceStatus = 'PROVISIONED' | 'ACTIVE' | 'MAINTENANCE' | 'REVOKED' | 'RETIRED';

export interface DeviceAuthEvaluation {
  authenticated: boolean;
  shouldActivateDevice?: boolean;
  errorCode?: 'AUTH_REQUIRED' | 'DEVICE_INACTIVE' | 'DEVICE_REVOKED';
  errorMessage?: string;
}

/**
 * Validates the Authorization Bearer header format
 * Must be exactly "Bearer <43-base64url-chars>" (256-bit entropy)
 * Per Specification 11.1 & Task P1-T2
 */
export function validateBearerTokenFormat(authHeader?: string | string[]): {
  valid: boolean;
  token?: string;
  error?: 'AUTH_REQUIRED';
} {
  if (!authHeader || typeof authHeader !== 'string') {
    return { valid: false, error: 'AUTH_REQUIRED' };
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
    return { valid: false, error: 'AUTH_REQUIRED' };
  }

  const token = parts[1];
  if (!token) {
    return { valid: false, error: 'AUTH_REQUIRED' };
  }

  // Exactly 43 base64url characters
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) {
    return { valid: false, error: 'AUTH_REQUIRED' };
  }

  return { valid: true, token };
}

/**
 * Computes HMAC-SHA256 for a device token using a specified key version secret
 */
export function hashDeviceToken(token: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(token).digest('hex');
}

/**
 * Evaluates device authentication state and lifecycle status
 * Implements Conflict C-01 resolution:
 * - Accept a PROVISIONED device on first request only if first_used_at is null, activating it to ACTIVE
 * - RETIRED or REVOKED devices return 403 DEVICE_INACTIVE
 * - Revoked token returns 401 DEVICE_REVOKED
 */
export function evaluateDeviceAuthStatus(
  device: {
    id: string;
    status: DeviceStatus;
    first_used_at?: Date | null;
  },
  storedTokens: Array<{
    key_version: string;
    token_hash: string;
    is_revoked: boolean;
  }>,
  computedHashes: Record<string, string>, // key_version -> hash
): DeviceAuthEvaluation {
  // Check if device status allows communication
  if (device.status === 'REVOKED' || device.status === 'RETIRED') {
    return {
      authenticated: false,
      errorCode: 'DEVICE_INACTIVE',
      errorMessage: `Device ${device.id} is ${device.status} and cannot transmit telemetry.`,
    };
  }

  // Find matching token by key_version and token_hash
  let matchedToken: (typeof storedTokens)[0] | undefined;
  for (const stored of storedTokens) {
    const computed = computedHashes[stored.key_version];
    if (computed && crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(stored.token_hash))) {
      matchedToken = stored;
      break;
    }
  }

  if (!matchedToken) {
    return {
      authenticated: false,
      errorCode: 'AUTH_REQUIRED',
      errorMessage: 'Invalid device credentials.',
    };
  }

  if (matchedToken.is_revoked) {
    return {
      authenticated: false,
      errorCode: 'DEVICE_REVOKED',
      errorMessage: `Device token for ${device.id} has been revoked.`,
    };
  }

  // Conflict C-01: First use of PROVISIONED device activates it
  if (device.status === 'PROVISIONED') {
    if (!device.first_used_at) {
      return {
        authenticated: true,
        shouldActivateDevice: true,
      };
    }
    return {
      authenticated: false,
      errorCode: 'DEVICE_INACTIVE',
      errorMessage: `PROVISIONED device ${device.id} has already been used and requires administrative reactivation.`,
    };
  }

  return { authenticated: true };
}

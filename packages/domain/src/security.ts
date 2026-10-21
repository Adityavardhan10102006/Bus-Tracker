import crypto from 'node:crypto';

/**
 * Computes HMAC-SHA256 hash of a bearer token
 * Per Specification 11.1 & Part F Control 18
 */
export function hashTokenHmac(token: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(token).digest('hex');
}

/**
 * Timing-safe string equality comparison to prevent timing attacks
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

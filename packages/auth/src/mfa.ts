import crypto from 'node:crypto';
import type { UserRole } from '@vjit/contracts';

export interface TotpEnrollment {
  secretBase32: string;
  otpauthUri: string;
  recoveryCodes: string[];
  recoveryCodeHashes: string[];
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 encode buffer
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte === undefined) continue;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decode string to buffer
 */
export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    const index = BASE32_ALPHABET.indexOf(char ?? '');
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates RFC 6238 TOTP code for a given secret and counter
 */
export function generateTotpCode(secretBase32: string, counter: number, digits = 6): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const codeInt =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);

  const modulo = 10 ** digits;
  const code = (codeInt % modulo).toString().padStart(digits, '0');
  return code;
}

/**
 * Validates a TOTP code within a 1-step window (±30s)
 */
export function verifyTotpCode(
  token: string,
  secretBase32: string,
  now = new Date(),
  stepSeconds = 30,
): boolean {
  if (!/^\d{6}$/.test(token.trim())) {
    return false;
  }

  const currentCounter = Math.floor(now.getTime() / 1000 / stepSeconds);

  // Allow ±1 step to account for client/server clock drift
  for (let delta = -1; delta <= 1; delta++) {
    const expected = generateTotpCode(secretBase32, currentCounter + delta);
    if (crypto.timingSafeEqual(Buffer.from(token.trim()), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates 10 single-use recovery codes and their salted SHA-256 hashes
 * Per Specification Section 6.4 & Task P0-T12
 */
export function generateRecoveryCodes(count = 10): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex characters
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
    codes.push(formatted);

    // Salted hash
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(`${salt}:${formatted}`).digest('hex');
    hashes.push(`${salt}:${hash}`);
  }

  return { codes, hashes };
}

/**
 * Verifies and consumes a recovery code against stored hashes
 */
export function verifyRecoveryCode(
  enteredCode: string,
  storedHashes: string[],
): { valid: boolean; matchingIndex?: number } {
  const normalized = enteredCode.trim().toUpperCase();

  for (let i = 0; i < storedHashes.length; i++) {
    const stored = storedHashes[i];
    if (!stored) continue;

    const [salt, expectedHash] = stored.split(':');
    if (!salt || !expectedHash) continue;

    const computed = crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedHash))) {
      return { valid: true, matchingIndex: i };
    }
  }

  return { valid: false };
}

/**
 * Generates MFA Enrollment packet for a user
 */
export function createTotpEnrollment(email: string, issuer = 'VJIT Bus Tracker'): TotpEnrollment {
  const secretBytes = crypto.randomBytes(20); // 160 bits secret
  const secretBase32 = base32Encode(secretBytes);
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;

  const { codes, hashes } = generateRecoveryCodes(10);

  return {
    secretBase32,
    otpauthUri,
    recoveryCodes: codes,
    recoveryCodeHashes: hashes,
  };
}

/**
 * Checks if MFA is mandatory for the role
 * SEC, COR, TEC, MGT, SAD require TOTP
 */
export function isMfaRequiredForRole(role: UserRole): boolean {
  const staffRoles: UserRole[] = ['SEC', 'COR', 'TEC', 'MGT', 'SAD'];
  return staffRoles.includes(role);
}

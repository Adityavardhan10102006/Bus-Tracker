import crypto from 'node:crypto';

export interface PkceChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  nonce: string;
}

export interface OidcUserInfo {
  email: string;
  sub: string;
  name?: string;
  picture?: string;
  hd?: string; // Hosted domain (Google Workspace)
}

/**
 * Generates cryptographic PKCE challenge parameters
 */
export function generatePkceParameters(): PkceChallenge {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const state = crypto.randomBytes(24).toString('base64url');
  const nonce = crypto.randomBytes(24).toString('base64url');

  return {
    codeVerifier,
    codeChallenge,
    state,
    nonce,
  };
}

/**
 * Validates whether the email domain is permitted under COLLEGE_EMAIL_DOMAINS
 * Rejects personal / public email providers (gmail.com, yahoo.com, etc.)
 */
export function isPermittedCollegeDomain(
  email: string,
  allowedDomains: string[],
): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return false;

  const domain = normalized.slice(atIndex + 1);
  return allowedDomains.some((d) => d.toLowerCase().trim() === domain);
}

/**
 * Validates OIDC user match against imported user record
 * Enforces F-AUTH-01: If no user match exists, returns instruction to contact transport office
 */
export function evaluateOidcUserMatch(
  email: string,
  allowedDomains: string[],
  existingUser: { id: string; role: string; isActive: boolean } | null,
): { allowed: boolean; errorReason?: 'DOMAIN_NOT_ALLOWED' | 'USER_NOT_REGISTERED' | 'ACCOUNT_DEACTIVATED'; message?: string } {
  if (!isPermittedCollegeDomain(email, allowedDomains)) {
    return {
      allowed: false,
      errorReason: 'DOMAIN_NOT_ALLOWED',
      message: 'Email domain is not authorized for institutional access.',
    };
  }

  if (!existingUser) {
    return {
      allowed: false,
      errorReason: 'USER_NOT_REGISTERED',
      message: 'Contact the transport office.',
    };
  }

  if (!existingUser.isActive) {
    return {
      allowed: false,
      errorReason: 'ACCOUNT_DEACTIVATED',
      message: 'Account is deactivated. Contact the transport office.',
    };
  }

  return { allowed: true };
}

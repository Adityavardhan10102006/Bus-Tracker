import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createErrorEnvelope, type ErrorEnvelope } from '@vjit/contracts';

export interface SecurityContext {
  requestId: string;
  clientIp: string;
}

/**
 * Extracts or generates a standard UUID v4 Request ID
 * Per Specification Section 31 & Task P0-T14
 */
export function resolveRequestId(incomingHeader?: string | string[]): string {
  if (typeof incomingHeader === 'string' && incomingHeader.trim().length > 0) {
    // Validate that it looks like a valid request identifier
    const sanitized = incomingHeader.trim();
    if (/^[a-zA-Z0-9\-_]{8,64}$/.test(sanitized)) {
      return sanitized;
    }
  }
  return crypto.randomUUID();
}

/**
 * Content Security Policy configuration for VJIT College Bus Tracker
 * Permits self-hosted resources, OpenStreetMap tiles, and Leaflet styles/scripts.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

/**
 * Applies security baseline response headers
 * Helmet principles: nosniff, no-store, CSP, Referrer-Policy, Permissions-Policy
 */
export function applySecurityHeaders(res: ServerResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

/**
 * In-memory sliding window rate limiter
 * Enforces Specification Section 31 & AG-MASTER-1.0-v2 Section 31
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  limit = 120,
  windowMs = 60000,
  now = Date.now(),
): { allowed: boolean; limit: number; remaining: number; reset: number } {
  const bucket = rateLimits.get(key);
  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    rateLimits.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);
  const reset = Math.ceil((bucket.resetAt - now) / 1000);
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    reset,
  };
}

export function applyRateLimitHeaders(
  res: ServerResponse,
  rateLimit: { limit: number; remaining: number; reset: number },
): void {
  res.setHeader('RateLimit-Limit', String(rateLimit.limit));
  res.setHeader('RateLimit-Remaining', String(rateLimit.remaining));
  res.setHeader('RateLimit-Reset', String(rateLimit.reset));
}

export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? '127.0.0.1';
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Validates Same-Origin header for browser state-changing requests
 */
export function validateSameOrigin(req: IncomingMessage): boolean {
  const method = req.method?.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }
  const origin = req.headers.origin;
  if (!origin) {
    return true; // Direct API or hardware device client
  }
  const host = req.headers.host;
  if (!host) {
    return true;
  }
  try {
    const originUrl = new URL(origin);
    const hostWithoutPort = host.split(':')[0]?.toLowerCase();
    const originHost = originUrl.hostname.toLowerCase();
    return originHost === hostWithoutPort || originHost === 'localhost' || originHost === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Validates Content-Type for state-changing requests (POST, PUT, PATCH)
 * Returns true if valid, false if 415 UNSUPPORTED_MEDIA_TYPE
 */
export function isAllowedContentType(req: IncomingMessage): boolean {
  const method = req.method?.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || method === 'DELETE') {
    return true;
  }

  const contentType = req.headers['content-type'];
  if (!contentType) {
    return false;
  }

  return contentType.toLowerCase().includes('application/json');
}

/**
 * Sends a structured error response conforming to the Part I.3 envelope
 */
export function sendErrorResponse(
  res: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): void {
  const envelope: ErrorEnvelope = createErrorEnvelope(code, message, requestId, details);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(envelope));
}

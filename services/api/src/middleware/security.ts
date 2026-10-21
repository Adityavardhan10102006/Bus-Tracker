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
 * Applies security baseline response headers
 * Helmet principles: nosniff, no-store, frame-options deny
 */
export function applySecurityHeaders(res: ServerResponse, requestId: string): void {
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
  const envelope: ErrorEnvelope = createErrorEnvelope(code as any, message, requestId, details);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(JSON.stringify(envelope));
}

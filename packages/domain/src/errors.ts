import type { ErrorDetail } from '@vjit/contracts';

export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: ErrorDetail[] | undefined;

  constructor(code: string, message: string, statusCode = 400, details?: ErrorDetail[]) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends DomainError {
  constructor(message = 'Authentication required') {
    super('AUTH_REQUIRED', message, 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Access forbidden for current role') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super('NOT_FOUND', id ? `${entity} with identifier ${id} not found` : `${entity} not found`, 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}

export class DeviceInactiveError extends DomainError {
  constructor(message = 'Device is revoked or retired') {
    super('DEVICE_INACTIVE', message, 403);
  }
}

export class RateLimitExceededError extends DomainError {
  constructor(message = 'Rate limit exceeded') {
    super('RATE_LIMIT_EXCEEDED', message, 429);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: ErrorDetail[]) {
    super('VALIDATION_FAILED', message, 400, details);
  }
}

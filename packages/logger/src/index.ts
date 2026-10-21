import { AsyncLocalStorage } from 'node:async_hooks';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const REDACTED_KEYS = new Set([
  'authorization',
  'token',
  'refreshtoken',
  'password',
  'otp',
  'totp',
  'secret',
  'apikey',
  'phone',
  'phonenumber',
  'email',
  'coordinates',
  'lat',
  'lng',
  'latitude',
  'longitude',
]);

const requestContextStorage = new AsyncLocalStorage<{ requestId: string }>();

export function runWithRequestContext<T>(requestId: string, fn: () => T): T {
  return requestContextStorage.run({ requestId }, fn);
}

export function getCurrentRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

export function sanitizeLogData(obj: unknown, depth = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Check for Bearer token string pattern
    if (/bearer\s+[a-zA-Z0-9_-]{20,}/i.test(obj)) {
      return 'Bearer [REDACTED_TOKEN]';
    }
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (REDACTED_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeLogData(val, depth + 1);
    }
  }

  return sanitized;
}

export class Logger {
  constructor(private readonly serviceName = 'vjit-bus-tracker') {}

  private write(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const requestId = getCurrentRequestId();

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      request_id: requestId,
      context: context ? sanitizeLogData(context) : undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            // Only output stack trace in local development
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          }
        : undefined,
    };

    const serialized = JSON.stringify(logEntry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(serialized + '\n');
    } else {
      process.stdout.write(serialized + '\n');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.write('error', message, context, error);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      this.write('debug', message, context);
    }
  }
}

export const logger = new Logger();

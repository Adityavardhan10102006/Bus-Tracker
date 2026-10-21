import { z } from 'zod';

export const errorDetailSchema = z.object({
  field: z.string().optional(),
  issue: z.string(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.array(errorDetailSchema).optional(),
    request_id: z.string().uuid().or(z.string().min(1)),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const commonErrorCodes = [
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'INVALID_INPUT',
  'DEVICE_INACTIVE',
  'DEVICE_REVOKED',
  'CONFLICT',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

export type CommonErrorCode = (typeof commonErrorCodes)[number];

export function createErrorEnvelope(
  code: CommonErrorCode | string,
  message: string,
  requestId: string,
  details?: unknown,
): ErrorEnvelope {
  return {
    error: {
      code,
      message,
      request_id: requestId,
      details: Array.isArray(details) ? (details as ErrorDetail[]) : undefined,
    },
  };
}

import { z } from 'zod';

const BANNED_SECRET_PLACEHOLDERS = [
  'changeme',
  'secret',
  'test',
  'placeholder',
  'password',
  '123456',
  'admin',
  'default',
  'todo',
  'replace_me',
  'dummy',
  'sample',
];

function isSafeSecret(val: string): boolean {
  const lower = val.toLowerCase().trim();
  return !BANNED_SECRET_PLACEHOLDERS.some(banned => lower.includes(banned));
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URI'),
    DATABASE_DIRECT_URL: z.string().url().optional(),

    API_PUBLIC_HOST: z.string().min(1).default('localhost:3000'),
    INGEST_PUBLIC_HOST: z.string().min(1).default('localhost:3000'),
    ADMIN_PUBLIC_HOST: z.string().min(1).default('localhost:5173'),

    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters')
      .refine(isSafeSecret, 'JWT_SECRET contains an insecure placeholder value'),

    JWT_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

    DEVICE_TOKEN_HMAC_KEYS: z
      .string()
      .refine(val => {
        try {
          const parsed = JSON.parse(val);
          return typeof parsed === 'object' && Object.keys(parsed).length > 0;
        } catch {
          return false;
        }
      }, 'DEVICE_TOKEN_HMAC_KEYS must be a valid JSON map of key versions to secrets')
      .refine(isSafeSecret, 'DEVICE_TOKEN_HMAC_KEYS contains an insecure placeholder value'),

    QR_HMAC_KEYS: z
      .string()
      .refine(val => {
        try {
          const parsed = JSON.parse(val);
          return typeof parsed === 'object' && Object.keys(parsed).length > 0;
        } catch {
          return false;
        }
      }, 'QR_HMAC_KEYS must be a valid JSON map of key versions to secrets')
      .refine(isSafeSecret, 'QR_HMAC_KEYS contains an insecure placeholder value'),

    AWS_REGION: z.string().default('ap-south-1'),

    SIMULATOR_ALLOWED_HOSTS: z.string().default('localhost,127.0.0.1'),
  })
  .refine(
    data => {
      // Rule P0-T2: Refuse to start when NODE_ENV is production while APP_ENV is local
      if (data.NODE_ENV === 'production' && data.APP_ENV === 'local') {
        return false;
      }
      return true;
    },
    {
      message: 'Incompatible environment configuration: NODE_ENV cannot be "production" when APP_ENV is "local".',
      path: ['APP_ENV'],
    },
  );

export type AppEnv = z.infer<typeof envSchema>;

export function loadAndValidateConfig(rawEnv: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`[FATAL CONFIGURATION ERROR] Environment validation failed:\n${issues}`);
  }

  return result.data;
}

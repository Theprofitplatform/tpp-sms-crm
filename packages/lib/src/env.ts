import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates critical environment variables at application startup
 */
export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL is required'),
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required'),
  POSTGRES_DB: z.string().min(1, 'POSTGRES_DB is required'),

  // Redis
  REDIS_URL: z.string().url().min(1, 'REDIS_URL is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  REDIS_PASSWORD: z.string().optional(),

  // API
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET must be at least 32 characters'),

  // Session Management
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL: z.string().transform(Number).pipe(z.number().min(60)).default(86400),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().min(1)).default(100),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default(60000),
  TENANT_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().min(1)).default(100),
  TENANT_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default(60000),

  // Webhook Security
  WEBHOOK_SECRET: z.string().min(32, 'WEBHOOK_SECRET must be at least 32 characters'),
  WEBHOOK_REPLAY_PROTECTION_TTL: z.string().transform(Number).pipe(z.number().min(60)).default(300),
  WEBHOOK_TIMESTAMP_MAX_AGE: z.string().transform(Number).pipe(z.number().min(60)).default(300),

  // Twilio (SMS Provider)
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_FROM_NUMBER: z.string().min(1, 'TWILIO_FROM_NUMBER is required'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Optional - for worker and shortener
  WORKER_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  SHORTENER_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  SHORT_DOMAIN: z.string().optional(),
  SHORT_LINK_SECRET: z.string().min(32, 'SHORT_LINK_SECRET must be at least 32 characters').optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables and return typed config
 * Throws detailed error if validation fails
 */
export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((err: z.ZodIssue) => {
        return `${err.path.join('.')}: ${err.message}`;
      });

      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Get validated environment config
 * Use this in your application startup
 */
export const env = validateEnv();
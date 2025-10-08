import { z } from 'zod';

/**
 * Common validation schemas
 */

// E.164 phone number format: +[country code][number]
export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{1,14}$/, {
  message: 'Phone must be in E.164 format (e.g., +61412345678)',
});

// Email validation
export const emailSchema = z.string().email({ message: 'Invalid email address' });

// UUID validation
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

// Timezone validation (IANA timezone)
export const timezoneSchema = z.string().min(1, { message: 'Timezone is required' });

/**
 * Auth schemas
 */

export const magicLinkRequestSchema = z.object({
  email: emailSchema,
});

export const verifyTokenSchema = z.object({
  token: z.string().min(32, { message: 'Invalid token format' }),
});

/**
 * Campaign schemas
 */

export const createCampaignSchema = z.object({
  name: z.string().min(1, { message: 'Campaign name is required' }).max(255),
  templateIds: z.array(uuidSchema).min(1, { message: 'At least one template is required' }),
  targetUrl: z.string().url({ message: 'Invalid URL format' }).optional(),
});

export const queueCampaignSchema = z.object({
  scheduleAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
});

/**
 * Contact schemas
 */

export const createContactSchema = z.object({
  phoneE164: phoneE164Schema,
  email: emailSchema.optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  timezone: timezoneSchema.optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const importContactsSchema = z.object({
  contacts: z.array(createContactSchema).min(1).max(10000, {
    message: 'Cannot import more than 10,000 contacts at once',
  }),
  dryRun: z.boolean().default(false),
});

/**
 * Budget schemas
 */

export const setBudgetSchema = z.object({
  dailyBudgetCents: z.number().int().min(0).max(1000000).optional(),
  monthlyBudgetCents: z.number().int().min(0).max(10000000).optional(),
}).refine(
  (data) => data.dailyBudgetCents !== undefined || data.monthlyBudgetCents !== undefined,
  {
    message: 'At least one budget limit must be set',
  }
);

/**
 * Tenant schemas
 */

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  timezone: timezoneSchema.optional(),
  quietHoursStart: z.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.number().int().min(0).max(23).optional(),
});

/**
 * Template schemas
 */

export const createTemplateSchema = z.object({
  name: z.string().min(1, { message: 'Template name is required' }).max(255),
  body: z.string().min(1, { message: 'Template body is required' }).max(1600),
  variables: z.array(z.string()).optional(),
});

/**
 * Webhook schemas
 */

export const webhookPayloadSchema = z.object({
  event: z.string().min(1),
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.any()),
  signature: z.string().optional(),
});

/**
 * Pagination schemas
 */

export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).default(() => 1),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(() => 20),
});

/**
 * Query filter schemas
 */

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

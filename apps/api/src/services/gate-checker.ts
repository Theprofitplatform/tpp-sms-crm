import { db, schema, isWithinQuietHours, getWarmupLimit } from '@sms-crm/lib';
import { addDays } from 'date-fns';
import { eq, and, sql, gte } from 'drizzle-orm';
import Redis from 'ioredis';

import { BudgetService } from './budget.service';

// Parse Redis connection from environment
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  // ioredis will parse the URL including username and password
  lazyConnect: false,
});
const budgetService = new BudgetService();

export interface GateResult {
  allowed: boolean;
  reason?: string;
  delayUntil?: Date;
}

export class GateChecker {
  async checkAllGates(
    tenantId: string,
    contactId: string,
    campaignId: string,
    costCents: number = 1 // Estimated cost for this send
  ): Promise<GateResult> {
    // Gate 1: Campaign pause
    const pauseCheck = await this.checkCampaignPause(tenantId);
    if (!pauseCheck.allowed) return pauseCheck;

    // Gate 2: Budget caps
    const budgetCheck = await this.checkBudget(tenantId, costCents);
    if (!budgetCheck.allowed) return budgetCheck;

    // Gate 3: DNC
    const dncCheck = await this.checkDNC(tenantId, contactId);
    if (!dncCheck.allowed) return dncCheck;

    // Gate 4: Suppression window
    const suppressionCheck = await this.checkSuppressionWindow(contactId);
    if (!suppressionCheck.allowed) return suppressionCheck;

    // Gate 5: Quiet hours
    const quietHoursCheck = await this.checkQuietHours(tenantId, contactId);
    if (!quietHoursCheck.allowed) return quietHoursCheck;

    // Gate 6: Rate limits (tenant-level)
    const rateLimitCheck = await this.checkTenantRateLimit(tenantId);
    if (!rateLimitCheck.allowed) return rateLimitCheck;

    // Gate 7: Warmup (number-level)
    const warmupCheck = await this.checkWarmup(tenantId);
    if (!warmupCheck.allowed) return warmupCheck;

    return { allowed: true };
  }

  private async checkCampaignPause(tenantId: string): Promise<GateResult> {
    const [tenant] = await db
      .select({ isPaused: schema.tenants.isPaused })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (tenant?.isPaused) {
      return { allowed: false, reason: 'Tenant is paused' };
    }

    return { allowed: true };
  }

  private async checkBudget(tenantId: string, costCents: number): Promise<GateResult> {
    const budgetStatus = await budgetService.checkBudget(tenantId, costCents);

    if (!budgetStatus.allowed) {
      return {
        allowed: false,
        reason: budgetStatus.reason || 'Budget limit exceeded',
      };
    }

    return { allowed: true };
  }

  private async checkDNC(tenantId: string, contactId: string): Promise<GateResult> {
    const [contact] = await db
      .select({ phoneE164: schema.contacts.phoneE164 })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);

    if (!contact) {
      return { allowed: false, reason: 'Contact not found' };
    }

    const [dnc] = await db
      .select()
      .from(schema.doNotContact)
      .where(
        and(
          eq(schema.doNotContact.tenantId, tenantId),
          eq(schema.doNotContact.phoneE164, contact.phoneE164)
        )
      )
      .limit(1);

    if (dnc) {
      return { allowed: false, reason: 'Contact is on DNC list' };
    }

    return { allowed: true };
  }

  private async checkSuppressionWindow(contactId: string): Promise<GateResult> {
    const [contact] = await db
      .select({ lastSentAt: schema.contacts.lastSentAt })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);

    if (contact?.lastSentAt) {
      const suppressionUntil = addDays(contact.lastSentAt, 90);

      if (new Date() < suppressionUntil) {
        return {
          allowed: false,
          reason: 'Contact in suppression window (90 days)',
          delayUntil: suppressionUntil,
        };
      }
    }

    return { allowed: true };
  }

  private async checkQuietHours(tenantId: string, contactId: string): Promise<GateResult> {
    const [tenant] = await db
      .select({ timezone: schema.tenants.timezone })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    const [contact] = await db
      .select({ timezone: schema.contacts.timezone })
      .from(schema.contacts)
      .where(eq(schema.contacts.id, contactId))
      .limit(1);

    const timezone = contact?.timezone || tenant?.timezone || 'Australia/Sydney';

    // Default quiet hours: 9 PM to 9 AM
    if (isWithinQuietHours(timezone, 21, 9)) {
      // Calculate next allowed time
      const now = new Date();
      const next = new Date(now);
      next.setHours(9, 0, 0, 0);

      if (now.getHours() >= 21) {
        next.setDate(next.getDate() + 1);
      }

      return {
        allowed: false,
        reason: 'Within quiet hours (9PM-9AM)',
        delayUntil: next,
      };
    }

    return { allowed: true };
  }

  private async checkTenantRateLimit(tenantId: string): Promise<GateResult> {
    const key = `rate:tenant:${tenantId}:${Math.floor(Date.now() / 60000)}`; // Per minute
    const count = await redis.incr(key);
    await redis.expire(key, 60);

    const limit = 100; // 100 messages per minute per tenant

    if (count > limit) {
      return { allowed: false, reason: 'Tenant rate limit exceeded' };
    }

    return { allowed: true };
  }

  private async checkWarmup(tenantId: string): Promise<GateResult> {
    // Get active sending number for tenant
    const [number] = await db
      .select()
      .from(schema.sendingNumbers)
      .where(and(eq(schema.sendingNumbers.tenantId, tenantId), eq(schema.sendingNumbers.isActive, true)))
      .limit(1);

    if (!number || !number.warmupStartDate) {
      return { allowed: true }; // No warmup configured
    }

    const warmupLimit = getWarmupLimit(number.warmupStartDate);
    const todayKey = `warmup:${number.id}:${new Date().toISOString().split('T')[0]}`;
    const sentToday = parseInt((await redis.get(todayKey)) || '0');

    if (sentToday >= warmupLimit) {
      return { allowed: false, reason: `Warmup limit reached (${warmupLimit}/day)` };
    }

    return { allowed: true };
  }
}

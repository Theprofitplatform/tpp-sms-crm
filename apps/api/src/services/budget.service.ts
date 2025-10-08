import { db, schema } from '@sms-crm/lib';
import { eq, and, gte, sql } from 'drizzle-orm';

export interface BudgetStatus {
  allowed: boolean;
  reason?: string;
  dailySpent: number;
  dailyLimit: number | null;
  monthlySpent: number;
  monthlyLimit: number | null;
}

/**
 * Budget Service
 * Tracks and enforces daily/monthly spending limits for tenants
 */
export class BudgetService {
  /**
   * Check if tenant has budget available for a send
   * @param tenantId - Tenant ID
   * @param costCents - Cost in cents for this send
   * @returns Budget status with current spend and limits
   */
  async checkBudget(tenantId: string, costCents: number): Promise<BudgetStatus> {
    // Get tenant budget limits
    const [tenant] = await db
      .select({
        dailyBudgetCents: schema.tenants.dailyBudgetCents,
        monthlyBudgetCents: schema.tenants.monthlyBudgetCents,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return {
        allowed: false,
        reason: 'Tenant not found',
        dailySpent: 0,
        dailyLimit: null,
        monthlySpent: 0,
        monthlyLimit: null,
      };
    }

    // Get current spending
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate daily spend
    const [dailySpendResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.sendJobs.costCents}), 0)`,
      })
      .from(schema.sendJobs)
      .where(
        and(
          eq(schema.sendJobs.tenantId, tenantId),
          gte(schema.sendJobs.queuedAt, startOfDay)
        )
      );

    const dailySpent = Number(dailySpendResult?.total || 0);

    // Calculate monthly spend
    const [monthlySpendResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.sendJobs.costCents}), 0)`,
      })
      .from(schema.sendJobs)
      .where(
        and(
          eq(schema.sendJobs.tenantId, tenantId),
          gte(schema.sendJobs.queuedAt, startOfMonth)
        )
      );

    const monthlySpent = Number(monthlySpendResult?.total || 0);

    // Check daily budget
    if (tenant.dailyBudgetCents !== null) {
      if (dailySpent + costCents > tenant.dailyBudgetCents) {
        return {
          allowed: false,
          reason: `Daily budget exceeded. Spent: $${(dailySpent / 100).toFixed(2)}, Limit: $${(tenant.dailyBudgetCents / 100).toFixed(2)}`,
          dailySpent,
          dailyLimit: tenant.dailyBudgetCents,
          monthlySpent,
          monthlyLimit: tenant.monthlyBudgetCents,
        };
      }
    }

    // Check monthly budget
    if (tenant.monthlyBudgetCents !== null) {
      if (monthlySpent + costCents > tenant.monthlyBudgetCents) {
        return {
          allowed: false,
          reason: `Monthly budget exceeded. Spent: $${(monthlySpent / 100).toFixed(2)}, Limit: $${(tenant.monthlyBudgetCents / 100).toFixed(2)}`,
          dailySpent,
          dailyLimit: tenant.dailyBudgetCents,
          monthlySpent,
          monthlyLimit: tenant.monthlyBudgetCents,
        };
      }
    }

    return {
      allowed: true,
      dailySpent,
      dailyLimit: tenant.dailyBudgetCents,
      monthlySpent,
      monthlyLimit: tenant.monthlyBudgetCents,
    };
  }

  /**
   * Get current budget status for a tenant
   * @param tenantId - Tenant ID
   * @returns Current spend and remaining budget
   */
  async getBudgetStatus(tenantId: string): Promise<{
    dailySpent: number;
    dailyLimit: number | null;
    dailyRemaining: number | null;
    monthlySpent: number;
    monthlyLimit: number | null;
    monthlyRemaining: number | null;
  }> {
    const [tenant] = await db
      .select({
        dailyBudgetCents: schema.tenants.dailyBudgetCents,
        monthlyBudgetCents: schema.tenants.monthlyBudgetCents,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return {
        dailySpent: 0,
        dailyLimit: null,
        dailyRemaining: null,
        monthlySpent: 0,
        monthlyLimit: null,
        monthlyRemaining: null,
      };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate daily spend
    const [dailySpendResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.sendJobs.costCents}), 0)`,
      })
      .from(schema.sendJobs)
      .where(
        and(
          eq(schema.sendJobs.tenantId, tenantId),
          gte(schema.sendJobs.queuedAt, startOfDay)
        )
      );

    const dailySpent = Number(dailySpendResult?.total || 0);

    // Calculate monthly spend
    const [monthlySpendResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${schema.sendJobs.costCents}), 0)`,
      })
      .from(schema.sendJobs)
      .where(
        and(
          eq(schema.sendJobs.tenantId, tenantId),
          gte(schema.sendJobs.queuedAt, startOfMonth)
        )
      );

    const monthlySpent = Number(monthlySpendResult?.total || 0);

    return {
      dailySpent,
      dailyLimit: tenant.dailyBudgetCents,
      dailyRemaining: tenant.dailyBudgetCents !== null ? tenant.dailyBudgetCents - dailySpent : null,
      monthlySpent,
      monthlyLimit: tenant.monthlyBudgetCents,
      monthlyRemaining: tenant.monthlyBudgetCents !== null ? tenant.monthlyBudgetCents - monthlySpent : null,
    };
  }

  /**
   * Track spend for a send job
   * Note: Cost should be calculated and stored when creating the send job
   * This is just a helper to calculate typical SMS costs
   * @param messageParts - Number of SMS message parts
   * @returns Cost in cents
   */
  calculateSmsCost(messageParts: number): number {
    // Typical SMS cost: $0.0075 per segment
    const costPerSegment = 0.75; // 0.75 cents
    return Math.ceil(messageParts * costPerSegment);
  }
}

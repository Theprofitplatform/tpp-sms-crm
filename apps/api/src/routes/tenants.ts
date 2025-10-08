import { db, schema } from '@sms-crm/lib';
import { eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';

import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { setBudgetSchema } from '../schemas/validation.schemas';
import { BudgetService } from '../services/budget.service';

const budgetService = new BudgetService();

const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  // Set budget
  fastify.post(
    '/:id/budget',
    { preHandler: [requireAuth, validateBody(setBudgetSchema)] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };
      const { dailyBudgetCents, monthlyBudgetCents } = request.body as {
        dailyBudgetCents?: number;
        monthlyBudgetCents?: number;
      };

      if (id !== authReq.user!.tenantId) {
        return reply.status(403).send({ error: 'Cannot modify other tenant budgets' });
      }

      await db
        .update(schema.tenants)
        .set({
          dailyBudgetCents,
          monthlyBudgetCents,
          updatedAt: new Date(),
        })
        .where(eq(schema.tenants.id, id));

      return { message: 'Budget updated' };
    }
  );

  // Get budget status
  fastify.get('/:id/budget', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    if (id !== authReq.user!.tenantId) {
      return reply.status(403).send({ error: 'Cannot view other tenant budgets' });
    }

    const budgetStatus = await budgetService.getBudgetStatus(id);

    if (!budgetStatus) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    // Calculate reset times
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      dailyBudgetCents: budgetStatus.dailyLimit,
      dailySpentCents: budgetStatus.dailySpent,
      dailyRemainingCents: budgetStatus.dailyRemaining,
      dailyResetAt: tomorrow,
      monthlyBudgetCents: budgetStatus.monthlyLimit,
      monthlySpentCents: budgetStatus.monthlySpent,
      monthlyRemainingCents: budgetStatus.monthlyRemaining,
      monthlyResetAt: nextMonth,
    };
  });

  // Pause tenant (kill switch)
  fastify.post(
    '/:id/pause',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      if (id !== authReq.user!.tenantId) {
        return reply.status(403).send({ error: 'Cannot pause other tenants' });
      }

      await db
        .update(schema.tenants)
        .set({ isPaused: true, updatedAt: new Date() })
        .where(eq(schema.tenants.id, id));

      // Log audit event
      await db.insert(schema.auditLog).values({
        tenantId: id,
        userId: authReq.user!.id,
        action: 'PAUSE_TENANT',
        resourceType: 'tenant',
        resourceId: id,
      });

      return { message: 'Tenant paused', isPaused: true };
    }
  );

  // Resume tenant
  fastify.post(
    '/:id/resume',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const authReq = request as AuthenticatedRequest;
      const { id } = request.params as { id: string };

      if (id !== authReq.user!.tenantId) {
        return reply.status(403).send({ error: 'Cannot resume other tenants' });
      }

      await db
        .update(schema.tenants)
        .set({ isPaused: false, updatedAt: new Date() })
        .where(eq(schema.tenants.id, id));

      // Log audit event
      await db.insert(schema.auditLog).values({
        tenantId: id,
        userId: authReq.user!.id,
        action: 'RESUME_TENANT',
        resourceType: 'tenant',
        resourceId: id,
      });

      return { message: 'Tenant resumed', isPaused: false };
    }
  );
};

export default tenantRoutes;

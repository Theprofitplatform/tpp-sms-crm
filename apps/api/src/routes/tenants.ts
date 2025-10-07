import { FastifyPluginAsync } from 'fastify';
import { db, schema } from '@sms-crm/lib';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';

const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  // Set budget
  fastify.post(
    '/:id/budget',
    { preHandler: [requireAuth, requireRole(['admin'])] },
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

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, id))
      .limit(1);

    const [budget] = await db
      .select()
      .from(schema.budgets)
      .where(eq(schema.budgets.tenantId, id))
      .limit(1);

    if (!tenant || !budget) {
      return reply.status(404).send({ error: 'Tenant or budget not found' });
    }

    return {
      dailyBudgetCents: tenant.dailyBudgetCents,
      dailySpentCents: budget.dailySpentCents,
      dailyRemainingCents: tenant.dailyBudgetCents
        ? tenant.dailyBudgetCents - budget.dailySpentCents
        : null,
      monthlyBudgetCents: tenant.monthlyBudgetCents,
      monthlySpentCents: budget.monthlySpentCents,
      monthlyRemainingCents: tenant.monthlyBudgetCents
        ? tenant.monthlyBudgetCents - budget.monthlySpentCents
        : null,
      dailyResetAt: budget.dailyResetAt,
      monthlyResetAt: budget.monthlyResetAt,
    };
  });

  // Pause tenant (kill switch)
  fastify.post(
    '/:id/pause',
    { preHandler: [requireAuth, requireRole(['admin'])] },
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
    { preHandler: [requireAuth, requireRole(['admin'])] },
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

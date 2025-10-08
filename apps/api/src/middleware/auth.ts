import { FastifyRequest, FastifyReply } from 'fastify';
import { db, schema } from '@sms-crm/lib';
import { eq } from 'drizzle-orm';
import { getSessionData, refreshSession } from '../services/session.service';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Get session data from Redis-backed session store
    const sessionData = getSessionData(request);

    if (!sessionData) {
      reply.status(401).send({ error: 'Unauthorized - No active session' });
      return;
    }

    // Verify user still exists and is active
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, sessionData.userId))
      .limit(1);

    if (!user || !user.isActive) {
      reply.status(401).send({ error: 'Unauthorized - User not found or inactive' });
      return;
    }

    // Verify session data matches database (in case of role changes)
    if (user.role !== sessionData.role || user.tenantId !== sessionData.tenantId) {
      reply.status(401).send({ error: 'Unauthorized - Session expired, please login again' });
      return;
    }

    // Attach user to request
    (request as AuthenticatedRequest).user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    // Refresh session TTL on successful auth (rolling session)
    await refreshSession(request);
  } catch (error) {
    request.log.error({ error }, 'Auth middleware error');
    reply.status(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authReq = request as AuthenticatedRequest;

    if (!authReq.user || !roles.includes(authReq.user.role)) {
      reply.status(403).send({ error: 'Forbidden' });
      return;
    }
  };
}

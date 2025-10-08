import { FastifyRequest, FastifyReply } from 'fastify';

import { getSessionData, refreshSession } from '../services/session.service';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

export async function requireAuthSimple(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Get session data from Redis-backed session store
    const sessionData = getSessionData(request);

    if (!sessionData) {
      reply.status(401).send({ error: 'Unauthorized - No active session' });
      return;
    }

    // Attach user to request from session data (no database query)
    (request as AuthenticatedRequest).user = {
      id: sessionData.userId,
      tenantId: sessionData.tenantId,
      email: sessionData.email,
      role: sessionData.role,
    };

    // Refresh session TTL on successful auth (rolling session)
    await refreshSession(request);
  } catch (error) {
    request.log.error({ error }, 'Auth middleware error');
    reply.status(401).send({ error: 'Unauthorized' });
  }
}
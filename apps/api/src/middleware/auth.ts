import { FastifyRequest, FastifyReply } from 'fastify';
import { db, schema } from '@sms-crm/lib';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies['session_id'];

  if (!sessionId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // In production, validate session from Redis or sessions table
  // For now, decode from cookie (simplified)
  try {
    const decoded = JSON.parse(Buffer.from(sessionId, 'base64').toString());
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, decoded.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    (request as AuthenticatedRequest).user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export function requireRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authReq = request as AuthenticatedRequest;

    if (!authReq.user || !roles.includes(authReq.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}

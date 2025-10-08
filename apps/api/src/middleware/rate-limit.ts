import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './auth';
import { checkTenantRateLimit } from '../services/rate-limit.service';

/**
 * Per-tenant rate limiting middleware
 * Enforces rate limits based on tenant ID from authenticated session
 */
export async function tenantRateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authReq = request as AuthenticatedRequest;

  if (!authReq.user?.tenantId) {
    // No tenant ID available, skip rate limiting
    // (This should not happen if requireAuth is used)
    return;
  }

  const maxRequests = parseInt(process.env.TENANT_RATE_LIMIT_MAX || '100', 10);
  const windowMs = parseInt(process.env.TENANT_RATE_LIMIT_WINDOW_MS || '60000', 10);

  try {
    const result = await checkTenantRateLimit(authReq.user.tenantId, maxRequests, windowMs);

    // Add rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests.toString());
    reply.header('X-RateLimit-Remaining', result.remaining.toString());
    reply.header('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      reply.status(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again after ${result.resetAt.toISOString()}`,
        retryAfter: result.resetAt,
      });
      return;
    }
  } catch (error) {
    request.log.error({ error }, 'Rate limit check failed');
    // On error, allow the request to proceed
  }
}

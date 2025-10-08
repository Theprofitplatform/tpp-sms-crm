import { db, schema, generateMagicToken } from '@sms-crm/lib';
import { addMinutes } from 'date-fns';
import { eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';

import { validateBody } from '../middleware/validation';
import { magicLinkRequestSchema } from '../schemas/validation.schemas';
import { createSession, destroySession } from '../services/session.service';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Request magic link
  fastify.post(
    '/magic-link',
    { preHandler: validateBody(magicLinkRequestSchema) },
    async (request, reply) => {
      const { email } = request.body as { email: string };

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      // Don't reveal if user exists
      return reply.send({ message: 'If account exists, magic link sent' });
    }

    const token = generateMagicToken();
    const expiresAt = addMinutes(new Date(), 15);

    await db.insert(schema.magicTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    // In production, send email with link
    // For now, log it
    fastify.log.info({ email, token }, 'Magic link generated');

      return { message: 'If account exists, magic link sent' };
    }
  );

  // Verify magic link and create session
  fastify.get('/verify/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const [magicToken] = await db
      .select()
      .from(schema.magicTokens)
      .where(eq(schema.magicTokens.token, token))
      .limit(1);

    if (!magicToken || magicToken.usedAt || magicToken.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    // Mark as used
    await db
      .update(schema.magicTokens)
      .set({ usedAt: new Date() })
      .where(eq(schema.magicTokens.id, magicToken.id));

    // Get user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, magicToken.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return reply.status(401).send({ error: 'User not found' });
    }

    // Update last login
    await db
      .update(schema.users)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.users.id, user.id));

    // Create Redis-backed session
    try {
      await createSession(request, user.id, user.tenantId, user.email, user.role);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create session');
      return reply.status(500).send({ error: 'Failed to create session' });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  });

  // Logout
  fastify.post('/logout', async (request, _reply) => {
    try {
      await destroySession(request);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to destroy session');
      // Continue anyway to clear client state
    }

    return { message: 'Logged out' };
  });
};

export default authRoutes;

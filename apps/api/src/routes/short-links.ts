import { db, schema } from '@sms-crm/lib';
import { eq } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';

const shortLinkRoutes: FastifyPluginAsync = async (fastify) => {
  // Record click (called by shortener service)
  fastify.post('/click', async (request, reply) => {
    const { token, userAgent, isHuman } = request.body as {
      token: string;
      userAgent?: string;
      isHuman: boolean;
    };

    const [link] = await db
      .select()
      .from(schema.shortLinks)
      .where(eq(schema.shortLinks.token, token))
      .limit(1);

    if (!link) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    // Check expiration
    if (link.expiresAt < new Date()) {
      return reply.status(410).send({ error: 'Link expired' });
    }

    // Update click counts
    const updates: any = {
      clickCount: link.clickCount + 1,
    };

    if (isHuman) {
      updates.humanClickCount = link.humanClickCount + 1;
    }

    if (!link.clickedAt) {
      updates.clickedAt = new Date();

      // Record CLICKED event on first click only
      await db.insert(schema.events).values({
        tenantId: link.tenantId,
        contactId: link.contactId,
        campaignId: link.campaignId,
        shortLinkId: link.id,
        eventType: 'CLICKED',
        metadata: { userAgent, isHuman },
      });
    }

    await db
      .update(schema.shortLinks)
      .set(updates)
      .where(eq(schema.shortLinks.id, link.id));

    return { targetUrl: link.targetUrl };
  });
};

export default shortLinkRoutes;

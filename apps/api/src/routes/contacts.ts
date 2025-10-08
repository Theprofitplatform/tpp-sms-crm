import { db, schema } from '@sms-crm/lib';
import { eq, and, desc, sql } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';

const contactsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all contacts with pagination
  fastify.get('/', async (request, reply) => {
    const { page = '1', limit = '50', search } = request.query as {
      page?: string;
      limit?: string;
      search?: string;
    };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const whereClause = eq(schema.contacts.tenantId, '00000000-0000-0000-0000-000000000001');

    let searchWhere = whereClause;
    if (search) {
      searchWhere = and(
        whereClause,
        sql`(
          ${schema.contacts.firstName} ILIKE ${`%${search}%`} OR
          ${schema.contacts.lastName} ILIKE ${`%${search}%`} OR
          ${schema.contacts.phoneE164} ILIKE ${`%${search}%`} OR
          ${schema.contacts.email} ILIKE ${`%${search}%`}
        )`
      );
    }

    // Get contacts
    const contacts = await db
      .select({
        id: schema.contacts.id,
        phoneE164: schema.contacts.phoneE164,
        email: schema.contacts.email,
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        timezone: schema.contacts.timezone,
        consentStatus: schema.contacts.consentStatus,
        lastSentAt: schema.contacts.lastSentAt,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
      })
      .from(schema.contacts)
      .where(searchWhere)
      .orderBy(desc(schema.contacts.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.contacts)
      .where(searchWhere);

    return {
      contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil(count / limitNum),
      },
    };
  });

  // Get single contact by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [contact] = await db
      .select({
        id: schema.contacts.id,
        phoneE164: schema.contacts.phoneE164,
        email: schema.contacts.email,
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
        timezone: schema.contacts.timezone,
        consentStatus: schema.contacts.consentStatus,
        consentSource: schema.contacts.consentSource,
        consentTimestamp: schema.contacts.consentTimestamp,
        customFields: schema.contacts.customFields,
        lastSentAt: schema.contacts.lastSentAt,
        importBatchId: schema.contacts.importBatchId,
        createdAt: schema.contacts.createdAt,
        updatedAt: schema.contacts.updatedAt,
      })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .limit(1);

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    // Get contact's message history
    const messageHistory = await db
      .select({
        id: schema.events.id,
        eventType: schema.events.eventType,
        campaignId: schema.events.campaignId,
        campaignName: schema.campaigns.name,
        createdAt: schema.events.createdAt,
        metadata: schema.events.metadata,
      })
      .from(schema.events)
      .leftJoin(schema.campaigns, eq(schema.events.campaignId, schema.campaigns.id))
      .where(
        and(
          eq(schema.events.contactId, id),
          eq(schema.events.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .orderBy(desc(schema.events.createdAt))
      .limit(50);

    // Get contact's click history
    const clickHistory = await db
      .select({
        id: schema.shortLinks.id,
        token: schema.shortLinks.token,
        campaignId: schema.shortLinks.campaignId,
        campaignName: schema.campaigns.name,
        targetUrl: schema.shortLinks.targetUrl,
        clickedAt: schema.shortLinks.clickedAt,
        clickCount: schema.shortLinks.clickCount,
        humanClickCount: schema.shortLinks.humanClickCount,
        createdAt: schema.shortLinks.createdAt,
      })
      .from(schema.shortLinks)
      .leftJoin(schema.campaigns, eq(schema.shortLinks.campaignId, schema.campaigns.id))
      .where(
        and(
          eq(schema.shortLinks.contactId, id),
          eq(schema.shortLinks.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .orderBy(desc(schema.shortLinks.clickedAt))
      .limit(50);

    // Check if contact is on DNC list
    const [dncEntry] = await db
      .select({
        id: schema.doNotContact.id,
        reason: schema.doNotContact.reason,
        createdAt: schema.doNotContact.createdAt,
      })
      .from(schema.doNotContact)
      .where(
        and(
          eq(schema.doNotContact.phoneE164, contact.phoneE164),
          eq(schema.doNotContact.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .limit(1);

    // Get import batch info
    let importBatch = null;
    if (contact.importBatchId) {
      [importBatch] = await db
        .select({
          id: schema.importBatches.id,
          fileName: schema.importBatches.fileName,
          createdAt: schema.importBatches.createdAt,
        })
        .from(schema.importBatches)
        .where(eq(schema.importBatches.id, contact.importBatchId))
        .limit(1);
    }

    return {
      contact,
      messageHistory,
      clickHistory,
      dncStatus: dncEntry ? {
        isOnDnc: true,
        reason: dncEntry.reason,
        addedAt: dncEntry.createdAt,
      } : { isOnDnc: false },
      importBatch,
    };
  });

  // Add contact to DNC list
  fastify.post('/:id/dnc', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason = 'MANUAL' } = request.body as { reason?: string };

    // Get contact
    const [contact] = await db
      .select({
        id: schema.contacts.id,
        phoneE164: schema.contacts.phoneE164,
      })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .limit(1);

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    // Check if already on DNC
    const [existingDnc] = await db
      .select()
      .from(schema.doNotContact)
      .where(
        and(
          eq(schema.doNotContact.phoneE164, contact.phoneE164),
          eq(schema.doNotContact.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .limit(1);

    if (existingDnc) {
      return reply.status(409).send({ error: 'Contact already on DNC list' });
    }

    // Add to DNC
    const [dncEntry] = await db
      .insert(schema.doNotContact)
      .values({
        tenantId: '00000000-0000-0000-0000-000000000001',
        phoneE164: contact.phoneE164,
        reason,
      })
      .returning();

    return { success: true, dncEntry };
  });

  // Remove contact from DNC list
  fastify.delete('/:id/dnc', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Get contact
    const [contact] = await db
      .select({
        id: schema.contacts.id,
        phoneE164: schema.contacts.phoneE164,
      })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.id, id),
          eq(schema.contacts.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .limit(1);

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    // Remove from DNC
    await db
      .delete(schema.doNotContact)
      .where(
        and(
          eq(schema.doNotContact.phoneE164, contact.phoneE164),
          eq(schema.doNotContact.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      );

    return { success: true };
  });
};

export default contactsRoutes;
import { db, schema } from '@sms-crm/lib';
import { eq, and, sql } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';

import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // Campaign report
  fastify.get('/campaigns/:id', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [campaign] = await db
      .select()
      .from(schema.campaigns)
      .where(and(eq(schema.campaigns.id, id), eq(schema.campaigns.tenantId, authReq.user!.tenantId)))
      .limit(1);

    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    // Get send job stats
    const jobStats = await db
      .select({
        status: schema.sendJobs.status,
        count: sql<number>`COUNT(*)`.as('count'),
        totalCost: sql<number>`SUM(${schema.sendJobs.costCents})`.as('total_cost'),
      })
      .from(schema.sendJobs)
      .where(eq(schema.sendJobs.campaignId, id))
      .groupBy(schema.sendJobs.status);

    const stats = {
      queued: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      totalCostCents: 0,
    };

    jobStats.forEach((stat) => {
      if (stat.status === 'queued') stats.queued = Number(stat.count);
      if (stat.status === 'sent') stats.sent = Number(stat.count);
      if (stat.status === 'delivered') stats.delivered = Number(stat.count);
      if (stat.status === 'failed') stats.failed = Number(stat.count);
      stats.totalCostCents += Number(stat.totalCost || 0);
    });

    // Get click stats
    const [clickStats] = await db
      .select({
        totalClicks: sql<number>`SUM(${schema.shortLinks.clickCount})`.as('total_clicks'),
        humanClicks: sql<number>`SUM(${schema.shortLinks.humanClickCount})`.as('human_clicks'),
        uniqueClickers: sql<number>`COUNT(DISTINCT ${schema.shortLinks.contactId})`.as('unique_clickers'),
      })
      .from(schema.shortLinks)
      .where(eq(schema.shortLinks.campaignId, id));

    // Get opt-outs during campaign
    const [optOutCount] = await db
      .select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(schema.events)
      .where(and(eq(schema.events.campaignId, id), eq(schema.events.eventType, 'OPT_OUT')));

    // Calculate CTR
    const totalSent = stats.sent + stats.delivered;
    const ctrRaw = totalSent > 0 ? (Number(clickStats?.totalClicks || 0) / totalSent) * 100 : 0;
    const ctrHuman = totalSent > 0 ? (Number(clickStats?.humanClicks || 0) / totalSent) * 100 : 0;

    // Get template breakdown
    const templateStats = await db
      .select({
        templateId: schema.sendJobs.templateId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(schema.sendJobs)
      .where(eq(schema.sendJobs.campaignId, id))
      .groupBy(schema.sendJobs.templateId);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        queuedAt: campaign.queuedAt,
        completedAt: campaign.completedAt,
      },
      stats: {
        ...stats,
        optOuts: Number(optOutCount?.count || 0),
        clicks: {
          total: Number(clickStats?.totalClicks || 0),
          human: Number(clickStats?.humanClicks || 0),
          uniqueClickers: Number(clickStats?.uniqueClickers || 0),
        },
        ctr: {
          raw: ctrRaw.toFixed(2) + '%',
          human: ctrHuman.toFixed(2) + '%',
        },
      },
      templateBreakdown: templateStats,
    };
  });

  // Contact timeline
  fastify.get('/contacts/:id/timeline', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [contact] = await db
      .select()
      .from(schema.contacts)
      .where(and(eq(schema.contacts.id, id), eq(schema.contacts.tenantId, authReq.user!.tenantId)))
      .limit(1);

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    // Get events
    const events = await db
      .select({
        id: schema.events.id,
        eventType: schema.events.eventType,
        createdAt: schema.events.createdAt,
        metadata: schema.events.metadata,
        campaignName: schema.campaigns.name,
      })
      .from(schema.events)
      .leftJoin(schema.campaigns, eq(schema.events.campaignId, schema.campaigns.id))
      .where(eq(schema.events.contactId, id))
      .orderBy(sql`${schema.events.createdAt} DESC`)
      .limit(100);

    // Check DNC status
    const [dnc] = await db
      .select()
      .from(schema.doNotContact)
      .where(
        and(
          eq(schema.doNotContact.tenantId, authReq.user!.tenantId),
          eq(schema.doNotContact.phoneE164, contact.phoneE164)
        )
      )
      .limit(1);

    // Calculate suppression window
    let suppressedUntil = null;
    if (contact.lastSentAt) {
      const suppressionDate = new Date(contact.lastSentAt);
      suppressionDate.setDate(suppressionDate.getDate() + 90);
      if (suppressionDate > new Date()) {
        suppressedUntil = suppressionDate;
      }
    }

    return {
      contact: {
        id: contact.id,
        phoneE164: contact.phoneE164,
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        consentStatus: contact.consentStatus,
        lastSentAt: contact.lastSentAt,
      },
      status: {
        isDNC: !!dnc,
        dncReason: dnc?.reason,
        suppressedUntil,
      },
      events,
    };
  });
};

export default reportRoutes;

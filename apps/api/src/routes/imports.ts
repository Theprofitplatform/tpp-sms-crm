import { FastifyPluginAsync } from 'fastify';
import { db, schema, normalizePhone, type DryRunResult, type ImportRow } from '@sms-crm/lib';
import { eq, and } from 'drizzle-orm';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const importRoutes: FastifyPluginAsync = async (fastify) => {
  // Dry-run preview
  fastify.post('/contacts/dry-run', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const csvContent = buffer.toString('utf-8');

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as ImportRow[];

    // Dry-run decisions
    const results: DryRunResult[] = [];
    const summary = {
      totalRows: records.length,
      createCount: 0,
      updateCount: 0,
      duplicateCount: 0,
      invalidPhoneCount: 0,
      dncCount: 0,
      suppressedCount: 0,
      invalidConsentCount: 0,
    };

    // Get DNC list for tenant
    const dncList = await db
      .select({ phoneE164: schema.doNotContact.phoneE164 })
      .from(schema.doNotContact)
      .where(eq(schema.doNotContact.tenantId, authReq.user!.tenantId));

    const dncSet = new Set(dncList.map((d) => d.phoneE164));

    for (const row of records) {
      const normalizedPhone = normalizePhone(row.phone);

      if (!normalizedPhone) {
        results.push({
          decision: 'invalid_phone',
          reason: 'Invalid phone number format',
          row,
        });
        summary.invalidPhoneCount++;
        continue;
      }

      // Check consent
      const consent = (row.consentStatus || 'unknown') as 'explicit' | 'implied' | 'unknown';
      if (consent !== 'explicit' && consent !== 'implied') {
        results.push({
          decision: 'invalid_consent',
          reason: 'Contact must have explicit or implied consent',
          row,
          normalizedPhone,
        });
        summary.invalidConsentCount++;
        continue;
      }

      // Check DNC
      if (dncSet.has(normalizedPhone)) {
        results.push({
          decision: 'dnc',
          reason: 'Phone is on Do Not Contact list',
          row,
          normalizedPhone,
        });
        summary.dncCount++;
        continue;
      }

      // Check if contact exists
      const [existing] = await db
        .select()
        .from(schema.contacts)
        .where(
          and(
            eq(schema.contacts.tenantId, authReq.user!.tenantId),
            eq(schema.contacts.phoneE164, normalizedPhone)
          )
        )
        .limit(1);

      if (existing) {
        // Check if recently sent (suppression window)
        if (existing.lastSentAt) {
          const daysSince = Math.floor(
            (Date.now() - existing.lastSentAt.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSince < 90) {
            results.push({
              decision: 'suppressed_by_cooldown',
              reason: `Contact sent within ${daysSince} days (90-day cooldown)`,
              row,
              normalizedPhone,
            });
            summary.suppressedCount++;
            continue;
          }
        }

        results.push({
          decision: 'update',
          reason: 'Contact exists, will update',
          row,
          normalizedPhone,
        });
        summary.updateCount++;
      } else {
        results.push({
          decision: 'create',
          reason: 'New contact',
          row,
          normalizedPhone,
        });
        summary.createCount++;
      }
    }

    return {
      summary,
      preview: results.slice(0, 50), // First 50 for UI
      totalDecisions: results.length,
    };
  });

  // Commit import
  fastify.post('/contacts/commit', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const csvContent = buffer.toString('utf-8');
    const fileHash = crypto.createHash('sha256').update(csvContent).digest('hex');

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as ImportRow[];

    // Create import batch
    const [batch] = await db
      .insert(schema.importBatches)
      .values({
        tenantId: authReq.user!.tenantId,
        fileName: data.filename || 'upload.csv',
        fileHash,
        totalRows: records.length,
        status: 'processing',
      })
      .returning();

    const dncList = await db
      .select({ phoneE164: schema.doNotContact.phoneE164 })
      .from(schema.doNotContact)
      .where(eq(schema.doNotContact.tenantId, authReq.user!.tenantId));

    const dncSet = new Set(dncList.map((d) => d.phoneE164));

    const rejectedRows: any[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let rejectedCount = 0;

    for (const row of records) {
      const normalizedPhone = normalizePhone(row.phone);

      if (!normalizedPhone || dncSet.has(normalizedPhone!)) {
        rejectedRows.push({ row, reason: !normalizedPhone ? 'Invalid phone' : 'DNC' });
        rejectedCount++;
        continue;
      }

      const consent = (row.consentStatus || 'unknown') as 'explicit' | 'implied' | 'unknown';
      if (consent !== 'explicit' && consent !== 'implied') {
        rejectedRows.push({ row, reason: 'Invalid consent' });
        rejectedCount++;
        continue;
      }

      // Upsert contact
      const [existing] = await db
        .select()
        .from(schema.contacts)
        .where(
          and(
            eq(schema.contacts.tenantId, authReq.user!.tenantId),
            eq(schema.contacts.phoneE164, normalizedPhone)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(schema.contacts)
          .set({
            email: row.email || existing.email,
            firstName: row.firstName || existing.firstName,
            lastName: row.lastName || existing.lastName,
            timezone: row.timezone || existing.timezone,
            consentStatus: consent,
            consentSource: row.consentSource || existing.consentSource,
            importBatchId: batch.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.contacts.id, existing.id));

        updatedCount++;
      } else {
        await db.insert(schema.contacts).values({
          tenantId: authReq.user!.tenantId,
          phoneE164: normalizedPhone,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          timezone: row.timezone || 'Australia/Sydney',
          consentStatus: consent,
          consentSource: row.consentSource,
          importBatchId: batch.id,
        });

        createdCount++;
      }
    }

    // Update batch
    await db
      .update(schema.importBatches)
      .set({
        createdCount,
        updatedCount,
        rejectedCount,
        rejectedRows,
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(schema.importBatches.id, batch.id));

    return {
      batchId: batch.id,
      summary: {
        total: records.length,
        created: createdCount,
        updated: updatedCount,
        rejected: rejectedCount,
      },
    };
  });

  // Get import summary
  fastify.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [batch] = await db
      .select()
      .from(schema.importBatches)
      .where(
        and(
          eq(schema.importBatches.id, id),
          eq(schema.importBatches.tenantId, authReq.user!.tenantId)
        )
      )
      .limit(1);

    if (!batch) {
      return reply.status(404).send({ error: 'Import not found' });
    }

    return batch;
  });

  // Download rejected CSV
  fastify.get('/:id/rejected.csv', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [batch] = await db
      .select()
      .from(schema.importBatches)
      .where(
        and(
          eq(schema.importBatches.id, id),
          eq(schema.importBatches.tenantId, authReq.user!.tenantId)
        )
      )
      .limit(1);

    if (!batch || !batch.rejectedRows) {
      return reply.status(404).send({ error: 'No rejected rows' });
    }

    const csv = stringify(batch.rejectedRows as any[], {
      header: true,
    });

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="rejected-${id}.csv"`);
    return csv;
  });
};

export default importRoutes;

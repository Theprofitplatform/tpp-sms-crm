import crypto from 'crypto';

import { db, schema, normalizePhone, type DryRunResult, type ImportRow } from '@sms-crm/lib';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { eq, and } from 'drizzle-orm';
import { FastifyPluginAsync } from 'fastify';


// import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
// import { requireAuthSimple } from '../middleware/auth-simple';

const importRoutes: FastifyPluginAsync = async (fastify) => {
  // Test endpoint with simplified authentication (no database query) - DISABLED
  // fastify.get('/contacts/test-simple-auth', { preHandler: requireAuthSimple }, async (request, reply) => {
  //   const authReq = request as AuthenticatedRequest;
  //   fastify.log.info({ userId: authReq.user?.id }, 'Simple auth test endpoint called');
  //   return { message: 'Simple auth test successful', userId: authReq.user?.id };
  // });

  // Simple test endpoint without file upload - DISABLED
  // fastify.get('/contacts/test-simple', { preHandler: requireAuth }, async (request, reply) => {
  //   const authReq = request as AuthenticatedRequest;
  //   fastify.log.info({ userId: authReq.user?.id }, 'Simple test endpoint called');
  //   return { message: 'Simple test successful', userId: authReq.user?.id };
  // });

  // Test CSV parsing without database
  fastify.post('/contacts/test-parse', async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    const csvContent = buffer.toString('utf-8');

    // Parse CSV only
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    }) as ImportRow[];

    return {
      parsedRows: records.length,
      sample: records.slice(0, 3),
      message: 'CSV parsing successful without database queries'
    };
  });

  // Dry-run preview
  fastify.post('/contacts/dry-run', async (request, reply) => {
    // const authReq = request as AuthenticatedRequest;

    try {
      fastify.log.info('Starting CSV import dry-run');
      fastify.log.info('File processing starting');

      const data = await request.file();

      if (!data) {
        fastify.log.warn('No file uploaded');
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      fastify.log.info({ filename: data.filename }, 'File received');

      const buffer = await data.toBuffer();
      const csvContent = buffer.toString('utf-8');

      fastify.log.info({ contentLength: csvContent.length }, 'CSV content loaded');

      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      }) as ImportRow[];

      fastify.log.info({ recordCount: records.length }, 'CSV parsed successfully');

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
    fastify.log.info('Querying DNC list from database');
    const dncList = await db
      .select({ phoneE164: schema.doNotContact.phoneE164 })
      .from(schema.doNotContact)
      .where(eq(schema.doNotContact.tenantId, '00000000-0000-0000-0000-000000000001'));

    fastify.log.info({ dncCount: dncList.length }, 'DNC list retrieved');
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
            eq(schema.contacts.tenantId, '00000000-0000-0000-0000-000000000001'),
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
    } catch (error) {
      fastify.log.error({ error }, 'CSV import dry-run failed');
      return reply.status(500).send({ error: 'CSV processing failed' });
    }
  });

  // Commit import
  fastify.post('/contacts/commit', async (request, reply) => {
    // const authReq = request as AuthenticatedRequest;
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
        tenantId: '00000000-0000-0000-0000-000000000001',
        fileName: data.filename || 'upload.csv',
        fileHash,
        totalRows: records.length,
        status: 'processing',
      })
      .returning();

    const dncList = await db
      .select({ phoneE164: schema.doNotContact.phoneE164 })
      .from(schema.doNotContact)
      .where(eq(schema.doNotContact.tenantId, '00000000-0000-0000-0000-000000000001'));

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
            eq(schema.contacts.tenantId, '00000000-0000-0000-0000-000000000001'),
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
          tenantId: '00000000-0000-0000-0000-000000000001',
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
  fastify.get('/:id', async (request, reply) => {
    // const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [batch] = await db
      .select()
      .from(schema.importBatches)
      .where(
        and(
          eq(schema.importBatches.id, id),
          eq(schema.importBatches.tenantId, '00000000-0000-0000-0000-000000000001')
        )
      )
      .limit(1);

    if (!batch) {
      return reply.status(404).send({ error: 'Import not found' });
    }

    return batch;
  });

  // Download rejected CSV
  fastify.get('/:id/rejected.csv', async (request, reply) => {
    // const authReq = request as AuthenticatedRequest;
    const { id } = request.params as { id: string };

    const [batch] = await db
      .select()
      .from(schema.importBatches)
      .where(
        and(
          eq(schema.importBatches.id, id),
          eq(schema.importBatches.tenantId, '00000000-0000-0000-0000-000000000001')
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

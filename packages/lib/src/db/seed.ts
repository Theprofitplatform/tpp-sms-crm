import { addMonths } from 'date-fns';

import { db, closeDb } from './client';
import * as schema from './schema';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create primary tenant
    const [tenant] = await db.insert(schema.tenants).values({
      id: '00000000-0000-0000-0000-000000000001', // Fixed UUID for primary tenant
      name: 'Primary Tenant',
      timezone: 'Australia/Sydney',
      dailyBudgetCents: 10000, // $100/day
      monthlyBudgetCents: 200000, // $2000/month
    }).returning();

    console.log('Created tenant:', tenant.name);

    // Create admin user
    const [adminUser] = await db.insert(schema.users).values({
      tenantId: tenant.id,
      email: 'admin@example.com',
      role: 'admin',
      isActive: true,
    }).returning();

    console.log('Created admin user:', adminUser.email);

    // Create three compliant message templates
    const templates = [
      {
        tenantId: tenant.id,
        name: 'Review Request 1',
        body: 'Hi {{firstName}}, thanks for choosing us! We\'d love your feedback. {{link}} Reply STOP to opt out.',
        variables: ['firstName', 'link'],
        isActive: true,
      },
      {
        tenantId: tenant.id,
        name: 'Review Request 2',
        body: 'Hello {{firstName}}! Your opinion matters. Share your experience: {{link}} Reply STOP to opt out.',
        variables: ['firstName', 'link'],
        isActive: true,
      },
      {
        tenantId: tenant.id,
        name: 'Review Request 3',
        body: 'Hi {{firstName}}, how was your experience? Let us know: {{link}} Reply STOP to opt out.',
        variables: ['firstName', 'link'],
        isActive: true,
      },
    ];

    const insertedTemplates = await db.insert(schema.messageTemplates).values(templates).returning();
    console.log('Created templates:', insertedTemplates.length);

    // Create a placeholder sending number
    const [sendingNumber] = await db.insert(schema.sendingNumbers).values({
      tenantId: tenant.id,
      phoneE164: '+61400000000', // Placeholder
      provider: 'twilio',
      dailyLimit: 300,
      perMinuteLimit: 10,
      warmupStartDate: new Date(),
      isActive: false, // Inactive until real number configured
    }).returning();

    console.log('Created sending number:', sendingNumber.phoneE164);

    // Create budget tracking record
    await db.insert(schema.budgets).values({
      tenantId: tenant.id,
      dailySpentCents: 0,
      monthlySpentCents: 0,
      dailyResetAt: new Date(),
      monthlyResetAt: new Date(),
    });

    // Create cost structure for AU
    await db.insert(schema.costs).values({
      provider: 'twilio',
      country: 'AU',
      perPartCents: 8, // $0.08 per SMS part
      effectiveFrom: new Date(),
      effectiveUntil: addMonths(new Date(), 12),
    });

    // Create default suppression rule
    await db.insert(schema.suppressionRules).values({
      tenantId: tenant.id,
      name: 'Default 90-day cooldown',
      windowDays: 90,
      isActive: true,
    });

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

seed();

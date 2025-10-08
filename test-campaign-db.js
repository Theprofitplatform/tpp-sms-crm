// Test script to verify campaign functionality at database level
const { db, schema } = require('./packages/lib/dist/index.js');

async function testCampaignDB() {
  console.log('🔍 Testing Campaign Database Functionality\n');

  try {
    // Test 1: Check if we can query campaigns
    console.log('1. Querying existing campaigns...');
    const campaigns = await db.select().from(schema.campaigns);
    console.log(`   ✅ Found ${campaigns.length} campaigns`);

    // Test 2: Create a test campaign
    console.log('\n2. Creating test campaign...');
    const [newCampaign] = await db
      .insert(schema.campaigns)
      .values({
        tenantId: '1b5019fb-1be6-47b9-908a-2b276ce43b17',
        name: 'Test Campaign from DB Script',
        templateIds: ['3d5df277-b609-48c0-ad35-6f52797bf54e'],
        status: 'draft',
      })
      .returning();

    console.log('   ✅ Campaign created:', {
      id: newCampaign.id,
      name: newCampaign.name,
      status: newCampaign.status
    });

    // Test 3: Retrieve the campaign
    console.log('\n3. Retrieving created campaign...');
    const [retrievedCampaign] = await db
      .select()
      .from(schema.campaigns)
      .where(schema.campaigns.id.eq(newCampaign.id));

    console.log('   ✅ Campaign retrieved:', {
      id: retrievedCampaign.id,
      name: retrievedCampaign.name,
      status: retrievedCampaign.status
    });

    // Test 4: Test message preview functionality
    console.log('\n4. Testing message preview calculation...');
    const testMessage = "Hello, this is a test message for campaign testing";
    const { calculateMessageParts, appendOptOutLine } = require('./packages/lib/dist/index.js');

    const fullMessage = appendOptOutLine(testMessage);
    const parts = calculateMessageParts(fullMessage);

    console.log('   ✅ Message preview calculated:', {
      originalLength: testMessage.length,
      fullMessageLength: fullMessage.length,
      parts: parts,
      preview: fullMessage
    });

    console.log('\n🎉 All database-level campaign tests passed!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Campaign creation works');
    console.log('   ✅ Campaign retrieval works');
    console.log('   ✅ Message preview calculation works');
    console.log('   ✅ Database connection is functional');

  } catch (error) {
    console.error('❌ Campaign database test failed:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testCampaignDB().catch(console.error);
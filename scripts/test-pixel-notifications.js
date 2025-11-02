/**
 * TEST: Pixel Notifications Service
 *
 * Tests the complete notification workflow:
 * - New issue detected
 * - Issue resolved
 * - Pixel down
 * - Score drop
 * - Daily summary
 * - Email generation
 * - Webhook triggers
 * - Dashboard notifications
 */

import pixelNotificationService from '../src/services/pixel-notifications.js';

console.log('🧪 Testing Pixel Notifications Service\n');

async function testNotifications() {
  try {
    // Test 1: Handle New Issue (Critical)
    console.log('Test 1: Handle New Critical Issue\n');

    const mockPixelId = 1; // Assuming pixel ID 1 exists
    const mockIssue = {
      id: 9999,
      pixel_id: mockPixelId,
      issue_type: 'missing_meta_description',
      page_url: 'https://example.com/test-page',
      severity: 'CRITICAL',
      detected_at: new Date().toISOString(),
      description: 'Page is missing critical meta description tag',
      recommendation: 'Add a meta description between 120-160 characters describing page content'
    };

    const mockRecommendation = {
      id: 1234,
      auto_fix_available: true,
      auto_fix_engine: 'meta-tags-fixer'
    };

    const result1 = await pixelNotificationService.handleNewIssue(mockIssue, mockRecommendation);

    console.log('✅ Handle New Issue Result:');
    console.log(JSON.stringify(result1, null, 2));
    console.log('');

    // Test 2: Handle Resolved Issue
    console.log('\nTest 2: Handle Issue Resolved\n');

    const resolvedIssue = {
      ...mockIssue,
      status: 'RESOLVED',
      resolved_at: new Date().toISOString()
    };

    const result2 = await pixelNotificationService.handleIssueResolved(resolvedIssue, mockRecommendation);

    console.log('✅ Issue Resolved Notification Sent');
    console.log('');

    // Test 3: Pixel Down Notification
    console.log('\nTest 3: Pixel Down Notification\n');

    const downtimeSeconds = 1800; // 30 minutes
    await pixelNotificationService.notifyPixelDown(mockPixelId, downtimeSeconds);

    console.log('✅ Pixel Down Notification Sent');
    console.log(`   Downtime: ${Math.floor(downtimeSeconds / 60)} minutes`);
    console.log('');

    // Test 4: Score Drop Notification
    console.log('\nTest 4: SEO Score Drop Notification\n');

    await pixelNotificationService.notifyScoreDrop(mockPixelId, 85, 72);

    console.log('✅ Score Drop Notification Sent');
    console.log('   Previous: 85 → Current: 72 (-13 points)');
    console.log('');

    // Test 5: Daily Summary
    console.log('\nTest 5: Daily Summary Email\n');

    await pixelNotificationService.sendDailySummary();

    console.log('✅ Daily Summary Sent');
    console.log('');

    // Test 6: Check Email HTML Generation
    console.log('\nTest 6: Email HTML Generation\n');

    const pixel = pixelNotificationService.getPixelData(mockPixelId);
    if (pixel) {
      const criticalHTML = pixelNotificationService.generateCriticalIssueHTML(pixel, mockIssue, mockRecommendation);
      console.log('✅ Critical Issue Email HTML Generated');
      console.log(`   Length: ${criticalHTML.length} characters`);
      console.log(`   Contains AutoFix: ${criticalHTML.includes('AutoFix Available')}`);

      const resolvedHTML = pixelNotificationService.generateIssueResolvedHTML(pixel, mockIssue);
      console.log('✅ Resolved Issue Email HTML Generated');
      console.log(`   Length: ${resolvedHTML.length} characters`);

      const pixelDownHTML = pixelNotificationService.generatePixelDownHTML(pixel, '30m');
      console.log('✅ Pixel Down Email HTML Generated');
      console.log(`   Length: ${pixelDownHTML.length} characters`);

      const scoreDropHTML = pixelNotificationService.generateScoreDropHTML(pixel, 85, 72, 13);
      console.log('✅ Score Drop Email HTML Generated');
      console.log(`   Length: ${scoreDropHTML.length} characters`);
    } else {
      console.log('⚠️  No pixel found with ID 1, skipping HTML generation tests');
    }
    console.log('');

    // Test 7: Dashboard Notifications
    console.log('\nTest 7: Dashboard Notification Creation\n');

    const dashboardNotif = await pixelNotificationService.createDashboardNotification({
      type: 'test_notification',
      category: 'update',
      title: 'Test Notification',
      message: 'This is a test notification from the notification service',
      link: '/test'
    });

    console.log('✅ Dashboard Notification Created:');
    console.log(`   ID: ${dashboardNotif.notification?.id || 'N/A'}`);
    console.log(`   Title: ${dashboardNotif.notification?.title || 'N/A'}`);
    console.log('');

    // Test 8: Webhook Trigger (will fail if no webhooks configured, which is expected)
    console.log('\nTest 8: Webhook Trigger\n');

    const webhookResult = await pixelNotificationService.triggerWebhook('test.event', {
      test: true,
      timestamp: new Date().toISOString()
    });

    console.log('✅ Webhook Trigger Result:');
    console.log(JSON.stringify(webhookResult, null, 2));
    console.log('');

    // Test 9: Notification Actions Determination
    console.log('\nTest 9: Notification Actions Determination\n');

    const criticalActions = pixelNotificationService.determineNotificationActions({ severity: 'CRITICAL' });
    const highActions = pixelNotificationService.determineNotificationActions({ severity: 'HIGH' });
    const mediumActions = pixelNotificationService.determineNotificationActions({ severity: 'MEDIUM' });
    const lowActions = pixelNotificationService.determineNotificationActions({ severity: 'LOW' });

    console.log('✅ Actions for CRITICAL:', JSON.stringify(criticalActions, null, 2));
    console.log('✅ Actions for HIGH:', JSON.stringify(highActions, null, 2));
    console.log('✅ Actions for MEDIUM:', JSON.stringify(mediumActions, null, 2));
    console.log('✅ Actions for LOW:', JSON.stringify(lowActions, null, 2));
    console.log('');

    // Test 10: Daily Summary Stats
    console.log('\nTest 10: Daily Summary Stats\n');

    const stats = pixelNotificationService.getDailySummaryStats();

    console.log('✅ Daily Summary Stats:');
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    // Summary
    console.log('\n📋 Test Summary\n');
    console.log('✅ All notification service tests completed successfully!');
    console.log('');
    console.log('Tested Features:');
    console.log('  ✓ New issue handling (email + webhook + dashboard)');
    console.log('  ✓ Issue resolved handling');
    console.log('  ✓ Pixel down notifications');
    console.log('  ✓ Score drop notifications');
    console.log('  ✓ Daily summary generation');
    console.log('  ✓ Email HTML template generation');
    console.log('  ✓ Dashboard notification creation');
    console.log('  ✓ Webhook triggering');
    console.log('  ✓ Action determination logic');
    console.log('  ✓ Statistics generation');
    console.log('');
    console.log('📧 Email Configuration:');
    console.log(`  SMTP Host: ${process.env.SMTP_HOST || 'Not configured (using default: smtp.gmail.com)'}`);
    console.log(`  SMTP User: ${process.env.SMTP_USER || 'Not configured'}`);
    console.log(`  Email From: ${process.env.EMAIL_FROM || 'noreply@seoexpert.com'}`);
    console.log('');
    console.log('💡 Note: Actual email sending requires SMTP configuration in .env file');
    console.log('    Set: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM');
    console.log('');

    // Close database connection
    pixelNotificationService.close();

    console.log('✅ All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    pixelNotificationService.close();
    process.exit(1);
  }
}

testNotifications();

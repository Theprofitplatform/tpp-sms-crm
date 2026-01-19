/**
 * Alert Manager Tests - Stock Trading Automation System
 *
 * Tests for alert routing, escalation, and channel delivery.
 *
 * Run tests:
 *   npm test -- --grep "AlertManager"
 *   npm test services/ops/alerting/tests/alert-manager.test.js
 */

import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import {
  AlertManager,
  SEVERITY_LEVELS,
  ALERT_STATUS,
  CHANNELS,
} from '../alert-manager.js';
import {
  ALERT_RULES,
  getAlertRule,
  evaluateCondition,
  buildAlertMessage,
} from '../alert-rules.js';

describe('AlertManager', () => {
  let alertManager;
  let axiosStub;
  let clock;

  beforeEach(() => {
    // Stub axios for Discord webhook calls
    axiosStub = sinon.stub(axios, 'post').resolves({ status: 200 });

    // Create alert manager with mock config
    alertManager = new AlertManager({
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
      channels: {
        discord: {
          webhookUrl: 'https://discord.test/webhook',
          criticalWebhookUrl: 'https://discord.test/critical-webhook',
        },
        email: {
          host: null, // Disabled for tests
        },
        sms: {
          twilioSid: null, // Disabled for tests
        },
        pagerduty: {
          routingKey: null, // Disabled for tests
        },
      },
      escalation: {
        enabled: true,
        smsDelayMinutes: 5,
        pagerdutyDelayMinutes: 15,
      },
    });
  });

  afterEach(() => {
    sinon.restore();
    if (alertManager) {
      alertManager.cleanup();
    }
    if (clock) {
      clock.restore();
    }
  });

  describe('Initialization', () => {
    it('should initialize with in-memory storage when no database provided', async () => {
      await alertManager.initialize();
      expect(alertManager._inMemoryAlerts).to.be.an('array');
    });

    it('should log channel configuration', () => {
      expect(alertManager.channels.discord.enabled).to.be.true;
      expect(alertManager.channels.email.enabled).to.be.false;
      expect(alertManager.channels.sms.enabled).to.be.false;
      expect(alertManager.channels.pagerduty.enabled).to.be.false;
    });
  });

  describe('Alert Sending', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should send info alert to Discord only', async () => {
      const result = await alertManager.sendAlert({
        type: 'test_info',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Test Info Alert',
        message: 'This is a test info alert',
      });

      expect(result.alertId).to.exist;
      expect(result.channels).to.have.property(CHANNELS.DISCORD);
      expect(result.channels.discord.success).to.be.true;
      expect(axiosStub.calledOnce).to.be.true;
    });

    it('should send warning alert to Discord', async () => {
      const result = await alertManager.sendAlert({
        type: 'test_warning',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Test Warning Alert',
        message: 'This is a test warning alert',
      });

      expect(result.alertId).to.exist;
      expect(result.channels).to.have.property(CHANNELS.DISCORD);
    });

    it('should send critical alert to Discord with @here mention', async () => {
      const result = await alertManager.sendAlert({
        type: 'kill_switch_activated',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Kill Switch Activated',
        message: 'Trading has been halted',
        details: { reason: 'Manual activation' },
      });

      expect(result.alertId).to.exist;
      expect(result.channels).to.have.property(CHANNELS.DISCORD);

      // Verify @here mention in payload
      const discordCall = axiosStub.firstCall;
      const payload = discordCall.args[1];
      expect(payload.content).to.equal('@here');
    });

    it('should use critical webhook URL for critical alerts', async () => {
      await alertManager.sendAlert({
        type: 'critical_test',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Critical Test',
        message: 'Critical message',
      });

      const discordCall = axiosStub.firstCall;
      expect(discordCall.args[0]).to.equal('https://discord.test/critical-webhook');
    });

    it('should store alert in memory', async () => {
      const result = await alertManager.sendAlert({
        type: 'test_alert',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Test Alert',
        message: 'Test message',
      });

      const storedAlert = await alertManager.getAlert(result.alertId);
      expect(storedAlert).to.exist;
      expect(storedAlert.title).to.equal('Test Alert');
      expect(storedAlert.status).to.equal(ALERT_STATUS.ACTIVE);
    });

    it('should include details in Discord embed', async () => {
      await alertManager.sendAlert({
        type: 'test_details',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Test With Details',
        message: 'Test message',
        details: {
          symbol: 'AAPL',
          quantity: 100,
          price: 150.50,
        },
      });

      const discordCall = axiosStub.firstCall;
      const payload = discordCall.args[1];
      const embed = payload.embeds[0];

      expect(embed.fields).to.be.an('array');
      const fieldNames = embed.fields.map(f => f.name);
      expect(fieldNames).to.include('Symbol');
      expect(fieldNames).to.include('Quantity');
      expect(fieldNames).to.include('Price');
    });
  });

  describe('Deduplication', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should deduplicate same alert within window', async () => {
      const alert1 = await alertManager.sendAlert({
        type: 'duplicate_test',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Same Alert',
        message: 'Same message',
      });

      const alert2 = await alertManager.sendAlert({
        type: 'duplicate_test',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Same Alert',
        message: 'Same message',
      });

      expect(alert1.alertId).to.exist;
      expect(alert2.deduplicated).to.be.true;
      expect(axiosStub.calledOnce).to.be.true; // Only first alert sent
    });

    it('should not deduplicate different alerts', async () => {
      await alertManager.sendAlert({
        type: 'alert_type_1',
        severity: SEVERITY_LEVELS.INFO,
        title: 'First Alert',
        message: 'First message',
      });

      await alertManager.sendAlert({
        type: 'alert_type_2',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Second Alert',
        message: 'Second message',
      });

      expect(axiosStub.calledTwice).to.be.true;
    });

    it('should respect deduplicate=false option', async () => {
      await alertManager.sendAlert({
        type: 'no_dedup',
        severity: SEVERITY_LEVELS.INFO,
        title: 'No Dedup',
        message: 'No dedup message',
        deduplicate: false,
      });

      await alertManager.sendAlert({
        type: 'no_dedup',
        severity: SEVERITY_LEVELS.INFO,
        title: 'No Dedup',
        message: 'No dedup message',
        deduplicate: false,
      });

      expect(axiosStub.calledTwice).to.be.true;
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should rate limit excessive alerts of same type', async () => {
      // Send max alerts
      for (let i = 0; i < 10; i++) {
        await alertManager.sendAlert({
          type: 'rate_limit_test',
          severity: SEVERITY_LEVELS.INFO,
          title: `Rate Limit Test ${i}`,
          message: `Message ${i}`,
          deduplicate: false,
        });
      }

      // 11th alert should be rate limited
      const rateLimited = await alertManager.sendAlert({
        type: 'rate_limit_test',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Rate Limit Test 11',
        message: 'Message 11',
        deduplicate: false,
      });

      expect(rateLimited.rateLimited).to.be.true;
    });

    it('should respect bypassRateLimit option', async () => {
      // Fill up rate limit
      for (let i = 0; i < 10; i++) {
        await alertManager.sendAlert({
          type: 'bypass_test',
          severity: SEVERITY_LEVELS.INFO,
          title: `Bypass Test ${i}`,
          message: `Message ${i}`,
          deduplicate: false,
        });
      }

      // Bypass rate limit
      const result = await alertManager.sendAlert({
        type: 'bypass_test',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Bypass Test',
        message: 'Important message',
        deduplicate: false,
        bypassRateLimit: true,
      });

      expect(result.alertId).to.exist;
      expect(result.rateLimited).to.not.exist;
    });
  });

  describe('Acknowledgment', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should acknowledge alert', async () => {
      const result = await alertManager.sendAlert({
        type: 'ack_test',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Ack Test',
        message: 'Test message',
      });

      const acked = await alertManager.acknowledgeAlert(result.alertId, 'test-user');

      expect(acked.status).to.equal(ALERT_STATUS.ACKNOWLEDGED);
      expect(acked.acknowledged_by).to.equal('test-user');
      expect(acked.acknowledged_at).to.exist;
    });

    it('should throw error when acknowledging non-existent alert', async () => {
      try {
        await alertManager.acknowledgeAlert(9999, 'test-user');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('not found');
      }
    });

    it('should throw error when acknowledging already acknowledged alert', async () => {
      const result = await alertManager.sendAlert({
        type: 'double_ack_test',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Double Ack Test',
        message: 'Test message',
      });

      await alertManager.acknowledgeAlert(result.alertId, 'user1');

      try {
        await alertManager.acknowledgeAlert(result.alertId, 'user2');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).to.include('already');
      }
    });
  });

  describe('Resolution', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should resolve alert', async () => {
      const result = await alertManager.sendAlert({
        type: 'resolve_test',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Resolve Test',
        message: 'Test message',
      });

      const resolved = await alertManager.resolveAlert(
        result.alertId,
        'test-user',
        'Issue fixed'
      );

      expect(resolved.status).to.equal(ALERT_STATUS.RESOLVED);
      expect(resolved.resolved_by).to.equal('test-user');
      expect(resolved.resolution_notes).to.equal('Issue fixed');
      expect(resolved.resolved_at).to.exist;
    });

    it('should resolve alert without notes', async () => {
      const result = await alertManager.sendAlert({
        type: 'resolve_no_notes',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Resolve No Notes',
        message: 'Test message',
      });

      const resolved = await alertManager.resolveAlert(result.alertId, 'test-user');

      expect(resolved.status).to.equal(ALERT_STATUS.RESOLVED);
      expect(resolved.resolution_notes).to.equal('');
    });
  });

  describe('Active Alerts Query', () => {
    beforeEach(async () => {
      await alertManager.initialize();

      // Create various alerts
      await alertManager.sendAlert({
        type: 'active_1',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Active Critical',
        message: 'Critical alert',
        deduplicate: false,
      });

      await alertManager.sendAlert({
        type: 'active_2',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Active Warning',
        message: 'Warning alert',
        deduplicate: false,
      });

      const result = await alertManager.sendAlert({
        type: 'resolved_1',
        severity: SEVERITY_LEVELS.INFO,
        title: 'Resolved Alert',
        message: 'Info alert',
        deduplicate: false,
      });

      await alertManager.resolveAlert(result.alertId, 'system');
    });

    it('should get all active alerts', async () => {
      const active = await alertManager.getActiveAlerts();
      expect(active).to.have.lengthOf(2);
    });

    it('should filter active alerts by severity', async () => {
      const critical = await alertManager.getActiveAlerts({ severity: SEVERITY_LEVELS.CRITICAL });
      expect(critical).to.have.lengthOf(1);
      expect(critical[0].title).to.equal('Active Critical');
    });

    it('should not include resolved alerts', async () => {
      const active = await alertManager.getActiveAlerts();
      const titles = active.map(a => a.title);
      expect(titles).to.not.include('Resolved Alert');
    });
  });

  describe('Alert Statistics', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should return empty stats when no alerts', async () => {
      const stats = await alertManager.getAlertStats();

      expect(stats.activeAlerts).to.equal(0);
      expect(stats.criticalAlerts).to.equal(0);
      expect(stats.escalatedAlerts).to.equal(0);
      expect(stats.totalLast24h).to.equal(0);
    });

    it('should count active and critical alerts', async () => {
      await alertManager.sendAlert({
        type: 'stat_crit',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Critical',
        message: 'Critical',
        deduplicate: false,
      });

      await alertManager.sendAlert({
        type: 'stat_warn',
        severity: SEVERITY_LEVELS.WARNING,
        title: 'Warning',
        message: 'Warning',
        deduplicate: false,
      });

      const stats = await alertManager.getAlertStats();

      expect(stats.activeAlerts).to.equal(2);
      expect(stats.criticalAlerts).to.equal(1);
      expect(stats.totalLast24h).to.equal(2);
    });

    it('should track time since last critical', async () => {
      await alertManager.sendAlert({
        type: 'time_crit',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Critical',
        message: 'Critical',
      });

      const stats = await alertManager.getAlertStats();

      expect(stats.lastCriticalAt).to.exist;
      expect(stats.timeSinceLastCritical).to.be.a('number');
      expect(stats.timeSinceLastCritical).to.be.lessThan(1000); // Within 1 second
    });
  });

  describe('Test Alert', () => {
    beforeEach(async () => {
      await alertManager.initialize();
    });

    it('should send test alert', async () => {
      const result = await alertManager.sendTestAlert();

      expect(result.alertId).to.exist;
      expect(axiosStub.calledOnce).to.be.true;
    });

    it('should send test to specific channel', async () => {
      const result = await alertManager.sendTestAlert(CHANNELS.DISCORD);

      expect(result.channel).to.equal(CHANNELS.DISCORD);
      expect(result.result.sent).to.be.true;
    });

    it('should skip disabled channel', async () => {
      const result = await alertManager.sendTestAlert(CHANNELS.SMS);

      expect(result.channel).to.equal(CHANNELS.SMS);
      expect(result.result.skipped).to.be.true;
    });
  });

  describe('Cleanup', () => {
    it('should clear all timers and caches on cleanup', async () => {
      await alertManager.initialize();

      // Create some state
      await alertManager.sendAlert({
        type: 'cleanup_test',
        severity: SEVERITY_LEVELS.CRITICAL,
        title: 'Cleanup Test',
        message: 'Test message',
      });

      alertManager.cleanup();

      expect(alertManager.escalationTimers.size).to.equal(0);
      expect(alertManager.rateLimit.alertCounts.size).to.equal(0);
      expect(alertManager.deduplication.recentAlerts.size).to.equal(0);
    });
  });
});

describe('Alert Rules', () => {
  describe('getAlertRule', () => {
    it('should return rule for valid type', () => {
      const rule = getAlertRule('kill_switch_activated');
      expect(rule).to.exist;
      expect(rule.severity).to.equal(SEVERITY_LEVELS.CRITICAL);
    });

    it('should return null for unknown type', () => {
      const rule = getAlertRule('unknown_type');
      expect(rule).to.be.null;
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate kill switch condition', () => {
      const rule = getAlertRule('kill_switch_activated');

      expect(evaluateCondition(rule, { kill_switch_active: true })).to.be.true;
      expect(evaluateCondition(rule, { kill_switch_active: false })).to.be.false;
    });

    it('should evaluate position mismatch condition', () => {
      const rule = getAlertRule('position_mismatch');

      expect(evaluateCondition(rule, { position_mismatch_count: 1 })).to.be.true;
      expect(evaluateCondition(rule, { position_mismatch_count: 0 })).to.be.false;
    });

    it('should evaluate daily loss warning condition', () => {
      const rule = getAlertRule('daily_loss_warning');

      expect(evaluateCondition(rule, { daily_loss_pct: 1.7 })).to.be.true;
      expect(evaluateCondition(rule, { daily_loss_pct: 1.0 })).to.be.false;
      expect(evaluateCondition(rule, { daily_loss_pct: 2.1 })).to.be.false; // Above critical
    });

    it('should evaluate daily loss critical condition', () => {
      const rule = getAlertRule('daily_loss_critical');

      expect(evaluateCondition(rule, { daily_loss_pct: 2.5 })).to.be.true;
      expect(evaluateCondition(rule, { daily_loss_pct: 1.9 })).to.be.false;
    });

    it('should evaluate clock drift condition', () => {
      const rule = getAlertRule('clock_drift');

      expect(evaluateCondition(rule, { clock_skew_ms: 6000 })).to.be.true;
      expect(evaluateCondition(rule, { clock_skew_ms: 4000 })).to.be.false;
      expect(evaluateCondition(rule, { clock_skew_ms: -6000 })).to.be.true; // Negative
    });

    it('should evaluate outbox backlog condition', () => {
      const rule = getAlertRule('outbox_backlog');

      expect(evaluateCondition(rule, { outbox_pending: 150 })).to.be.true;
      expect(evaluateCondition(rule, { outbox_pending: 50 })).to.be.false;
    });

    it('should evaluate dead letter condition', () => {
      const rule = getAlertRule('dead_letter_accumulating');

      expect(evaluateCondition(rule, { dead_letter_count: 15 })).to.be.true;
      expect(evaluateCondition(rule, { dead_letter_count: 5 })).to.be.false;
    });

    it('should handle errors gracefully', () => {
      const badRule = {
        evaluate: () => { throw new Error('Test error'); },
      };

      expect(evaluateCondition(badRule, {})).to.be.false;
    });
  });

  describe('buildAlertMessage', () => {
    it('should build kill switch message', () => {
      const rule = getAlertRule('kill_switch_activated');
      const message = buildAlertMessage(rule, { reason: 'Manual test' });

      expect(message).to.include('Manual test');
      expect(message).to.include('halted');
    });

    it('should build position mismatch message', () => {
      const rule = getAlertRule('position_mismatch');
      const message = buildAlertMessage(rule, {
        symbol: 'AAPL',
        broker_qty: 100,
        local_qty: 95,
        difference: 5,
        broker_avg_price: 150.00,
        local_avg_price: 149.50,
      });

      expect(message).to.include('AAPL');
      expect(message).to.include('100');
      expect(message).to.include('95');
    });

    it('should use description as fallback', () => {
      const rule = {
        description: 'Test description',
      };
      const message = buildAlertMessage(rule, {});

      expect(message).to.equal('Test description');
    });
  });

  describe('Rule Definitions', () => {
    it('should have all required critical alerts', () => {
      const criticalRules = [
        'kill_switch_activated',
        'position_mismatch',
        'daily_loss_critical',
        'service_down',
      ];

      for (const type of criticalRules) {
        const rule = getAlertRule(type);
        expect(rule, `Rule ${type} should exist`).to.exist;
        expect(rule.severity, `Rule ${type} should be critical`).to.equal(SEVERITY_LEVELS.CRITICAL);
      }
    });

    it('should have all required warning alerts', () => {
      const warningRules = [
        'daily_loss_warning',
        'data_stale',
        'order_reject_spike',
        'clock_drift',
        'outbox_backlog',
        'dead_letter_accumulating',
      ];

      for (const type of warningRules) {
        const rule = getAlertRule(type);
        expect(rule, `Rule ${type} should exist`).to.exist;
        expect(rule.severity, `Rule ${type} should be warning`).to.equal(SEVERITY_LEVELS.WARNING);
      }
    });

    it('should include SMS channel for critical alerts', () => {
      const criticalRules = Object.values(ALERT_RULES).filter(
        r => r.severity === SEVERITY_LEVELS.CRITICAL
      );

      for (const rule of criticalRules) {
        expect(rule.channels, `Rule ${rule.type} should include SMS`).to.include(CHANNELS.SMS);
      }
    });
  });
});

describe('Severity Channel Routing', () => {
  let alertManager;
  let axiosStub;

  beforeEach(async () => {
    axiosStub = sinon.stub(axios, 'post').resolves({ status: 200 });

    alertManager = new AlertManager({
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
      channels: {
        discord: { webhookUrl: 'https://discord.test/webhook' },
        email: { host: null },
        sms: { twilioSid: null },
        pagerduty: { routingKey: null },
      },
    });

    await alertManager.initialize();
  });

  afterEach(() => {
    sinon.restore();
    if (alertManager) {
      alertManager.cleanup();
    }
  });

  it('should route INFO to Discord only', async () => {
    const result = await alertManager.sendAlert({
      type: 'route_info',
      severity: SEVERITY_LEVELS.INFO,
      title: 'Info Alert',
      message: 'Info message',
    });

    expect(Object.keys(result.channels)).to.deep.equal([CHANNELS.DISCORD]);
  });

  it('should route WARNING to Discord and Email', async () => {
    const result = await alertManager.sendAlert({
      type: 'route_warning',
      severity: SEVERITY_LEVELS.WARNING,
      title: 'Warning Alert',
      message: 'Warning message',
    });

    const channels = Object.keys(result.channels);
    expect(channels).to.include(CHANNELS.DISCORD);
    expect(channels).to.include(CHANNELS.EMAIL);
  });

  it('should route CRITICAL to Discord, Email, and SMS', async () => {
    const result = await alertManager.sendAlert({
      type: 'route_critical',
      severity: SEVERITY_LEVELS.CRITICAL,
      title: 'Critical Alert',
      message: 'Critical message',
    });

    const channels = Object.keys(result.channels);
    expect(channels).to.include(CHANNELS.DISCORD);
    expect(channels).to.include(CHANNELS.EMAIL);
    expect(channels).to.include(CHANNELS.SMS);
  });
});

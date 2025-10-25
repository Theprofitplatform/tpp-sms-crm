/**
 * Client Communication Email Templates
 *
 * Professional email templates for existing client communications:
 * - Monthly performance reports
 * - Alert notifications
 * - Check-ins and retention
 * - Onboarding sequence
 */

import { EmailTemplates } from './email-templates.js';

export class ClientEmailTemplates {
  /**
   * MONTHLY PERFORMANCE REPORT
   */
  static monthlyReport() {
    return {
      name: 'Monthly Performance Report',
      type: 'client_report',
      triggerEvent: 'monthly_report',
      delayHours: 0,
      subject: "Your SEO Performance Report for {{month}} - {{businessName}}",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0; }
    .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; }
    .metric-value { font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .metric-label { font-size: 14px; color: #666666; }
    .metric-change { font-size: 14px; margin-top: 5px; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .highlight-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
    .achievement { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Your {{month}} SEO Performance</h1>
      <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">{{businessName}}</p>
    </div>

    <div class="content">
      <p>Hi {{clientName}},</p>

      <p>Here's your monthly SEO performance summary. Great progress this month!</p>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-value">{{totalClicks}}</div>
          <div class="metric-label">Total Clicks</div>
          <div class="metric-change {{clicksChangeClass}}">{{clicksChange}} from last month</div>
        </div>

        <div class="metric-card">
          <div class="metric-value">{{avgPosition}}</div>
          <div class="metric-label">Avg Position</div>
          <div class="metric-change {{positionChangeClass}}">{{positionChange}} from last month</div>
        </div>

        <div class="metric-card">
          <div class="metric-value">{{totalImpressions}}</div>
          <div class="metric-label">Impressions</div>
          <div class="metric-change {{impressionsChangeClass}}">{{impressionsChange}} from last month</div>
        </div>

        <div class="metric-card">
          <div class="metric-value">{{ctr}}%</div>
          <div class="metric-label">Click Rate</div>
          <div class="metric-change {{ctrChangeClass}}">{{ctrChange}} from last month</div>
        </div>
      </div>

      <h3 style="color: #333; margin-top: 30px;">🎯 Key Achievements</h3>

      <div class="achievement">
        <strong>New Keywords Ranking:</strong> {{newKeywords}} keywords entered top 10
      </div>

      <div class="achievement">
        <strong>Position Improvements:</strong> {{improvedKeywords}} keywords moved up in rankings
      </div>

      <div class="achievement">
        <strong>Traffic Growth:</strong> {{trafficIncrease}}% increase in organic traffic
      </div>

      <h3 style="color: #333; margin-top: 30px;">🚀 Optimizations Completed</h3>

      <ul>
        <li>{{optimization1}}</li>
        <li>{{optimization2}}</li>
        <li>{{optimization3}}</li>
      </ul>

      <div class="highlight-box">
        <h4 style="margin: 0 0 10px 0;">📈 Next Month's Focus</h4>
        <p style="margin: 0;">{{nextMonthFocus}}</p>
      </div>

      <p style="text-align: center;">
        <a href="{{dashboardLink}}" class="cta-button">View Full Report →</a>
      </p>

      <p>As always, feel free to reach out if you have any questions!</p>

      <p>Best regards,<br>
      <strong>{{fromName}}</strong><br>
      {{fromEmail}}</p>
    </div>

    <div class="footer">
      <p>{{companyName}} - Your SEO Partner<br>
      <a href="{{dashboardLink}}" style="color: #667eea;">View Dashboard</a> |
      <a href="{{supportLink}}" style="color: #667eea;">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Your {{month}} SEO Performance - {{businessName}}

Hi {{clientName}},

Here's your monthly SEO performance summary:

KEY METRICS:
- Total Clicks: {{totalClicks}} ({{clicksChange}} from last month)
- Average Position: {{avgPosition}} ({{positionChange}} from last month)
- Impressions: {{totalImpressions}} ({{impressionsChange}} from last month)
- Click Rate: {{ctr}}% ({{ctrChange}} from last month)

KEY ACHIEVEMENTS:
✓ {{newKeywords}} new keywords in top 10
✓ {{improvedKeywords}} keywords moved up in rankings
✓ {{trafficIncrease}}% increase in organic traffic

OPTIMIZATIONS COMPLETED:
- {{optimization1}}
- {{optimization2}}
- {{optimization3}}

NEXT MONTH'S FOCUS:
{{nextMonthFocus}}

View your full report: {{dashboardLink}}

Best regards,
{{fromName}}
{{fromEmail}}
      `.trim()
    };
  }

  /**
   * RANKING ALERT - When rankings drop
   */
  static rankingAlert() {
    return {
      name: 'Ranking Drop Alert',
      type: 'client_alert',
      triggerEvent: 'ranking_drop',
      delayHours: 0,
      subject: "⚠️ Ranking Alert: {{keyword}} - {{businessName}}",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; }
    .header h1 { margin: 0; font-size: 20px; color: #92400e; }
    .content { padding: 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .alert-box { background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .position-change { font-size: 24px; font-weight: bold; color: #dc2626; margin: 10px 0; }
    .action-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Ranking Alert for {{businessName}}</h1>
    </div>

    <div class="content">
      <p>Hi {{clientName}},</p>

      <p>We detected a ranking change that needs your attention.</p>

      <div class="alert-box">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">Keyword: "{{keyword}}"</h3>
        <div class="position-change">
          Position {{oldPosition}} → {{newPosition}}
          <span style="font-size: 18px;">({{positionDrop}} positions)</span>
        </div>
        <p style="margin: 10px 0 0 0; color: #666;">
          Detected: {{detectedDate}}<br>
          Search Volume: {{searchVolume}}/month
        </p>
      </div>

      <h3 style="color: #333;">🔍 Possible Causes</h3>
      <ul>
        <li>Algorithm update</li>
        <li>Competitor improvement</li>
        <li>Technical issue on your site</li>
        <li>Content becoming outdated</li>
      </ul>

      <div class="action-box">
        <h4 style="margin: 0 0 10px 0;">📋 Our Action Plan</h4>
        <ol style="margin: 10px 0; padding-left: 20px;">
          <li>Analyze competitor changes</li>
          <li>Review on-page optimization</li>
          <li>Update content if needed</li>
          <li>Monitor for algorithm updates</li>
        </ol>
        <p style="margin: 10px 0 0 0; font-weight: 600;">
          We'll have this resolved within 7-14 days
        </p>
      </div>

      <p style="text-align: center;">
        <a href="{{dashboardLink}}" class="cta-button">View Detailed Analysis →</a>
      </p>

      <p>No action needed from your side - we're on it!</p>

      <p>Best regards,<br>
      <strong>{{fromName}}</strong></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
⚠️ Ranking Alert for {{businessName}}

Hi {{clientName}},

We detected a ranking change:

KEYWORD: "{{keyword}}"
Position {{oldPosition}} → {{newPosition}} ({{positionDrop}} positions)

Detected: {{detectedDate}}
Search Volume: {{searchVolume}}/month

POSSIBLE CAUSES:
- Algorithm update
- Competitor improvement
- Technical issue
- Content becoming outdated

OUR ACTION PLAN:
1. Analyze competitor changes
2. Review on-page optimization
3. Update content if needed
4. Monitor for algorithm updates

Timeline: Resolved within 7-14 days

View detailed analysis: {{dashboardLink}}

No action needed from your side - we're on it!

Best regards,
{{fromName}}
      `.trim()
    };
  }

  /**
   * MONTHLY CHECK-IN
   */
  static monthlyCheckIn() {
    return {
      name: 'Monthly Check-In',
      type: 'client_retention',
      triggerEvent: 'monthly_checkin',
      delayHours: 0,
      subject: "Quick Check-In: How are we doing? - {{businessName}}",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: #667eea; padding: 30px; text-align: center; color: #ffffff; }
    .content { padding: 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .survey-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .survey-buttons { margin: 20px 0; }
    .survey-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 5px; font-weight: 600; }
    .feedback-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👋 Quick Check-In</h1>
    </div>

    <div class="content">
      <p>Hi {{clientName}},</p>

      <p>We've been working together for {{monthsActive}} months now, and I wanted to check in personally.</p>

      <div class="survey-box">
        <h3 style="margin: 0 0 15px 0; color: #333;">How satisfied are you with our SEO service?</h3>
        <div class="survey-buttons">
          <a href="{{surveyLink}}?rating=5" class="survey-button">😊 Very Satisfied</a>
          <a href="{{surveyLink}}?rating=4" class="survey-button">🙂 Satisfied</a>
          <a href="{{surveyLink}}?rating=3" class="survey-button">😐 Neutral</a>
          <a href="{{surveyLink}}?rating=2" class="survey-button">😕 Could Be Better</a>
        </div>
      </div>

      <h3 style="color: #333;">📊 Your Results So Far</h3>
      <ul>
        <li><strong>{{totalKeywords}}</strong> keywords now ranking in top 10</li>
        <li><strong>{{trafficIncrease}}%</strong> increase in organic traffic</li>
        <li><strong>{{optimizationsCompleted}}</strong> optimizations completed</li>
      </ul>

      <div class="feedback-box">
        <h4 style="margin: 0 0 10px 0;">💬 We'd Love Your Feedback</h4>
        <p style="margin: 0;">
          Is there anything we could be doing better? Any concerns or questions?
          Simply reply to this email - I read every response personally.
        </p>
      </div>

      <p>Looking forward to continuing our partnership!</p>

      <p>Best regards,<br>
      <strong>{{fromName}}</strong><br>
      {{fromEmail}}<br>
      {{phone}}</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Quick Check-In - {{businessName}}

Hi {{clientName}},

We've been working together for {{monthsActive}} months, and I wanted to check in personally.

HOW SATISFIED ARE YOU WITH OUR SEO SERVICE?
Rate us: {{surveyLink}}

YOUR RESULTS SO FAR:
- {{totalKeywords}} keywords now ranking in top 10
- {{trafficIncrease}}% increase in organic traffic
- {{optimizationsCompleted}} optimizations completed

WE'D LOVE YOUR FEEDBACK:
Is there anything we could be doing better? Any concerns or questions?
Simply reply to this email - I read every response personally.

Looking forward to continuing our partnership!

Best regards,
{{fromName}}
{{fromEmail}}
{{phone}}
      `.trim()
    };
  }

  /**
   * CLIENT ONBOARDING - Welcome existing client
   */
  static clientOnboarding() {
    return {
      name: 'Client Onboarding Welcome',
      type: 'client_onboarding',
      triggerEvent: 'client_added',
      delayHours: 0,
      subject: "Welcome to {{companyName}}! Here's what happens next",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .timeline { margin: 30px 0; }
    .timeline-item { display: flex; gap: 20px; margin-bottom: 25px; }
    .timeline-number { background: #667eea; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
    .timeline-content h4 { margin: 0 0 5px 0; color: #333; }
    .timeline-content p { margin: 0; color: #666; font-size: 14px; }
    .highlight-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to {{companyName}}!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">We're excited to partner with {{businessName}}</p>
    </div>

    <div class="content">
      <p>Hi {{clientName}},</p>

      <p>Thank you for choosing us as your SEO partner! I'm {{fromName}}, and I'll be your main point of contact.</p>

      <h3 style="color: #333;">📋 Here's What Happens Next</h3>

      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-number">1</div>
          <div class="timeline-content">
            <h4>Initial Audit (Days 1-3)</h4>
            <p>We'll analyze your current SEO performance and identify opportunities</p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-number">2</div>
          <div class="timeline-content">
            <h4>Strategy Call (Week 1)</h4>
            <p>We'll present our findings and custom 90-day roadmap</p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-number">3</div>
          <div class="timeline-content">
            <h4>Quick Wins (Weeks 2-3)</h4>
            <p>We'll implement high-impact optimizations first</p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-number">4</div>
          <div class="timeline-content">
            <h4>Ongoing Optimization (Month 2+)</h4>
            <p>Continuous monitoring, reporting, and improvements</p>
          </div>
        </div>
      </div>

      <div class="highlight-box">
        <h4 style="margin: 0 0 10px 0;">🔐 Your Client Portal</h4>
        <p style="margin: 0;">
          Access your dashboard 24/7 to see real-time rankings, traffic, and optimization history.
        </p>
        <p style="margin: 10px 0 0 0;">
          <strong>Login:</strong> {{portalLink}}<br>
          <strong>Username:</strong> {{clientEmail}}<br>
          <strong>Temporary Password:</strong> {{temporaryPassword}}
        </p>
      </div>

      <p style="text-align: center;">
        <a href="{{portalLink}}" class="cta-button">Access Your Dashboard →</a>
      </p>

      <h3 style="color: #333;">📞 How to Reach Me</h3>
      <ul>
        <li>Email: {{fromEmail}}</li>
        <li>Phone: {{phone}}</li>
        <li>Reply to this email anytime!</li>
      </ul>

      <p>I'll be in touch within 24 hours to schedule our strategy call. Looking forward to getting started!</p>

      <p>Welcome aboard,<br>
      <strong>{{fromName}}</strong><br>
      {{companyName}}</p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Welcome to {{companyName}}!

Hi {{clientName}},

Thank you for choosing us! I'm {{fromName}}, your main point of contact.

WHAT HAPPENS NEXT:

1. INITIAL AUDIT (Days 1-3)
   Analyze your current SEO and identify opportunities

2. STRATEGY CALL (Week 1)
   Present findings and custom 90-day roadmap

3. QUICK WINS (Weeks 2-3)
   Implement high-impact optimizations first

4. ONGOING OPTIMIZATION (Month 2+)
   Continuous monitoring, reporting, improvements

YOUR CLIENT PORTAL:
Login: {{portalLink}}
Username: {{clientEmail}}
Temporary Password: {{temporaryPassword}}

HOW TO REACH ME:
- Email: {{fromEmail}}
- Phone: {{phone}}
- Reply to this email anytime!

I'll be in touch within 24 hours to schedule our strategy call.

Welcome aboard,
{{fromName}}
{{companyName}}
      `.trim()
    };
  }

  /**
   * SUCCESS MILESTONE - Celebrate wins
   */
  static successMilestone() {
    return {
      name: 'Success Milestone Celebration',
      type: 'client_retention',
      triggerEvent: 'milestone_reached',
      delayHours: 0,
      subject: "🎉 We Hit a Milestone! {{milestone}} - {{businessName}}",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 32px; }
    .content { padding: 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .celebration-box { background: #ecfdf5; border: 3px solid #10b981; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center; }
    .big-number { font-size: 48px; font-weight: bold; color: #059669; margin: 10px 0; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
    .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations!</h1>
    </div>

    <div class="content">
      <p>Hi {{clientName}},</p>

      <p>I have some exciting news to share!</p>

      <div class="celebration-box">
        <h2 style="margin: 0 0 15px 0; color: #059669;">We Just Reached a Major Milestone</h2>
        <div class="big-number">{{milestone}}</div>
        <p style="margin: 15px 0 0 0; font-size: 18px; color: #059669;">
          {{milestoneDescription}}
        </p>
      </div>

      <h3 style="color: #333;">📊 Your Progress So Far</h3>

      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-value">{{totalKeywords}}</div>
          <div class="stat-label">Keywords Ranking</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{trafficGrowth}}%</div>
          <div class="stat-label">Traffic Growth</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{avgPosition}}</div>
          <div class="stat-label">Avg Position</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{monthsActive}}</div>
          <div class="stat-label">Months Together</div>
        </div>
      </div>

      <p>This is a testament to the great work we've been doing together. Thank you for being an amazing client!</p>

      <p>Here's to many more wins! 🚀</p>

      <p>Best regards,<br>
      <strong>{{fromName}}</strong></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
🎉 Congratulations! - {{businessName}}

Hi {{clientName}},

I have exciting news!

WE JUST REACHED A MAJOR MILESTONE:
{{milestone}}
{{milestoneDescription}}

YOUR PROGRESS SO FAR:
- {{totalKeywords}} Keywords Ranking
- {{trafficGrowth}}% Traffic Growth
- {{avgPosition}} Avg Position
- {{monthsActive}} Months Together

This is a testament to our great work together. Thank you for being an amazing client!

Here's to many more wins! 🚀

Best regards,
{{fromName}}
      `.trim()
    };
  }

  /**
   * Get all client communication templates
   */
  static getAll() {
    return [
      this.monthlyReport(),
      this.rankingAlert(),
      this.monthlyCheckIn(),
      this.clientOnboarding(),
      this.successMilestone()
    ];
  }
}

export default ClientEmailTemplates;

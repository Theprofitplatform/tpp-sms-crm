/**
 * Email Templates for Lead Nurturing
 *
 * Pre-built, professionally designed email templates for automated campaigns
 */

export class EmailTemplates {
  /**
   * Replace template variables with actual data
   */
  static replacePlaceholders(template, data) {
    let result = template;

    // Replace all {{variable}} placeholders
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, data[key] || '');
    });

    return result;
  }

  /**
   * WELCOME EMAIL - Immediate after lead capture
   */
  static welcomeEmail() {
    return {
      name: 'Welcome & Audit Delivery',
      type: 'welcome',
      triggerEvent: 'lead_captured',
      delayHours: 0,
      subject: "{{name}}, Your FREE SEO Audit is Ready! 📊",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SEO Audit Results</title>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .score-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0; }
    .score-value { font-size: 48px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
    .score-label { font-size: 16px; color: #666666; }
    .findings { margin: 30px 0; }
    .finding { background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    .finding-title { font-size: 18px; font-weight: 600; color: #333333; margin-bottom: 10px; }
    .finding-text { color: #666666; font-size: 14px; line-height: 1.5; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your SEO Audit Results Are In! 🎯</h1>
    </div>

    <div class="content">
      <p>Hi {{name}},</p>

      <p>Thank you for requesting your FREE SEO audit! Our AI-powered system has analyzed <strong>{{website}}</strong> and discovered some valuable opportunities to improve your search rankings.</p>

      <div class="score-box">
        <div class="score-value">{{seoScore}}/100</div>
        <div class="score-label">Your Current SEO Score</div>
      </div>

      <p><strong>Here's what we found:</strong></p>

      <div class="findings">
        <div class="finding">
          <div class="finding-title">🔧 Technical Issues</div>
          <div class="finding-text">{{technicalSummary}}</div>
        </div>

        <div class="finding">
          <div class="finding-title">📄 On-Page SEO</div>
          <div class="finding-text">{{onPageSummary}}</div>
        </div>

        <div class="finding">
          <div class="finding-title">🎯 Competitor Gaps</div>
          <div class="finding-text">{{competitorSummary}}</div>
        </div>
      </div>

      <p>The good news? These issues are fixable, and we can help you implement the changes in as little as 30 days.</p>

      <p style="text-align: center;">
        <a href="{{calendarLink}}" class="cta-button">Book Your Free Strategy Call →</a>
      </p>

      <p>On this 30-minute call, we'll:</p>
      <ul>
        <li>Walk through your complete audit findings</li>
        <li>Create a custom 90-day SEO roadmap</li>
        <li>Show you exactly how we can improve your rankings</li>
        <li>Discuss pricing and timeline options</li>
      </ul>

      <p>Talk soon!</p>

      <p><strong>The SEO Expert Team</strong><br>
      {{fromEmail}}<br>
      {{phone}}</p>
    </div>

    <div class="footer">
      <p>SEO Expert - AI-Powered SEO Automation<br>
      Helping businesses dominate local search</p>
      <p style="font-size: 12px; margin-top: 20px;">
        You're receiving this because you requested a FREE SEO audit at {{website}}.<br>
        <a href="{{unsubscribeLink}}" style="color: #999999;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Hi {{name}},

Thank you for requesting your FREE SEO audit! Our AI-powered system has analyzed {{website}} and discovered some valuable opportunities.

YOUR SEO SCORE: {{seoScore}}/100

WHAT WE FOUND:

Technical Issues:
{{technicalSummary}}

On-Page SEO:
{{onPageSummary}}

Competitor Gaps:
{{competitorSummary}}

The good news? These are fixable, and we can help implement changes in 30 days.

BOOK YOUR FREE STRATEGY CALL:
{{calendarLink}}

On this 30-minute call, we'll:
- Walk through your complete audit findings
- Create a custom 90-day SEO roadmap
- Show you how we can improve your rankings
- Discuss pricing and timeline

Talk soon!

The SEO Expert Team
{{fromEmail}}
{{phone}}
      `.trim()
    };
  }

  /**
   * FOLLOW-UP EMAIL #1 - 2 days after welcome
   */
  static followUp1() {
    return {
      name: 'Follow-Up: Case Study',
      type: 'follow_up',
      triggerEvent: 'audit_viewed',
      delayHours: 48,
      subject: "How We Got {{similarBusiness}} 312% More Traffic in 90 Days",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .content { padding: 40px 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .highlight-box { background: #f0f4ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
    .stat { font-size: 36px; font-weight: bold; color: #667eea; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi {{name}},</p>

      <p>I wanted to share a quick success story that's relevant to {{businessName}}.</p>

      <p>We recently worked with <strong>{{similarBusiness}}</strong>, a {{industry}} business just like yours. They came to us with similar issues:</p>

      <ul>
        <li>Low visibility in local search</li>
        <li>Competitors dominating their keywords</li>
        <li>Website not optimized for conversions</li>
      </ul>

      <p><strong>Here's what we achieved in just 90 days:</strong></p>

      <div class="highlight-box">
        <div class="stat">+312%</div>
        <p style="margin: 5px 0 0 0;">Increase in organic traffic</p>
      </div>

      <div class="highlight-box">
        <div class="stat">23 Keywords</div>
        <p style="margin: 5px 0 0 0;">Ranking on page 1 of Google</p>
      </div>

      <div class="highlight-box">
        <div class="stat">+$47K</div>
        <p style="margin: 5px 0 0 0;">Additional monthly revenue</p>
      </div>

      <p>The best part? We used the same AI-powered automation system that analyzed your website.</p>

      <p>Want to see how we can achieve similar results for {{businessName}}?</p>

      <p style="text-align: center;">
        <a href="{{calendarLink}}" class="cta-button">Book Your Strategy Call →</a>
      </p>

      <p>Best,<br>
      <strong>{{fromName}}</strong><br>
      SEO Expert</p>
    </div>

    <div class="footer">
      <p><a href="{{unsubscribeLink}}" style="color: #999999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Hi {{name}},

I wanted to share a success story relevant to {{businessName}}.

We recently worked with {{similarBusiness}}, a {{industry}} business with similar challenges:
- Low visibility in local search
- Competitors dominating their keywords
- Website not optimized for conversions

HERE'S WHAT WE ACHIEVED IN 90 DAYS:

+312% Increase in organic traffic
23 Keywords ranking on page 1
+$47K Additional monthly revenue

We used the same AI-powered system that analyzed your website.

Want similar results for {{businessName}}?

BOOK YOUR STRATEGY CALL:
{{calendarLink}}

Best,
{{fromName}}
SEO Expert
      `.trim()
    };
  }

  /**
   * FOLLOW-UP EMAIL #2 - 5 days after welcome
   */
  static followUp2() {
    return {
      name: 'Follow-Up: Quick Wins',
      type: 'follow_up',
      delayHours: 120,
      subject: "3 Quick SEO Fixes You Can Implement Today ({{businessName}})",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .content { padding: 40px 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .tip-box { background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .tip-number { background: #667eea; color: #ffffff; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; }
    .tip-title { font-size: 18px; font-weight: 600; color: #333; margin: 15px 0 10px 0; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi {{name}},</p>

      <p>Based on your audit results, here are 3 quick SEO fixes you can implement today to start improving your rankings:</p>

      <div class="tip-box">
        <span class="tip-number">1</span>
        <div class="tip-title">Optimize Your Google Business Profile</div>
        <p>Add high-quality photos, respond to reviews, and post weekly updates. This alone can boost your local rankings by 15-20%.</p>
      </div>

      <div class="tip-box">
        <span class="tip-number">2</span>
        <div class="tip-title">Fix Your Meta Descriptions</div>
        <p>Write compelling 150-160 character descriptions for your top 10 pages. This can increase your click-through rate by 30%.</p>
      </div>

      <div class="tip-box">
        <span class="tip-number">3</span>
        <div class="tip-title">Add Schema Markup</div>
        <p>Implement LocalBusiness schema on your homepage. This helps Google understand your business and can improve your search visibility.</p>
      </div>

      <p><strong>Want the full roadmap?</strong></p>

      <p>These are just 3 of the 47 optimization opportunities we found for {{businessName}}. On our strategy call, I'll walk you through the complete plan and show you how we can implement everything in 30-90 days.</p>

      <p style="text-align: center;">
        <a href="{{calendarLink}}" class="cta-button">Let's Talk Strategy →</a>
      </p>

      <p>Cheers,<br>
      <strong>{{fromName}}</strong></p>
    </div>

    <div class="footer">
      <p><a href="{{unsubscribeLink}}" style="color: #999999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Hi {{name}},

Based on your audit, here are 3 quick SEO fixes for today:

1. OPTIMIZE YOUR GOOGLE BUSINESS PROFILE
Add photos, respond to reviews, post updates.
Result: 15-20% boost in local rankings

2. FIX YOUR META DESCRIPTIONS
Write compelling 150-160 char descriptions for top pages.
Result: 30% increase in click-through rate

3. ADD SCHEMA MARKUP
Implement LocalBusiness schema on homepage.
Result: Better search visibility

These are just 3 of the 47 opportunities we found for {{businessName}}.

Want the full roadmap? Let's talk:
{{calendarLink}}

Cheers,
{{fromName}}
      `.trim()
    };
  }

  /**
   * LAST CHANCE EMAIL - 7 days after welcome
   */
  static lastChance() {
    return {
      name: 'Last Chance: Limited Spots',
      type: 'reengagement',
      triggerEvent: null,
      delayHours: 168,
      subject: "Should I close your file? ({{businessName}})",
      bodyHtml: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .content { padding: 40px 30px; }
    .content p { color: #333333; font-size: 16px; line-height: 1.6; }
    .urgent-box { background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .cta-button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Hi {{name}},</p>

      <p>I haven't heard back from you, so I wanted to check in one last time.</p>

      <p>I have your SEO audit for {{businessName}} sitting on my desk, and honestly, I'm excited about the opportunities I see.</p>

      <div class="urgent-box">
        <h3 style="margin: 0 0 10px 0; color: #856404;">⏰ We Only Take 5 New Clients Per Month</h3>
        <p style="margin: 0; color: #856404;">We have 2 spots left for {{currentMonth}}</p>
      </div>

      <p><strong>Here's what's possible for {{businessName}}:</strong></p>

      <ul>
        <li>Rank for {{keywordCount}} high-value local keywords</li>
        <li>Outrank {{competitorCount}} competitors in your area</li>
        <li>Generate an estimated {{trafficIncrease}} additional visitors/month</li>
      </ul>

      <p>But I can't hold your spot forever.</p>

      <p>If I don't hear from you by {{deadline}}, I'll assume you're not interested and move on to the next business on my waitlist.</p>

      <p style="text-align: center;">
        <a href="{{calendarLink}}" class="cta-button">Claim Your Spot Now →</a>
      </p>

      <p>Or if this isn't a priority right now, just reply and let me know. No hard feelings.</p>

      <p>Best regards,<br>
      <strong>{{fromName}}</strong><br>
      SEO Expert</p>

      <p style="font-size: 14px; color: #999;">P.S. - Even if you don't work with us, implement those 3 quick wins I sent you. They'll make a difference.</p>
    </div>

    <div class="footer">
      <p><a href="{{unsubscribeLink}}" style="color: #999999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
      bodyText: `
Hi {{name}},

I haven't heard back, so checking in one last time.

I have your SEO audit for {{businessName}}, and I'm excited about the opportunities.

⏰ WE ONLY TAKE 5 NEW CLIENTS/MONTH
We have 2 spots left for {{currentMonth}}

WHAT'S POSSIBLE FOR {{businessName}}:
- Rank for {{keywordCount}} high-value keywords
- Outrank {{competitorCount}} competitors
- Generate {{trafficIncrease}} additional visitors/month

I can't hold your spot forever.

If I don't hear from you by {{deadline}}, I'll move to the next business.

CLAIM YOUR SPOT:
{{calendarLink}}

Or reply if this isn't a priority. No hard feelings.

Best,
{{fromName}}

P.S. - Implement those 3 quick wins. They'll help.
      `.trim()
    };
  }

  /**
   * Get all default templates
   */
  static getAll() {
    return [
      this.welcomeEmail(),
      this.followUp1(),
      this.followUp2(),
      this.lastChance()
    ];
  }
}

export default EmailTemplates;

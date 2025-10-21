# CLIENT ONBOARDING CHECKLIST

**Client:** ___________________________
**Package:** ___________________________
**Start Date:** ___________________________

---

## PRE-SALE (Before Signing)

### Discovery & Audit
- [ ] Run free audit on client's website
  ```bash
  # Temporarily update config/env/.env with their URL (read-only)
  node quick-audit.js
  ```
- [ ] Document top 10 issues found
- [ ] Calculate estimated traffic loss
- [ ] Research their competitors (top 3)
- [ ] Estimate potential improvement (15-30%)

### Proposal Preparation
- [ ] Customize proposal template with their data
- [ ] Include specific issues from audit
- [ ] Calculate ROI estimate
- [ ] Add industry-specific examples
- [ ] Prepare pricing options

### Sales Call
- [ ] Send calendar invite
- [ ] Prepare demo (screen share ready)
- [ ] Review their website beforehand
- [ ] Prepare objection responses
- [ ] Have contract ready to send

---

## POST-SALE (After Signing)

### Day 1: Contract & Payment
- [ ] Receive signed contract
- [ ] Process setup fee payment
- [ ] Send welcome email (Email Template #7)
- [ ] Send WordPress access form
- [ ] Create client folder in system

### Day 1-2: Technical Setup
- [ ] Receive WordPress credentials
- [ ] Test admin access
- [ ] Create application password
- [ ] Test REST API access
  ```bash
  node test-auth.js
  ```
- [ ] Add client to `clients/clients-config.json`
- [ ] Create client environment file `clients/[client-id].env`
- [ ] Configure Discord/Slack webhook (if included)

### Day 3: Baseline Audit
- [ ] Run comprehensive audit
  ```bash
  node client-manager.js audit [client-id]
  ```
- [ ] Review results for accuracy
- [ ] Create baseline report
- [ ] Note current SEO score
- [ ] Document all issues found
- [ ] Take screenshots for before/after

### Day 4-5: Initial Optimization
- [ ] Run first optimization
  ```bash
  node client-manager.js optimize [client-id]
  ```
- [ ] Monitor for errors
- [ ] Verify changes on live site
- [ ] Document improvements made
- [ ] Generate first progress report

### Day 6-7: Kickoff Call
- [ ] Send kickoff call invite
- [ ] Prepare presentation
  - Baseline audit results
  - Initial improvements made
  - Explanation of ongoing process
  - Reporting schedule
  - Communication channels
- [ ] Share screen and walk through reports
- [ ] Answer questions
- [ ] Set expectations
- [ ] Schedule next call

---

## ONGOING OPERATIONS

### Weekly Tasks (15-30 min per client)

**Monday (Optimization Day):**
- [ ] Run weekly optimization
  ```bash
  node client-manager.js optimize [client-id]
  ```
- [ ] Check logs for errors
- [ ] Review changes made
- [ ] Note significant improvements

**Thursday (Reporting Day):**
- [ ] Generate weekly report
  ```bash
  node client-manager.js audit [client-id]
  ```
- [ ] Email report to client (Email Template #8)
- [ ] Respond to any questions
- [ ] Document feedback

**Friday (Check-in Day):**
- [ ] Check Discord/Slack for messages
- [ ] Review any support requests
- [ ] Prepare for next week

### Monthly Tasks (1-2 hours per client)

**Week 4 of Month:**
- [ ] Generate monthly summary report
- [ ] Calculate month-over-month improvements
- [ ] Prepare strategy recommendations
- [ ] Schedule monthly strategy call
- [ ] Send monthly email (Email Template #9)

**Monthly Strategy Call:**
- [ ] Review 30-day progress
- [ ] Discuss wins and challenges
- [ ] Present next month's focus areas
- [ ] Answer questions
- [ ] Identify upsell opportunities
- [ ] Schedule next call

### Quarterly Review (2-3 hours per client)

**Every 90 Days:**
- [ ] Generate comprehensive 90-day report
- [ ] Calculate ROI achieved
- [ ] Benchmark against competitors
- [ ] Prepare strategic recommendations
- [ ] Discuss renewal/upgrade options
- [ ] Request testimonial/case study
- [ ] Ask for referrals

---

## CLIENT SUCCESS METRICS

### Track These KPIs:

**Technical Metrics:**
- [ ] SEO Score (track weekly)
- [ ] Issues resolved (cumulative)
- [ ] Posts optimized (total)
- [ ] Pages analyzed
- [ ] Optimization runtime

**Business Metrics:**
- [ ] Organic traffic (if GA access)
- [ ] Search rankings (key terms)
- [ ] Click-through rate improvements
- [ ] Bounce rate changes
- [ ] Conversion rate (if tracking)

**Client Satisfaction:**
- [ ] Response time to emails
- [ ] Issues reported vs resolved
- [ ] Meeting attendance
- [ ] Referrals provided
- [ ] Renewal rate

---

## COMMUNICATION SCHEDULE

### STARTER Package:
- **Weekly:** Automated report email
- **Monthly:** Summary email
- **Quarterly:** Check-in call
- **Support:** Email (24-48 hr response)

### PROFESSIONAL Package:
- **Bi-weekly:** Optimization reports
- **Weekly:** Discord/email updates
- **Monthly:** 30-min strategy call
- **Support:** Priority email (12-24 hr response)

### ENTERPRISE Package:
- **Daily:** Health monitoring alerts
- **Weekly:** Detailed progress reports
- **Bi-weekly:** 1-hour strategy calls
- **24/7:** Slack/phone support

---

## ESCALATION PROCEDURES

### If Things Go Wrong:

**Technical Issues:**
1. Check logs: `logs/clients/[client-id]/`
2. Test authentication: `node test-auth.js`
3. Verify WordPress access still valid
4. Check for plugin conflicts
5. Review recent WordPress updates

**Client Complaints:**
1. Acknowledge immediately (within 2 hours)
2. Investigate issue thoroughly
3. Provide explanation and solution
4. Implement fix within 24 hours
5. Follow-up to confirm satisfaction

**Non-Payment:**
1. Automated reminder (Day 5 overdue)
2. Personal email (Day 10 overdue)
3. Phone call (Day 15 overdue)
4. Pause service (Day 20 overdue)
5. Terminate (Day 30 overdue)

---

## OFFBOARDING (If Client Cancels)

### Final Tasks:
- [ ] Receive cancellation notice (30 days)
- [ ] Continue service through notice period
- [ ] Generate final report
- [ ] Export all data for client
- [ ] Remove client from active automation
- [ ] Archive client data
- [ ] Send exit survey
- [ ] Request feedback
- [ ] Keep door open for return
- [ ] Send re-engagement email (90 days later)

### Archive Checklist:
- [ ] Move `clients/[client-id].env` to archive
- [ ] Update status to "inactive" in config
- [ ] Archive logs folder
- [ ] Save final reports
- [ ] Document lessons learned

---

## QUALITY ASSURANCE

### Weekly QA Checks:
- [ ] Verify all optimizations ran successfully
- [ ] Check no WordPress errors occurred
- [ ] Confirm reports generated correctly
- [ ] Test all client website URLs still work
- [ ] Verify Discord/Slack notifications working

### Monthly QA Checks:
- [ ] Review all client accounts
- [ ] Update any expired credentials
- [ ] Check for WordPress/plugin updates needed
- [ ] Verify billing processed correctly
- [ ] Review support response times
- [ ] Update documentation if needed

---

## TEMPLATES & DOCUMENTS CHECKLIST

### Have These Ready:
- [x] Proposal template
- [x] Email templates (12 types)
- [x] Welcome packet
- [ ] WordPress access form
- [ ] Service agreement/contract
- [ ] Invoice template
- [ ] Weekly report template
- [ ] Monthly report template
- [ ] Quarterly review deck
- [ ] Case study template
- [ ] Testimonial request form

---

## FIRST CLIENT QUICK START

### Speed Run (Get First Client in 7 Days):

**Day 1: Prep**
- [ ] Finalize pricing
- [ ] Set up payment processor
- [ ] Create proposal template
- [ ] Build simple landing page
- [ ] Prepare demo

**Day 2-3: Outreach**
- [ ] Identify 20 prospects
- [ ] Run free audits on their sites
- [ ] Send cold emails (Email Template #1)
- [ ] Follow up on LinkedIn

**Day 4-5: Sales**
- [ ] Schedule calls with interested prospects
- [ ] Present audits and proposals
- [ ] Handle objections
- [ ] Close first deal

**Day 6-7: Onboard**
- [ ] Get WordPress access
- [ ] Run baseline audit
- [ ] Complete setup
- [ ] Deliver first value

**Result:** First client paying by Day 7! 🎉

---

## SUCCESS TIPS

### Do's:
✅ Over-communicate during onboarding
✅ Set clear expectations upfront
✅ Deliver reports on schedule
✅ Respond to emails within 24 hours
✅ Celebrate wins with clients
✅ Ask for referrals when happy
✅ Document everything

### Don'ts:
❌ Skip the baseline audit
❌ Promise guaranteed rankings
❌ Ignore client questions
❌ Let automation run unchecked
❌ Miss scheduled calls
❌ Forget to invoice
❌ Take on too many clients too fast

---

## AUTOMATION REMINDERS

### Set These Up:
- [ ] Weekly optimization cron job
- [ ] Automated report emails
- [ ] Discord notification webhooks
- [ ] Billing reminders
- [ ] Renewal reminders (30 days before)
- [ ] Check-in emails
- [ ] Backup automation

---

## RESOURCES

### Quick Reference:
- Multi-Client Plan: `MULTI-CLIENT-PLAN.md`
- Proposal Template: `sales-materials/PROPOSAL-TEMPLATE.md`
- Email Templates: `sales-materials/EMAIL-TEMPLATES.md`
- Client Manager: `node client-manager.js list`

### Commands:
```bash
# List all clients
node client-manager.js list

# Run audit for specific client
node client-manager.js audit [client-id]

# Run optimization for specific client
node client-manager.js optimize [client-id]

# Run for all active clients
node client-manager.js optimize-all

# Test authentication
node test-auth.js
```

---

**Remember:** The first client is the hardest. After that, you have proof, testimonials, and a proven process. Keep going!

**You've got this! 🚀**

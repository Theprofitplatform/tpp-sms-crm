# Getting Started with SMS CRM Platform

## Quick Start Guide

### Step 1: Login

1. Visit: https://sms.theprofitplatform.com.au/
2. Enter email: `admin@example.com`
3. Click "Send Magic Link"
4. Get the token from VPS logs:
   ```bash
   ssh tpp-vps 'journalctl -u sms-crm-api -n 20 | grep "Magic link"'
   ```
5. Copy the token value
6. Visit: `https://sms.theprofitplatform.com.au/api/auth/verify/{TOKEN}`

### Step 2: Import Test Contacts

1. Create a CSV file with AU mobile numbers:
   ```csv
   firstName,lastName,phone,email
   John,Doe,+61412345678,john@example.com
   Jane,Smith,+61423456789,jane@example.com
   ```

2. Go to: https://sms.theprofitplatform.com.au/imports
3. Upload the CSV file
4. Wait for processing (check Worker logs to see progress)

### Step 3: Create a Test Campaign

1. Go to: https://sms.theprofitplatform.com.au/campaigns
2. Click "Create Campaign"
3. Fill in:
   - **Name**: "Test Campaign"
   - **Message**: "Hi {firstName}, this is a test message from SMS CRM. Reply STOP to opt out."
   - **Schedule**: Immediate or scheduled
4. Click "Create & Send"

### Step 4: Monitor Sending

Watch the worker process SMS jobs:
```bash
ssh tpp-vps 'journalctl -u sms-crm-worker -f'
```

You'll see:
- Job processing
- Twilio API calls
- Message delivery status
- Any errors

### Step 5: Test Opt-Out Flow

1. Reply to your test message with "STOP"
2. Check webhook logs:
   ```bash
   ssh tpp-vps 'journalctl -u sms-crm-api -f | grep webhook'
   ```
3. Verify contact is marked as opted out in database

---

## Testing Checklist

- [ ] Login via magic link works
- [ ] CSV import completes successfully
- [ ] Contacts appear in database
- [ ] Campaign creation works
- [ ] SMS messages send via Twilio
- [ ] Short links are generated
- [ ] Incoming SMS webhook processes replies
- [ ] STOP/START keywords work correctly
- [ ] Quiet hours are enforced (9PM-9AM)

---

## Common Tasks

### View All Contacts
```bash
ssh tpp-vps "export PGPASSWORD=postgres && psql -h localhost -p 5433 -U postgres -d smscrm -c 'SELECT id, \"firstName\", \"lastName\", phone FROM contacts LIMIT 10;'"
```

### View Campaigns
```bash
ssh tpp-vps "export PGPASSWORD=postgres && psql -h localhost -p 5433 -U postgres -d smscrm -c 'SELECT id, name, status, \"scheduledAt\" FROM campaigns ORDER BY \"createdAt\" DESC LIMIT 5;'"
```

### View Recent Messages
```bash
ssh tpp-vps "export PGPASSWORD=postgres && psql -h localhost -p 5433 -U postgres -d smscrm -c 'SELECT id, to_phone, status, \"sentAt\" FROM messages ORDER BY \"createdAt\" DESC LIMIT 10;'"
```

### Check Opt-Out Lines
```bash
ssh tpp-vps "export PGPASSWORD=postgres && psql -h localhost -p 5433 -U postgres -d smscrm -c 'SELECT \"phoneNumber\", \"optedOutAt\" FROM \"optOutLines\" WHERE \"optedOutAt\" IS NOT NULL;'"
```

---

## API Testing with curl

### Get Magic Link
```bash
curl -X POST https://sms.theprofitplatform.com.au/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com"}'
```

### Test with Session Cookie
```bash
# First, verify your token to get session cookie
curl -c cookies.txt https://sms.theprofitplatform.com.au/api/auth/verify/{TOKEN}

# Then use the cookie for authenticated requests
curl -b cookies.txt https://sms.theprofitplatform.com.au/api/campaigns
```

---

## Troubleshooting

### Messages Not Sending?

1. **Check Twilio credentials:**
   ```bash
   ssh tpp-vps 'grep TWILIO /home/avi/projects/sms-crm/.env'
   ```

2. **Check Worker is running:**
   ```bash
   ssh tpp-vps 'sudo systemctl status sms-crm-worker'
   ```

3. **Check Worker logs for errors:**
   ```bash
   ssh tpp-vps 'journalctl -u sms-crm-worker -n 50 | grep -i error'
   ```

4. **Check Redis connection:**
   ```bash
   ssh tpp-vps 'docker ps | grep redis'
   ```

### Webhook Not Receiving SMS?

1. **Verify Twilio webhook is configured** (see main guide)

2. **Check API logs for incoming webhooks:**
   ```bash
   ssh tpp-vps 'journalctl -u sms-crm-api -f | grep webhook'
   ```

3. **Test webhook endpoint:**
   ```bash
   curl -X POST https://sms.theprofitplatform.com.au/webhooks/provider \
     -d "From=%2B61400000000&Body=TEST&To=%2B61468033323"
   ```

### Can't Login?

1. **Generate new magic link via API:**
   ```bash
   curl -X POST https://sms.theprofitplatform.com.au/api/auth/magic-link \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com"}'
   ```

2. **Get token from logs:**
   ```bash
   ssh tpp-vps 'journalctl -u sms-crm-api -n 20 | grep "Magic link"'
   ```

3. **Verify user exists in database:**
   ```bash
   ssh tpp-vps "export PGPASSWORD=postgres && psql -h localhost -p 5433 -U postgres -d smscrm -c 'SELECT id, email, \"isActive\" FROM users;'"
   ```

---

## Production Considerations

### Before Going Live

1. **Update secrets in .env:**
   - Generate new `COOKIE_SECRET`
   - Generate new `SHORT_LINK_SECRET`

2. **Set up email delivery for magic links:**
   - Integrate SendGrid/Mailgun/AWS SES
   - Update auth route to send emails instead of logging

3. **Configure monitoring:**
   - Set up uptime monitoring
   - Configure error alerts
   - Set up log aggregation

4. **Test at scale:**
   - Import larger contact lists
   - Send to test groups first
   - Monitor delivery rates

5. **Review compliance:**
   - Verify quiet hours (9PM-9AM)
   - Test STOP/START flows thoroughly
   - Document opt-out procedures

### Backup Strategy

**Automated daily backup:**
```bash
# Add to crontab on VPS
0 2 * * * /home/avi/projects/sms-crm/scripts/backup.sh
```

**Manual backup:**
```bash
ssh tpp-vps 'docker exec infra-postgres-1 pg_dump -U postgres smscrm > backup-$(date +%Y%m%d).sql'
```

---

## Next Features to Consider

1. **Email delivery for magic links** - Current: logs only
2. **Campaign analytics dashboard** - Track delivery/click rates
3. **A/B testing** - Test different message variants
4. **Contact segmentation** - Filter by tags/properties
5. **Scheduled reports** - Daily/weekly campaign summaries
6. **Multi-user support** - Team member access
7. **Custom short domain** - Brand your links
8. **Two-way conversations** - Reply management

---

## Support Resources

- **Deployment Guide**: `DEPLOYMENT_SUMMARY.md`
- **VPS Operations**: `VPS_DEPLOYMENT.md`
- **Platform README**: `README.md`
- **Twilio Docs**: https://www.twilio.com/docs/messaging
- **Service Logs**: `ssh tpp-vps 'journalctl -u sms-crm-* -f'`

---

**Ready to send your first campaign!** 🚀

#!/usr/bin/env node

/**
 * AUTOMATED REVIEW REQUEST EMAIL GENERATOR
 *
 * Generates personalized review request emails for all your customers.
 * Just provide customer data and get ready-to-send emails.
 *
 * Usage:
 *   node generate-review-emails.js
 *   node generate-review-emails.js --format=text (for plain text emails)
 *   node generate-review-emails.js --format=html (for HTML emails)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION - UPDATE THIS WITH YOUR DETAILS
// ============================================================================

const businessInfo = {
  name: "Instant Auto Traders",
  yourName: "[Your Name]",
  phone: "[Your Phone]",
  reviewLink: "[YOUR GOOGLE REVIEW LINK - Get from Google Business Profile]",
  // Get your review link: Go to business.google.com → Get more reviews → Copy link
};

// ============================================================================
// CUSTOMER DATA - ADD YOUR CUSTOMERS HERE
// ============================================================================

const customers = [
  {
    name: "John Smith",
    car: "Toyota Camry 2015",
    dateSold: "last week",
    email: "john.smith@example.com",
    relationship: "recent" // recent, older, vip, referrer
  },
  {
    name: "Sarah Johnson",
    car: "Honda Civic 2018",
    dateSold: "2 weeks ago",
    email: "sarah.j@example.com",
    relationship: "recent"
  },
  {
    name: "Mike Brown",
    car: "Ford Focus 2016",
    dateSold: "last month",
    email: "mike.brown@example.com",
    relationship: "older"
  },
  // Add more customers here...
];

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const templates = {
  recent: {
    subject: (name) => `Thanks for choosing ${businessInfo.name}!`,
    body: (customer) => `Hi ${customer.name},

Thanks for selling your ${customer.car} to us ${customer.dateSold}! We hope the process was smooth and you were happy with our service.

Would you mind taking 2 minutes to share your experience on Google? Your feedback helps other Sydney car sellers know what to expect when working with us.

👉 Click here to leave a review: ${businessInfo.reviewLink}

We really appreciate your time!

Cheers,
${businessInfo.yourName}
${businessInfo.name}
${businessInfo.phone}`
  },

  older: {
    subject: (name) => `Quick favor - would you mind leaving us a review?`,
    body: (customer) => `Hi ${customer.name},

Hope you're well! We helped you sell your ${customer.car} a while back, and I wanted to reach out.

We're working on building our online presence to help more Sydney car sellers find us. If you had a positive experience working with us, would you mind sharing a quick Google review?

👉 Click here: ${businessInfo.reviewLink}

Takes just 2 minutes, and we'd be incredibly grateful. Your feedback helps other car owners know what to expect.

Thanks so much!

${businessInfo.yourName}
${businessInfo.name}
${businessInfo.phone}`
  },

  vip: {
    subject: (name) => `We'd love your feedback, ${name}`,
    body: (customer) => `Hi ${customer.name},

Thank you again for choosing ${businessInfo.name} for your ${customer.car}. We really enjoyed working with you and hope the experience was seamless.

As one of our valued customers, your opinion matters to us. Would you mind sharing your experience in a Google review? Your feedback helps us improve and helps other car sellers in Sydney make informed decisions.

👉 Leave a review: ${businessInfo.reviewLink}

As a small thank you, next time you or anyone you refer needs to sell a car, mention this email for an extra $50 bonus.

Thanks for your time!

Best,
${businessInfo.yourName}
${businessInfo.name}`
  },

  referrer: {
    subject: (name) => `Thanks for the referral! Mind leaving a review?`,
    body: (customer) => `Hi ${customer.name},

Thanks so much for referring [Referral Name] to us! We really appreciate your trust and confidence.

Since you've had such a positive experience that you'd recommend us to friends, would you mind leaving a Google review? It helps other Sydney car sellers discover us.

👉 Review link: ${businessInfo.reviewLink}

Thanks again for the referral and your support!

Cheers,
${businessInfo.yourName}
${businessInfo.name}`
  }
};

// ============================================================================
// EMAIL GENERATOR
// ============================================================================

function generateEmail(customer, format = 'text') {
  const template = templates[customer.relationship] || templates.recent;

  const email = {
    to: customer.email,
    subject: template.subject(customer.name),
    body: template.body(customer)
  };

  if (format === 'html') {
    email.bodyHtml = email.body.replace(/\n/g, '<br>');
  }

  return email;
}

function generateAllEmails(format = 'text') {
  console.log('\n📧 REVIEW REQUEST EMAIL GENERATOR');
  console.log('='.repeat(70));
  console.log(`\nGenerating ${customers.length} personalized emails...\n`);

  const emails = customers.map(customer => generateEmail(customer, format));

  // Output to console
  emails.forEach((email, index) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`EMAIL ${index + 1} of ${emails.length}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\nTo: ${email.to}`);
    console.log(`Subject: ${email.subject}`);
    console.log(`\n${'-'.repeat(70)}`);
    console.log(`\n${email.body}`);
    console.log(`\n${'-'.repeat(70)}`);
  });

  // Save to file
  const outputDir = path.join(__dirname, 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const outputFile = path.join(outputDir, `review-emails-${timestamp}.txt`);

  const fileContent = emails.map((email, index) => `
${'='.repeat(70)}
EMAIL ${index + 1} of ${emails.length}
${'='.repeat(70)}

To: ${email.to}
Subject: ${email.subject}

${'-'.repeat(70)}

${email.body}

${'-'.repeat(70)}
`).join('\n\n');

  fs.writeFileSync(outputFile, fileContent);

  console.log(`\n\n✅ COMPLETE!`);
  console.log(`\n📊 SUMMARY:`);
  console.log(`   → Generated: ${emails.length} emails`);
  console.log(`   → Saved to: ${outputFile}`);
  console.log(`   → Format: ${format}`);

  console.log(`\n📧 NEXT STEPS:`);
  console.log(`   1. Review the generated emails above`);
  console.log(`   2. Copy-paste into your email client`);
  console.log(`   3. Send to customers`);
  console.log(`   4. Track responses in REVIEW-REQUEST-TEMPLATES.md`);

  console.log(`\n💡 PRO TIPS:`);
  console.log(`   → Send 2-3 emails per day (don't blast all at once)`);
  console.log(`   → Follow up once after 1 week if no response`);
  console.log(`   → Respond to all reviews within 24 hours`);
  console.log(`   → Target: 5 reviews within 2 weeks`);

  return emails;
}

// ============================================================================
// SMS GENERATOR (BONUS)
// ============================================================================

function generateSMS(customer) {
  const smsTemplates = {
    recent: `Hi ${customer.name}! ${businessInfo.yourName} from ${businessInfo.name} here. Thanks again for the smooth transaction on your ${customer.car}! Would you mind leaving us a quick Google review? ${businessInfo.reviewLink} Takes 2 mins. Cheers!`,

    older: `Hi ${customer.name}, following up on my email about a Google review for your ${customer.car} sale. If you have 2 mins: ${businessInfo.reviewLink}. Appreciate it! - ${businessInfo.yourName}, ${businessInfo.name}`
  };

  return {
    to: customer.phone || '[Phone number needed]',
    message: smsTemplates[customer.relationship] || smsTemplates.recent
  };
}

function generateAllSMS() {
  console.log('\n📱 SMS GENERATOR');
  console.log('='.repeat(70));

  const smsMessages = customers.map(customer => generateSMS(customer));

  smsMessages.forEach((sms, index) => {
    console.log(`\n${'-'.repeat(70)}`);
    console.log(`SMS ${index + 1} of ${smsMessages.length}`);
    console.log(`${'-'.repeat(70)}`);
    console.log(`To: ${sms.to}`);
    console.log(`Message (${sms.message.length} chars):`);
    console.log(`\n${sms.message}`);
  });

  console.log(`\n\n✅ Generated ${smsMessages.length} SMS messages`);
  console.log(`\n⚠️  Note: SMS messages should be under 160 characters`);
  console.log(`   Some messages above may need shortening.`);

  return smsMessages;
}

// ============================================================================
// CUSTOMER DATA VALIDATOR
// ============================================================================

function validateCustomerData() {
  console.log('\n🔍 VALIDATING CUSTOMER DATA...\n');

  let valid = true;

  // Check business info
  if (businessInfo.reviewLink.includes('[YOUR GOOGLE REVIEW LINK]')) {
    console.log('❌ ERROR: You need to add your Google Review Link');
    console.log('   → Go to: business.google.com');
    console.log('   → Click: Get more reviews');
    console.log('   → Copy the link and update businessInfo.reviewLink');
    valid = false;
  }

  if (businessInfo.yourName.includes('[Your Name]')) {
    console.log('⚠️  WARNING: Update businessInfo.yourName with your actual name');
  }

  // Check customer data
  if (customers.length === 0) {
    console.log('❌ ERROR: No customers added');
    console.log('   → Add customer data to the customers array');
    valid = false;
  }

  // Check for example data
  const exampleEmails = customers.filter(c => c.email.includes('example.com'));
  if (exampleEmails.length > 0) {
    console.log(`⚠️  WARNING: ${exampleEmails.length} customers have example.com emails`);
    console.log('   → Replace with real email addresses');
  }

  if (valid) {
    console.log('✅ Customer data looks good!\n');
  }

  return valid;
}

// ============================================================================
// MAIN
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'text';
  const smsMode = args.includes('--sms');

  console.log('\n🚀 Review Request Generator Starting...\n');

  // Validate data first
  const isValid = validateCustomerData();

  if (!isValid) {
    console.log('\n❌ Please fix the errors above and run again.\n');
    process.exit(1);
  }

  // Generate emails or SMS
  if (smsMode) {
    generateAllSMS();
  } else {
    generateAllEmails(format);
  }

  console.log('\n✅ Done!\n');
}

export { generateEmail, generateAllEmails, generateSMS, generateAllSMS };

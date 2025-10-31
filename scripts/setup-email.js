#!/usr/bin/env node

/**
 * Setup Email Configuration
 * 
 * Interactive script to configure email service
 * 
 * Usage:
 *   node scripts/setup-email.js
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmail() {
  console.log('\n==============================================');
  console.log('  Email Service Setup');
  console.log('==============================================\n');

  console.log('Choose your email provider:\n');
  console.log('1. Gmail (for development/testing)');
  console.log('2. SendGrid (recommended for production)');
  console.log('3. AWS SES');
  console.log('4. Custom SMTP\n');

  const choice = await question('Enter choice (1-4): ');

  let config = {
    EMAIL_NOTIFICATIONS_ENABLED: 'true',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    FROM_EMAIL: '',
    FROM_NAME: 'SEO Automation Platform',
    REPLY_TO_EMAIL: '',
    COMPANY_NAME: 'SEO Automation Platform'
  };

  switch (choice.trim()) {
    case '1': // Gmail
      console.log('\n📧 Gmail Setup\n');
      console.log('1. Go to: https://myaccount.google.com/apppasswords');
      console.log('2. Create an App Password');
      console.log('3. Copy the 16-character password\n');

      config.SMTP_HOST = 'smtp.gmail.com';
      config.SMTP_PORT = '587';
      config.SMTP_USER = await question('Gmail address: ');
      config.SMTP_PASS = await question('App password (16 chars): ');
      config.FROM_EMAIL = config.SMTP_USER;
      config.REPLY_TO_EMAIL = config.SMTP_USER;
      break;

    case '2': // SendGrid
      console.log('\n📧 SendGrid Setup\n');
      console.log('1. Sign up at: https://signup.sendgrid.com/');
      console.log('2. Create an API key in Settings → API Keys');
      console.log('3. Verify a sender email in Settings → Sender Authentication\n');

      config.SMTP_HOST = 'smtp.sendgrid.net';
      config.SMTP_PORT = '587';
      config.SMTP_USER = 'apikey';
      config.SMTP_PASS = await question('SendGrid API Key: ');
      config.FROM_EMAIL = await question('Verified sender email: ');
      config.REPLY_TO_EMAIL = config.FROM_EMAIL;
      break;

    case '3': // AWS SES
      console.log('\n📧 AWS SES Setup\n');
      console.log('1. Get SMTP credentials from AWS SES console');
      console.log('2. Verify your sender email or domain\n');

      const region = await question('AWS region (e.g., us-east-1): ');
      config.SMTP_HOST = `email-smtp.${region}.amazonaws.com`;
      config.SMTP_PORT = '587';
      config.SMTP_USER = await question('SMTP username: ');
      config.SMTP_PASS = await question('SMTP password: ');
      config.FROM_EMAIL = await question('Verified sender email: ');
      config.REPLY_TO_EMAIL = config.FROM_EMAIL;
      break;

    case '4': // Custom SMTP
      console.log('\n📧 Custom SMTP Setup\n');
      config.SMTP_HOST = await question('SMTP host: ');
      config.SMTP_PORT = await question('SMTP port (default 587): ') || '587';
      config.SMTP_SECURE = (await question('Use SSL/TLS? (yes/no): ')).toLowerCase() === 'yes' ? 'true' : 'false';
      config.SMTP_USER = await question('SMTP username: ');
      config.SMTP_PASS = await question('SMTP password: ');
      config.FROM_EMAIL = await question('From email: ');
      config.REPLY_TO_EMAIL = await question('Reply-to email (press Enter to use from email): ') || config.FROM_EMAIL;
      break;

    default:
      console.log('❌ Invalid choice');
      rl.close();
      process.exit(1);
  }

  // Additional settings
  console.log('\n📝 Additional Settings\n');
  config.FROM_NAME = await question('From name (default: SEO Automation Platform): ') || config.FROM_NAME;
  config.COMPANY_NAME = await question('Company name: ') || config.COMPANY_NAME;

  // Update .env file
  console.log('\n💾 Updating .env file...');
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Update each config value
  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent);

  console.log('✅ Email configuration saved!\n');

  // Test email?
  const sendTest = await question('Send test email? (yes/no): ');
  if (sendTest.toLowerCase() === 'yes' || sendTest.toLowerCase() === 'y') {
    const testEmail = await question('Enter recipient email: ');
    
    console.log('\n🧪 Testing email service...');
    console.log('Run: node scripts/test-email-service.js --to ' + testEmail);
  }

  console.log('\n✅ Email setup complete!');
  console.log('\n📚 Next steps:');
  console.log('1. Test email: node scripts/test-email-service.js --to your@email.com');
  console.log('2. Start dashboard: node dashboard-server.js');
  console.log('3. Email notifications will be sent automatically\n');

  rl.close();
}

setupEmail();

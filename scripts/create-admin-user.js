#!/usr/bin/env node

/**
 * Create Admin User Script
 * 
 * Creates the initial admin user for the SEO Automation Platform
 * 
 * Usage:
 *   node scripts/create-admin-user.js
 *   node scripts/create-admin-user.js --email admin@example.com --password SecurePass123!
 */

import bcrypt from 'bcryptjs';
import db from '../src/database/index.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdminUser() {
  console.log('\n==============================================');
  console.log('  SEO Automation Platform - Create Admin User');
  console.log('==============================================\n');

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let email = null;
    let password = null;
    let firstName = 'Admin';
    let lastName = 'User';

    for (let i = 0; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];
      
      if (flag === '--email') email = value;
      else if (flag === '--password') password = value;
      else if (flag === '--first-name') firstName = value;
      else if (flag === '--last-name') lastName = value;
    }

    // Prompt for missing values
    if (!email) {
      email = await question('Admin Email: ');
    }

    if (!password) {
      password = await question('Admin Password (min 8 characters): ');
    }

    // Validate inputs
    if (!email || !email.includes('@')) {
      console.error('❌ Error: Valid email is required');
      rl.close();
      process.exit(1);
    }

    if (!password || password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters');
      rl.close();
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = db.authOps.getUserByEmail(email);
    if (existingUser) {
      console.log(`\n⚠️  User with email ${email} already exists!`);
      const overwrite = await question('Do you want to update the password? (yes/no): ');
      
      if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        console.log('❌ Cancelled');
        rl.close();
        process.exit(0);
      }

      // Update password
      const hashedPassword = await bcrypt.hash(password, 10);
      db.authOps.updatePassword(existingUser.id, hashedPassword);
      
      console.log('\n✅ Admin user password updated successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   User ID: ${existingUser.id}`);
      
      rl.close();
      process.exit(0);
    }

    // Create a default "admin" client if it doesn't exist
    let adminClient = db.clientOps.getById('admin');
    if (!adminClient) {
      console.log('\n📦 Creating admin client...');
      db.clientOps.upsert({
        id: 'admin',
        name: 'Platform Administration',
        domain: 'localhost',
        status: 'active'
      });
      adminClient = db.clientOps.getById('admin');
      console.log('✅ Admin client created');
    }

    // Hash password
    console.log('\n🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    const userId = db.authOps.createUser({
      clientId: 'admin',
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin'
    });

    // Log activity
    db.authOps.logActivity(userId, 'user_created', {
      email,
      role: 'admin',
      createdBy: 'setup-script'
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('==============================================');
    console.log('  Login Credentials');
    console.log('==============================================');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     admin`);
    console.log(`User ID:  ${userId}`);
    console.log('==============================================\n');
    console.log('⚠️  IMPORTANT: Store these credentials securely!');
    console.log('⚠️  Change the password after first login.\n');

    console.log('Next steps:');
    console.log('1. Start the dashboard: node dashboard-server.js');
    console.log('2. Open: http://localhost:9000');
    console.log('3. Login with the credentials above');
    console.log('4. Go to Settings → Change Password\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdminUser();

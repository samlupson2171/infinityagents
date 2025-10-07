#!/usr/bin/env node

/**
 * Microsoft 365 Email Setup Script
 * This script helps configure Microsoft 365 email settings for the Infinity Weekends platform
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupMicrosoft365Email() {
  console.log('\n🚀 Microsoft 365 Email Setup for Infinity Weekends\n');
  console.log('This script will help you configure Microsoft 365 email settings.\n');

  try {
    // Get user input
    const email = await question('Enter your Microsoft 365 email address: ');
    const rawAppPassword = await question('Enter your Microsoft 365 App Password: ');
    const fromName = await question('Enter the "From" name (default: Infinity Weekends): ') || 'Infinity Weekends';

    // Clean and validate inputs
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    // Clean the app password by removing spaces, hyphens, and other common characters
    const appPassword = rawAppPassword.replace(/[\s\-]/g, '');
    
    if (!appPassword || appPassword.length < 12) {
      throw new Error('App password appears to be too short. Please ensure you copied the complete password.');
    }

    console.log(`\n📝 Cleaned password length: ${appPassword.length} characters`);

    // Create environment configuration
    const envConfig = `
# Microsoft 365 Email Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=${email}
SMTP_PASS=${appPassword}
SMTP_SECURE=false

# Email Display Settings
EMAIL_FROM_NAME=${fromName}
EMAIL_FROM_ADDRESS=${email}
`;

    // Determine which env file to update
    const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
    const envPath = path.join(process.cwd(), envFile);

    // Read existing env file if it exists
    let existingEnv = '';
    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing email configuration
    const cleanedEnv = existingEnv
      .split('\n')
      .filter(line => !line.startsWith('SMTP_') && !line.startsWith('EMAIL_FROM_'))
      .join('\n');

    // Write updated configuration
    const finalConfig = cleanedEnv + envConfig;
    fs.writeFileSync(envPath, finalConfig);

    console.log('\n✅ Microsoft 365 email configuration saved successfully!');
    console.log(`📁 Configuration saved to: ${envFile}`);
    console.log('\n📋 Configuration Summary:');
    console.log(`   Email: ${email}`);
    console.log(`   SMTP Host: smtp.office365.com`);
    console.log(`   SMTP Port: 587`);
    console.log(`   From Name: ${fromName}`);
    console.log(`   Password Length: ${appPassword.length} characters`);

    console.log('\n🔧 Next Steps:');
    console.log('1. Restart your application to load the new configuration');
    console.log('2. Go to Admin → Settings → Email Settings to test the configuration');
    console.log('3. Click "Test Email" to verify everything is working');

    console.log('\n📚 Need help setting up App Passwords?');
    console.log('   Visit: https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a7944');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📖 Setup Guide: docs/microsoft-365-email-setup-guide.md');
  } finally {
    rl.close();
  }
}

// Run the setup
setupMicrosoft365Email();
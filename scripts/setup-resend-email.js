#!/usr/bin/env node

/**
 * Resend Email Setup Script
 * This script helps configure Resend email settings for the Infinity Weekends platform
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

async function setupResendEmail() {
  console.log('\n🚀 Resend Email Setup for Infinity Weekends\n');
  console.log('This script will help you configure Resend email settings.\n');

  try {
    // Get user input
    const apiKey = await question('Enter your Resend API Key (starts with re_): ');
    const fromEmail = await question('Enter your "From" email address: ');
    const fromName = await question('Enter the "From" name (default: Infinity Weekends): ') || 'Infinity Weekends';

    // Validate inputs
    if (!apiKey || !apiKey.startsWith('re_')) {
      throw new Error('Please enter a valid Resend API key (should start with "re_")');
    }

    if (!fromEmail || !fromEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }

    // Create environment configuration
    const envConfig = `
# Resend Email Configuration
RESEND_API_KEY=${apiKey}
RESEND_FROM_EMAIL=${fromEmail}
`;

    // Determine which env file to update
    const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
    const envPath = path.join(process.cwd(), envFile);

    // Read existing env file if it exists
    let existingEnv = '';
    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing email configuration (both SMTP and Resend)
    const cleanedEnv = existingEnv
      .split('\n')
      .filter(line => 
        !line.startsWith('SMTP_') && 
        !line.startsWith('RESEND_') && 
        !line.startsWith('EMAIL_FROM_')
      )
      .join('\n');

    // Write updated configuration
    const finalConfig = cleanedEnv + envConfig;
    fs.writeFileSync(envPath, finalConfig);

    console.log('\n✅ Resend email configuration saved successfully!');
    console.log(`📁 Configuration saved to: ${envFile}`);
    console.log('\n📋 Configuration Summary:');
    console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`   From Email: ${fromEmail}`);
    console.log(`   From Name: ${fromName}`);

    console.log('\n🔧 Next Steps:');
    console.log('1. Restart your application to load the new configuration');
    console.log('2. Go to Admin → Settings → Email Settings to test the configuration');
    console.log('3. Click "Test Email with Resend" to verify everything is working');

    console.log('\n📚 Need help?');
    console.log('   Setup Guide: docs/resend-email-setup-guide.md');
    console.log('   Resend Docs: https://resend.com/docs');

    console.log('\n💡 Pro Tips:');
    console.log('   • Use your own domain for professional emails');
    console.log('   • Free tier includes 3,000 emails/month');
    console.log('   • Check the Resend dashboard for email analytics');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📖 Setup Guide: docs/resend-email-setup-guide.md');
  } finally {
    rl.close();
  }
}

// Run the setup
setupResendEmail();
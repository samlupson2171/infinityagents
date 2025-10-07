#!/usr/bin/env node

/**
 * Resend Email Diagnostic Script
 * 
 * This script helps diagnose common Resend email delivery issues
 */

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

async function diagnoseResendSetup() {
  console.log('🔍 Diagnosing Resend Email Setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || '❌ Missing'}`);
  console.log(`RESEND_FROM_NAME: ${process.env.RESEND_FROM_NAME || '❌ Missing'}`);
  console.log(`RESEND_TO_EMAIL: ${process.env.RESEND_TO_EMAIL || '❌ Missing'}\n`);

  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY is missing. Please set it in your .env.local file.');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Test 1: Verify API key
    console.log('🔑 Testing API Key...');
    const domains = await resend.domains.list();
    console.log('✅ API Key is valid\n');

    // Test 2: List domains
    console.log('🌐 Verified Domains:');
    if (domains.data && domains.data.length > 0) {
      domains.data.forEach(domain => {
        console.log(`  - ${domain.name} (Status: ${domain.status})`);
      });
    } else {
      console.log('  No verified domains found');
      console.log('  💡 You can use onboarding@resend.dev for testing');
    }
    console.log('');

    // Test 3: Check if current from email domain is verified
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (fromEmail) {
      const fromDomain = fromEmail.split('@')[1];
      const isVerified = domains.data?.some(d => d.name === fromDomain && d.status === 'verified');
      
      console.log(`📧 From Email Domain Check:`);
      console.log(`  Domain: ${fromDomain}`);
      console.log(`  Status: ${isVerified ? '✅ Verified' : '❌ Not verified'}`);
      
      if (!isVerified && fromDomain !== 'resend.dev') {
        console.log(`  💡 To use ${fromEmail}, you need to verify ${fromDomain} in your Resend dashboard`);
      }
      console.log('');
    }

    // Test 4: Send a test email
    console.log('📤 Sending Test Email...');
    const testEmail = {
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [process.env.RESEND_TO_EMAIL || 'test@example.com'],
      subject: 'Resend Diagnostic Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #007bff;">🎉 Resend Email Test Successful!</h2>
          <p>If you're reading this, your Resend configuration is working correctly.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <ul>
              <li><strong>From:</strong> ${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}</li>
              <li><strong>From Name:</strong> ${process.env.RESEND_FROM_NAME || 'Test'}</li>
              <li><strong>API Key:</strong> ${process.env.RESEND_API_KEY?.substring(0, 10)}...</li>
            </ul>
          </div>
          <p>Test performed at: ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    const result = await resend.emails.send(testEmail);
    
    if (result.data) {
      console.log('✅ Test email sent successfully!');
      console.log(`   Email ID: ${result.data.id}`);
      console.log(`   To: ${testEmail.to[0]}`);
      console.log(`   From: ${testEmail.from}`);
      console.log('\n📬 Check your inbox (including spam folder) for the test email.');
    } else {
      console.log('❌ Failed to send test email');
      console.log('Response:', result);
    }

  } catch (error) {
    console.log('❌ Error occurred:');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify your RESEND_API_KEY is correct');
      console.log('   - Make sure the API key has the necessary permissions');
    }
    
    if (error.message.includes('domain')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify your sending domain in the Resend dashboard');
      console.log('   - Use onboarding@resend.dev for testing');
    }
  }

  console.log('\n🔗 Useful Links:');
  console.log('   - Resend Dashboard: https://resend.com/dashboard');
  console.log('   - Domain Verification: https://resend.com/domains');
  console.log('   - API Keys: https://resend.com/api-keys');
}

// Run the diagnostic
diagnoseResendSetup().catch(console.error);
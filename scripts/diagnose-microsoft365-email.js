#!/usr/bin/env node

/**
 * Microsoft 365 Email Diagnostic Script
 * This script helps diagnose common Microsoft 365 email authentication issues
 */

const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testMicrosoft365Connection() {
  console.log('\n🔍 Microsoft 365 Email Diagnostic Tool\n');
  
  try {
    // Get credentials
    const email = await question('Enter your Microsoft 365 email: ');
    const appPassword = await question('Enter your App Password: ');
    
    console.log('\n📋 Testing different configurations...\n');
    
    // Configuration 1: Standard Microsoft 365 settings
    console.log('1️⃣ Testing standard Microsoft 365 configuration...');
    await testConfiguration({
      name: 'Standard Microsoft 365',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: email, pass: appPassword },
      tls: { rejectUnauthorized: false }
    });
    
    // Configuration 2: Alternative settings
    console.log('\n2️⃣ Testing alternative configuration...');
    await testConfiguration({
      name: 'Alternative Microsoft 365',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: appPassword },
      tls: { 
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });
    
    // Configuration 3: Legacy settings
    console.log('\n3️⃣ Testing legacy configuration...');
    await testConfiguration({
      name: 'Legacy Microsoft 365',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: email, pass: appPassword },
      tls: { rejectUnauthorized: false }
    });
    
    console.log('\n✅ Diagnostic complete!');
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
  } finally {
    rl.close();
  }
}

async function testConfiguration(config) {
  try {
    console.log(`   Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    
    const transporter = nodemailer.createTransporter({
      ...config,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
    
    // Test connection
    await transporter.verify();
    console.log(`   ✅ ${config.name}: Connection successful!`);
    
    // Test sending email
    const testEmail = {
      from: config.auth.user,
      to: config.auth.user,
      subject: 'Test Email - Microsoft 365 Diagnostic',
      text: `This is a test email sent using ${config.name} configuration at ${new Date().toISOString()}`
    };
    
    await transporter.sendMail(testEmail);
    console.log(`   ✅ ${config.name}: Email sent successfully!`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ ${config.name}: Failed`);
    console.log(`   Error: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.log('   💡 Suggestion: Check your app password and ensure MFA is enabled');
    } else if (error.code === 'ECONNECTION') {
      console.log('   💡 Suggestion: Check your internet connection and firewall settings');
    } else if (error.message.includes('authentication')) {
      console.log('   💡 Suggestion: Try generating a new app password');
    }
    
    return false;
  }
}

// Additional diagnostic functions
async function checkAppPasswordFormat(password) {
  const cleaned = password.replace(/[\s\-]/g, '');
  console.log(`\n🔍 App Password Analysis:`);
  console.log(`   Original length: ${password.length}`);
  console.log(`   Cleaned length: ${cleaned.length}`);
  console.log(`   Contains spaces/hyphens: ${password !== cleaned ? 'Yes' : 'No'}`);
  
  if (cleaned.length < 12) {
    console.log('   ⚠️  Warning: Password seems too short for Microsoft 365');
  } else if (cleaned.length > 20) {
    console.log('   ⚠️  Warning: Password seems too long for Microsoft 365');
  } else {
    console.log('   ✅ Password length looks correct');
  }
  
  return cleaned;
}

// Run the diagnostic
console.log('🚀 Starting Microsoft 365 Email Diagnostic...');
console.log('This tool will test different configurations to help identify the issue.\n');

testMicrosoft365Connection();
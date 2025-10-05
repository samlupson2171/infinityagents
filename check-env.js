#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Environment Variables Checker');
console.log('=================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const requiredVars = [
  'MONGODB_URI',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS'
];

const optionalVars = [
  'BLOB_READ_WRITE_TOKEN'
];

let allGood = true;

console.log('Required Environment Variables:');
console.log('-------------------------------');

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value && value !== 'your-' + varName.toLowerCase().replace('_', '-') + '-here' && !value.includes('your-')) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing or using placeholder value`);
    allGood = false;
  }
});

console.log('\nOptional Environment Variables:');
console.log('-------------------------------');

optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('your-')) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional for basic functionality)`);
  }
});

console.log('\nEnvironment Variable Validation:');
console.log('--------------------------------');

// Validate MongoDB URI
if (process.env.MONGODB_URI) {
  if (process.env.MONGODB_URI.startsWith('mongodb://') || process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    console.log('✅ MONGODB_URI: Valid format');
  } else {
    console.log('❌ MONGODB_URI: Invalid format (should start with mongodb:// or mongodb+srv://)');
    allGood = false;
  }
}

// Validate NextAuth URL
if (process.env.NEXTAUTH_URL) {
  if (process.env.NEXTAUTH_URL.startsWith('http://') || process.env.NEXTAUTH_URL.startsWith('https://')) {
    console.log('✅ NEXTAUTH_URL: Valid format');
  } else {
    console.log('❌ NEXTAUTH_URL: Invalid format (should start with http:// or https://)');
    allGood = false;
  }
}

// Validate NextAuth Secret
if (process.env.NEXTAUTH_SECRET) {
  if (process.env.NEXTAUTH_SECRET.length >= 32) {
    console.log('✅ NEXTAUTH_SECRET: Adequate length');
  } else {
    console.log('❌ NEXTAUTH_SECRET: Too short (should be at least 32 characters)');
    allGood = false;
  }
}

// Validate SMTP Port
if (process.env.SMTP_PORT) {
  const port = parseInt(process.env.SMTP_PORT);
  if (port > 0 && port <= 65535) {
    console.log('✅ SMTP_PORT: Valid port number');
  } else {
    console.log('❌ SMTP_PORT: Invalid port number');
    allGood = false;
  }
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('🎉 All required environment variables are properly configured!');
  console.log('You can now run "npm run dev" to start the development server.');
} else {
  console.log('❌ Some environment variables need attention.');
  console.log('Please update your .env.local file with the correct values.');
  console.log('See LAUNCH_GUIDE.md for detailed instructions.');
}

console.log('\n📖 For help setting up these variables, check LAUNCH_GUIDE.md');
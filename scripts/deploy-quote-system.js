#!/usr/bin/env node

/**
 * Quote System Production Deployment Script
 * 
 * This script helps deploy and configure the quote system for production.
 * It handles database migrations, configuration validation, and deployment verification.
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Import models (will be loaded after database connection)
let Quote, Enquiry, User;

// Configuration
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/infinityweekends',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  email: {
    from: process.env.QUOTE_EMAIL_FROM || 'quotes@infinityweekends.com',
    fromName: process.env.QUOTE_EMAIL_FROM_NAME || 'Infinity Weekends Quotes',
    replyTo: process.env.QUOTE_EMAIL_REPLY_TO || 'support@infinityweekends.com',
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  }
};

class QuoteSystemDeployer {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  async deploy() {
    console.log('🚀 Starting Quote System Deployment...\n');

    try {
      await this.validateEnvironment();
      await this.connectDatabase();
      await this.runMigrations();
      await this.createIndexes();
      await this.validateConfiguration();
      await this.runSmokeTests();
      
      this.printResults();
      
      if (this.errors.length === 0) {
        console.log('✅ Quote System deployment completed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Quote System deployment failed. Please fix the errors above.');
        process.exit(1);
      }
    } catch (error) {
      console.error('💥 Deployment failed with error:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment configuration...');

    const requiredEnvVars = [
      'MONGODB_URI',
      'NEXTAUTH_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.errors.push(`Missing required environment variables: ${missingVars.join(', ')}`);
    } else {
      this.success.push('Environment variables validated');
    }

    // Check optional but recommended variables
    const recommendedVars = [
      'QUOTE_EMAIL_FROM',
      'QUOTE_EMAIL_FROM_NAME',
      'QUOTE_EMAIL_REPLY_TO'
    ];

    const missingRecommended = recommendedVars.filter(varName => !process.env[varName]);
    if (missingRecommended.length > 0) {
      this.warnings.push(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    }
  }

  async connectDatabase() {
    console.log('🔌 Connecting to database...');

    try {
      await mongoose.connect(config.mongodb.uri, config.mongodb.options);
      
      // Load models after database connection
      Quote = require('../src/models/Quote');
      Enquiry = require('../src/models/Enquiry');
      User = require('../src/models/User');
      
      this.success.push('Database connection established');
    } catch (error) {
      this.errors.push(`Database connection failed: ${error.message}`);
      throw error;
    }
  }

  async runMigrations() {
    console.log('📦 Running database migrations...');

    try {
      // Check if Quote collection exists
      const collections = await mongoose.connection.db.listCollections().toArray();
      const quoteCollectionExists = collections.some(col => col.name === 'quotes');

      if (!quoteCollectionExists) {
        // Create a sample quote to initialize the collection
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          const sampleEnquiry = await Enquiry.findOne();
          if (sampleEnquiry) {
            const sampleQuote = new Quote({
              enquiryId: sampleEnquiry._id,
              leadName: 'Migration Test',
              hotelName: 'Test Hotel',
              numberOfPeople: 2,
              numberOfRooms: 1,
              numberOfNights: 7,
              arrivalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              isSuperPackage: false,
              whatsIncluded: 'Migration test quote',
              transferIncluded: false,
              activitiesIncluded: '',
              totalPrice: 1000,
              currency: 'GBP',
              createdBy: adminUser._id,
              status: 'draft'
            });
            
            await sampleQuote.save();
            await sampleQuote.deleteOne(); // Clean up the test quote
            
            this.success.push('Quote collection initialized');
          } else {
            this.warnings.push('No enquiries found to test quote creation');
          }
        } else {
          this.warnings.push('No admin user found to test quote creation');
        }
      } else {
        this.success.push('Quote collection already exists');
      }

      // Update enquiry schema with quote fields
      const enquiryUpdateResult = await Enquiry.updateMany(
        { quotes: { $exists: false } },
        {
          $set: {
            quotes: [],
            hasQuotes: false,
            quotesCount: 0
          }
        }
      );

      if (enquiryUpdateResult.modifiedCount > 0) {
        this.success.push(`Updated ${enquiryUpdateResult.modifiedCount} enquiries with quote fields`);
      } else {
        this.success.push('Enquiry schema already up to date');
      }

    } catch (error) {
      this.errors.push(`Migration failed: ${error.message}`);
    }
  }

  async createIndexes() {
    console.log('📊 Creating database indexes...');

    try {
      // Quote collection indexes
      await Quote.collection.createIndex({ enquiryId: 1, version: -1 });
      await Quote.collection.createIndex({ createdBy: 1, createdAt: -1 });
      await Quote.collection.createIndex({ status: 1, createdAt: -1 });
      await Quote.collection.createIndex({ emailDeliveryStatus: 1 });

      // Enquiry collection additional indexes
      await Enquiry.collection.createIndex({ hasQuotes: 1 });
      await Enquiry.collection.createIndex({ latestQuoteDate: -1 });

      this.success.push('Database indexes created successfully');
    } catch (error) {
      this.errors.push(`Index creation failed: ${error.message}`);
    }
  }

  async validateConfiguration() {
    console.log('⚙️ Validating system configuration...');

    try {
      // Test database operations
      const quoteCount = await Quote.countDocuments();
      const enquiryCount = await Enquiry.countDocuments();
      const userCount = await User.countDocuments();

      this.success.push(`Database validation: ${quoteCount} quotes, ${enquiryCount} enquiries, ${userCount} users`);

      // Check for admin users
      const adminCount = await User.countDocuments({ role: 'admin', isApproved: true });
      if (adminCount === 0) {
        this.errors.push('No approved admin users found');
      } else {
        this.success.push(`Found ${adminCount} approved admin users`);
      }

      // Validate email configuration
      if (!config.email.smtp.host || !config.email.smtp.user || !config.email.smtp.pass) {
        this.errors.push('Incomplete SMTP configuration');
      } else {
        this.success.push('SMTP configuration validated');
      }

    } catch (error) {
      this.errors.push(`Configuration validation failed: ${error.message}`);
    }
  }

  async runSmokeTests() {
    console.log('🧪 Running smoke tests...');

    try {
      // Test quote creation
      const adminUser = await User.findOne({ role: 'admin', isApproved: true });
      const testEnquiry = await Enquiry.findOne();

      if (adminUser && testEnquiry) {
        const testQuote = new Quote({
          enquiryId: testEnquiry._id,
          leadName: 'Smoke Test',
          hotelName: 'Test Hotel',
          numberOfPeople: 2,
          numberOfRooms: 1,
          numberOfNights: 7,
          arrivalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isSuperPackage: false,
          whatsIncluded: 'Smoke test quote',
          transferIncluded: false,
          activitiesIncluded: '',
          totalPrice: 1000,
          currency: 'GBP',
          createdBy: adminUser._id,
          status: 'draft'
        });

        await testQuote.save();
        
        // Test quote retrieval
        const retrievedQuote = await Quote.findById(testQuote._id);
        if (!retrievedQuote) {
          this.errors.push('Quote creation/retrieval test failed');
        } else {
          this.success.push('Quote creation/retrieval test passed');
        }

        // Clean up test quote
        await testQuote.deleteOne();

      } else {
        this.warnings.push('Skipped smoke tests - missing admin user or enquiry data');
      }

    } catch (error) {
      this.errors.push(`Smoke tests failed: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n📋 Deployment Results:\n');

    if (this.success.length > 0) {
      console.log('✅ Successful operations:');
      this.success.forEach(msg => console.log(`   • ${msg}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.warnings.forEach(msg => console.log(`   • ${msg}`));
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log('❌ Errors:');
      this.errors.forEach(msg => console.log(`   • ${msg}`));
      console.log('');
    }
  }

  async cleanup() {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployer = new QuoteSystemDeployer();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Deployment interrupted');
    await deployer.cleanup();
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Deployment terminated');
    await deployer.cleanup();
    process.exit(1);
  });

  deployer.deploy().finally(async () => {
    await deployer.cleanup();
  });
}

module.exports = QuoteSystemDeployer;
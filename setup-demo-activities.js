const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const Activity = require('./src/models/Activity').default;
const ActivityPackage = require('./src/models/ActivityPackage').default;
const User = require('./src/models/User').default;

// CSV parsing utility
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    data.push(row);
  }
  
  return data;
}

// Convert CSV row to Activity data
function convertToActivityData(row, createdBy) {
  return {
    name: row.Activity,
    category: row.Category.toLowerCase(),
    location: row.Location,
    pricePerPerson: parseFloat(row.PricePerPerson),
    minPersons: parseInt(row.MinPersons),
    maxPersons: parseInt(row.MaxPersons),
    availableFrom: new Date(row.AvailableFrom),
    availableTo: new Date(row.AvailableTo),
    duration: row.Duration,
    description: row.Description,
    isActive: true,
    createdBy: createdBy
  };
}

async function setupDemoActivities() {
  try {
    console.log('🚀 Setting up demo activities...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinity-weekends';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Create demo admin user if not exists
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Demo Admin',
        companyName: 'Infinity Weekends Demo',
        abtaPtsNumber: 'ABTA12345',
        contactEmail: 'admin@infinityweekends.com',
        websiteAddress: 'https://infinityweekends.com',
        password: 'demo123456',
        role: 'admin',
        isApproved: true
      });
      console.log('✅ Created demo admin user');
    }

    // Create demo travel agent if not exists
    let agentUser = await User.findOne({ role: 'agent', contactEmail: 'agent@demo.com' });
    if (!agentUser) {
      agentUser = await User.create({
        name: 'Demo Travel Agent',
        companyName: 'Demo Travel Agency',
        abtaPtsNumber: 'ABTA54321',
        contactEmail: 'agent@demo.com',
        websiteAddress: 'https://demo-travel.com',
        password: 'demo123456',
        role: 'agent',
        isApproved: true
      });
      console.log('✅ Created demo travel agent user');
    }

    // Clear existing activities
    await Activity.deleteMany({});
    console.log('🗑️  Cleared existing activities');

    // Load and import sample activities
    const csvPath = path.join(__dirname, 'src/test/sample-data/activities-sample.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);

    const activities = [];
    for (const row of csvData) {
      try {
        const activityData = convertToActivityData(row, adminUser._id);
        const activity = await Activity.create(activityData);
        activities.push(activity);
      } catch (error) {
        console.warn(`⚠️  Skipped activity "${row.Activity}": ${error.message}`);
      }
    }

    console.log(`✅ Created ${activities.length} demo activities`);

    // Create sample packages
    await ActivityPackage.deleteMany({});
    
    // Sample package 1: Benidorm Adventure Package
    const benidormActivities = activities.filter(a => a.location === 'Benidorm').slice(0, 4);
    if (benidormActivities.length > 0) {
      const package1Activities = benidormActivities.map(activity => ({
        activityId: activity._id,
        quantity: 1,
        subtotal: activity.pricePerPerson
      }));

      await ActivityPackage.create({
        name: 'Benidorm Adventure Package',
        activities: package1Activities,
        numberOfPersons: 4,
        totalCost: 0, // Will be calculated by pre-save hook
        createdBy: agentUser._id,
        status: 'draft',
        clientName: 'Smith Family',
        notes: 'Family vacation package with mix of cultural and adventure activities'
      });
      console.log('✅ Created Benidorm Adventure Package');
    }

    // Sample package 2: Albufeira Cultural Experience
    const albufeiraActivities = activities.filter(a => a.location === 'Albufeira').slice(0, 3);
    if (albufeiraActivities.length > 0) {
      const package2Activities = albufeiraActivities.map(activity => ({
        activityId: activity._id,
        quantity: 1,
        subtotal: activity.pricePerPerson
      }));

      await ActivityPackage.create({
        name: 'Albufeira Cultural Experience',
        activities: package2Activities,
        numberOfPersons: 2,
        totalCost: 0, // Will be calculated by pre-save hook
        createdBy: agentUser._id,
        status: 'finalized',
        clientName: 'Johnson Couple',
        notes: 'Romantic getaway focusing on Portuguese culture and cuisine'
      });
      console.log('✅ Created Albufeira Cultural Experience package');
    }

    // Sample package 3: Mixed Destinations Package
    const mixedActivities = [
      activities.find(a => a.name.includes('Flamenco')),
      activities.find(a => a.name.includes('Dolphin')),
      activities.find(a => a.name.includes('Cooking'))
    ].filter(Boolean);

    if (mixedActivities.length > 0) {
      const package3Activities = mixedActivities.map(activity => ({
        activityId: activity._id,
        quantity: 1,
        subtotal: activity.pricePerPerson
      }));

      await ActivityPackage.create({
        name: 'Best of Spain & Portugal',
        activities: package3Activities,
        numberOfPersons: 6,
        totalCost: 0, // Will be calculated by pre-save hook
        createdBy: agentUser._id,
        status: 'draft',
        clientName: 'Corporate Group',
        notes: 'Corporate team building package with diverse activities across both destinations'
      });
      console.log('✅ Created Best of Spain & Portugal package');
    }

    console.log('\n🎉 Demo setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${activities.length} activities created`);
    console.log(`   • 3 sample packages created`);
    console.log(`   • 1 admin user: admin@infinityweekends.com (password: demo123456)`);
    console.log(`   • 1 agent user: agent@demo.com (password: demo123456)`);
    console.log('\n🔗 You can now:');
    console.log('   • Login as admin to manage activities');
    console.log('   • Login as agent to search activities and build packages');
    console.log('   • Test CSV upload with sample files in src/test/sample-data/');

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the setup
if (require.main === module) {
  setupDemoActivities();
}

module.exports = { setupDemoActivities };
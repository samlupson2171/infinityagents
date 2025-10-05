const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function setupUsers() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }
  
  console.log('🔧 Setting up user accounts...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    // Clear existing users (optional - remove this line if you want to keep existing users)
    await users.deleteMany({});
    console.log('🗑️  Cleared existing users');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminUser = {
      name: 'Admin User',
      contactEmail: 'admin@infinityweekends.co.uk',
      password: adminPassword,
      companyName: 'Infinity Weekends',
      websiteAddress: 'https://infinityweekends.co.uk',
      abtaPtsNumber: 'ADMIN001',
      role: 'admin',
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await users.insertOne(adminUser);
    console.log('✅ Admin user created:');
    console.log('   Email: admin@infinityweekends.co.uk');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    
    // Create test travel agent user
    const agentPassword = await bcrypt.hash('agent123', 12);
    const agentUser = {
      name: 'Test Agent',
      contactEmail: 'agent@testtravel.co.uk',
      password: agentPassword,
      companyName: 'Test Travel Agency',
      websiteAddress: 'https://testtravel.co.uk',
      abtaPtsNumber: 'TEST001',
      role: 'agent',
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await users.insertOne(agentUser);
    console.log('✅ Test agent user created:');
    console.log('   Email: agent@testtravel.co.uk');
    console.log('   Password: agent123');
    console.log('   Role: agent');
    
    // Create pending user (for testing approval workflow)
    const pendingPassword = await bcrypt.hash('pending123', 12);
    const pendingUser = {
      name: 'Pending User',
      contactEmail: 'pending@newagency.co.uk',
      password: pendingPassword,
      companyName: 'New Travel Agency',
      websiteAddress: 'https://newagency.co.uk',
      abtaPtsNumber: 'NEW001',
      role: 'agent',
      isApproved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await users.insertOne(pendingUser);
    console.log('✅ Pending user created (for testing approval):');
    console.log('   Email: pending@newagency.co.uk');
    console.log('   Password: pending123');
    console.log('   Role: agent (pending approval)');
    
    console.log('\n🎉 User setup complete!');
    console.log('\n📋 Login Credentials Summary:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ ADMIN LOGIN                                             │');
    console.log('│ Email: admin@infinityweekends.co.uk                     │');
    console.log('│ Password: admin123                                      │');
    console.log('│ Access: Full admin dashboard, user management           │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ AGENT LOGIN                                             │');
    console.log('│ Email: agent@testtravel.co.uk                          │');
    console.log('│ Password: agent123                                      │');
    console.log('│ Access: Offers, enquiries, training materials          │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ PENDING USER (for testing approval workflow)           │');
    console.log('│ Email: pending@newagency.co.uk                         │');
    console.log('│ Password: pending123                                    │');
    console.log('│ Status: Pending approval (cannot login until approved) │');
    console.log('└─────────────────────────────────────────────────────────┘');
    
  } catch (error) {
    console.error('❌ Error setting up users:', error);
  } finally {
    await client.close();
  }
}

setupUsers();
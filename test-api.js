async function testAPI() {
  const fetch = (await import('node-fetch')).default;
  try {
    console.log('🧪 Testing API endpoints...');
    
    // Test offers endpoint (should work without auth for public offers)
    console.log('\n📋 Testing public offers endpoint...');
    const offersResponse = await fetch('http://localhost:3002/api/offers');
    const offersData = await offersResponse.json();
    console.log('Status:', offersResponse.status);
    console.log('Response:', JSON.stringify(offersData, null, 2));
    
    // Test admin offers endpoint (will fail without auth, but we can see the error)
    console.log('\n🔒 Testing admin offers endpoint (should fail without auth)...');
    const adminOffersResponse = await fetch('http://localhost:3002/api/admin/offers');
    const adminOffersData = await adminOffersResponse.json();
    console.log('Status:', adminOffersResponse.status);
    console.log('Response:', JSON.stringify(adminOffersData, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPI();
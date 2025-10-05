// Simple test script to debug the quote creation issue
const testQuoteCreation = async () => {
  try {
    console.log('Testing quote creation...');
    
    // First, let's test the auth endpoint
    console.log('\n=== Testing Auth Endpoint ===');
    const authResponse = await fetch('http://localhost:3004/api/debug/test-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any cookies or auth headers that your browser is sending
      },
      body: JSON.stringify({
        test: 'auth'
      })
    });
    
    const authResult = await authResponse.json();
    console.log('Auth Response Status:', authResponse.status);
    console.log('Auth Response:', JSON.stringify(authResult, null, 2));
    
    if (!authResponse.ok) {
      console.log('Auth failed, stopping test');
      return;
    }
    
    // Now test the quote endpoint
    console.log('\n=== Testing Quote Endpoint ===');
    const quoteResponse = await fetch('http://localhost:3004/api/debug/test-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enquiryId: '507f1f77bcf86cd799439011', // dummy ObjectId
        leadName: 'Test Lead',
        hotelName: 'Test Hotel',
        numberOfPeople: 2,
        numberOfRooms: 1,
        numberOfNights: 3,
        arrivalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isSuperPackage: false,
        whatsIncluded: 'Test package',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 1000,
        currency: 'GBP',
        internalNotes: ''
      })
    });
    
    const quoteResult = await quoteResponse.json();
    console.log('Quote Response Status:', quoteResponse.status);
    console.log('Quote Response:', JSON.stringify(quoteResult, null, 2));
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
};

// Run the test
testQuoteCreation();
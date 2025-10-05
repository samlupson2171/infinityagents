'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DebugQuotePage() {
  const { data: session, status } = useSession();
  const [authResult, setAuthResult] = useState<any>(null);
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'auth' })
      });
      
      const result = await response.json();
      setAuthResult({ status: response.status, data: result });
    } catch (error) {
      setAuthResult({ error: error.message });
    }
    setLoading(false);
  };

  const testQuote = async () => {
    setLoading(true);
    try {
      // First, create a test enquiry
      console.log('Creating test enquiry...');
      const enquiryResponse = await fetch('/api/admin/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadName: 'Test Lead for Quote',
          tripType: 'stag',
          agentEmail: 'test@example.com',
          firstChoiceDestination: 'Benidorm',
          travelDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          departureAirport: 'Manchester',
          numberOfNights: 3,
          numberOfGuests: 8,
          eventsRequested: ['Bar Crawl', 'Nightclub Entry'],
          accommodationType: 'hotel',
          boardType: 'All Inclusive',
          budgetPerPerson: 500,
          additionalNotes: 'Test enquiry for quote creation'
        })
      });

      if (!enquiryResponse.ok) {
        const enquiryError = await enquiryResponse.json();
        setQuoteResult({ error: 'Failed to create test enquiry', details: enquiryError });
        setLoading(false);
        return;
      }

      const enquiryResult = await enquiryResponse.json();
      console.log('Test enquiry created:', enquiryResult);

      // Now create a quote for this enquiry
      console.log('Creating quote for enquiry:', enquiryResult.data._id);
      const response = await fetch('/api/debug/test-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enquiryId: enquiryResult.data._id,
          leadName: 'Test Lead for Quote',
          hotelName: 'Test Hotel Benidorm',
          numberOfPeople: 8,
          numberOfRooms: 4,
          numberOfNights: 3,
          arrivalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isSuperPackage: true,
          whatsIncluded: 'All inclusive accommodation, airport transfers, bar crawl, nightclub entries',
          transferIncluded: true,
          activitiesIncluded: 'Bar Crawl, Nightclub Entry, Pool Party',
          totalPrice: 4000,
          currency: 'GBP',
          internalNotes: 'Test quote created via debug endpoint'
        })
      });
      
      const result = await response.json();
      setQuoteResult({ 
        status: response.status, 
        data: result,
        enquiryId: enquiryResult.data._id 
      });
    } catch (error) {
      setQuoteResult({ error: error.message });
    }
    setLoading(false);
  };

  if (status === 'loading') {
    return <div>Loading session...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Quote System</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Session Info</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <div>
          <button
            onClick={testAuth}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Auth'}
          </button>
          
          {authResult && (
            <div className="mt-2 p-3 bg-gray-50 rounded">
              <h3 className="font-semibold">Auth Test Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(authResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={testQuote}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Quote Creation'}
          </button>
          
          {quoteResult && (
            <div className="mt-2 p-3 bg-gray-50 rounded">
              <h3 className="font-semibold">Quote Test Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(quoteResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
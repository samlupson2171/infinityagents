'use client';

import { useState } from 'react';

export default function TestQuotePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testQuoteCreation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // First, let's get an enquiry to use
      const enquiriesResponse = await fetch('/api/admin/enquiries');
      const enquiriesData = await enquiriesResponse.json();
      
      if (!enquiriesResponse.ok) {
        throw new Error('Failed to fetch enquiries');
      }

      const enquiries = enquiriesData.data?.enquiries || [];
      if (enquiries.length === 0) {
        throw new Error('No enquiries found. Please create an enquiry first.');
      }

      const testEnquiry = enquiries[0];

      // Create test quote data
      const quoteData = {
        enquiryId: testEnquiry._id,
        leadName: testEnquiry.leadName || 'Test Lead',
        hotelName: 'Test Hotel',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 3,
        arrivalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isSuperPackage: false,
        whatsIncluded: 'Accommodation, breakfast, and airport transfers included in this test quote',
        transferIncluded: true,
        activitiesIncluded: 'City tour, boat trip',
        totalPrice: 1200,
        currency: 'GBP',
        internalNotes: 'Test quote created from debug page'
      };

      console.log('Creating quote with data:', quoteData);

      // Create the quote
      const response = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      setResult({
        success: true,
        quote: data.data,
        enquiry: testEnquiry
      });

    } catch (err) {
      console.error('Quote creation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Quote Creation Test</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <button
          onClick={testQuoteCreation}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Quote Creation'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="text-red-800 font-medium">Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="text-green-800 font-medium">Success!</h3>
            <div className="mt-2 text-sm text-green-700">
              <p><strong>Quote ID:</strong> {result.quote._id}</p>
              <p><strong>Lead Name:</strong> {result.quote.leadName}</p>
              <p><strong>Hotel:</strong> {result.quote.hotelName}</p>
              <p><strong>Total Price:</strong> {result.quote.formattedPrice || `${result.quote.currency} ${result.quote.totalPrice}`}</p>
              <p><strong>Status:</strong> {result.quote.status}</p>
              <p><strong>Enquiry:</strong> {result.enquiry.leadName} ({result.enquiry._id})</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Full Response:</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
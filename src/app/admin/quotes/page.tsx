'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuoteManager from '@/components/admin/QuoteManager';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

function QuotesPageContent() {
  const searchParams = useSearchParams();
  const enquiryId = searchParams.get('enquiry');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        {enquiryId && (
          <div className="mb-4">
            <a
              href="/admin/enquiries"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Enquiries
            </a>
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
        <p className="text-gray-600 mt-2">
          Create, manage, and track quotes for customer enquiries
        </p>
      </div>

      <QuoteManager initialEnquiryId={enquiryId} />
    </div>
  );
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <QuotesPageContent />
    </Suspense>
  );
}
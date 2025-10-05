import { Metadata } from 'next';
import { Suspense } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import EnquiryConfirmation from '@/components/enquiries/EnquiryConfirmation';

export const metadata: Metadata = {
  title: 'Enquiry Confirmation - Infinity Weekends',
  description: 'Your enquiry has been submitted successfully',
};

export default function EnquiryConfirmationPage() {
  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <EnquiryConfirmation />
      </Suspense>
    </ProtectedRoute>
  );
}

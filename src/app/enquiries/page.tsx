import { Metadata } from 'next';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import EnquiryForm from '@/components/enquiries/EnquiryForm';

export const metadata: Metadata = {
  title: 'Submit Enquiry - Infinity Weekends',
  description:
    "Submit a detailed enquiry for your client's travel requirements",
};

export default function EnquiriesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            <EnquiryForm />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

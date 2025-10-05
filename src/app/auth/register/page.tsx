import Link from 'next/link';
import RegisterForm from '@/components/auth/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register - Infinity Weekends Training Portal',
  description:
    'Register your travel agency to access exclusive training materials and offers from Infinity Weekends.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
            >
              Infinity Weekends
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Join Infinity Weekends
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Register your travel agency to access exclusive training materials
              and offers
            </p>
          </div>

          <RegisterForm />

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By registering, you agree to our terms of service and privacy
              policy. Only travel agencies with valid ABTA/PTS numbers will be
              approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

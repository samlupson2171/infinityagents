import { Metadata } from 'next';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign In - Infinity Weekends Training Platform',
  description:
    'Sign in to access exclusive training materials and resources for travel agencies.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/infinity-weekends-logo.png"
            alt="Infinity Weekends"
            className="h-16 w-auto mx-auto mb-8"
          />
          <h2 className="text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <div className="w-16 h-1 bg-orange-500 mx-auto mt-4 mb-6"></div>
          <p className="text-gray-600">
            Access exclusive training materials and resources
          </p>
        </div>

        <div className="bg-white py-8 px-8 shadow-xl rounded-lg border border-gray-200">
          <LoginForm />
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Register here
            </Link>
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            For ABTA/PTS registered travel agencies only
          </p>
        </div>
      </div>
    </div>
  );
}

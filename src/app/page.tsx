'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <img
              src="/infinity-weekends-logo.png"
              alt="Infinity Weekends"
              className="h-20 w-auto mx-auto mb-6"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Agent Portal
          </h1>
          <div className="w-24 h-1 bg-orange-500 mx-auto mt-4 mb-6"></div>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Your comprehensive platform for exclusive offers, training
            resources, and travel agency support
          </p>
        </div>

        {status === 'loading' ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : session ? (
          <AuthenticatedContent session={session} />
        ) : (
          <UnauthenticatedContent />
        )}
      </main>
    </div>
  );
}

function AuthenticatedContent({ session }: { session: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">


      {/* Enquiries Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:border-orange-300">
        <div className="flex items-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 ml-4">
            Submit Enquiry
          </h3>
        </div>
        <p className="text-gray-600 mb-6 text-lg leading-relaxed">
          Get personalized quotes and information for your travel needs
        </p>
        <Link
          href="/enquiries"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg transition-colors"
        >
          Make Enquiry
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>

      {/* Training Materials Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:border-orange-300">
        <div className="flex items-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 ml-4">
            Training Materials
          </h3>
        </div>
        <p className="text-gray-600 mb-6 text-lg leading-relaxed">
          Access training resources and educational content
        </p>
        <Link
          href="/training"
          className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold text-lg transition-colors"
        >
          View Training
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>

      {/* Admin Panel (if admin) */}
      {session.user?.role === 'admin' && (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow md:col-span-2">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 ml-3">
              Admin Dashboard
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Manage users, offers, enquiries, and training materials
          </p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center text-red-600 hover:text-red-500"
          >
            Go to Dashboard
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

function UnauthenticatedContent() {
  return (
    <div className="text-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          Get Started Today
        </h3>
        <p className="text-gray-600 mb-6">
          Join our platform to submit enquiries and access training materials.
        </p>
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            Register Now
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-md transition-colors"
          >
            Already have an account? Login
          </Link>
        </div>
      </div>

      {/* Features Preview */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">


        <div className="text-center">
          <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900">
            Easy Enquiries
          </h4>
          <p className="text-gray-600 mt-2">
            Submit and track your travel enquiries effortlessly
          </p>
        </div>

        <div className="text-center">
          <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900">
            Training Resources
          </h4>
          <p className="text-gray-600 mt-2">
            Comprehensive training materials and resources
          </p>
        </div>
      </div>
    </div>
  );
}

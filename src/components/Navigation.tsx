'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import LogoutButton from './auth/LogoutButton';

export default function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show navigation on auth pages
  const hideNavigation =
    pathname?.startsWith('/auth/') || pathname === '/unauthorized';

  if (hideNavigation) {
    return null;
  }

  return (
    <nav className="bg-white shadow-lg border-b-4 border-orange-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img
                src="/infinity-weekends-logo.png"
                alt="Infinity Weekends"
                className="h-12 w-auto"
                onError={(e) => {
                  console.log('Logo failed to load');
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <span className="text-2xl font-bold text-gray-800 hidden">
                Infinity Weekends
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {status === 'loading' ? (
              <div className="text-gray-600">Loading...</div>
            ) : session ? (
              <>


                <Link
                  href="/destinations"
                  className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md font-medium transition-colors"
                >
                  Destinations
                </Link>
                <Link
                  href="/enquiries"
                  className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md font-medium transition-colors"
                >
                  Enquiries
                </Link>
                <Link
                  href="/training"
                  className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md font-medium transition-colors"
                >
                  Training
                </Link>
                {session.user?.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md font-medium transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-300">
                  <span className="text-gray-600 text-sm">
                    Welcome, {session.user?.name}
                  </span>
                  <LogoutButton />
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-orange-500 px-3 py-2 rounded-md font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

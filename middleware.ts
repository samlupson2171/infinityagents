import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Allow access to auth pages for unauthenticated users
    if (pathname.startsWith('/auth/')) {
      return NextResponse.next();
    }

    // Redirect unauthenticated users to login
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Check if user is approved for protected routes
    if (!token.isApproved && !pathname.startsWith('/auth/pending')) {
      return NextResponse.redirect(new URL('/auth/pending', req.url));
    }

    // Admin-only routes
    if (pathname.startsWith('/admin') && token.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to public routes
        if (pathname === '/' || pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
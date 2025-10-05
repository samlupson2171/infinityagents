import mongoose from 'mongoose';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare global {
  var mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      isApproved: boolean;
      companyName: string;
      abtaPtsNumber: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
    isApproved: boolean;
    companyName: string;
    abtaPtsNumber: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: string;
    isApproved: boolean;
    companyName: string;
    abtaPtsNumber: string;
  }
}

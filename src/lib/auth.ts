import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import User from '@/models/User';
import { connectDB } from '@/lib/mongodb';

const client = new MongoClient(process.env.MONGODB_URI!, {
  // Basic connection options for local MongoDB - no SSL
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  ssl: false, // Explicitly disable SSL for local MongoDB
});
const clientPromise = client.connect();

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          await connectDB();

          // Find user with password field included
          const user = await User.findOne({
            contactEmail: credentials.email.toLowerCase(),
          }).select('+password');

          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Check if password matches
          const isPasswordValid = await user.comparePassword(
            credentials.password
          );
          if (!isPasswordValid) {
            throw new Error('Invalid email or password');
          }

          // Check if user is approved
          if (!user.isApproved) {
            throw new Error(
              'Your account is pending approval. Please wait for admin approval.'
            );
          }

          return {
            id: user._id.toString(),
            email: user.contactEmail,
            name: user.name,
            role: user.role,
            isApproved: user.isApproved,
            companyName: user.companyName,
            abtaPtsNumber: user.abtaPtsNumber,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      // Persist user data in JWT token
      if (user) {
        token.role = user.role;
        token.isApproved = user.isApproved;
        token.companyName = user.companyName;
        token.abtaPtsNumber = user.abtaPtsNumber;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.isApproved = token.isApproved as boolean;
        session.user.companyName = token.companyName as string;
        session.user.abtaPtsNumber = token.abtaPtsNumber as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

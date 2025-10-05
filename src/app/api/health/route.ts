import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    // Check database connection
    const { db } = await connectToDatabase();
    await db.admin().ping();

    // Check environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      missingEnvVars: missingEnvVars.length > 0 ? missingEnvVars : undefined
    };

    return NextResponse.json(status, { 
      status: missingEnvVars.length > 0 ? 500 : 200 
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'disconnected'
      },
      { status: 500 }
    );
  }
}
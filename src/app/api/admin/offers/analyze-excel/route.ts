import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { excelSmartDetector } from '@/lib/excel-smart-detector';
import { excelMetadataExtractor } from '@/lib/excel-metadata-extractor';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Check admin role
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: { message: 'Forbidden - Admin access required' } },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { message: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' } },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { message: 'File too large. Maximum size is 10MB' } },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Analyze the Excel file
    const analysis = await excelSmartDetector.analyzeFile(buffer);
    const metadata = await excelMetadataExtractor.extractMetadata(buffer);

    // Combine analysis results
    const result = {
      headers: analysis.headers || [],
      sampleData: analysis.sampleData || [],
      metadata: {
        ...metadata,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      },
      layout: analysis.layout,
      confidence: analysis.confidence,
      suggestions: analysis.suggestions || []
    };

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Excel analysis error:', error);
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to analyze Excel file' 
        } 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { parseActivitiesCSV } from '@/lib/csv-parser';
import { importActivities } from '@/lib/activity-utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  handleAPIError,
  createSuccessResponse,
  ErrorCode,
  BusinessError,
  validateRequired,
} from '@/lib/error-handling';

interface UploadResponse {
  success: boolean;
  data?: {
    summary: {
      totalRows: number;
      validRows: number;
      errorRows: number;
      created: number;
      updated: number;
    };
    errors?: Array<{
      line: number;
      field: string;
      value: any;
      message: string;
    }>;
    importErrors?: Array<{
      row: any;
      error: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<UploadResponse>> {
  try {
    // Verify admin authorization
    await requireAdmin(request);

    // Get current user session for createdBy field
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new BusinessError(ErrorCode.UNAUTHORIZED, 'User session not found');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new BusinessError(ErrorCode.UPLOAD_ERROR, 'No file provided');
    }

    // Validate file type (CSV only)
    if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
      throw new BusinessError(
        ErrorCode.INVALID_FILE_FORMAT,
        'Only CSV files are allowed'
      );
    }

    // Validate file size (10MB max as per requirements)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BusinessError(
        ErrorCode.FILE_TOO_LARGE,
        'File size exceeds 10MB limit'
      );
    }

    // Read file content
    const csvContent = await file.text();

    if (!csvContent.trim()) {
      throw new BusinessError(ErrorCode.UPLOAD_ERROR, 'CSV file is empty');
    }

    // Parse and validate CSV
    const parseResult = parseActivitiesCSV(csvContent);

    // If parsing failed completely, return parse errors
    if (!parseResult.success && parseResult.data.length === 0) {
      throw new BusinessError(
        ErrorCode.CSV_PARSING_ERROR,
        'CSV validation failed',
        {
          summary: parseResult.summary,
          errors: parseResult.errors,
        }
      );
    }

    // Import valid activities to database
    let importResult = { created: 0, updated: 0, errors: [] };

    if (parseResult.data.length > 0) {
      try {
        importResult = await importActivities(
          parseResult.data,
          session.user.id
        );
      } catch (error) {
        console.error('Error importing activities:', error);
        throw new BusinessError(
          ErrorCode.DATABASE_ERROR,
          'Failed to import activities to database',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    // Determine overall success
    const hasValidData = parseResult.data.length > 0;
    const hasParseErrors = parseResult.errors.length > 0;
    const hasImportErrors = importResult.errors.length > 0;

    const overallSuccess = hasValidData && !hasImportErrors;

    const responseData = {
      summary: {
        totalRows: parseResult.summary.totalRows,
        validRows: parseResult.summary.validRows,
        errorRows: parseResult.summary.errorRows,
        created: importResult.created,
        updated: importResult.updated,
      },
      ...(hasParseErrors && { errors: parseResult.errors }),
      ...(hasImportErrors && { importErrors: importResult.errors }),
    };

    const response = createSuccessResponse(
      responseData,
      overallSuccess
        ? 'Activities uploaded successfully'
        : 'Upload completed with some errors'
    );

    return NextResponse.json(response, { status: overallSuccess ? 200 : 207 });
  } catch (error: any) {
    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    const errorResponse = handleAPIError(error);
    const statusCode =
      error.code === ErrorCode.UNAUTHORIZED
        ? 401
        : error.code === ErrorCode.UPLOAD_ERROR ||
            error.code === ErrorCode.INVALID_FILE_FORMAT ||
            error.code === ErrorCode.FILE_TOO_LARGE ||
            error.code === ErrorCode.CSV_PARSING_ERROR
          ? 400
          : 500;

    return NextResponse.json(errorResponse, { status: statusCode });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'GET method not supported for this endpoint',
      },
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'PUT method not supported for this endpoint',
      },
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'DELETE method not supported for this endpoint',
      },
    },
    { status: 405 }
  );
}

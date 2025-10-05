import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import Offer from '@/models/Offer';
import { parseOffersExcel, validateOffer, previewExcelStructure } from '@/lib/excel-parser';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const adminToken = await requireAdmin(request);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const action = formData.get('action') as string; // 'preview' or 'import'
    const sheetName = formData.get('sheetName') as string;
    const headerRow = formData.get('headerRow') as string;
    const columnMapping = formData.get('columnMapping') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'No file uploaded'
          }
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only Excel (.xlsx, .xls) and CSV files are supported'
          }
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Handle preview action
    if (action === 'preview') {
      try {
        const preview = previewExcelStructure(buffer);
        return NextResponse.json({
          success: true,
          data: {
            type: 'preview',
            filename: file.name,
            size: file.size,
            ...preview
          }
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PREVIEW_ERROR',
              message: `Failed to preview file: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          },
          { status: 400 }
        );
      }
    }

    // Handle import action
    if (action === 'import') {
      // Parse column mapping if provided
      let parsedColumnMapping: Record<string, string> | undefined;
      if (columnMapping) {
        try {
          parsedColumnMapping = JSON.parse(columnMapping);
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_COLUMN_MAPPING',
                message: 'Invalid column mapping format'
              }
            },
            { status: 400 }
          );
        }
      }

      // Parse the Excel file
      const parseResult = parseOffersExcel(buffer, {
        sheetName: sheetName || undefined,
        headerRow: headerRow ? parseInt(headerRow) : undefined,
        columnMapping: parsedColumnMapping
      });

      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PARSE_ERROR',
              message: 'Failed to parse Excel file',
              details: parseResult.errors
            }
          },
          { status: 400 }
        );
      }

      // Validate offers
      const validationErrors: string[] = [];
      const validOffers = parseResult.data.filter(offer => {
        const errors = validateOffer(offer);
        if (errors.length > 0) {
          validationErrors.push(`${offer.title}: ${errors.join(', ')}`);
          return false;
        }
        return true;
      });

      if (validOffers.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NO_VALID_OFFERS',
              message: 'No valid offers found in the file',
              details: validationErrors
            }
          },
          { status: 400 }
        );
      }

      // Connect to database
      await connectDB();

      // Import offers to database
      const importResults = {
        created: 0,
        updated: 0,
        errors: [] as string[]
      };

      for (const offerData of validOffers) {
        try {
          // Check if offer already exists (by title and destination)
          const existingOffer = await Offer.findOne({
            title: offerData.title,
            destination: offerData.destination
          });

          if (existingOffer) {
            // Update existing offer
            await Offer.findByIdAndUpdate(existingOffer._id, {
              ...offerData,
              updatedAt: new Date(),
              updatedBy: adminToken.sub
            });
            importResults.updated++;
          } else {
            // Create new offer
            await Offer.create({
              ...offerData,
              createdBy: adminToken.sub,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            importResults.created++;
          }
        } catch (error) {
          importResults.errors.push(
            `Failed to save offer "${offerData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          type: 'import',
          filename: file.name,
          parseResult: {
            totalRows: parseResult.summary.totalRows,
            validOffers: parseResult.summary.validOffers,
            skippedRows: parseResult.summary.skippedRows,
            warnings: parseResult.warnings,
            errors: parseResult.errors
          },
          importResults,
          summary: {
            totalProcessed: validOffers.length,
            created: importResults.created,
            updated: importResults.updated,
            failed: importResults.errors.length
          }
        }
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: 'Action must be either "preview" or "import"'
        }
      },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Error processing Excel upload:', error);

    // Handle auth errors
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process Excel file'
        }
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'GET method not supported for this endpoint'
      }
    },
    { status: 405 }
  );
}
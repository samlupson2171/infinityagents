import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ContractTemplate from '@/models/ContractTemplate';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get the current active contract template
    const contract = await ContractTemplate.findOne({ isActive: true }).sort({
      createdAt: -1,
    });

    if (!contract) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_CONTRACT',
            message: 'No active contract template found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: contract._id,
        version: contract.version,
        title: contract.title,
        content: contract.content,
        isActive: contract.isActive,
        createdAt: contract.createdAt,
        effectiveDate: contract.effectiveDate,
      },
    });
  } catch (error) {
    console.error('Error fetching current contract:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch contract',
        },
      },
      { status: 500 }
    );
  }
}

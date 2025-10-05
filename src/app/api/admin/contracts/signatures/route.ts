import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ContractSignature from '@/models/ContractSignature';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    // Get user session and verify admin role
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    await connectDB();

    // Verify user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required',
          },
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const contractId = searchParams.get('contractId');
    const userId = searchParams.get('userId');

    // Build query
    const query: any = {};
    if (contractId) {
      query.contractTemplateId = contractId;
    }
    if (userId) {
      query.userId = userId;
    }

    // Get signatures with pagination
    const signatures = await ContractSignature.find(query)
      .populate('userId', 'name contactEmail company registrationStatus')
      .populate('contractTemplateId', 'version title effectiveDate')
      .sort({ signedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ContractSignature.countDocuments(query);

    // Get signature statistics
    const stats = {
      totalSignatures: await ContractSignature.countDocuments(),
      signaturesByType: await ContractSignature.aggregate([
        {
          $group: {
            _id: '$signatureType',
            count: { $sum: 1 },
          },
        },
      ]),
      recentSignatures: await ContractSignature.countDocuments({
        signedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      signaturesByContract: await ContractSignature.aggregate([
        {
          $group: {
            _id: '$contractTemplateId',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'contracttemplates',
            localField: '_id',
            foreignField: '_id',
            as: 'contract',
          },
        },
        {
          $unwind: '$contract',
        },
        {
          $project: {
            contractVersion: '$contract.version',
            contractTitle: '$contract.title',
            signatureCount: '$count',
          },
        },
      ]),
    };

    return NextResponse.json({
      success: true,
      data: {
        signatures: signatures.map((sig) => ({
          ...sig.toObject(),
          auditTrail: sig.getAuditTrail(),
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching contract signatures:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch contract signatures',
        },
      },
      { status: 500 }
    );
  }
}

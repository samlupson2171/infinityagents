import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ContractTemplate from '@/models/ContractTemplate';
import { ObjectId } from 'mongodb';

// POST /api/admin/contracts/templates/[id]/activate - Activate a specific template version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    await connectToDatabase();

    const template = await ContractTemplate.findById(params.id);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.isActive) {
      return NextResponse.json(
        { error: 'Template is already active' },
        { status: 400 }
      );
    }

    // Deactivate all other templates
    await ContractTemplate.updateMany({}, { isActive: false });

    // Activate this template
    template.isActive = true;
    await template.save();

    await template.populate('createdBy', 'name email');

    return NextResponse.json({ 
      template,
      message: 'Contract template activated successfully'
    });
  } catch (error) {
    console.error('Error activating contract template:', error);
    return NextResponse.json(
      { error: 'Failed to activate contract template' },
      { status: 500 }
    );
  }
}
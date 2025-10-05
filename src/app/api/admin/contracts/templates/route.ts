import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ContractTemplate from '@/models/ContractTemplate';
import { ObjectId } from 'mongodb';

// GET /api/admin/contracts/templates - Get all contract templates with version history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    const templates = await ContractTemplate.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching contract templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract templates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/contracts/templates - Create new contract template version
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content, effectiveDate } = await request.json();

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    if (content.length < 100) {
      return NextResponse.json(
        { error: 'Contract content must be at least 100 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Deactivate current active template
    await ContractTemplate.updateMany(
      { isActive: true },
      { isActive: false }
    );

    // Generate version number
    const latestTemplate = await ContractTemplate.findOne({})
      .sort({ createdAt: -1 })
      .lean() as any;
    
    let versionNumber = 'v1.0';
    if (latestTemplate && latestTemplate.version) {
      const versionMatch = latestTemplate.version.match(/^v(\d+)\.(\d+)$/);
      if (versionMatch) {
        const major = parseInt(versionMatch[1]);
        const minor = parseInt(versionMatch[2]);
        versionNumber = `v${major}.${minor + 1}`;
      } else {
        // Fallback for old version format
        versionNumber = 'v1.0';
      }
    }

    // Create new template
    const newTemplate = new ContractTemplate({
      version: versionNumber,
      title: title.trim(),
      content: content.trim(),
      isActive: true,
      createdBy: new ObjectId(session.user.id),
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      createdAt: new Date()
    });

    await newTemplate.save();
    
    // Populate creator info for response
    await newTemplate.populate('createdBy', 'name email');

    return NextResponse.json({ 
      template: newTemplate,
      message: 'Contract template created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating contract template:', error);
    return NextResponse.json(
      { error: 'Failed to create contract template' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ContractTemplate from '@/models/ContractTemplate';
import { ObjectId } from 'mongodb';

// GET /api/admin/contracts/templates/[id] - Get specific contract template
export async function GET(
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
    
    const template = await ContractTemplate.findById(params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching contract template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract template' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/contracts/templates/[id] - Update contract template (create new version)
export async function PUT(
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

    const existingTemplate = await ContractTemplate.findById(params.id);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if content actually changed
    if (existingTemplate.content === content.trim() && existingTemplate.title === title.trim()) {
      return NextResponse.json(
        { error: 'No changes detected in template content' },
        { status: 400 }
      );
    }

    // Deactivate all templates
    await ContractTemplate.updateMany({}, { isActive: false });

    // Generate new version number
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

    // Create new version
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
    await newTemplate.populate('createdBy', 'name email');

    return NextResponse.json({ 
      template: newTemplate,
      message: 'New contract template version created successfully'
    });
  } catch (error) {
    console.error('Error updating contract template:', error);
    return NextResponse.json(
      { error: 'Failed to update contract template' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/contracts/templates/[id] - Deactivate contract template
export async function DELETE(
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

    // Don't allow deletion of active template if it's the only one
    if (template.isActive) {
      const templateCount = await ContractTemplate.countDocuments({});
      if (templateCount === 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the only contract template' },
          { status: 400 }
        );
      }
    }

    // Deactivate template
    template.isActive = false;
    await template.save();

    return NextResponse.json({ 
      message: 'Contract template deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating contract template:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate contract template' },
      { status: 500 }
    );
  }
}
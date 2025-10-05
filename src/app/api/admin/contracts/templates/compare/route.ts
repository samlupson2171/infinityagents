import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import ContractTemplate from '@/models/ContractTemplate';
import { ObjectId } from 'mongodb';

// POST /api/admin/contracts/templates/compare - Compare two template versions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId1, templateId2 } = await request.json();

    if (!templateId1 || !templateId2) {
      return NextResponse.json(
        { error: 'Both template IDs are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(templateId1) || !ObjectId.isValid(templateId2)) {
      return NextResponse.json({ error: 'Invalid template IDs' }, { status: 400 });
    }

    await connectToDatabase();

    const [template1, template2] = await Promise.all([
      ContractTemplate.findById(templateId1).populate('createdBy', 'name email').lean(),
      ContractTemplate.findById(templateId2).populate('createdBy', 'name email').lean()
    ]);

    if (!template1 || !template2) {
      return NextResponse.json({ error: 'One or both templates not found' }, { status: 404 });
    }

    // Simple diff calculation (in a real app, you might use a more sophisticated diff library)
    const calculateDiff = (text1: string, text2: string) => {
      const lines1 = text1.split('\n');
      const lines2 = text2.split('\n');
      
      const changes = [];
      const maxLines = Math.max(lines1.length, lines2.length);
      
      for (let i = 0; i < maxLines; i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';
        
        if (line1 !== line2) {
          changes.push({
            lineNumber: i + 1,
            oldLine: line1,
            newLine: line2,
            type: !line1 ? 'added' : !line2 ? 'removed' : 'modified'
          });
        }
      }
      
      return changes;
    };

    const contentDiff = calculateDiff(template1.content, template2.content);
    const titleChanged = template1.title !== template2.title;

    return NextResponse.json({
      template1: {
        id: template1._id,
        version: template1.version,
        title: template1.title,
        createdAt: template1.createdAt,
        createdBy: template1.createdBy
      },
      template2: {
        id: template2._id,
        version: template2.version,
        title: template2.title,
        createdAt: template2.createdAt,
        createdBy: template2.createdBy
      },
      differences: {
        titleChanged,
        contentChanges: contentDiff,
        totalChanges: contentDiff.length + (titleChanged ? 1 : 0)
      }
    });
  } catch (error) {
    console.error('Error comparing contract templates:', error);
    return NextResponse.json(
      { error: 'Failed to compare contract templates' },
      { status: 500 }
    );
  }
}
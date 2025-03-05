import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

// GET /api/dashboard/documents
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        taxReturn: true
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Error fetching documents' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/documents
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const taxReturnId = formData.get('taxReturnId') as string | null;

    if (!file || !type) {
      return NextResponse.json(
        { error: 'File and type are required' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', session.user.id);
    await createUploadDirectory(uploadDir);

    // Generate unique filename
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save document record in database
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        taxReturnId,
        type,
        fileName,
        fileUrl: `/uploads/${session.user.id}/${fileName}`
      }
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Error uploading document' },
      { status: 500 }
    );
  }
}

// Helper function to create upload directory
async function createUploadDirectory(dir: string) {
  try {
    await writeFile(dir, '', { flag: 'wx' });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}
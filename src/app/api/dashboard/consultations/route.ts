import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

// GET /api/dashboard/consultations
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const consultations = await prisma.consultation.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(consultations);
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return NextResponse.json(
      { error: 'Error fetching consultations' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/consultations
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, scheduledAt, notes } = body;

    if (!subject || !scheduledAt) {
      return NextResponse.json(
        { error: 'Subject and scheduled time are required' },
        { status: 400 }
      );
    }

    const consultation = await prisma.consultation.create({
      data: {
        userId: session.user.id,
        subject,
        scheduledAt: new Date(scheduledAt),
        notes,
        status: 'pending'
      }
    });

    return NextResponse.json(consultation, { status: 201 });
  } catch (error) {
    console.error('Error creating consultation:', error);
    return NextResponse.json(
      { error: 'Error creating consultation request' },
      { status: 500 }
    );
  }
}

// PATCH /api/dashboard/consultations
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Consultation ID and status are required' },
        { status: 400 }
      );
    }

    const consultation = await prisma.consultation.update({
      where: {
        id,
        userId: session.user.id
      },
      data: {
        status,
        notes: notes || undefined
      }
    });

    return NextResponse.json(consultation);
  } catch (error) {
    console.error('Error updating consultation:', error);
    return NextResponse.json(
      { error: 'Error updating consultation' },
      { status: 500 }
    );
  }
}
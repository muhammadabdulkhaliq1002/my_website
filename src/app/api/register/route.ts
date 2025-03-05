import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, pan, dateOfBirth } = body;

    console.log('Received registration request:', { 
      fullName, 
      email, 
      phone, 
      pan, 
      dateOfBirth 
    });

    // Basic validation
    if (!fullName?.trim() || !email?.trim() || !password || !pan?.trim() || !dateOfBirth) {
      console.error('Validation failed:', { fullName, email, pan, dateOfBirth });
      return NextResponse.json(
        { error: 'All fields except phone are required' },
        { status: 400 }
      );
    }

    // Test database connection
    try {
      await prisma.$connect();
      console.log('Database connection successful');
    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }

    // Data normalization
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPan = pan.toUpperCase().trim();
    
    // Check existing user first
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { pan: normalizedPan }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === normalizedEmail ? 'email' : 'PAN';
      console.error(`User already exists with ${field}:`, field === 'email' ? normalizedEmail : normalizedPan);
      return NextResponse.json(
        { error: `User with this ${field} already exists` },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        password: hashedPassword,
        pan: normalizedPan,
        dateOfBirth: new Date(dateOfBirth),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('User created successfully:', { id: user.id, email: user.email });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        success: true,
        message: 'Registration successful',
        user: userWithoutPassword
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Registration error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });

    // Specific database error handling
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'email/PAN';
      return NextResponse.json(
        { error: `This ${field} is already registered` },
        { status: 400 }
      );
    }

    // Connection errors
    if (error.code === 'P1001' || error.code === 'P1002') {
      return NextResponse.json(
        { error: 'Unable to connect to the database. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
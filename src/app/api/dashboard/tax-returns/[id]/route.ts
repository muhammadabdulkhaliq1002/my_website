import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const updateTaxReturnSchema = z.object({
  assessmentYear: z.string().regex(/^\d{4}-\d{2}$/),
  status: z.enum(['DRAFT', 'FINAL']),
  data: z.object({
    returnFileSec: z.number().int().min(11).max(21),
    optOutNewTaxRegime: z.enum(['Y', 'N']),
    salaryIncome: z.object({
      grossSalary: z.number().min(0),
      salary: z.number().min(0),
      perquisitesValue: z.number().min(0),
      profitsInSalary: z.number().min(0),
      allowancesExemptUs10: z.array(z.object({
        natureDesc: z.string(),
        amount: z.number().min(0)
      })),
      netSalary: z.number().min(0),
      deductions: z.object({
        standard: z.number().min(0).max(50000),
        entertainment: z.number().min(0).max(5000),
        professionalTax: z.number().min(0).max(5000)
      })
    }),
    housePropertyIncome: z.object({
      type: z.enum(['S', 'L', 'D']),
      grossRent: z.number().min(0),
      taxesPaid: z.number().min(0),
      annualValue: z.number().min(0),
      standardDeduction: z.number().min(0),
      interestPayable: z.number().min(0),
      totalIncomeFromHP: z.number()
    }),
    otherIncome: z.object({
      natureOfIncome: z.array(z.object({
        type: z.enum(['SAV', 'IFD', 'TAX', 'FAP', 'DIV', 'NOT89A', 'OTHNOT89A', 'OTH']),
        description: z.string().optional(),
        amount: z.number().min(0)
      })),
      deductionUs57iia: z.number().min(0).max(15000),
      totalOtherIncome: z.number().min(0)
    }),
    deductions: z.object({
      section80C: z.number().min(0).max(150000),
      section80CCC: z.number().min(0).max(150000),
      section80CCDEmployee: z.number().min(0).max(150000),
      section80CCD1B: z.number().min(0).max(50000),
      section80CCDEmployer: z.number().min(0),
      section80D: z.number().min(0).max(100000),
      section80DD: z.number().min(0).max(125000),
      section80DDB: z.number().min(0).max(100000),
      section80E: z.number().min(0),
      section80EE: z.number().min(0).max(50000),
      section80EEA: z.number().min(0).max(150000),
      section80EEB: z.number().min(0).max(150000),
      section80G: z.number().min(0),
      section80GG: z.number().min(0).max(60000),
      section80GGA: z.number().min(0),
      section80GGC: z.number().min(0),
      section80TTA: z.number().min(0).max(10000),
      section80TTB: z.number().min(0).max(50000),
      section80U: z.number().min(0).max(125000),
      totalDeductions: z.number().min(0)
    })
  })
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taxReturn = await prisma.taxReturn.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        assessmentYear: true,
        status: true,
        filingDate: true,
        data: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!taxReturn) {
      return NextResponse.json({ error: 'Tax return not found' }, { status: 404 });
    }

    return NextResponse.json(taxReturn);
  } catch (error) {
    console.error('Error fetching tax return:', error);
    return NextResponse.json(
      { error: 'Error fetching tax return' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the tax return exists and belongs to the user
    const existingReturn = await prisma.taxReturn.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingReturn) {
      return NextResponse.json({ error: 'Tax return not found' }, { status: 404 });
    }

    if (existingReturn.status === 'FINAL') {
      return NextResponse.json(
        { error: 'Cannot modify a finalized tax return' },
        { status: 400 }
      );
    }

    const json = await request.json();
    const validatedData = updateTaxReturnSchema.parse(json);

    // Check for existing final return for the same assessment year
    if (validatedData.status === 'FINAL') {
      const existingFinal = await prisma.taxReturn.findFirst({
        where: {
          userId: session.user.id,
          assessmentYear: validatedData.assessmentYear,
          status: 'FINAL',
          NOT: {
            id: params.id
          }
        }
      });

      if (existingFinal) {
        return NextResponse.json(
          { error: 'A final tax return already exists for this assessment year' },
          { status: 400 }
        );
      }
    }

    // Update the tax return
    const updatedTaxReturn = await prisma.taxReturn.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        assessmentYear: validatedData.assessmentYear,
        status: validatedData.status,
        filingDate: validatedData.status === 'FINAL' ? new Date().toISOString() : null,
        data: validatedData.data,
      },
    });

    return NextResponse.json(updatedTaxReturn);
  } catch (error) {
    console.error('Error updating tax return:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error updating tax return' },
      { status: 500 }
    );
  }
}
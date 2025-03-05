import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { taxReturnSchema } from "@/lib/validationSchemas";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const validatedData = taxReturnSchema.parse(json);

    // Check if a tax return already exists for this assessment year
    const existingReturn = await prisma.taxReturn.findFirst({
      where: {
        userId: session.user.id,
        assessmentYear: validatedData.assessmentYear,
        status: validatedData.status === "FINAL" ? "FINAL" : undefined,
      },
    });

    if (existingReturn && validatedData.status === "FINAL") {
      return NextResponse.json(
        { error: "A final tax return already exists for this assessment year" },
        { status: 400 }
      );
    }

    // Create new tax return
    const newTaxReturn = await prisma.taxReturn.create({
      data: {
        userId: session.user.id,
        assessmentYear: validatedData.assessmentYear,
        status: validatedData.status,
        filingDate: validatedData.status === "FINAL" ? new Date().toISOString() : null,
        data: validatedData.data,
      },
    });

    return NextResponse.json(newTaxReturn);
  } catch (error) {
    console.error("Error creating tax return:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data format", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error creating tax return" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const status = searchParams.get("status");
    const year = searchParams.get("year");

    const where = {
      userId: session.user.id,
      ...(status && { status }),
      ...(year && { assessmentYear: year }),
    };

    const taxReturns = await prisma.taxReturn.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        assessmentYear: true,
        status: true,
        filingDate: true,
        data: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(taxReturns);
  } catch (error) {
    console.error("Error fetching tax returns:", error);
    return NextResponse.json(
      { error: "Error fetching tax returns" },
      { status: 500 }
    );
  }
}

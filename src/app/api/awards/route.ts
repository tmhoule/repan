import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireManager, handleApiError } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const where = (includeInactive && session.role === "manager") ? {} : { isActive: true };
    return NextResponse.json(await prisma.award.findMany({ where, orderBy: { createdAt: "asc" } }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireManager();
    const body = await request.json();
    const award = await prisma.award.create({
      data: { name: body.name, description: body.description, icon: body.icon, criteriaType: body.criteriaType, criteriaValue: body.criteriaValue },
    });
    return NextResponse.json(award, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

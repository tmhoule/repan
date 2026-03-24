import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireManager } from "@/lib/session";

export async function GET() {
  await requireSession();
  return NextResponse.json(await prisma.award.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));
}

export async function POST(request: NextRequest) {
  await requireManager();
  const body = await request.json();
  const award = await prisma.award.create({
    data: { name: body.name, description: body.description, icon: body.icon, criteriaType: body.criteriaType, criteriaValue: body.criteriaValue },
  });
  return NextResponse.json(award, { status: 201 });
}

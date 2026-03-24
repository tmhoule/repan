import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/session";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json(await prisma.award.update({ where: { id }, data: body }));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  return NextResponse.json(await prisma.award.update({ where: { id }, data: { isActive: false } }));
}

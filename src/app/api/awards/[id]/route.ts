import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, handleApiError } from "@/lib/session";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const body = await request.json();
    // Whitelist allowed fields to prevent mass-assignment
    const { name, description, icon, criteriaType, criteriaValue, isActive } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (criteriaType !== undefined) data.criteriaType = criteriaType;
    if (criteriaValue !== undefined) data.criteriaValue = criteriaValue;
    if (isActive !== undefined) data.isActive = isActive;
    return NextResponse.json(await prisma.award.update({ where: { id }, data }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    return NextResponse.json(await prisma.award.update({ where: { id }, data: { isActive: false } }));
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, handleApiError } from "@/lib/session";
import { isValidColorKey } from "@/lib/bucket-colors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  try {
    await requireManager();
    const { id: teamId, bucketId } = await params;
    const body = await request.json();

    const bucket = await prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket || bucket.teamId !== teamId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      data.name = name;
    }
    if (body.colorKey !== undefined) {
      if (!isValidColorKey(body.colorKey)) {
        return NextResponse.json({ error: "Invalid color" }, { status: 400 });
      }
      data.colorKey = body.colorKey;
    }
    if (body.displayOrder !== undefined) {
      data.displayOrder = body.displayOrder;
    }

    const updated = await prisma.bucket.update({
      where: { id: bucketId },
      data,
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json({ error: "A bucket with that name already exists" }, { status: 409 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bucketId: string }> }
) {
  try {
    await requireManager();
    const { id: teamId, bucketId } = await params;

    const bucket = await prisma.bucket.findUnique({ where: { id: bucketId } });
    if (!bucket || bucket.teamId !== teamId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.bucket.delete({ where: { id: bucketId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

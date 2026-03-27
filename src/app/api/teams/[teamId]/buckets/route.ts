import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, handleApiError, requireTeam } from "@/lib/session";
import { isValidColorKey } from "@/lib/bucket-colors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    await requireTeam();
    const { teamId } = await params;

    const buckets = await prisma.bucket.findMany({
      where: { teamId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json({ buckets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    await requireManager();
    const { teamId } = await params;
    const body = await request.json();

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.colorKey || !isValidColorKey(body.colorKey)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }

    const maxOrder = await prisma.bucket.aggregate({
      where: { teamId },
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const bucket = await prisma.bucket.create({
      data: { name, colorKey: body.colorKey, displayOrder, teamId },
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json(bucket, { status: 201 });
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json({ error: "A bucket with that name already exists" }, { status: 409 });
    }
    return handleApiError(error);
  }
}

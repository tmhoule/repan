import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, clearSessionTimeoutCache } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { id: "singleton" },
      select: { sessionTimeoutMinutes: true },
    });

    return NextResponse.json({
      timeoutMinutes: config?.sessionTimeoutMinutes ?? 360,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const timeoutMinutes = Number(body.timeoutMinutes);

    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 15 || timeoutMinutes > 43200) {
      return NextResponse.json(
        { error: "Timeout must be between 15 minutes and 30 days (43200 minutes)" },
        { status: 400 }
      );
    }

    await prisma.systemConfig.upsert({
      where: { id: "singleton" },
      create: { sessionTimeoutMinutes: timeoutMinutes },
      update: { sessionTimeoutMinutes: timeoutMinutes },
    });

    clearSessionTimeoutCache();

    return NextResponse.json({
      timeoutMinutes,
      message: "Session timeout updated successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

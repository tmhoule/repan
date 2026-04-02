import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { generateRandomToken, clearSecretCache } from "@/lib/crypto";

export async function GET() {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { id: "singleton" },
      select: { sessionSecret: true, updatedAt: true },
    });

    return NextResponse.json({
      configured: !!config?.sessionSecret,
      lastUpdated: config?.updatedAt || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === "generate") {
      // Generate a new session secret
      const newSecret = generateRandomToken(32); // 256-bit key

      const config = await prisma.systemConfig.upsert({
        where: { id: "singleton" },
        create: {
          sessionSecret: newSecret,
        },
        update: {
          sessionSecret: newSecret,
        },
      });

      // Clear the cache so the new secret is used immediately
      clearSecretCache();

      return NextResponse.json({
        success: true,
        configured: true,
        lastUpdated: config.updatedAt,
        message: "Session secret generated successfully. All existing sessions will be invalidated.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

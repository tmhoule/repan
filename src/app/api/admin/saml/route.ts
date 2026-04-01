import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { parseSamlMetadata } from "@/lib/saml";

export async function GET() {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const config = await prisma.samlConfig.findUnique({ where: { id: "singleton" } });
    if (!config) return NextResponse.json({ configured: false });

    return NextResponse.json({
      configured: true,
      enabled: config.enabled,
      appUrl: config.appUrl,
      idpEntityId: config.idpEntityId,
      idpSsoUrl: config.idpSsoUrl,
      spEntityId: config.spEntityId,
      attrUid: config.attrUid,
      attrDisplayName: config.attrDisplayName,
      acsUrl: `${config.appUrl}/api/auth/saml/callback`,
      hasCertificate: !!config.idpCertificate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();

    // Toggle enabled/disabled
    if ("enabled" in body && Object.keys(body).length === 1) {
      const existing = await prisma.samlConfig.findUnique({ where: { id: "singleton" } });
      if (!existing) return NextResponse.json({ error: "SSO not configured yet" }, { status: 400 });

      const updated = await prisma.samlConfig.update({
        where: { id: "singleton" },
        data: { enabled: body.enabled },
      });
      return NextResponse.json({ enabled: updated.enabled });
    }

    // Full configuration
    const { appUrl, metadataUrl, metadataXml, attrUid, attrDisplayName } = body;
    if (!appUrl) return NextResponse.json({ error: "appUrl is required" }, { status: 400 });
    if (!metadataUrl && !metadataXml) {
      return NextResponse.json({ error: "metadataUrl or metadataXml is required" }, { status: 400 });
    }

    let xml = metadataXml;
    if (!xml && metadataUrl) {
      const res = await fetch(metadataUrl);
      if (!res.ok) return NextResponse.json({ error: `Failed to fetch metadata: HTTP ${res.status}` }, { status: 400 });
      xml = await res.text();
    }

    const { idpEntityId, idpSsoUrl, idpCertificate } = parseSamlMetadata(xml);
    const cleanAppUrl = appUrl.replace(/\/+$/, "");

    const config = await prisma.samlConfig.upsert({
      where: { id: "singleton" },
      create: {
        appUrl: cleanAppUrl,
        idpEntityId,
        idpSsoUrl,
        idpCertificate,
        spEntityId: cleanAppUrl,
        attrUid: attrUid || "uid",
        attrDisplayName: attrDisplayName || "displayName",
      },
      update: {
        appUrl: cleanAppUrl,
        idpEntityId,
        idpSsoUrl,
        idpCertificate,
        spEntityId: cleanAppUrl,
        attrUid: attrUid || "uid",
        attrDisplayName: attrDisplayName || "displayName",
      },
    });

    return NextResponse.json({
      configured: true,
      enabled: config.enabled,
      appUrl: config.appUrl,
      idpEntityId: config.idpEntityId,
      idpSsoUrl: config.idpSsoUrl,
      spEntityId: config.spEntityId,
      attrUid: config.attrUid,
      attrDisplayName: config.attrDisplayName,
      acsUrl: `${config.appUrl}/api/auth/saml/callback`,
      hasCertificate: true,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Could not find")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}

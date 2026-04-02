import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { parseSamlMetadata } from "@/lib/saml";

/**
 * Validate URL to prevent SSRF attacks
 * Blocks private IP ranges, localhost, and non-HTTPS URLs
 */
function isAllowedUrl(urlString: string): { allowed: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTPS protocol
    if (url.protocol !== 'https:') {
      return { allowed: false, error: "Only HTTPS URLs are allowed" };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { allowed: false, error: "Localhost URLs are not allowed" };
    }
    
    // Block private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
    if (hostname.match(/^10\./)) {
      return { allowed: false, error: "Private IP addresses are not allowed" };
    }
    if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return { allowed: false, error: "Private IP addresses are not allowed" };
    }
    if (hostname.match(/^192\.168\./)) {
      return { allowed: false, error: "Private IP addresses are not allowed" };
    }
    
    // Block link-local addresses (169.254.0.0/16)
    if (hostname.match(/^169\.254\./)) {
      return { allowed: false, error: "Link-local IP addresses are not allowed" };
    }
    
    // Block AWS metadata endpoint (commonly used in SSRF attacks)
    if (hostname === '169.254.169.254') {
      return { allowed: false, error: "Metadata endpoints are not allowed" };
    }
    
    // Block private IPv6 ranges
    if (hostname.match(/^f[cd][0-9a-f]{2}:/i)) {
      return { allowed: false, error: "Private IPv6 addresses are not allowed" };
    }
    
    return { allowed: true };
  } catch (error) {
    return { allowed: false, error: "Invalid URL format" };
  }
}

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

    let idpEntityId: string;
    let idpSsoUrl: string;
    let idpCertificate: string;

    // Manual IdP configuration — fields provided directly
    if (body.idpEntityId && body.idpSsoUrl && body.idpCertificate) {
      idpEntityId = body.idpEntityId.trim();
      idpSsoUrl = body.idpSsoUrl.trim();
      // Clean up certificate — strip PEM headers/footers and whitespace
      idpCertificate = body.idpCertificate
        .replace(/-----BEGIN CERTIFICATE-----/g, "")
        .replace(/-----END CERTIFICATE-----/g, "")
        .replace(/\s/g, "");
      if (!idpCertificate) {
        return NextResponse.json({ error: "Invalid certificate" }, { status: 400 });
      }
    } else if (metadataUrl || metadataXml) {
      // Metadata-based configuration
      let xml = metadataXml;
      if (!xml && metadataUrl) {
        // Validate URL to prevent SSRF attacks
        const urlValidation = isAllowedUrl(metadataUrl);
        if (!urlValidation.allowed) {
          return NextResponse.json({
            error: `Invalid metadata URL: ${urlValidation.error}`
          }, { status: 400 });
        }

        // Fetch with timeout to prevent hanging requests
        try {
          const res = await fetch(metadataUrl, {
            signal: AbortSignal.timeout(10000), // 10 second timeout
            headers: {
              'User-Agent': 'Repan-SAML-Client/1.0',
              'Accept': 'application/xml, text/xml',
            },
          });

          if (!res.ok) {
            return NextResponse.json({
              error: `Failed to fetch metadata: HTTP ${res.status}`
            }, { status: 400 });
          }

          // Limit response size to prevent memory exhaustion
          const contentLength = res.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
            return NextResponse.json({
              error: "Metadata file too large (max 1MB)"
            }, { status: 400 });
          }

          xml = await res.text();

          // Additional size check after reading
          if (xml.length > 1024 * 1024) {
            return NextResponse.json({
              error: "Metadata file too large (max 1MB)"
            }, { status: 400 });
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'TimeoutError') {
            return NextResponse.json({
              error: "Request timed out while fetching metadata"
            }, { status: 400 });
          }
          throw error;
        }
      }

      ({ idpEntityId, idpSsoUrl, idpCertificate } = await parseSamlMetadata(xml));
    } else {
      return NextResponse.json({
        error: "Provide either IdP details (idpEntityId, idpSsoUrl, idpCertificate) or a metadata URL/XML"
      }, { status: 400 });
    }
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

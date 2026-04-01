import { SAML } from "@node-saml/node-saml";
import { prisma } from "./db";

export interface SamlAttributes {
  uid: string;
  displayName: string | null;
}

/**
 * Parse IdP metadata XML and extract entity ID, SSO URL, and signing certificate.
 */
export function parseSamlMetadata(xml: string): {
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
} {
  // Extract EntityID
  const entityIdMatch = xml.match(/entityID="([^"]+)"/);
  if (!entityIdMatch) throw new Error("Could not find entityID in metadata");
  const idpEntityId = entityIdMatch[1];

  // Extract SSO URL (HTTP-Redirect or HTTP-POST SingleSignOnService)
  const ssoUrlMatch = xml.match(
    /SingleSignOnService[^>]+Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-Redirect"[^>]+Location="([^"]+)"/
  ) ?? xml.match(
    /SingleSignOnService[^>]+Location="([^"]+)"[^>]+Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-Redirect"/
  ) ?? xml.match(
    /SingleSignOnService[^>]+Location="([^"]+)"/
  );
  if (!ssoUrlMatch) throw new Error("Could not find SingleSignOnService URL in metadata");
  const idpSsoUrl = ssoUrlMatch[1];

  // Extract signing certificate (strip PEM headers/whitespace)
  const certMatch = xml.match(
    /<(?:ds:)?X509Certificate>([\s\S]*?)<\/(?:ds:)?X509Certificate>/
  );
  if (!certMatch) throw new Error("Could not find X509Certificate in metadata");
  const idpCertificate = certMatch[1].replace(/\s/g, "");

  return { idpEntityId, idpSsoUrl, idpCertificate };
}

/**
 * Build a SAML instance from stored config.
 */
async function buildSaml(): Promise<{ saml: SAML; config: { attrUid: string; attrDisplayName: string } }> {
  const config = await prisma.samlConfig.findUnique({ where: { id: "singleton" } });
  if (!config || !config.enabled) throw new Error("SSO is not configured or not enabled");

  const saml = new SAML({
    callbackUrl: `${config.appUrl}/api/auth/saml/callback`,
    entryPoint: config.idpSsoUrl,
    issuer: config.spEntityId,
    idpCert: config.idpCertificate,
    wantAssertionsSigned: true,
  });

  return { saml, config: { attrUid: config.attrUid, attrDisplayName: config.attrDisplayName } };
}

/**
 * Generate the URL to redirect the user to the IdP for authentication.
 */
export async function createSamlRedirectUrl(): Promise<string> {
  const { saml } = await buildSaml();
  const url = await saml.getAuthorizeUrlAsync("", undefined, {});
  return url;
}

/**
 * Validate a SAML response POSTed by the IdP and extract user attributes.
 */
export async function validateSamlResponse(samlResponse: string): Promise<SamlAttributes> {
  const { saml, config } = await buildSaml();
  const { profile } = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });

  if (!profile) throw new Error("SAML assertion validation failed: no profile returned");

  const uid = (profile as Record<string, unknown>)[config.attrUid] as string | undefined
    ?? profile.nameID;
  if (!uid) throw new Error("SAML assertion missing UID attribute");

  const displayName = (profile as Record<string, unknown>)[config.attrDisplayName] as string | undefined
    ?? null;

  return { uid, displayName };
}

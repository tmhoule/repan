import { SAML } from "@node-saml/node-saml";
import { parseStringPromise } from "xml2js";
import { prisma } from "./db";

export interface SamlAttributes {
  uid: string;
  displayName: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Parse IdP metadata XML and extract entity ID, SSO URL, and signing certificate.
 * Uses xml2js for proper XML parsing instead of regex.
 */
export async function parseSamlMetadata(xml: string): Promise<{
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
}> {
  const result = await parseStringPromise(xml, { explicitArray: false, tagNameProcessors: [(name: string) => name.replace(/^.*:/, "")] });

  // Find the EntityDescriptor (may be top-level or nested under EntitiesDescriptor)
  const descriptor = result.EntityDescriptor ?? result.EntitiesDescriptor?.EntityDescriptor;
  if (!descriptor) throw new Error("Could not find EntityDescriptor in metadata");
  // If multiple descriptors, find the one with an IDPSSODescriptor
  const entity = Array.isArray(descriptor)
    ? descriptor.find((d: any) => d.IDPSSODescriptor)
    : descriptor;
  if (!entity) throw new Error("Could not find IdP EntityDescriptor in metadata");

  const idpEntityId = entity.$.entityID;
  if (!idpEntityId) throw new Error("Could not find entityID in metadata");

  // Extract SSO URL from IDPSSODescriptor
  const idpDesc = entity.IDPSSODescriptor;
  if (!idpDesc) throw new Error("Could not find IDPSSODescriptor in metadata");

  const ssoServices = Array.isArray(idpDesc.SingleSignOnService)
    ? idpDesc.SingleSignOnService
    : [idpDesc.SingleSignOnService];
  // Prefer HTTP-Redirect binding, fall back to first available
  const redirectBinding = "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect";
  const ssoService = ssoServices.find((s: any) => s?.$.Binding === redirectBinding)
    ?? ssoServices[0];
  if (!ssoService?.$?.Location) throw new Error("Could not find SingleSignOnService URL in metadata");
  const idpSsoUrl = ssoService.$.Location;

  // Extract signing certificate from KeyDescriptor
  const keyDescriptors = Array.isArray(idpDesc.KeyDescriptor)
    ? idpDesc.KeyDescriptor
    : [idpDesc.KeyDescriptor].filter(Boolean);
  // Prefer the signing key, fall back to first available
  const signingKey = keyDescriptors.find((k: any) => k?.$.use === "signing") ?? keyDescriptors[0];
  const cert = signingKey?.KeyInfo?.X509Data?.X509Certificate;
  if (!cert) throw new Error("Could not find X509Certificate in metadata");
  const idpCertificate = (typeof cert === "string" ? cert : cert._).replace(/\s/g, "");

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
    audience: config.spEntityId,
    idpCert: config.idpCertificate,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
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

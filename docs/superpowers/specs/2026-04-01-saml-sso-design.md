# SAML SSO Authentication via NetIQ

**Date:** 2026-04-01
**Status:** Draft
**Approach:** `@node-saml/node-saml` with custom glue code

## Overview

Add SAML 2.0 SSO authentication to Repan, allowing corporate deployments to authenticate users via NetIQ (or any SAML IdP). SSO is optional — the existing local user-picker login remains available for simple deployments. A future task will add a third auth method (admin username/password backdoor).

## Requirements

- SAML SSO configured and enabled by a superadmin after initial app setup
- Superadmin provides IdP metadata URL; app parses it automatically
- UID from SAML assertion is the stable user identifier
- Display name pulled from SAML assertion, user-editable after provisioning
- Just-in-time (JIT) auto-provisioning: new SSO users created as staff with no team assignment
- New SSO users are in a "limbo" state until a manager assigns them to a team
- No linking between existing local users and SSO identities
- No Single Logout (SLO) — logout clears the local session only
- Local user-picker login remains available alongside SSO
- The SAML ACS callback URL and SP entity ID are displayed to the superadmin for registration on the IdP side

## Out of Scope

- Single Logout (SLO)
- Admin username/password login (separate future task)
- Linking existing local users to SSO identities
- SP-side request signing (IdP signing only)

## Database Changes

### New Model: `SamlConfig`

Singleton table storing parsed IdP metadata and SSO configuration.

```prisma
model SamlConfig {
  id              String   @id @default("singleton")
  enabled         Boolean  @default(false)
  appUrl          String   @map("app_url")
  idpEntityId     String   @map("idp_entity_id")
  idpSsoUrl       String   @map("idp_sso_url")
  idpCertificate  String   @map("idp_certificate")
  spEntityId      String   @map("sp_entity_id")
  attrUid         String   @default("uid") @map("attr_uid")
  attrDisplayName String   @default("displayName") @map("attr_display_name")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("saml_config")
}
```

- `appUrl`: The public-facing URL of the app (e.g., `https://repan.company.com`). Used to derive SP entity ID and ACS URL. Configured by superadmin on the SSO settings page.
- `spEntityId`: Same as `appUrl` — the app URL serves as the SP entity ID.
- `attrUid`: The SAML attribute name containing the user's unique identifier. Defaults to `uid`.
- `attrDisplayName`: The SAML attribute name containing the user's display name. Defaults to `displayName`.
- `idpEntityId`, `idpSsoUrl`, `idpCertificate`: Extracted from IdP metadata XML.
- `enabled`: Toggle to activate/deactivate SSO. Only available after config is saved.

### User Model Additions

```prisma
ssoUid    String?  @unique @map("sso_uid")
ssoUser   Boolean  @default(false) @map("sso_user")
```

- `ssoUid`: The stable UID from the SAML assertion. Null for local users. Unique constraint prevents duplicate SSO accounts.
- `ssoUser`: Distinguishes SSO-provisioned users from locally created ones.

## API Routes

### `POST /api/admin/saml` — Save SSO Configuration

**Auth:** Superadmin only (`requireSession()` + `isSuperAdmin` check).

**Request body (configure):**
```json
{ "metadataUrl": "https://idp.company.com/metadata" }
```
or:
```json
{ "metadataXml": "<EntityDescriptor>...</EntityDescriptor>" }
```
and:
```json
{ "appUrl": "https://repan.company.com" }
```

**Behavior:**
1. Fetch metadata from URL (or use provided XML)
2. Parse XML to extract IdP entity ID, SSO URL, signing certificate
3. Derive SP entity ID from `appUrl`
4. Upsert into `SamlConfig` table

**Request body (toggle):**
```json
{ "enabled": true }
```

Only succeeds if config already exists.

**Response:** Saved config (certificate truncated for display).

### `GET /api/admin/saml` — Read SSO Configuration

**Auth:** Superadmin only.

**Response:** Current `SamlConfig` (certificate truncated), plus the computed ACS callback URL (`{appUrl}/api/auth/saml/callback`).

### `GET /api/auth/saml/login` — Initiate SAML Login

**Auth:** None (unauthenticated users call this).

**Behavior:**
1. Load `SamlConfig` from DB
2. If SSO not enabled, return 404
3. Use `node-saml` to generate AuthnRequest
4. Redirect browser to IdP SSO URL with encoded request

### `POST /api/auth/saml/callback` — SAML ACS Endpoint

**Auth:** None (NetIQ POSTs here).

**Behavior:**
1. Load `SamlConfig` from DB
2. Use `node-saml` to validate the SAML response (signature, timestamps, audience)
3. Extract UID and display name from assertion attributes
4. Look up user by `ssoUid`:
   - **Found:** Update display name if changed from SAML. Call `setSession(userId)`.
   - **Not found:** Create new user with `role: staff`, `ssoUser: true`, `ssoUid: <uid>`, `name: <displayName>`, random `avatarColor`, no team. Call `setSession(userId)`.
5. Check team memberships:
   - **Has teams:** Redirect to `/tasks` (or `/team-select` if multiple teams)
   - **No teams:** Redirect to `/team-select` (limbo state)

## Middleware Changes

**File:** `src/middleware.ts`

Add `/api/auth/saml/callback` to the unauthenticated bypass list. The ACS endpoint must be accessible without a session since NetIQ POSTs to it before the user has one.

The existing session/team redirect logic handles SSO users identically to local users — no other changes needed.

## Login Page Changes

**File:** `src/app/(auth)/login/page.tsx`

- `GET /api/bootstrap` response gains an `ssoEnabled: boolean` field
- If `ssoEnabled` is true: render a "Sign in with SSO" button above the existing user-picker. The button navigates to `/api/auth/saml/login`.
- If `ssoEnabled` is false: login page works exactly as today
- The existing user-picker remains visible in both cases (backdoor for dev/local access)

## Team Select / Limbo State

**File:** `src/app/(auth)/team-select/page.tsx`

- If the authenticated user has zero team memberships: display a message like "Your account has been created. A manager will assign you to a team shortly." instead of the team list.
- The user remains on this page until a manager adds them to a team via the admin page.

## Admin UI: SSO Tab

**File:** `src/app/admin/page.tsx`

New "SSO" tab, visible only to superadmins. Contains:

1. **App URL field** — text input for the public-facing URL
2. **IdP Metadata URL field** — text input
3. **"Fetch & Save" button** — fetches metadata, parses, stores config
4. **Post-save confirmation** — displays parsed IdP entity ID and SSO URL
5. **Attribute mapping fields** — text inputs for UID attribute name (default: `uid`) and display name attribute name (default: `displayName`)
6. **SP info display** — shows the SP entity ID and ACS callback URL (computed from App URL) that the NetIQ admin needs to register
7. **Enable/Disable toggle** — only available after config is saved

## Dependencies

**New npm package:**
- `@node-saml/node-saml` — SAML AuthnRequest generation, assertion validation, XML signature verification

**No new environment variables.** All SSO configuration lives in the database.

## SAML Attribute Mapping

Expected attributes in the SAML assertion:

| SAML Attribute (default) | Config Field | Maps To | Required |
|---|---|---|---|
| `uid` | `attrUid` | `User.ssoUid` | Yes |
| `displayName` | `attrDisplayName` | `User.name` | No (falls back to UID) |

The attribute names are configurable via the `SamlConfig` fields `attrUid` and `attrDisplayName`, editable on the admin SSO page. This accommodates IdPs that use non-standard attribute names.

## Security Considerations

- SAML assertions are validated for signature, timestamps, and audience restriction
- The IdP signing certificate is stored in the database, not in env vars — superadmin can rotate it by re-importing metadata
- The ACS endpoint only accepts POST requests
- JIT-provisioned users cannot access any team data until explicitly assigned by a manager
- The local user-picker remains as a fallback — this is intentional for dev/bootstrap scenarios, not a security hole in production (production deployments would rely on SSO)

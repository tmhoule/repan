# Session Security Implementation

## Overview

The session management system uses cryptographically signed tokens instead of plain user IDs. This prevents session forgery attacks where an attacker could guess or enumerate user IDs to impersonate users.

## How It Works

### Token Structure

Session tokens follow this format:
```
userId.timestamp.signature
```

- **userId**: The user's unique identifier
- **timestamp**: Unix timestamp (milliseconds) when the token was created
- **signature**: HMAC-SHA256 signature of `userId.timestamp` using a secret key

### Security Features

1. **HMAC-SHA256 Signing**: Tokens are signed with a cryptographically secure hash function
2. **Timing-Safe Comparison**: Signature verification uses constant-time comparison to prevent timing attacks
3. **Expiration Validation**: Tokens include creation timestamp for age-based validation
4. **Database-Stored Secret**: Secret key is stored in the database and can be managed via the admin UI
5. **Secret Caching**: Secret is cached for 5 minutes to avoid excessive database queries

## Configuration

### Easy Management via Admin UI (Recommended)

1. Log in as a super admin
2. Go to **Admin Panel** → **SSO** tab
3. Scroll to the **Session Security** section
4. Click **"Generate"** to create a new session secret

The secret is automatically:
- Generated with 256 bits of cryptographic randomness
- Stored securely in the database
- Applied immediately to all new sessions

### Environment Variable (Optional Fallback)

You can optionally set `SESSION_SECRET` in your environment, but this is **not required**. The database-stored secret takes priority.

```bash
SESSION_SECRET="<64-character-hex-string>"
```

To generate a secret manually:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Priority Order

The system checks for secrets in this order:
1. **Database-stored secret** (preferred) - managed via admin UI
2. **SESSION_SECRET environment variable** (fallback) - for compatibility
3. **Auto-generated** (last resort) - generates random key on startup (dev only, warning in production)

## Implementation Details

### Files Modified

1. **`src/lib/crypto.ts`** (MODIFIED)
   - `createSignedToken(value)`: Creates a signed token with timestamp (async)
   - `verifySignedToken(token, maxAgeMs?)`: Verifies signature and expiration (async)
   - `generateRandomToken(bytes)`: Generates cryptographically secure random tokens
   - `clearSecretCache()`: Clears the cached secret (called after regeneration)
   - Secret retrieved from database with 5-minute cache

2. **`src/lib/session.ts`** (MODIFIED)
   - `setSession(userId)`: Now creates signed tokens instead of storing plain user IDs (async)
   - `getSession()`: Now verifies token signatures and expiration (30 days) (async)

3. **`src/prisma/schema.prisma`** (MODIFIED)
   - Added `SystemConfig` model with `sessionSecret` field

4. **`src/prisma/migrations/20260402000000_add_system_config/`** (NEW)
   - Database migration for `system_config` table

5. **`src/app/api/admin/session-secret/route.ts`** (NEW)
   - GET: Check if secret is configured
   - POST: Generate new session secret

6. **`src/app/admin/page.tsx`** (MODIFIED)
   - Added "Session Security" section in SSO tab (super admin only)
   - UI to generate/regenerate session secrets
   - Shows configuration status and last updated time

### Token Expiration

Session tokens expire after **30 days** from creation. This is enforced at both:
- Cookie level: `maxAge: 30 days`
- Token level: Signature verification checks timestamp

## Migration Guide

### Existing Sessions

⚠️ **Breaking Change**: All existing sessions will be invalidated after deploying this update.

- Users will be logged out automatically
- They will need to log in again to receive new signed tokens
- This is a one-time event during the security upgrade

### Deployment Steps

**Option 1: Database-Managed Secret (Recommended)**

1. Deploy the updated code with database migration
2. Log in as super admin
3. Go to Admin Panel → SSO tab → Session Security
4. Click "Generate" to create the session secret
5. Notify users they will need to log in again

**Option 2: Environment Variable (Legacy/Compatibility)**

1. Generate a secret key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Set environment variable in your deployment:
   ```bash
   export SESSION_SECRET="your-generated-key-here"
   ```

3. Deploy the updated code

4. (Optional) Later migrate to database-stored secret via admin UI

### Multi-Server Deployments

If running multiple server instances (load-balanced):

**With Database-Stored Secret (Recommended):**
- All servers automatically use the same secret from the database
- Secret is cached for 5 minutes per server to minimize database load
- Cache invalidated immediately on all servers after regeneration (on next request)

**With Environment Variable:**
- Use the **same `SESSION_SECRET`** across all instances
- Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)
- Rotate manually during maintenance windows

## Security Considerations

### What This Protects Against

✅ **Session Forgery**: Attackers cannot forge valid session tokens without the secret key
✅ **Session Fixation**: Timestamps prevent old/stolen tokens from being reused indefinitely
✅ **Timing Attacks**: Constant-time comparison prevents signature leakage via timing analysis
✅ **Enumeration Attacks**: Even if an attacker enumerates user IDs, they cannot create valid signatures

### What This Does NOT Protect Against

❌ **Cookie Theft (XSS)**: If an attacker steals the cookie via XSS, the token is still valid
   - Mitigation: `HttpOnly` flag is already set (prevents JavaScript access)
   - Mitigation: Implement Content Security Policy (CSP) headers

❌ **Man-in-the-Middle (MITM)**: If an attacker intercepts the cookie over HTTP
   - Mitigation: `Secure` flag is set in production (requires HTTPS)
   - Mitigation: Deploy with HTTPS/SSL (already done via Nginx)

❌ **Session Hijacking**: If an attacker obtains a valid session token
   - Mitigation: Implement IP address validation (optional)
   - Mitigation: Implement user-agent validation (optional)
   - Mitigation: Shorter session timeouts for sensitive operations

## Admin UI Features

### Session Security Panel

Located in **Admin Panel → SSO tab** (super admin only):

**Status Display:**
- Shows whether a secret is configured
- Displays last generation/update time
- Indicates if using fallback (environment variable or auto-generated)

**Generate Button:**
- Creates a new 256-bit cryptographically random secret
- Stores it in the database
- Clears the cache immediately
- Shows confirmation dialog warning about session invalidation

**Warning Messages:**
- Alerts admin that regeneration will log out all users
- Provides clear feedback on success/error

## Testing

Run the test suite to verify crypto utilities:

```bash
npm test -- src/lib/__tests__/crypto.test.ts
```

Tests cover:
- Token creation and verification (async)
- Tamper detection
- Expiration validation
- Random token generation
- Database mocking

## Troubleshooting

### "No secret configured" warning in logs

**Cause**: No secret in database and no `SESSION_SECRET` environment variable
**Solution**: Generate a secret via Admin Panel → SSO → Session Security → Generate

### Sessions invalidated after server restart

**Cause**: Using auto-generated secret (fallback) which changes on restart
**Solution**: Generate a permanent secret via admin UI or set `SESSION_SECRET` environment variable

### Cache not updating after regeneration

**Cause**: Cache TTL is 5 minutes
**Solution**: Cache is automatically cleared when you regenerate via admin UI. For environment variable changes, restart the server.

### All servers not using same secret

**Cause**: Likely using environment variables with different values
**Solution**: Use database-stored secret (recommended) or ensure all servers have the same `SESSION_SECRET` value

## Future Enhancements

Consider implementing:

1. **Session Rotation**: Regenerate tokens on sensitive actions
2. **IP Binding**: Bind sessions to originating IP address
3. **Device Fingerprinting**: Track and validate device characteristics
4. **Session Revocation**: Database-backed session tracking for immediate revocation
5. **Audit Logging**: Log all authentication and token validation events
6. **Secret Rotation Schedule**: Automatic rotation every N days with grace period

## Additional Resources

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [HMAC-SHA256 Specification](https://tools.ietf.org/html/rfc2104)

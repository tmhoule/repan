# Comprehensive Security Hardening

This document details the security improvements implemented to protect against common web application vulnerabilities.

## Overview

This security hardening implementation addresses multiple OWASP Top 10 vulnerabilities:

1. **SSRF (Server-Side Request Forgery)** protection
2. **Security headers** to prevent XSS, clickjacking, and other attacks
3. **Rate limiting** to prevent brute force and DoS attacks
4. **CSRF (Cross-Site Request Forgery)** protection

## 1. SSRF Protection

### Problem
The SAML metadata endpoint accepted arbitrary URLs without validation, allowing potential attacks on internal services, cloud metadata endpoints, or internal network scanning.

### Solution
Implemented comprehensive URL validation with multiple security checks:

**File:** `/src/app/api/admin/saml/route.ts`

**Protections:**
- ✅ **HTTPS-only**: Blocks HTTP URLs
- ✅ **Private IP blocking**: Rejects 10.x.x.x, 172.16-31.x.x, 192.168.x.x ranges
- ✅ **Localhost blocking**: Prevents 127.0.0.1, ::1, localhost
- ✅ **Link-local blocking**: Blocks 169.254.x.x range
- ✅ **Metadata endpoint blocking**: Specifically blocks 169.254.169.254 (AWS metadata)
- ✅ **IPv6 private range blocking**: Blocks fc00::/7 and fd00::/8
- ✅ **Request timeout**: 10-second timeout prevents hanging requests
- ✅ **Size limits**: 1MB maximum metadata file size
- ✅ **User-Agent header**: Identifies requests as from Repan

**Example blocked URLs:**
```
http://example.com          → Blocked (not HTTPS)
https://localhost/secret    → Blocked (localhost)
https://10.0.0.1/internal   → Blocked (private IP)
https://169.254.169.254     → Blocked (AWS metadata)
https://192.168.1.1/admin   → Blocked (private IP)
```

## 2. Security Headers

### Problem
Missing HTTP security headers left the application vulnerable to XSS, clickjacking, MIME sniffing, and other client-side attacks.

### Solution
Comprehensive security headers configured in Next.js.

**File:** `/next.config.ts`

**Headers implemented:**

| Header | Value | Protection |
|--------|-------|------------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking attacks |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS (with SSL) |
| `Permissions-Policy` | `camera=(), microphone=(), ...` | Disables unnecessary features |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Content-Security-Policy` | See details | Prevents XSS and injection attacks |

**Content Security Policy (CSP):**
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
```

**Note:** `unsafe-eval` and `unsafe-inline` are required for Next.js and Tailwind CSS. These can be tightened further with nonces in future iterations.

## 3. Rate Limiting

### Problem
No rate limiting allowed unlimited requests, enabling brute force attacks, user enumeration, search DoS, and API abuse.

### Solution
Implemented in-memory rate limiting with configurable limits per endpoint type.

**File:** `/src/lib/rate-limit.ts`

**Architecture:**
- **In-memory store** for single-server deployments
- **Client identification** via IP address (from X-Forwarded-For or X-Real-IP headers)
- **Automatic cleanup** of expired entries every 5 minutes
- **Configurable limits** per endpoint type
- **Standard rate limit headers** (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

**Rate Limit Presets:**

| Endpoint Type | Limit | Window | Use Case |
|---------------|-------|--------|----------|
| **AUTH** | 5 requests | 15 minutes | Login attempts (prevents brute force) |
| **SEARCH** | 30 requests | 1 minute | Search queries (prevents DoS) |
| **API** | 100 requests | 1 minute | General API calls |
| **ADMIN** | 20 requests | 1 minute | Admin operations |

**Applied to endpoints:**
- ✅ `/api/auth/login` - AUTH limits (5 per 15 min)
- ✅ `/api/search` - SEARCH limits (30 per minute)

**Response on limit exceeded:**
```json
{
  "error": "Too many login attempts. Please try again later."
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735850400000
```

**Future enhancement:** For multi-server deployments, migrate to Redis-backed rate limiting using `@upstash/ratelimit`.

## 4. CSRF Protection

### Problem
No CSRF token validation allowed cross-site request forgery attacks on state-changing operations.

### Solution
Implemented double-submit cookie pattern with custom header validation.

**Files:**
- `/src/lib/csrf.ts` - Server-side CSRF utilities
- `/src/lib/csrf-client.ts` - Client-side fetch wrapper
- `/src/middleware.ts` - CSRF validation in middleware
- `/src/app/api/csrf/route.ts` - Token generation endpoint

**How it works:**

1. **Token Generation:**
   - Server generates 256-bit random token
   - Token stored in cookie (`repan_csrf`, HttpOnly: false)
   - Token valid for 24 hours

2. **Token Validation:**
   - Client includes token in `X-CSRF-Token` header
   - Server compares header token with cookie token
   - Validation occurs in middleware for all POST/PUT/PATCH/DELETE requests

3. **Client-Side Integration:**
   ```typescript
   import { csrfFetch } from '@/lib/csrf-client';
   
   // Automatically includes CSRF token
   const response = await csrfFetch('/api/tasks', {
     method: 'POST',
     body: JSON.stringify(data),
   });
   ```

4. **Automatic Retry:**
   - If CSRF validation fails (403), client clears cached token
   - Fetches fresh token and retries request once

**Exemptions:**
- ✅ GET/HEAD/OPTIONS requests (not state-changing)
- ✅ `/api/auth/saml/callback` (external POST from IdP)

**Example flow:**
```
1. Client requests CSRF token: GET /api/csrf
   → Server responds: { "token": "abc123..." }
   → Server sets cookie: repan_csrf=abc123...

2. Client makes state-changing request:
   POST /api/tasks
   Headers: X-CSRF-Token: abc123...
   
3. Middleware validates:
   - Check header: X-CSRF-Token === "abc123..."
   - Check cookie: repan_csrf === "abc123..."
   - Match? → Allow request
   - No match? → 403 Forbidden
```

## Testing

### Rate Limiting Tests
```bash
npm test -- src/lib/__tests__/rate-limit.test.ts
```

**Coverage:**
- ✅ Allows requests under limit
- ✅ Blocks requests over limit
- ✅ Tracks different IPs separately
- ✅ Returns correct rate limit info

### CSRF Tests
```bash
npm test -- src/lib/__tests__/csrf.test.ts
```

**Coverage:**
- ✅ Rejects requests without CSRF header
- ✅ Rejects requests without CSRF cookie
- ✅ Rejects mismatched tokens
- ✅ Accepts matching tokens

## Client-Side Integration Guide

### 1. Using CSRF-Protected Fetch

Replace standard `fetch` with `csrfFetch`:

```typescript
// Before
await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(taskData),
});

// After
import { csrfFetch } from '@/lib/csrf-client';

await csrfFetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(taskData),
});
```

### 2. Preloading CSRF Token

Add to root layout for better UX:

```typescript
'use client';
import { usePreloadCsrfToken } from '@/lib/csrf-client';

export default function RootLayout() {
  usePreloadCsrfToken(); // Preload token on mount
  
  return <html>...</html>;
}
```

### 3. Clearing CSRF Token on Logout

```typescript
import { clearCsrfToken } from '@/lib/csrf-client';

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  clearCsrfToken(); // Clear cached token
  router.push('/login');
}
```

## Deployment Considerations

### Single-Server Deployment
- ✅ Rate limiting works out of the box (in-memory)
- ✅ CSRF tokens work automatically
- ✅ No additional setup required

### Multi-Server Deployment (Load Balanced)
- ⚠️ **Rate limiting limitation**: In-memory store is per-server
- **Solution options:**
  1. Use sticky sessions (route same IP to same server)
  2. Migrate to Redis-backed rate limiting (`@upstash/ratelimit`)
  
**CSRF and Security Headers:**
- ✅ Work correctly across multiple servers (no shared state needed)

### Environment Variables

No new environment variables required. All features work out of the box.

Optional (for multi-server rate limiting):
```bash
# For @upstash/ratelimit (future enhancement)
UPSTASH_REDIS_URL="..."
UPSTASH_REDIS_TOKEN="..."
```

## Security Headers Testing

Test your headers with:
- [SecurityHeaders.com](https://securityheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)

Expected rating: **A** or **A+**

## Performance Impact

All security features are designed for minimal performance impact:

| Feature | Impact | Notes |
|---------|--------|-------|
| **SSRF Protection** | Negligible | Only affects SAML config (rare operation) |
| **Security Headers** | None | Headers cached by Next.js |
| **Rate Limiting** | < 1ms | In-memory lookup, automatic cleanup |
| **CSRF Validation** | < 1ms | Simple string comparison |

**Total overhead per request:** < 2ms

## Monitoring & Alerting

### Rate Limit Monitoring

Monitor for unusual patterns:
```javascript
// Count 429 responses
if (response.status === 429) {
  // Alert: Potential brute force or DoS attempt
}
```

### CSRF Failure Monitoring

```javascript
// Count 403 CSRF failures
if (response.status === 403 && error.includes('CSRF')) {
  // Alert: Potential CSRF attack or token expiration
}
```

## Future Enhancements

1. **Redis-backed rate limiting** for multi-server deployments
2. **CSP nonce generation** for stricter Content Security Policy
3. **Anomaly detection** for rate limit patterns
4. **IP reputation scoring** for smarter rate limits
5. **CAPTCHA integration** after repeated rate limit violations
6. **Audit logging** of security events

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "./db";

// Cache for the secret key to avoid database queries on every request
let secretKeyCache: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get or generate a secret key for signing session tokens
 * Priority order:
 * 1. Database-stored secret (preferred)
 * 2. SESSION_SECRET environment variable (fallback for migration/compatibility)
 * 3. Auto-generated (dev only, warning in production)
 */
async function getSecretKey(): Promise<string> {
  // Check cache first (to avoid DB query on every request)
  const now = Date.now();
  if (secretKeyCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return secretKeyCache;
  }

  // Environment variable takes priority — always available, no async/race issues
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret) {
    secretKeyCache = envSecret;
    cacheTimestamp = now;
    return envSecret;
  }

  try {
    // Try database-stored secret
    const config = await prisma.systemConfig.findUnique({
      where: { id: "singleton" },
      select: { sessionSecret: true },
    });

    if (config?.sessionSecret) {
      secretKeyCache = config.sessionSecret;
      cacheTimestamp = now;
      return config.sessionSecret;
    }
  } catch (error) {
    // Database might not be initialized yet or migration not run
    console.warn("Could not fetch session secret from database:", error);
  }

  // No secret configured — generate one and persist it to the database
  const randomKey = randomBytes(32).toString("hex");
  try {
    await prisma.systemConfig.upsert({
      where: { id: "singleton" },
      update: { sessionSecret: randomKey },
      create: { id: "singleton", sessionSecret: randomKey },
    });
    console.log("Auto-generated and persisted session secret to database");
  } catch (error) {
    console.warn("Could not persist session secret to database — sessions will not survive restart:", error);
  }
  secretKeyCache = randomKey;
  cacheTimestamp = now;
  return randomKey;
}

/**
 * Clear the secret key cache
 * Call this after updating the secret in the database
 */
export function clearSecretCache(): void {
  secretKeyCache = null;
  cacheTimestamp = 0;
}

/**
 * Sign a value with HMAC-SHA256
 */
async function sign(value: string): Promise<string> {
  const secret = await getSecretKey();
  const hmac = createHmac("sha256", secret);
  hmac.update(value);
  return hmac.digest("hex");
}

/**
 * Create a signed token in format: value.timestamp.signature
 * The timestamp allows for token expiration validation
 */
export async function createSignedToken(value: string): Promise<string> {
  const timestamp = Date.now().toString();
  const payload = `${value}.${timestamp}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

/**
 * Verify and extract value from a signed token
 * Returns null if signature is invalid or token is expired
 */
export async function verifySignedToken(token: string, maxAgeMs?: number): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [value, timestamp, providedSignature] = parts;
    
    // Verify signature
    const payload = `${value}.${timestamp}`;
    const expectedSignature = await sign(payload);
    
    // Use timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(Buffer.from(providedSignature, "hex"), Buffer.from(expectedSignature, "hex"))) {
      return null;
    }

    // Check expiration if maxAgeMs provided
    if (maxAgeMs !== undefined) {
      const tokenTime = parseInt(timestamp, 10);
      const now = Date.now();
      if (now - tokenTime > maxAgeMs) {
        return null; // Token expired
      }
    }

    return value;
  } catch (error) {
    // Any error in parsing/verification means invalid token
    return null;
  }
}

/**
 * Generate a cryptographically secure random token
 * Useful for CSRF tokens, API keys, session secrets, etc.
 */
export function generateRandomToken(bytes: number = 32): string {
  return randomBytes(bytes).toString("hex");
}

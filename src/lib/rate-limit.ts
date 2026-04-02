import { NextRequest } from "next/server";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory rate limit store (for single-server deployments)
// For multi-server deployments, use Redis with @upstash/ratelimit
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Identifier for the rate limit (e.g., "login", "api", "search")
   */
  identifier: string;
}

/**
 * Extract client identifier from request
 * Uses IP address, but falls back to user agent if IP not available
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (behind proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to user agent (less reliable)
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `ua:${userAgent.substring(0, 100)}`;
}

/**
 * Check if request should be rate limited
 * Returns { limited: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number; total: number } {
  const clientId = getClientIdentifier(request);
  const key = `${config.identifier}:${clientId}`;
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore[key];
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore[key] = entry;
  }
  
  // Increment count
  entry.count++;
  
  // Check if limit exceeded
  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  
  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
    total: config.maxRequests,
  };
}

/**
 * Helper to create rate limit response headers
 */
export function getRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
  total: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.total.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetTime.toString(),
  };
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    identifier: 'auth',
  },
  
  // Search endpoints - moderate
  SEARCH: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'search',
  },
  
  // General API - lenient
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'api',
  },
  
  // Admin operations - moderate
  ADMIN: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'admin',
  },
} as const;

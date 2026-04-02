import { NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "../rate-limit";

describe("Rate Limiting", () => {
  function createMockRequest(ip: string = "127.0.0.1"): NextRequest {
    return {
      headers: new Map([
        ["x-forwarded-for", ip],
      ]),
      method: "GET",
      url: "http://localhost/api/test",
    } as any;
  }

  it("should allow requests under the limit", () => {
    const request = createMockRequest("192.168.1.1");
    
    for (let i = 0; i < RATE_LIMITS.AUTH.maxRequests; i++) {
      const result = checkRateLimit(request, RATE_LIMITS.AUTH);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    }
  });

  it("should block requests over the limit", () => {
    const request = createMockRequest("192.168.1.2");
    
    // Exhaust the limit
    for (let i = 0; i < RATE_LIMITS.AUTH.maxRequests; i++) {
      checkRateLimit(request, RATE_LIMITS.AUTH);
    }
    
    // Next request should be blocked
    const result = checkRateLimit(request, RATE_LIMITS.AUTH);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should track different IPs separately", () => {
    const request1 = createMockRequest("192.168.1.3");
    const request2 = createMockRequest("192.168.1.4");
    
    // Exhaust limit for IP 1
    for (let i = 0; i < RATE_LIMITS.AUTH.maxRequests; i++) {
      checkRateLimit(request1, RATE_LIMITS.AUTH);
    }
    
    const result1 = checkRateLimit(request1, RATE_LIMITS.AUTH);
    expect(result1.limited).toBe(true);
    
    // IP 2 should still be allowed
    const result2 = checkRateLimit(request2, RATE_LIMITS.AUTH);
    expect(result2.limited).toBe(false);
  });

  it("should return correct rate limit info", () => {
    const request = createMockRequest("192.168.1.5");
    
    const result = checkRateLimit(request, RATE_LIMITS.AUTH);
    
    expect(result.total).toBe(RATE_LIMITS.AUTH.maxRequests);
    expect(result.remaining).toBe(RATE_LIMITS.AUTH.maxRequests - 1);
    expect(result.resetTime).toBeGreaterThan(Date.now());
  });
});

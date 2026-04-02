import { NextRequest } from "next/server";
import { verifyCsrfToken } from "../csrf";

// Mock cookies and generateRandomToken
jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("../crypto", () => ({
  generateRandomToken: jest.fn(() => "mock-token-123"),
}));

describe("CSRF Protection", () => {
  const createMockRequest = (
    headerToken?: string,
    cookieToken?: string
  ): NextRequest => {
    const headers = new Map<string, string>();
    if (headerToken) {
      headers.set("x-csrf-token", headerToken);
    }

    const cookies = new Map();
    if (cookieToken) {
      cookies.set("repan_csrf", { value: cookieToken });
    }

    return {
      headers,
      cookies: {
        get: (name: string) => cookies.get(name),
      },
      method: "POST",
    } as any;
  };

  it("should reject request without CSRF header", async () => {
    const request = createMockRequest(undefined, "token123");
    const valid = await verifyCsrfToken(request);
    expect(valid).toBe(false);
  });

  it("should reject request without CSRF cookie", async () => {
    const request = createMockRequest("token123", undefined);
    const valid = await verifyCsrfToken(request);
    expect(valid).toBe(false);
  });

  it("should reject mismatched tokens", async () => {
    const request = createMockRequest("token123", "token456");
    const valid = await verifyCsrfToken(request);
    expect(valid).toBe(false);
  });

  it("should accept matching tokens", async () => {
    const request = createMockRequest("token123", "token123");
    const valid = await verifyCsrfToken(request);
    expect(valid).toBe(true);
  });
});

import { createSignedToken, verifySignedToken, generateRandomToken } from "../crypto";

// Mock prisma to avoid database dependency in tests
jest.mock("../db", () => ({
  prisma: {
    systemConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

describe("Crypto utilities", () => {
  describe("createSignedToken and verifySignedToken", () => {
    it("should create and verify a valid token", async () => {
      const value = "user123";
      const token = await createSignedToken(value);
      const verified = await verifySignedToken(token);
      expect(verified).toBe(value);
    });

    it("should reject a tampered token", async () => {
      const value = "user123";
      const token = await createSignedToken(value);
      // Tamper with the token
      const tamperedToken = token.replace("user123", "user456");
      const verified = await verifySignedToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it("should reject a token with invalid signature", async () => {
      const token = "user123.1234567890.invalidsignature";
      const verified = await verifySignedToken(token);
      expect(verified).toBeNull();
    });

    it("should reject a malformed token", async () => {
      const token = "invalidtoken";
      const verified = await verifySignedToken(token);
      expect(verified).toBeNull();
    });

    it("should reject an expired token", async () => {
      const value = "user123";
      const token = await createSignedToken(value);
      
      // Wait a bit and verify with very short maxAge
      await new Promise(resolve => setTimeout(resolve, 10));
      const verifiedAfterDelay = await verifySignedToken(token, 1);
      expect(verifiedAfterDelay).toBeNull();
    });

    it("should accept a token within maxAge", async () => {
      const value = "user123";
      const token = await createSignedToken(value);
      
      // Verify with maxAge of 1 hour
      const verified = await verifySignedToken(token, 60 * 60 * 1000);
      expect(verified).toBe(value);
    });
  });

  describe("generateRandomToken", () => {
    it("should generate a random token of default length", () => {
      const token = generateRandomToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it("should generate a random token of custom length", () => {
      const token = generateRandomToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it("should generate different tokens each time", () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      expect(token1).not.toBe(token2);
    });
  });
});

import { describe, expect, it } from "vitest";

import { loginSchema } from "./auth-schema";

describe("auth-schema", () => {
  it("should accept valid login payloads", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "Tester123.",
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid emails", () => {
    const result = loginSchema.safeParse({
      email: "invalid-email",
      password: "Tester123.",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain("E-mail inválido");
  });
});

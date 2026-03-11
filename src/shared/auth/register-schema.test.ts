import { describe, expect, it } from "vitest";

import { registerSchema } from "./register-schema";

describe("register-schema", () => {
  it("should accept strong passwords with matching confirmation", () => {
    const result = registerSchema.safeParse({
      name: "Tester",
      email: "tester@example.com",
      password: "Tester123.",
      confirmPassword: "Tester123.",
    });

    expect(result.success).toBe(true);
  });

  it("should reject mismatched password confirmation", () => {
    const result = registerSchema.safeParse({
      name: "Tester",
      email: "tester@example.com",
      password: "Tester123.",
      confirmPassword: "Tester1234.",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.confirmPassword).toContain(
      "As senhas não coincidem",
    );
  });
});

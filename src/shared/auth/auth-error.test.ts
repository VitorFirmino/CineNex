import { describe, expect, it } from "vitest";
import { translateAuthError } from "./auth-error";

describe("auth-error", () => {
  it("should translate known auth provider errors", () => {
    expect(translateAuthError("Invalid login credentials", "login")).toBe(
      "Credenciais inválidas. Verifique e-mail e senha.",
    );
    expect(translateAuthError("Token has expired or is invalid", "verify")).toBe(
      "Código inválido ou expirado. Solicite um novo código e tente novamente.",
    );
  });

  it("should preserve throttling messages already written in portuguese", () => {
    expect(
      translateAuthError("Muitas tentativas em pouco tempo", "login"),
    ).toBe("Muitas tentativas em pouco tempo");
  });

  it("should fallback by auth context for unknown messages", () => {
    expect(translateAuthError("unexpected", "reset")).toBe(
      "Não foi possível redefinir sua senha agora. Tente novamente.",
    );
  });
});

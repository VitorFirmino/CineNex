import { expect, test } from "@playwright/test";
import {
  e2eAdminCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

test.describe("accessibility smoke", () => {
  test("should expose the core landmarks and accessible auth controls", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("main").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Filmes/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Séries/i }).first()).toBeVisible();

    await page.goto("/login");

    await expect(page.getByRole("main").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bem-vindo" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
    await expect(page.locator('input[aria-label="Senha"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Fazer login" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mostrar senha|Esconder senha/i })).toBeVisible();
  });

  test.skip(
    !e2eAdminCredentials,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the admin accessibility flow.",
  );

  test("should expose a described dialog for catalog diagnostics", async ({
    page,
  }) => {
    await loginWithCredentials(page, e2eAdminCredentials!, "/admin/content");
    await expect(page).toHaveURL(/\/admin\/content$/, { timeout: 15_000 });

    await page.getByRole("button", { name: "Ver Relatório Completo" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const dialogDescriptionId = await dialog.getAttribute("aria-describedby");
    expect(dialogDescriptionId).toBeTruthy();

    const description = page.locator(`#${dialogDescriptionId}`);
    await expect(description).toContainText(/problemas detectados na fonte atual/i);
  });
});

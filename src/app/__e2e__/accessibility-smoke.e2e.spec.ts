import { expect, test, type Page } from "@playwright/test";
import {
  e2eAdminCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

async function openCatalogDiagnosticsDialog(page: Page) {
  const openReportButton = page.getByRole("button", {
    name: "Ver Relatório Completo",
  });
  await expect(openReportButton).toBeVisible({ timeout: 15_000 });
  await openReportButton.dispatchEvent("click");
}

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
    await expect(page.getByText("Relatório de Saúde do Catálogo")).toBeVisible({
      timeout: 15_000,
    });

    await openCatalogDiagnosticsDialog(page);

    const dialogHeading = page.getByRole("heading", {
      name: /Diagnóstico do Catálogo em Tempo Real/i,
    });
    await expect(dialogHeading).toBeVisible({ timeout: 15_000 });

    const dialog = page.locator("[role='dialog']").filter({ has: dialogHeading });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const dialogDescriptionId = await dialog.getAttribute("aria-describedby");
    expect(dialogDescriptionId).toBeTruthy();

    const description = page.locator(`#${dialogDescriptionId}`);
    await expect(description).toContainText(/problemas detectados na fonte atual/i);
  });
});

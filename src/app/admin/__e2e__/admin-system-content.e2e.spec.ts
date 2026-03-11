import { expect, test, type Page } from "@playwright/test";
import {
  e2eAdminCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

async function readMaintenanceState(page: Page) {
  return await page.evaluate(async () => {
    const response = await fetch("/api/admin/maintenance");
    return await response.json();
  });
}

test.describe("admin system and content", () => {
  test.skip(
    !e2eAdminCredentials,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the admin system/content flows.",
  );

  test("should load system checks and catalog diagnostics for admins", async ({ page }) => {
    await loginWithCredentials(page, e2eAdminCredentials!, "/admin/system");
    await expect(page).toHaveURL(/\/admin\/system$/, { timeout: 15_000 });

    await expect(
      page.getByRole("heading", { name: /Status do Sistema/i }),
    ).toBeVisible();
    await expect(page.getByText("PostgreSQL (Prisma)")).toBeVisible();
    await expect(page.getByText("Supabase Auth")).toBeVisible();
    await expect(page.getByText("TMDB API")).toBeVisible();

    await page.getByRole("button", { name: "Testar Conexões" }).click();
    await expect(page.getByText(/Conexão estável|Serviço fora do ar/i).first()).toBeVisible();
    await expect(page.getByText("Modo de Manutenção")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Encerrar Todas as Sessões Ativas" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Limpar" })).toBeVisible();

    await page.goto("/admin/content");

    await expect(
      page.getByRole("heading", { name: /Performance Catálogo/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Conteúdos Mais Favoritados (Geral)"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Atualizar Dados" }).click();
    await expect(page.getByText("Relatório de Saúde do Catálogo")).toBeVisible();

    await page.getByRole("button", { name: "Ver Relatório Completo" }).click();
    await expect(
      page.getByRole("heading", { name: /Diagnóstico do Catálogo em Tempo Real/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Nenhum problema encontrado no catálogo atual|Link Quebrado|Sem Metadados|Fonte Indisponível/i).first(),
    ).toBeVisible();
  });

  test("should execute the critical admin system actions and restore maintenance state", async ({
    page,
  }) => {
    const dialogMessages: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    await loginWithCredentials(page, e2eAdminCredentials!, "/admin/system");
    await expect(page).toHaveURL(/\/admin\/system$/, { timeout: 15_000 });

    const initialState = await readMaintenanceState(page);
    const maintenanceSwitch = page.getByRole("switch").first();
    await expect(maintenanceSwitch).toBeVisible();

    await maintenanceSwitch.click();
    await expect
      .poll(async () => (await readMaintenanceState(page)).maintenance)
      .toBe(!initialState.maintenance);

    await maintenanceSwitch.click();
    await expect
      .poll(async () => (await readMaintenanceState(page)).maintenance)
      .toBe(initialState.maintenance);

    await page.getByRole("button", { name: "Encerrar Todas as Sessões Ativas" }).click();
    await expect
      .poll(() =>
        dialogMessages.some((message) =>
          message.includes("Tem certeza que deseja encerrar todas as outras sessões?"),
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        dialogMessages.some((message) =>
          message.includes("Todas as sessões ativas (exceto a sua) foram encerradas."),
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: "Limpar" }).click();
    await expect
      .poll(() =>
        dialogMessages.some((message) =>
          message.includes("Data cache do Next.js limpo com sucesso."),
        ),
      )
      .toBe(true);
  });
});

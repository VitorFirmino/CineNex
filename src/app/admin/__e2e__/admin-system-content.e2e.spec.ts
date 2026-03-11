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

    await openCatalogDiagnosticsDialog(page);
    await expect(
      page.getByRole("heading", { name: /Diagnóstico do Catálogo em Tempo Real/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText(/Nenhum problema encontrado no catálogo atual|Link Quebrado|Sem Metadados|Fonte Indisponível/i).first(),
    ).toBeVisible();
  });

  test("should execute the critical admin system actions and restore maintenance state", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile-chrome",
      "The destructive admin action flow is already covered on Chromium and is unreliable with mobile dialog handling.",
    );

    let mockedMaintenance = false;

    await page.route("**/api/admin/maintenance", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ maintenance: mockedMaintenance }),
        });
        return;
      }

      const payload = route.request().postDataJSON() as { enabled?: boolean };
      mockedMaintenance = Boolean(payload.enabled);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ maintenance: mockedMaintenance, success: true }),
      });
    });

    await page.route("**/api/admin/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Todas as sessões ativas encerradas com sucesso.",
        }),
      });
    });

    await page.route("**/api/admin/cache", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await loginWithCredentials(page, e2eAdminCredentials!, "/admin/system");
    await expect(page).toHaveURL(/\/admin\/system$/, { timeout: 15_000 });
    await page.evaluate(() => {
      const testWindow = window as typeof window & { __adminDialogs?: string[] };
      testWindow.__adminDialogs = [];
      window.confirm = (message?: string) => {
        testWindow.__adminDialogs?.push(String(message || ""));
        return true;
      };
      window.alert = (message?: string) => {
        testWindow.__adminDialogs?.push(String(message || ""));
      };
    });

    const initialState = { maintenance: mockedMaintenance };
    const readMaintenanceFlag = async () => (await readMaintenanceState(page)).maintenance;

    try {
      const maintenanceSwitch = page.getByRole("switch").first();
      await expect(maintenanceSwitch).toBeVisible();
      await expect(maintenanceSwitch).toHaveAttribute(
        "aria-checked",
        String(initialState.maintenance),
      );
      await expect.poll(readMaintenanceFlag, { timeout: 15_000 }).toBe(initialState.maintenance);

      await maintenanceSwitch.click({ force: true });
      await expect
        .poll(async () => await maintenanceSwitch.getAttribute("aria-checked"), {
          timeout: 15_000,
        })
        .toBe(String(!initialState.maintenance));
      await expect.poll(readMaintenanceFlag, { timeout: 15_000 }).toBe(!initialState.maintenance);

      await maintenanceSwitch.click({ force: true });
      await expect
        .poll(async () => await maintenanceSwitch.getAttribute("aria-checked"), {
          timeout: 15_000,
        })
        .toBe(String(initialState.maintenance));
      await expect.poll(readMaintenanceFlag, { timeout: 15_000 }).toBe(initialState.maintenance);

      const clearSessionsButton = page.getByRole("button", {
        name: "Encerrar Todas as Sessões Ativas",
      });
      await expect(clearSessionsButton).toBeVisible({ timeout: 15_000 });
      await expect(clearSessionsButton).toBeEnabled({ timeout: 15_000 });
      await clearSessionsButton.evaluate((button) => {
        if (button instanceof HTMLButtonElement) {
          button.click();
        }
      });
      await expect
        .poll(
          async () =>
            await page.evaluate(
              () =>
                (window as typeof window & { __adminDialogs?: string[] }).__adminDialogs ?? [],
            ),
          { timeout: 15_000 },
        )
        .toContain(
          "Tem certeza que deseja encerrar todas as outras sessões?",
        );
      await expect
        .poll(
          async () =>
            await page.evaluate(
              () =>
                (window as typeof window & { __adminDialogs?: string[] }).__adminDialogs ?? [],
            ),
          { timeout: 15_000 },
        )
        .toContain(
          "Todas as sessões ativas (exceto a sua) foram encerradas.",
        );

      const clearCacheButton = page.getByRole("button", { name: "Limpar" });
      await expect(clearCacheButton).toBeVisible({ timeout: 15_000 });
      await expect(clearCacheButton).toBeEnabled({ timeout: 15_000 });
      await clearCacheButton.evaluate((button) => {
        if (button instanceof HTMLButtonElement) {
          button.click();
        }
      });
      await expect
        .poll(
          async () =>
            await page.evaluate(
              () =>
                (window as typeof window & { __adminDialogs?: string[] }).__adminDialogs ?? [],
            ),
          { timeout: 15_000 },
        )
        .toContain(
          "Data cache do Next.js limpo com sucesso.",
        );
    } finally {
      const currentMaintenance = await readMaintenanceFlag().catch(() => initialState.maintenance);
      if (currentMaintenance !== initialState.maintenance) {
        await page.goto("/admin/system");
        const maintenanceSwitch = page.getByRole("switch").first();
        await expect(maintenanceSwitch).toBeVisible();
        await maintenanceSwitch.click();
        await expect.poll(readMaintenanceFlag, { timeout: 15_000 }).toBe(initialState.maintenance);
      }
    }
  });
});

import { expect, test } from "@playwright/test";

test.describe("catalog flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/collection/movies");
    await expect(
      page.getByRole("heading", { name: /Minha Coleção/i }),
    ).toBeVisible();
  });

  test("should switch tabs, paginate, search, filter and open a detail page", async ({
    page,
  }) => {
    await page.locator("a[href='/collection/series']").first().click();
    await expect(page).toHaveURL(/\/collection\/series$/);
    await expect(page.locator("a[href^='/view/series/']").first()).toBeVisible();

    await page.locator("a[href='/collection/movies']").first().click();
    await expect(page).toHaveURL(/\/collection\/movies$/);

    await expect(page.locator("p:has-text('PÁGINA 1')")).toBeVisible();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page.locator("p:has-text('PÁGINA 2')")).toBeVisible({
      timeout: 10_000,
    });

    const searchInput = page.getByPlaceholder("Pesquisar no catálogo...");
    await searchInput.fill("harry");
    await page.waitForTimeout(450);
    await expect(page.locator("a[href^='/view/movies/']").first()).toBeVisible();

    await page.getByRole("button", { name: "FILTROS" }).click();
    const filtersDialog = page.getByRole("dialog", {
      name: /CONFIGURAÇÃO DE FILTROS/i,
    });
    await expect(filtersDialog).toBeVisible();
    await filtersDialog.getByRole("button", { name: "Netflix" }).click();
    await filtersDialog
      .getByRole("button", { name: "APLICAR FILTROS" })
      .click();
    await expect(filtersDialog).not.toBeVisible();

    await searchInput.fill("");
    await page.waitForTimeout(450);
    await page.locator("a[href^='/view/movies/']").first().click();
    await expect(page).toHaveURL(/\/view\/movies\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should avoid spamming catalog requests when switching back to movies", async ({
    page,
  }) => {
    const apiCalls: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      if (!url.includes("/api/catalog/")) return;
      apiCalls.push(url);
    });

    await page.reload();
    await expect(page.locator("a[href^='/view/movies/']").first()).toBeVisible();

    await page.locator("a[href='/collection/series']").first().click();
    await expect(page).toHaveURL(/\/collection\/series$/);
    await expect(page.locator("a[href^='/view/series/']").first()).toBeVisible();

    await page.locator("a[href='/collection/movies']").first().click();
    await expect(page).toHaveURL(/\/collection\/movies$/);
    await expect(page.locator("a[href^='/view/movies/']").first()).toBeVisible();

    const moviesHits = apiCalls.filter((url) =>
      url.includes("/api/catalog/movies?"),
    ).length;
    const groupsMoviesHits = apiCalls.filter((url) =>
      url.includes("/api/catalog/groups?type=movies"),
    ).length;

    expect(moviesHits).toBeLessThanOrEqual(2);
    expect(groupsMoviesHits).toBeLessThanOrEqual(2);
  });
});

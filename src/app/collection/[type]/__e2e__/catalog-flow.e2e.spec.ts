import { expect, test, type Page } from "@playwright/test";

async function waitForCatalogGrid(page: Page, type: "movies" | "series") {
  const firstVisibleCard = page.locator(`main a[href^='/view/${type}/']:visible`).first();
  await expect(firstVisibleCard).toBeVisible({ timeout: 15_000 });
  return firstVisibleCard;
}

async function openFirstVisibleCatalogDetail(
  page: Page,
  type: "movies" | "series",
) {
  const firstVisibleCard = await waitForCatalogGrid(page, type);
  const href = await firstVisibleCard.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "domcontentloaded" });
}

test.describe("catalog flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/, { timeout: 15_000 });
    await waitForCatalogGrid(page, "movies");
  });

  test("should switch tabs, paginate, search, filter and open a detail page", async ({
    page,
  }) => {
    await page.goto("/collection/series");
    await expect(page).toHaveURL(/\/collection\/series$/);
    await waitForCatalogGrid(page, "series");

    await page.goto("/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/);
    await waitForCatalogGrid(page, "movies");

    await expect(page.getByText(/PÁGINA 1 DE/i)).toBeVisible();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByText(/PÁGINA 2 DE/i)).toBeVisible({
      timeout: 10_000,
    });

    const searchInput = page.getByPlaceholder("Pesquisar por título ou palavra-chave...");
    const firstMovieTitle = await page.locator("main a[href^='/view/movies/']:visible h3").first().textContent();
    const searchTerm = firstMovieTitle?.trim().split(/\s+/).slice(0, 2).join(" ") || "Guerra";
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(450);
    await waitForCatalogGrid(page, "movies");

    await page.getByRole("button", { name: "FILTRE" }).click();
    const filtersDialog = page.getByRole("dialog", {
      name: /FILTRE O CATÁLOGO/i,
    });
    await expect(filtersDialog).toBeVisible();
    await filtersDialog
      .getByRole("button")
      .filter({ hasNotText: "TODAS AS CATEGORIAS" })
      .nth(2)
      .click();
    await filtersDialog
      .getByRole("button", { name: "CONFIRMAR E FILTRAR" })
      .click();
    await expect(filtersDialog).not.toBeVisible();
    await waitForCatalogGrid(page, "movies");

    await searchInput.fill("");
    await page.waitForTimeout(450);
    await openFirstVisibleCatalogDetail(page, "movies");
    await expect(page).toHaveURL(/\/view\/movies\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 15_000,
    });
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
    await waitForCatalogGrid(page, "movies");

    await page.goto("/collection/series");
    await expect(page).toHaveURL(/\/collection\/series$/);
    await waitForCatalogGrid(page, "series");

    await page.goto("/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/);
    await waitForCatalogGrid(page, "movies");

    const moviesHits = apiCalls.filter((url) =>
      url.includes("/api/catalog/movies?"),
    ).length;
    const groupsMoviesHits = apiCalls.filter((url) =>
      url.includes("/api/catalog/groups?type=movies"),
    ).length;

    expect(moviesHits).toBeLessThanOrEqual(2);
    expect(groupsMoviesHits).toBeLessThanOrEqual(2);
  });

  test("should not get stuck loading when the current last page is clicked twice", async ({
    page,
  }) => {
    const paginationButtons = page.locator("button[aria-current='page'], div.flex.gap-1\\.5.px-2 > button");
    const lastPageButton = paginationButtons.last();
    const lastPageLabel = (await lastPageButton.textContent())?.trim();

    expect(lastPageLabel).toBeTruthy();

    await lastPageButton.dblclick();
    await expect(page.getByText(new RegExp(`PÁGINA ${lastPageLabel} DE ${lastPageLabel}`, "i"))).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByText("BUSCANDO NO CATÁLOGO...")).toHaveCount(0);
    await waitForCatalogGrid(page, "movies");
  });
});

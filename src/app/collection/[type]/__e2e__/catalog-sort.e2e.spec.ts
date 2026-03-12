import { expect, test, type Page, type Response } from "@playwright/test";

async function waitForCatalogGrid(page: Page, type: "movies" | "series") {
  const firstVisibleCard = page.locator(`main a[href^='/view/${type}/']:visible`).first();
  await expect(firstVisibleCard).toBeVisible({ timeout: 15_000 });
}

async function openFilters(page: Page) {
  await page.getByRole("button", { name: "FILTRE" }).click();
  const dialog = page.getByRole("dialog", { name: /FILTRE O CATÁLOGO/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function applySort(
  page: Page,
  type: "movies" | "series",
  label: string,
  expectedSort: string,
): Promise<Response> {
  const dialog = await openFilters(page);
  await expect(dialog.getByText("TIPO DE ÁUDIO")).toHaveCount(0);
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/catalog/${type}?`) &&
    response.url().includes(`sort=${expectedSort}`) &&
    response.request().method() === "GET",
  );

  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: label, exact: true }).click();

  await dialog.getByRole("button", { name: "CONFIRMAR E FILTRAR" }).click();
  await expect(dialog).not.toBeVisible();

  return responsePromise;
}

async function visibleTitles(page: Page, type: "movies" | "series", count = 3) {
  const cards = page.locator(`main a[href^='/view/${type}/']:visible h3`);
  const total = await cards.count();
  const titles: string[] = [];

  for (let index = 0; index < Math.min(total, count); index += 1) {
    titles.push((await cards.nth(index).textContent())?.trim() || "");
  }

  return titles;
}

async function visibleYears(page: Page, type: "movies" | "series", count = 5) {
  const years = page.locator(
    `main a[href^='/view/${type}/']:visible p.text-\\[10px\\].font-bold.text-zinc-500.uppercase.tracking-widest`,
  );
  const total = await years.count();
  const values: number[] = [];

  for (let index = 0; index < Math.min(total, count); index += 1) {
    const raw = (await years.nth(index).textContent())?.trim() || "";
    const year = Number(raw);
    if (Number.isFinite(year)) values.push(year);
  }

  return values;
}

test.describe("catalog sort", () => {
  test("should apply movie display order and render the sorted response", async ({
    page,
  }) => {
    await page.goto("/collection/movies");
    await waitForCatalogGrid(page, "movies");

    const response = await applySort(page, "movies", "Ano (mais antigo)", "year_asc");
    await waitForCatalogGrid(page, "movies");

    const payload = await response.json();
    const years = payload.items.slice(0, 5).map((item: { year: number }) => item.year);
    const expectedTitles = payload.items.slice(0, 3).map((item: { title: string }) => item.title);

    expect(years).toEqual([...years].sort((a, b) => a - b));
    await expect.poll(() => visibleTitles(page, "movies")).toEqual(expectedTitles);
    await expect.poll(() => visibleYears(page, "movies")).toEqual(years);
  });

  test("should apply series display order by episode count", async ({
    page,
  }) => {
    await page.goto("/collection/series");
    await waitForCatalogGrid(page, "series");

    const response = await applySort(page, "series", "Mais episódios", "episodes_desc");
    await waitForCatalogGrid(page, "series");

    const payload = await response.json();
    const counts = payload.items.slice(0, 5).map((item: { episodeCount: number }) => item.episodeCount);
    const expectedTitles = payload.items.slice(0, 3).map((item: { title: string }) => item.title);

    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    await expect.poll(() => visibleTitles(page, "series")).toEqual(expectedTitles);
  });
});

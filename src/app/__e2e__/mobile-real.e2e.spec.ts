import { expect, test, type Page } from "@playwright/test";
import {
  e2eUserCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

async function expectAuthenticatedSession(page: Page) {
  await expect
    .poll(
      async () =>
        await page.evaluate(async () => {
          const response = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });
          return response.ok;
        }),
      { timeout: 30_000 },
    )
    .toBe(true);
}

async function waitForVisibleCatalogCard(page: Page, type: "movies" | "series") {
  const link = page.locator(`main a[href^='/view/${type}/']:visible`).first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  return link;
}

test.describe("mobile real flow", () => {
  test("should open the mobile menu, navigate to movies and start playback", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome");

    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Abrir menu de navegação" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Abrir menu de navegação" }).click();

    const moviesLink = page.locator('a[href="/collection/movies"]').last();
    await expect(moviesLink).toBeVisible();
    await page.goto("/collection/movies");

    await expect(page).toHaveURL(/\/collection\/movies$/, { timeout: 15_000 });
    const firstMovieLink = await waitForVisibleCatalogCard(page, "movies");
    const href = await firstMovieLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/view\/movies\//, { timeout: 15_000 });

    await page.getByRole("button", { name: /Assistir/i }).click({ force: true });
    await expect(page).toHaveURL(/\/play\/movies\//, { timeout: 15_000 });
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });
  });

  test.skip(
    !e2eUserCredentials,
    "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the authenticated mobile flow.",
  );

  test("should keep the mobile session through favorites and reload the player", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome");

    await loginWithCredentials(page, e2eUserCredentials!, "/collection/favorites");
    await expectAuthenticatedSession(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/collection\/favorites$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /Favoritos/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Minha Coleção Privada")).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Abrir menu de navegação/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expectAuthenticatedSession(page);

    await page.goto("/collection/movies");
    const firstMovieLink = await waitForVisibleCatalogCard(page, "movies");
    const href = await firstMovieLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/view\/movies\//, { timeout: 15_000 });

    await page.getByRole("button", { name: /Assistir/i }).click({ force: true });
    await expect(page).toHaveURL(/\/play\/movies\//, { timeout: 15_000 });
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/play\/movies\//, { timeout: 15_000 });
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Abrir menu de navegação/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expectAuthenticatedSession(page);
  });
});

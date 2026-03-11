import { expect, test } from "@playwright/test";
import {
  e2eUserCredentials,
  loginWithCredentials,
  openAccountMenu,
} from "@shared/testing/e2e/auth";

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

    await expect(page.getByRole("link", { name: /Filmes/i })).toBeVisible();
    await page.getByRole("link", { name: /Filmes/i }).click();

    await expect(page).toHaveURL(/\/collection\/movies$/);
    await expect(page.locator("a[href^='/view/movies/']").first()).toBeVisible();

    await page.locator("a[href^='/view/movies/']").first().click();
    await expect(page).toHaveURL(/\/view\/movies\//);

    await page.getByRole("button", { name: /Assistir/i }).click();
    await expect(page).toHaveURL(/\/play\/movies\//);
    await expect(page.locator("video")).toBeAttached();
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
    await expect(page).toHaveURL(/\/collection\/favorites$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Favoritos/i })).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu da conta" }).click();
    await expect(page.getByText(e2eUserCredentials!.email)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/collection/movies");
    const firstMovieLink = page.locator("a[href^='/view/movies/']").first();
    await expect(firstMovieLink).toBeVisible();
    await firstMovieLink.click();
    await expect(page).toHaveURL(/\/view\/movies\//);

    await page.getByRole("button", { name: /Assistir/i }).click();
    await expect(page).toHaveURL(/\/play\/movies\//);
    await expect(page.locator("video")).toBeAttached();

    await page.reload();
    await expect(page).toHaveURL(/\/play\/movies\//);
    await expect(page.locator("video")).toBeAttached();

    await page.goto("/");
    await openAccountMenu(page);
    await expect(page.getByText(e2eUserCredentials!.email)).toBeVisible();
  });
});

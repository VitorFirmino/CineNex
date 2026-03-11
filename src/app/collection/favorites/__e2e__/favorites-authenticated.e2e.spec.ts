import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "@shared/testing/e2e/auth";

const authEmail = process.env.E2E_AUTH_EMAIL;
const authPassword = process.env.E2E_AUTH_PASSWORD;

test.describe("favorites authenticated flow", () => {
  test.skip(
    !authEmail || !authPassword,
    "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the authenticated favorites flow.",
  );

  test("should sign in through the favorites guard and keep the session after reload", async ({
    page,
  }) => {
    await page.goto("/collection/favorites");

    await expect(page).toHaveURL(/\/login\?next=%2Fcollection%2Ffavorites$/);
    await expect(page.getByRole("heading", { name: "Bem-vindo" })).toBeVisible();

    await loginWithCredentials(
      page,
      { email: authEmail!, password: authPassword! },
      "/collection/favorites",
    );
    await expect(page).toHaveURL(/\/collection\/favorites$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Favoritos" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Minha Coleção Privada")).toBeVisible({
      timeout: 30_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/collection\/favorites$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Favoritos" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Minha Coleção Privada")).toBeVisible({
      timeout: 30_000,
    });
  });
});

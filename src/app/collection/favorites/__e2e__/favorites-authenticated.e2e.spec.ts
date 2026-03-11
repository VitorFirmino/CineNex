import { expect, test } from "@playwright/test";

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

    await page.getByPlaceholder("seu@email.com").fill(authEmail!);
    await page.getByPlaceholder("••••••••").fill(authPassword!);
    await page.getByRole("button", { name: "Fazer login" }).click();

    await expect(page).toHaveURL(/\/collection\/favorites$/);
    await expect(page.getByRole("heading", { name: "Favoritos" })).toBeVisible();
    await expect(page.getByText("Minha Coleção Privada")).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/collection\/favorites$/);
    await expect(page.getByRole("heading", { name: "Favoritos" })).toBeVisible();
    await expect(page.getByText("Minha Coleção Privada")).toBeVisible();
  });
});

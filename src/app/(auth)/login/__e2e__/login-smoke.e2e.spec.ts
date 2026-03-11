import { expect, test } from "@playwright/test";

test.describe("login smoke", () => {
  test("should render the login page with the main actions", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "Bem-vindo" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar com Google" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Fazer login" })).toBeVisible();
  });
});

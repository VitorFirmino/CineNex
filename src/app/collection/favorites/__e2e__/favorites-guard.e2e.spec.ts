import { expect, test } from "@playwright/test";

test.describe("favorites guard", () => {
  test("should redirect guests from favorites to login with a next param", async ({
    page,
  }) => {
    await page.goto("/collection/favorites");

    await expect(page).toHaveURL(/\/login\?next=%2Fcollection%2Ffavorites$/);
    await expect(
      page.getByRole("heading", { name: "Bem-vindo" }),
    ).toBeVisible();
  });
});

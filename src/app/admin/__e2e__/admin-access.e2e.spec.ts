import { expect, test } from "@playwright/test";

test.describe("admin access", () => {
  test("should redirect guests from admin routes to login with a next param", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
    await expect(
      page.getByRole("heading", { name: "Bem-vindo" }),
    ).toBeVisible();
  });
});

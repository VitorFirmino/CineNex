import { expect, test } from "@playwright/test";

test.describe("auth recovery", () => {
  test("should redirect expired recovery hashes to forgot-password with a safe message", async ({
    page,
  }) => {
    await page.goto(
      "/login#error_code=otp_expired&error=access_denied&error_description=Email%20link%20is%20invalid%20or%20has%20expired",
    );

    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(
      page.getByText(
        "O link de recuperação expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.",
      ),
    ).toBeVisible();
  });
});

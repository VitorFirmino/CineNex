import { expect, test } from "@playwright/test";
import {
  e2eAdminCredentials,
  e2eUserCredentials,
  hasAuthCookies,
  loginWithCredentials,
  logoutFromHeader,
} from "@shared/testing/e2e/auth";

test.describe("session switching", () => {
  test.skip(
    !e2eUserCredentials || !e2eAdminCredentials,
    "Set E2E_AUTH_* and E2E_ADMIN_* credentials to run the session switching flow.",
  );

  test("should clear the user session on logout and allow a clean admin login afterwards", async ({
    page,
    context,
  }) => {
    await loginWithCredentials(page, e2eUserCredentials!);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(true);

    await logoutFromHeader(page);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect(page.getByRole("link", { name: /Entrar/i })).toBeVisible();
    await expect.poll(() => hasAuthCookies(context)).toBe(false);

    await page.goto("/collection/favorites");
    await expect(page).toHaveURL(/\/login\?next=%2Fcollection%2Ffavorites$/);

    await loginWithCredentials(page, e2eAdminCredentials!, "/admin");
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    await page.goto("/");
    await expect.poll(() => hasAuthCookies(context)).toBe(true);
  });

  test("should keep the active session on reload and drop admin privileges after switching back to a user", async ({
    page,
    context,
  }) => {
    await loginWithCredentials(page, e2eAdminCredentials!, "/admin");
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    await logoutFromHeader(page);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(false);

    await loginWithCredentials(page, e2eUserCredentials!, "/admin");
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(true);

    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(true);
  });

  test("should propagate logout across tabs and keep auth tokens out of localStorage", async ({
    page,
    context,
  }) => {
    await loginWithCredentials(page, e2eUserCredentials!);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(true);

    const secondTab = await context.newPage();
    await secondTab.goto("/collection/favorites");
    await expect(secondTab).toHaveURL(/\/collection\/favorites$/, { timeout: 15_000 });

    await logoutFromHeader(page);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(false);

    await secondTab.reload();
    await secondTab.goto("/collection/favorites");
    await expect(secondTab).toHaveURL(/\/login\?next=%2Fcollection%2Ffavorites$/);

    const storageKeys = await secondTab.evaluate(() => Object.keys(window.localStorage));
    const sessionStorageKeys = await secondTab.evaluate(() => Object.keys(window.sessionStorage));
    expect(
      storageKeys.some((key) => /(supabase|auth|token|access|refresh)/i.test(key)),
    ).toBe(false);
    expect(
      sessionStorageKeys.some((key) => /(supabase|auth|token|access|refresh)/i.test(key)),
    ).toBe(false);

    await secondTab.close();
  });
});

import type { BrowserContext, Page } from "@playwright/test";

export type E2ECredentials = {
  email: string;
  password: string;
};

export const e2eUserCredentials: E2ECredentials | null =
  process.env.E2E_AUTH_EMAIL && process.env.E2E_AUTH_PASSWORD
    ? {
        email: process.env.E2E_AUTH_EMAIL,
        password: process.env.E2E_AUTH_PASSWORD,
      }
    : null;

export const e2eAdminCredentials: E2ECredentials | null =
  process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD
    ? {
        email: process.env.E2E_ADMIN_EMAIL,
        password: process.env.E2E_ADMIN_PASSWORD,
      }
    : null;

export async function loginWithCredentials(
  page: Page,
  credentials: E2ECredentials,
  nextPath?: string,
): Promise<void> {
  const loginPath = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  await page.goto(loginPath);
  await page.getByPlaceholder("seu@email.com").fill(credentials.email);
  await page.getByPlaceholder("••••••••").fill(credentials.password);
  await page.getByRole("button", { name: "Fazer login" }).click();
}

export async function openAccountMenu(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: /Abrir menu da conta/i }).first();
  if ((await trigger.getAttribute("aria-expanded")) === "true") {
    return;
  }

  await trigger.click();
}

export async function logoutFromHeader(page: Page): Promise<void> {
  const logoutItem = page.getByRole("menuitem", { name: /Sair/i });
  if (await logoutItem.isVisible().catch(() => false)) {
    await logoutItem.click();
    return;
  }

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: /Sair/i }).click();
}

export async function hasAuthCookies(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((cookie) =>
    /(sb-|supabase|access-token|refresh-token)/i.test(cookie.name),
  );
}

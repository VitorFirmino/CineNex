import { expect, type BrowserContext, type Locator, type Page } from "@playwright/test";

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

async function isVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

async function waitForAccountMenuContent(page: Page): Promise<void> {
  const desktopLogout = page.getByRole("menuitem", { name: /Sair/i }).first();
  const mobileLogout = page.getByRole("button", { name: /^Sair$/i }).first();

  await expect
    .poll(
      async () =>
        (await isVisible(desktopLogout)) || (await isVisible(mobileLogout)),
      { timeout: 15_000 },
    )
    .toBe(true);
}

export async function loginWithCredentials(
  page: Page,
  credentials: E2ECredentials,
  nextPath?: string,
): Promise<void> {
  const loginPath = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
  await page.goto(loginPath);
  await page.getByPlaceholder("seu@email.com").fill(credentials.email);
  await page.getByPlaceholder("••••••••").fill(credentials.password);
  const loginResponsePromise = page.waitForResponse((response) => {
    return response.url().includes("/api/auth/login") && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Fazer login" }).click();
  await loginResponsePromise;
  await expect
    .poll(async () => {
      const authCookies = await page.context().cookies();
      return authCookies.some((cookie) =>
        /(sb-|supabase|access-token|refresh-token)/i.test(cookie.name),
      );
    }, { timeout: 15_000 })
    .toBe(true);

  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(async () => {
            const response = await fetch("/api/auth/me", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });
            return response.ok;
          });
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    )
    .toBe(true);

  const leftLoginPage = await page
    .waitForURL((url) => url.pathname !== "/login", { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);

  if (!leftLoginPage) {
    const destination = nextPath || "/";
    await expect
      .poll(
        async () => {
          await page.goto(destination, { waitUntil: "domcontentloaded" });
          return new URL(page.url()).pathname;
        },
        { timeout: 15_000 },
      )
      .toBe(destination);
  }

  await page.waitForLoadState("domcontentloaded");
}

export async function openAccountMenu(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: /Abrir menu da conta/i }).first();
  const loadingTrigger = page.getByRole("button", {
    name: /Menu da conta carregando/i,
  }).first();
  const mobileTrigger = page.getByRole("button", {
    name: /Abrir menu de navegação/i,
  }).first();
  const desktopLogout = page.getByRole("menuitem", { name: /Sair/i }).first();
  const mobileLogout = page.getByRole("button", { name: /^Sair$/i }).first();

  await expect
    .poll(
      async () =>
        (await isVisible(trigger)) ||
        (await isVisible(mobileTrigger)) ||
        (await isVisible(loadingTrigger)) ||
        (await isVisible(desktopLogout)) ||
        (await isVisible(mobileLogout)),
      { timeout: 15_000 },
    )
    .toBe(true);

  if (await isVisible(desktopLogout) || await isVisible(mobileLogout)) {
    await waitForAccountMenuContent(page);
    return;
  }

  if (await isVisible(loadingTrigger)) {
    await expect
      .poll(
        async () =>
          (await isVisible(trigger)) ||
          (await isVisible(mobileTrigger)) ||
          (await isVisible(desktopLogout)) ||
          (await isVisible(mobileLogout)),
        { timeout: 15_000 },
      )
      .toBe(true);
  }

  if (await isVisible(trigger)) {
    if ((await trigger.getAttribute("aria-expanded")) === "true") {
      await waitForAccountMenuContent(page);
      return;
    }

    try {
      await trigger.click({ force: true, timeout: 5_000 });
    } catch {
      await trigger.focus();
      await page.keyboard.press("Enter");
    }
    await waitForAccountMenuContent(page);
    return;
  }

  await expect(mobileTrigger).toBeVisible({ timeout: 15_000 });
  if (await isVisible(mobileLogout)) {
    return;
  }

  try {
    await mobileTrigger.click({ force: true, timeout: 5_000 });
  } catch {
    await mobileTrigger.focus();
    await page.keyboard.press("Enter");
  }
  await waitForAccountMenuContent(page);
}

export async function logoutFromHeader(page: Page): Promise<void> {
  const logoutItem = page.getByRole("menuitem", { name: /Sair/i });
  if (await isVisible(logoutItem)) {
    await logoutItem.click();
    return;
  }

  await openAccountMenu(page);

  if (await isVisible(logoutItem)) {
    await logoutItem.click();
    return;
  }

  await page.getByRole("button", { name: /^Sair$/i }).click();
}

export async function expectAccountMenuOpen(page: Page): Promise<void> {
  await waitForAccountMenuContent(page);
}

export async function hasAuthCookies(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies();
  return cookies.some((cookie) =>
    /(sb-|supabase|access-token|refresh-token)/i.test(cookie.name),
  );
}

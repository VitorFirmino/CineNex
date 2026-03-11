import { expect, test } from "@playwright/test";
import {
  hasAuthCookies,
  e2eUserCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

test.describe("continue watching", () => {
  test.skip(
    !e2eUserCredentials,
    "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the continue watching flow.",
  );

  test("should show the resume row on the home page for authenticated users", async ({
    page,
    context,
  }) => {
    await loginWithCredentials(page, e2eUserCredentials!);
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await expect.poll(() => hasAuthCookies(context)).toBe(true);

    const response = await page.evaluate(async () => {
      const payload = {
        contentType: "movies",
        contentId: "resume-e2e-movie",
        playHref: "/play/movies/resume-e2e-movie",
        positionSec: 42,
        durationSec: 120,
        title: "QA Resume Session",
        posterUrl: "/screenshot.png",
        completed: false,
      };

      const res = await fetch("/api/auth/watch-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return {
        ok: res.ok,
        status: res.status,
      };
    });

    expect(response).toEqual({
      ok: true,
      status: 200,
    });

    await expect
      .poll(
        async () =>
          await page.evaluate(async () => {
            const res = await fetch("/api/auth/watch-progress?limit=18", {
              credentials: "include",
              cache: "no-store",
            });
            const data = await res.json();
            return Array.isArray(data.items)
              ? data.items.some((item: { title?: string | null }) => item.title === "QA Resume Session")
              : false;
          }),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Últimos Assistidos" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Retome rapidamente sua sessão")).toBeVisible({
      timeout: 30_000,
    });
    const resumeLink = page.getByRole("link", { name: /QA Resume Session/i }).first();
    await expect(resumeLink).toBeVisible({ timeout: 30_000 });

    await resumeLink.click({ force: true });
    await expect(page).toHaveURL(/\/play\/movies\/resume-e2e-movie$/, {
      timeout: 15_000,
    });
  });
});

import { expect, test, type Page } from "@playwright/test";
import {
  e2eUserCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

async function waitForVideoRendering(page: Page) {
  await page.waitForFunction(
    () => {
      const video = document.querySelector("video");
      if (!(video instanceof HTMLVideoElement)) return false;

      const qualityFrames =
        typeof video.getVideoPlaybackQuality === "function"
          ? video.getVideoPlaybackQuality().totalVideoFrames
          : 0;
      const webkitFrames =
        (
          video as HTMLVideoElement & {
            webkitDecodedFrameCount?: number;
          }
        ).webkitDecodedFrameCount || 0;
      const decodedFrames = Math.max(qualityFrames, webkitFrames);

      return !video.paused && video.currentTime > 0.5 && decodedFrames > 0;
    },
    undefined,
    { timeout: 30_000 },
  );
}

test.describe("player flow", () => {
  test.skip(
    !e2eUserCredentials,
    "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the authenticated player resume flow.",
  );

  test("should load a movie detail and start playback", async ({ page }) => {
    await page.goto("/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/);
    await expect(page.locator("a[href^='/view/movies/']").first()).toBeVisible();

    await page.locator("a[href^='/view/movies/']").first().click();
    await expect(page).toHaveURL(/\/view\/movies\//);

    const watchButton = page.getByRole("button", { name: /Assistir/i });
    await expect(watchButton).toBeVisible();
    await watchButton.click();

    await expect(page).toHaveURL(/\/play\/movies\//);
    await expect(page.locator("video")).toBeAttached();
    await waitForVideoRendering(page);
  });

  test("should load a fallback series episode when no episodeId is provided", async ({
    page,
  }) => {
    await page.goto("/collection/series");
    await expect(page).toHaveURL(/\/collection\/series$/);
    await expect(page.locator("a[href^='/view/series/']").first()).toBeVisible();

    const firstSeriesLink = page.locator("a[href^='/view/series/']").first();
    await expect(firstSeriesLink).toBeVisible();

    const href = await firstSeriesLink.getAttribute("href");
    expect(href).toBeTruthy();
    const seriesId = href?.split("/").pop();
    expect(seriesId).toBeTruthy();

    await page.goto(`/play/series/${seriesId}`);
    await expect(page.locator("video")).toBeAttached();
    await waitForVideoRendering(page);
  });

  test("should persist movie progress and resume from the saved position", async ({
    page,
  }) => {
    await loginWithCredentials(page, e2eUserCredentials!, "/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/, { timeout: 15_000 });

    const firstMovieLink = page.locator("a[href^='/view/movies/']").first();
    await expect(firstMovieLink).toBeVisible();

    await firstMovieLink.click();
    await expect(page).toHaveURL(/\/view\/movies\//);

    await page.getByRole("button", { name: /Assistir/i }).click();
    await expect(page).toHaveURL(/\/play\/movies\//);
    const movieId = new URL(page.url()).pathname.split("/").pop();
    expect(movieId).toBeTruthy();
    await expect(page.locator("video")).toBeAttached();
    await waitForVideoRendering(page);

    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (!(video instanceof HTMLVideoElement)) {
        throw new Error("Expected video element");
      }

      video.currentTime = 65;
      video.dispatchEvent(new Event("timeupdate"));
      video.dispatchEvent(new Event("pause"));
    });

    await page.waitForTimeout(750);

    const saved = await page.evaluate(async (contentId) => {
      const response = await fetch(
        `/api/auth/watch-progress?contentType=movies&contentId=${encodeURIComponent(contentId)}`,
      );

      return await response.json();
    }, movieId!);

    expect(saved.item).toMatchObject({
      contentId: movieId,
    });
    expect(saved.item.positionSec).toBeGreaterThanOrEqual(60);

    await page.goto(`/play/movies/${movieId}`);
    await expect(page.locator("video")).toBeAttached();
    await page.waitForFunction(
      (minimumTime) => {
        const video = document.querySelector("video");
        return video instanceof HTMLVideoElement && video.currentTime >= minimumTime;
      },
      55,
      { timeout: 15_000 },
    );
  });
});

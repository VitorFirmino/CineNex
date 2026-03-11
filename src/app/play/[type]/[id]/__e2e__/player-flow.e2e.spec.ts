import { expect, test, type Page } from "@playwright/test";
import {
  e2eUserCredentials,
  loginWithCredentials,
} from "@shared/testing/e2e/auth";

async function waitForVisibleCatalogCard(page: Page, type: "movies" | "series") {
  const link = page.locator(`main a[href^='/view/${type}/']:visible`).first();
  await expect(link).toBeVisible({ timeout: 15_000 });
  return link;
}

function isVideoRenderingInPage() {
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

  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    Boolean(video.currentSrc || video.getAttribute("src")) &&
    (!video.paused || video.currentTime > 0 || decodedFrames > 0)
  );
}

async function waitForVideoRendering(page: Page) {
  await waitForVideoMetadata(page);

  const playButton = page.getByRole("button", { name: /^Reproduzir$/i }).first();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const alreadyRendering = await page.evaluate(isVideoRenderingInPage);
    if (alreadyRendering) return;

    if (await playButton.isVisible().catch(() => false)) {
      await playButton.click({ force: true });
    }

    await page.evaluate(async () => {
      const video = document.querySelector("video");
      if (!(video instanceof HTMLVideoElement) || !video.paused) return;

      video.muted = true;

      try {
        await video.play();
      } catch (error) {
        console.log("Error playing video", error);
      }
    });

    try {
      await page.waitForFunction(isVideoRenderingInPage, undefined, { timeout: 5_000 });
      return;
    } catch (error) {
      console.log("Video not rendering", error);
    }
  }

  await page.waitForFunction(isVideoRenderingInPage, undefined, { timeout: 10_000 });
}

async function waitForVideoMetadata(page: Page) {
  await page.waitForFunction(
    () => {
      const video = document.querySelector("video");
      return (
        video instanceof HTMLVideoElement &&
        (video.readyState >= HTMLMediaElement.HAVE_METADATA ||
          Boolean(video.currentSrc || video.getAttribute("src")))
      );
    },
    undefined,
    { timeout: 15_000 },
  );
}

test.describe("player flow", () => {
  test.skip(
    !e2eUserCredentials,
    "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the authenticated player resume flow.",
  );

  test("should load a movie detail and start playback", async ({ page }) => {
    await loginWithCredentials(page, e2eUserCredentials!, "/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/, { timeout: 15_000 });
    const firstMovieLink = await waitForVisibleCatalogCard(page, "movies");
    const href = await firstMovieLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/view\/movies\//, { timeout: 15_000 });

    const watchButton = page.getByRole("button", { name: /Assistir/i });
    await expect(watchButton).toBeVisible({ timeout: 15_000 });
    await watchButton.click({ force: true });

    await expect(page).toHaveURL(/\/play\/movies\//, { timeout: 15_000 });
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });
    await waitForVideoRendering(page);
  });

  test("should load a fallback series episode when no episodeId is provided", async ({
    page,
  }) => {
    await loginWithCredentials(page, e2eUserCredentials!, "/collection/series");
    await expect(page).toHaveURL(/\/collection\/series$/, { timeout: 15_000 });
    const firstSeriesLink = await waitForVisibleCatalogCard(page, "series");

    const href = await firstSeriesLink.getAttribute("href");
    expect(href).toBeTruthy();
    const seriesId = href?.split("/").pop();
    expect(seriesId).toBeTruthy();

    await page.goto(`/play/series/${seriesId}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/play\/series\//, { timeout: 15_000 });
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });
    await waitForVideoRendering(page);
  });

  test("should persist movie progress and resume from the saved position", async ({
    page,
  }) => {
    await loginWithCredentials(page, e2eUserCredentials!, "/collection/movies");
    await expect(page).toHaveURL(/\/collection\/movies$/, { timeout: 15_000 });

    const firstMovieLink = await waitForVisibleCatalogCard(page, "movies");
    const href = await firstMovieLink.getAttribute("href");
    expect(href).toBeTruthy();

    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/view\/movies\//, { timeout: 15_000 });

    await page.getByRole("button", { name: /Assistir/i }).click({ force: true });
    await expect(page).toHaveURL(/\/play\/movies\//, { timeout: 15_000 });
    const movieId = new URL(page.url()).pathname.split("/").pop();
    expect(movieId).toBeTruthy();
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });
    await waitForVideoRendering(page);

    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (!(video instanceof HTMLVideoElement)) {
        throw new Error("Expected video element");
      }

      video.currentTime = 65;
      video.dispatchEvent(new Event("playing"));
      video.dispatchEvent(new Event("timeupdate"));
      video.dispatchEvent(new Event("pause"));
    });

    await page.waitForTimeout(1_500);

    await expect
      .poll(
        async () =>
          await page.evaluate(async (contentId) => {
            const response = await fetch(
              `/api/auth/watch-progress?contentType=movies&contentId=${encodeURIComponent(contentId)}`,
            );

            return await response.json();
          }, movieId!),
        { timeout: 30_000 },
      )
      .toMatchObject({
        item: {
          contentId: movieId,
        },
      });

    const saved = await page.evaluate(async (contentId) => {
      const response = await fetch(
        `/api/auth/watch-progress?contentType=movies&contentId=${encodeURIComponent(contentId)}`,
      );

      return await response.json();
    }, movieId!);

    expect(saved.item.positionSec).toBeGreaterThanOrEqual(60);

    await page.goto(`/play/movies/${movieId}`);
    await expect(page.locator("video")).toBeAttached({ timeout: 15_000 });
    await waitForVideoMetadata(page);
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

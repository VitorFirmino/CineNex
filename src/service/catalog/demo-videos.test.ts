import { describe, expect, it } from "vitest";

import { getDemoVideoUrl } from "./demo-videos";

describe("getDemoVideoUrl", () => {
  it("should skip known unavailable demo sources", () => {
    expect(getDemoVideoUrl("tmdb_tv_111110_s1_e2")).toBe(
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    );
  });
});

import { describe, expect, it } from "vitest";
import { axiosClient } from "./axios-client";

describe("axios-client", () => {
  it("should be configured with credentials and json content type", () => {
    expect(axiosClient.defaults.withCredentials).toBe(true);
    expect(axiosClient.defaults.headers["Content-Type"]).toBe("application/json");
  });
});
